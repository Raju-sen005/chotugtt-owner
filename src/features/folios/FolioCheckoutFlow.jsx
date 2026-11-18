import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  LogOut,
  Printer,
  Wallet,
} from "lucide-react";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import Modal from "../../components/ui/Modal";
import {
  createIdempotencyKey,
  formatMoney,
  getFolioApiErrorMessage,
  guestNameOf,
  normalizeBookingStatus,
  normalizeFolioStatus,
  roomNumberOf,
} from "./folioAccess";
import { buildFolioInvoiceHtml } from "./printFolioInvoice";
import {
  CHECKOUT_STEP_LABELS,
  CHECKOUT_STEP_ORDER,
  CHECKOUT_STEPS,
  canConfirmCheckout,
  checkoutStepIndex,
  isOutstandingCleared,
  nextStepAfterPayment,
  resolveCheckoutWizardError,
  shouldCollectPayment,
  validateCheckoutPaymentForm,
} from "./folioCheckoutFlow.js";

/**
 * Step wizard: Final Bill Preview → Collect Payment → Confirm Checkout → Complete.
 * Reuses existing sync / receipt / payment / checkout APIs via callbacks.
 */
export default function FolioCheckoutFlow({
  isOpen,
  /** When false, UI is hidden but local wizard state is preserved across billing tabs. */
  isActive = true,
  /** Render without a nested Modal (Room Billing tab host). */
  embedded = false,
  onClose,
  /** Called only after checkout API success + authoritative refresh (closes Room Billing). */
  onCheckoutSuccess,
  booking,
  bookingId,
  folio,
  pendingKitchen = [],
  currency = "INR",
  busy = false,
  onSyncOrders,
  onFetchReceipt,
  onRecordPayment,
  onCheckout,
  onPrintReceipt,
  onRefreshFolio,
}) {
  const [step, setStep] = useState(CHECKOUT_STEPS.PREVIEW);
  const [previewBusy, setPreviewBusy] = useState(false);
  const [previewError, setPreviewError] = useState("");
  const [receipt, setReceipt] = useState(null);
  const [invoiceHtml, setInvoiceHtml] = useState("");
  const [previewSynced, setPreviewSynced] = useState(false);
  const [syncFailed, setSyncFailed] = useState(false);
  const [payForm, setPayForm] = useState({
    method: "CASH",
    amount: "",
    cashAmount: "",
    upiAmount: "",
    note: "",
  });
  const [payBusy, setPayBusy] = useState(false);
  const [payError, setPayError] = useState("");
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [confirmError, setConfirmError] = useState("");
  const [finalReceipt, setFinalReceipt] = useState(null);
  const [printBusy, setPrintBusy] = useState(false);
  const idempotencyKeyRef = useRef(createIdempotencyKey());
  const bootstrappedForRef = useRef(null);

  const dueAmount = Number(folio?.dueAmount) || 0;
  const paidAmount = Number(folio?.paidAmount) || 0;
  const grandTotal = Number(folio?.grandTotal) || 0;
  const folioStatus = normalizeFolioStatus(folio?.status);
  const bookingStatus = normalizeBookingStatus(booking?.bookingStatus);
  const kitchenCount = Array.isArray(pendingKitchen) ? pendingKitchen.length : 0;

  const confirmAllowed = canConfirmCheckout({
    dueAmount,
    pendingKitchenCount: kitchenCount,
    bookingStatus,
    folioStatus,
    syncFailed,
  });

  const stepTitle = CHECKOUT_STEP_LABELS[step] || "Checkout";

  const resetLocal = useCallback(() => {
    setStep(CHECKOUT_STEPS.PREVIEW);
    setPreviewBusy(false);
    setPreviewError("");
    setReceipt(null);
    setInvoiceHtml("");
    setPreviewSynced(false);
    setSyncFailed(false);
    setPayForm({
      method: "CASH",
      amount: "",
      cashAmount: "",
      upiAmount: "",
      note: "",
    });
    setPayBusy(false);
    setPayError("");
    setConfirmBusy(false);
    setConfirmError("");
    setFinalReceipt(null);
    setPrintBusy(false);
    idempotencyKeyRef.current = createIdempotencyKey();
    bootstrappedForRef.current = null;
  }, []);

  const handleClose = useCallback(() => {
    if (previewBusy || payBusy || confirmBusy || printBusy) return;
    // Mid-flow cancel: parent keeps Room Billing open (e.g. switch to Overview).
    // Do not treat cancel as checkout success.
    if (step === CHECKOUT_STEPS.COMPLETE) {
      onCheckoutSuccess?.();
      return;
    }
    onClose?.();
  }, [
    previewBusy,
    payBusy,
    confirmBusy,
    printBusy,
    step,
    onCheckoutSuccess,
    onClose,
  ]);

  const loadPreview = useCallback(async () => {
    if (!bookingId || typeof onSyncOrders !== "function") return;
    setPreviewBusy(true);
    setPreviewError("");
    setSyncFailed(false);
    setPreviewSynced(false);
    setReceipt(null);
    setInvoiceHtml("");
    try {
      await onSyncOrders();
      setPreviewSynced(true);
      if (typeof onRefreshFolio === "function") {
        await onRefreshFolio();
      }
    } catch (error) {
      setSyncFailed(true);
      setPreviewError(
        getFolioApiErrorMessage(
          error,
          "Could not sync folio orders. Payment and checkout are blocked until sync succeeds.",
        ),
      );
      setPreviewBusy(false);
      return;
    }
    try {
      const snapshot = await onFetchReceipt();
      if (!snapshot) {
        throw new Error("Invoice receipt was empty");
      }
      setReceipt(snapshot);
      setInvoiceHtml(buildFolioInvoiceHtml(snapshot));
    } catch (error) {
      setPreviewError(
        getFolioApiErrorMessage(
          error,
          "Folio synced, but invoice preview could not be loaded. Retry before payment.",
        ),
      );
    } finally {
      setPreviewBusy(false);
    }
  }, [bookingId, onSyncOrders, onFetchReceipt, onRefreshFolio]);

  // Reset only when the host folio session ends — not when switching billing tabs.
  useEffect(() => {
    if (!isOpen) {
      resetLocal();
    }
  }, [isOpen, resetLocal]);

  // Lazy bootstrap when Checkout becomes active the first time for this booking.
  // Selecting the Checkout tab must not call the checkout API.
  useEffect(() => {
    if (!isOpen || !isActive || !bookingId) return;
    if (bootstrappedForRef.current === bookingId) return;
    bootstrappedForRef.current = bookingId;
    setStep(CHECKOUT_STEPS.PREVIEW);
    setConfirmError("");
    setPayError("");
    setFinalReceipt(null);
    const due = Number(folio?.dueAmount) || 0;
    idempotencyKeyRef.current = createIdempotencyKey();
    setPayForm({
      method: "CASH",
      amount: due > 0 ? String(due) : "",
      cashAmount: "",
      upiAmount: "",
      note: "",
    });
    loadPreview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, isActive, bookingId]);

  // Keep payment amount default in sync when authoritative due changes on payment step.
  useEffect(() => {
    if (!isOpen || step !== CHECKOUT_STEPS.PAYMENT) return;
    const due = Number(folio?.dueAmount) || 0;
    setPayForm((prev) => {
      if (prev.amount && Number(prev.amount) > 0 && Number(prev.amount) <= due + 0.001) {
        return prev;
      }
      return {
        ...prev,
        amount: due > 0 ? String(due) : "",
      };
    });
  }, [isOpen, step, folio?.dueAmount]);

  const goToPaymentOrConfirm = useCallback(() => {
    if (syncFailed || !previewSynced) return;
    if (shouldCollectPayment(dueAmount)) {
      setStep(CHECKOUT_STEPS.PAYMENT);
      return;
    }
    setStep(CHECKOUT_STEPS.CONFIRM);
  }, [syncFailed, previewSynced, dueAmount]);

  const submitPayment = async (event) => {
    event.preventDefault();
    if (payBusy || syncFailed) return;
    setPayError("");
    const validated = validateCheckoutPaymentForm({
      method: payForm.method,
      amount: payForm.amount,
      cashAmount: payForm.cashAmount,
      upiAmount: payForm.upiAmount,
      dueAmount,
    });
    if (!validated.ok) {
      setPayError(validated.message);
      return;
    }
    setPayBusy(true);
    try {
      const payload = {
        ...validated.payload,
        idempotencyKey: idempotencyKeyRef.current,
        note: payForm.note?.trim() || undefined,
      };
      const result = await onRecordPayment(payload);
      idempotencyKeyRef.current = createIdempotencyKey();
      if (typeof onRefreshFolio === "function") {
        await onRefreshFolio();
      }
      const nextFolio = result?.folio || folio;
      const nextDue = Number(nextFolio?.dueAmount);
      setPayForm({
        method: "CASH",
        amount:
          shouldCollectPayment(nextDue) && Number.isFinite(nextDue)
            ? String(nextDue)
            : "",
        cashAmount: "",
        upiAmount: "",
        note: "",
      });
      setStep(nextStepAfterPayment(nextFolio));
    } catch (error) {
      setPayError(getFolioApiErrorMessage(error, "Payment failed"));
    } finally {
      setPayBusy(false);
    }
  };

  const submitCheckout = async () => {
    if (!confirmAllowed || confirmBusy) return;
    setConfirmError("");
    setConfirmBusy(true);
    try {
      if (typeof onRefreshFolio === "function") {
        await onRefreshFolio();
      }
      await onCheckout();
      // Authoritative booking/room/folio refresh after backend confirms checkout.
      if (typeof onRefreshFolio === "function") {
        await onRefreshFolio();
      }
      let settledReceipt = null;
      try {
        settledReceipt = await onFetchReceipt();
      } catch {
        settledReceipt = null;
      }
      setFinalReceipt(settledReceipt);
      if (settledReceipt) {
        try {
          setInvoiceHtml(buildFolioInvoiceHtml(settledReceipt));
        } catch {
          /* keep prior html */
        }
      }
      setStep(CHECKOUT_STEPS.COMPLETE);
      // Keep Room Billing open on the Complete step so staff can print the
      // final invoice. Done → onCheckoutSuccess closes the host modal only
      // after this success + refresh path (never on submit / failure).
    } catch (error) {
      const resolved = resolveCheckoutWizardError(error);
      setConfirmError(resolved.message);
      if (resolved.action === "return-to-payment") {
        if (typeof onRefreshFolio === "function") {
          await onRefreshFolio();
        }
        setStep(CHECKOUT_STEPS.PAYMENT);
      }
      // Keep host Room Billing modal open on validation / API failure.
    } finally {
      setConfirmBusy(false);
    }
  };

  const printCurrent = async () => {
    const snap = step === CHECKOUT_STEPS.COMPLETE ? finalReceipt || receipt : receipt;
    if (!snap || printBusy) return;
    setPrintBusy(true);
    try {
      await onPrintReceipt(snap);
    } catch (error) {
      setConfirmError(
        getFolioApiErrorMessage(error, "Could not open print dialog"),
      );
    } finally {
      setPrintBusy(false);
    }
  };

  const totalsStrip = useMemo(
    () => (
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="rounded-xl border border-[var(--border)] bg-slate-50 px-3 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
            Total bill
          </p>
          <p className="mt-0.5 text-sm font-black">
            {formatMoney(grandTotal, currency)}
          </p>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-slate-50 px-3 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
            Already paid
          </p>
          <p className="mt-0.5 text-sm font-black text-emerald-700">
            {formatMoney(paidAmount, currency)}
          </p>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-slate-50 px-3 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
            Outstanding
          </p>
          <p
            className={`mt-0.5 text-sm font-black ${
              isOutstandingCleared(dueAmount) ? "text-emerald-700" : "text-rose-700"
            }`}
          >
            {formatMoney(dueAmount, currency)}
          </p>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-slate-50 px-3 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
            Folio status
          </p>
          <p className="mt-0.5 text-sm font-black">{folioStatus}</p>
        </div>
      </div>
    ),
    [grandTotal, paidAmount, dueAmount, currency, folioStatus],
  );

  const stepper = (
    <ol className="flex flex-wrap gap-2">
      {CHECKOUT_STEP_ORDER.map((key, index) => {
        const active = checkoutStepIndex(step) === index;
        const done = checkoutStepIndex(step) > index;
        return (
          <li
            key={key}
            className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
              active
                ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                : done
                  ? "border-slate-200 bg-slate-50 text-slate-600"
                  : "border-slate-100 bg-white text-slate-400"
            }`}
          >
            {index + 1}. {CHECKOUT_STEP_LABELS[key]}
          </li>
        );
      })}
    </ol>
  );

  const body = (
      <div
        className={`space-y-4 text-sm ${embedded && !isActive ? "hidden" : ""}`}
        aria-hidden={embedded && !isActive ? true : undefined}
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            {embedded ? (
              <p className="text-sm font-bold text-[var(--text-primary)]">
                Checkout · {stepTitle}
              </p>
            ) : null}
            <p className="text-[var(--text-muted)]">
              Room <strong>{roomNumberOf(booking)}</strong> · {guestNameOf(booking)} ·{" "}
              {bookingStatus}
            </p>
            {embedded ? (
              <p className="mt-1 text-xs text-[var(--text-muted)]">
                Opening Checkout does not check out the guest. Review the bill
                and confirm explicitly.
              </p>
            ) : null}
          </div>
          {stepper}
        </div>

        {embedded ? null : totalsStrip}

        {kitchenCount > 0 ? (
          <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-amber-900">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              {kitchenCount} kitchen order(s) still PENDING/ACCEPTED. Checkout
              stays blocked until they are released or completed.
            </p>
          </div>
        ) : null}

        {step === CHECKOUT_STEPS.PREVIEW ? (
          <div className="space-y-3">
            <p className="text-[var(--text-muted)]">
              Review the authoritative folio bill before collecting payment.
              Opening this preview does not change totals. Food orders are
              synced once before the preview loads.
            </p>
            {previewBusy ? (
              <div className="flex items-center gap-2 rounded-xl border border-[var(--border)] px-4 py-8 text-[var(--text-muted)]">
                <Loader2 className="h-5 w-5 animate-spin" />
                Syncing folio and loading invoice preview…
              </div>
            ) : null}
            {previewError ? (
              <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-rose-800">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <div className="space-y-2">
                  <p>{previewError}</p>
                  <Button
                    type="button"
                    variant="secondary"
                    className="!px-3 !py-1.5 text-xs"
                    disabled={previewBusy || busy}
                    onClick={loadPreview}
                  >
                    Retry sync &amp; preview
                  </Button>
                </div>
              </div>
            ) : null}
            {invoiceHtml && !previewError ? (
              <iframe
                title="Final bill preview"
                srcDoc={invoiceHtml}
                className="h-[min(55vh,420px)] w-full rounded-xl border border-[var(--border)] bg-white"
              />
            ) : null}
            <div className="flex flex-wrap justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                disabled={previewBusy || busy || !receipt}
                onClick={printCurrent}
              >
                {printBusy ? (
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                ) : (
                  <Printer className="mr-1 h-4 w-4" />
                )}
                Print interim bill
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={previewBusy || busy}
                onClick={handleClose}
              >
                {embedded ? "Back to Overview" : "Cancel"}
              </Button>
              <Button
                type="button"
                disabled={
                  previewBusy ||
                  busy ||
                  syncFailed ||
                  !previewSynced ||
                  Boolean(previewError)
                }
                onClick={goToPaymentOrConfirm}
              >
                {shouldCollectPayment(dueAmount)
                  ? "Continue to payment"
                  : "Continue to confirm"}
              </Button>
            </div>
          </div>
        ) : null}

        {step === CHECKOUT_STEPS.PAYMENT ? (
          <form className="space-y-3" onSubmit={submitPayment}>
            <p className="text-[var(--text-muted)]">
              Collect CASH / UPI / MIXED against the outstanding balance. Partial
              payments are allowed. Overpayment is rejected. No Razorpay for
              guest room payments.
            </p>
            {isOutstandingCleared(dueAmount) ? (
              <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-emerald-800">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                <p>Outstanding is cleared. You can proceed to confirm checkout.</p>
              </div>
            ) : (
              <>
                <label className="block space-y-1">
                  <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                    Method
                  </span>
                  <select
                    className="w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm"
                    value={payForm.method}
                    disabled={payBusy || busy}
                    onChange={(e) =>
                      setPayForm((f) => ({ ...f, method: e.target.value }))
                    }
                  >
                    <option value="CASH">CASH</option>
                    <option value="UPI">UPI</option>
                    <option value="MIXED">MIXED (CASH + UPI)</option>
                  </select>
                </label>
                <Input
                  label="Amount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={payForm.amount}
                  disabled={payBusy || busy}
                  onChange={(e) =>
                    setPayForm((f) => ({ ...f, amount: e.target.value }))
                  }
                />
                {payForm.method === "MIXED" ? (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <Input
                      label="Cash amount"
                      type="number"
                      min="0"
                      step="0.01"
                      value={payForm.cashAmount}
                      disabled={payBusy || busy}
                      onChange={(e) =>
                        setPayForm((f) => ({ ...f, cashAmount: e.target.value }))
                      }
                    />
                    <Input
                      label="UPI amount"
                      type="number"
                      min="0"
                      step="0.01"
                      value={payForm.upiAmount}
                      disabled={payBusy || busy}
                      onChange={(e) =>
                        setPayForm((f) => ({ ...f, upiAmount: e.target.value }))
                      }
                    />
                  </div>
                ) : null}
                <Input
                  label="Note (optional)"
                  value={payForm.note}
                  disabled={payBusy || busy}
                  onChange={(e) =>
                    setPayForm((f) => ({ ...f, note: e.target.value }))
                  }
                />
              </>
            )}
            {payError ? (
              <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-rose-800">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <p>{payError}</p>
              </div>
            ) : null}
            <div className="flex flex-wrap justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                disabled={payBusy || busy}
                onClick={() => setStep(CHECKOUT_STEPS.PREVIEW)}
              >
                Back
              </Button>
              {isOutstandingCleared(dueAmount) ? (
                <Button
                  type="button"
                  disabled={payBusy || busy || kitchenCount > 0}
                  onClick={() => setStep(CHECKOUT_STEPS.CONFIRM)}
                >
                  Continue to confirm
                </Button>
              ) : (
                <Button type="submit" disabled={payBusy || busy || syncFailed}>
                  {payBusy ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Recording…
                    </>
                  ) : (
                    <>
                      <Wallet className="mr-2 h-4 w-4" />
                      Record payment
                    </>
                  )}
                </Button>
              )}
            </div>
          </form>
        ) : null}

        {step === CHECKOUT_STEPS.CONFIRM ? (
          <div className="space-y-3">
            <p>
              Payment settled. Are you sure you want to checkout this guest?
            </p>
            <div className="rounded-xl border border-[var(--border)] bg-slate-50 p-3 space-y-1">
              <p>
                Room <strong>{roomNumberOf(booking)}</strong> ·{" "}
                {guestNameOf(booking)}
              </p>
              <p>
                Outstanding:{" "}
                <strong>{formatMoney(dueAmount, currency)}</strong>
              </p>
              <p className="text-xs text-[var(--text-muted)]">
                Confirm calls the existing room checkout API once. The backend
                re-validates folio settlement, outstanding balance, and pending
                kitchen orders. On success the booking becomes CHECKED_OUT and
                the room becomes CLEANING (not AVAILABLE).
              </p>
              {!confirmAllowed ? (
                <p className="text-xs text-rose-700">
                  Checkout stays disabled until outstanding is zero, kitchen
                  orders are clear, and the booking is CHECKED_IN with an OPEN
                  folio.
                </p>
              ) : (
                <p className="text-xs text-emerald-700">
                  Ready for checkout. Folio will settle as part of this step.
                </p>
              )}
            </div>
            {confirmError ? (
              <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-rose-800">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <p>{confirmError}</p>
              </div>
            ) : null}
            <div className="flex flex-wrap justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                disabled={confirmBusy || busy}
                onClick={() =>
                  setStep(
                    shouldCollectPayment(dueAmount)
                      ? CHECKOUT_STEPS.PAYMENT
                      : CHECKOUT_STEPS.PREVIEW,
                  )
                }
              >
                Back
              </Button>
              <Button
                type="button"
                disabled={!confirmAllowed || confirmBusy || busy}
                onClick={submitCheckout}
              >
                {confirmBusy ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Checking out…
                  </>
                ) : (
                  <>
                    <LogOut className="mr-2 h-4 w-4" />
                    Confirm checkout
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : null}

        {step === CHECKOUT_STEPS.COMPLETE ? (
          <div className="space-y-3">
            <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-emerald-900">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <p className="font-semibold">Checkout completed</p>
                <p className="mt-1 text-xs">
                  Folio is settled. Booking is CHECKED_OUT. Room is CLEANING —
                  mark AVAILABLE from Rooms when ready. Room ordering follows
                  the existing QR revoke lifecycle.
                </p>
              </div>
            </div>
            {invoiceHtml ? (
              <iframe
                title="Final settled invoice"
                srcDoc={invoiceHtml}
                className="h-[min(45vh,360px)] w-full rounded-xl border border-[var(--border)] bg-white"
              />
            ) : null}
            <div className="flex flex-wrap justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                disabled={printBusy || !finalReceipt}
                onClick={printCurrent}
              >
                {printBusy ? (
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                ) : (
                  <Printer className="mr-1 h-4 w-4" />
                )}
                Print Final Invoice
              </Button>
              <Button type="button" onClick={handleClose}>
                Done
              </Button>
            </div>
          </div>
        ) : null}
      </div>
  );

  if (embedded) {
    if (!isOpen) return null;
    return body;
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={`Checkout · ${stepTitle}`}
      panelClassName="max-w-4xl"
    >
      {body}
    </Modal>
  );
}
