import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  AlertCircle,
  CheckCircle2,
  FileText,
  Loader2,
  LogOut,
  Printer,
  RefreshCw,
  Search,
  Wallet,
  X,
} from "lucide-react";
import { Navigate, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import Modal from "../../components/ui/Modal";
import {
  bookingIdOf,
  bookingRefOf,
  canManageFolioPayments,
  canViewFolio,
  createIdempotencyKey,
  formatBookingDate,
  formatDateTime,
  formatMoney,
  getFolioApiErrorMessage,
  guestNameOf,
  hasRoomFolioAccess,
  isFeatureNotAvailable,
  normalizeBookingStatus,
  normalizeFolioStatus,
  roomIdOf,
  roomNumberOf,
} from "./folioAccess";
import { printFolioInvoice } from "./printFolioInvoice";
import FolioCheckoutFlow from "./FolioCheckoutFlow.jsx";
import {
  DEFAULT_FOLIO_BILLING_TAB,
  FOLIO_BILLING_TAB_LABELS,
  FOLIO_BILLING_TAB_ORDER,
  FOLIO_BILLING_TABS,
  normalizeFolioBillingTab,
  shouldCloseRoomBillingAfterCheckout,
  tabForCheckoutIntent,
} from "./folioBillingTabs.js";
import {
  ROOM_MGMT_QUERY_DEFAULTS,
  syncAfterFolioMutation,
  useRoomManagementCacheSync,
} from "../rooms/roomManagementCache";
import { roomMgmtKeys } from "../rooms/roomManagementQueryKeys";
import {
  ROOM_FOLIO_BOOKING_QUERY,
  evaluateRoomFolioFocusBooking,
  resolveRoomFolioFocusBookingId,
} from "../bookings/bookingsCheckoutNav";

const api = axios.create({
  baseURL: import.meta.env.VITE_APP_API_BASE,
  withCredentials: true,
});

const FOLIO_STATUS_STYLES = {
  OPEN: "bg-emerald-50 text-emerald-700 border-emerald-200",
  SETTLING: "bg-amber-50 text-amber-800 border-amber-200",
  SETTLED: "bg-slate-100 text-slate-700 border-slate-300",
  VOID: "bg-rose-50 text-rose-700 border-rose-200",
  NONE: "bg-slate-50 text-slate-500 border-slate-200",
};

const LINE_LABELS = {
  ROOM_RENT: "Room rent",
  FOOD_ORDER: "Food order",
  HOTEL_SERVICE: "Hotel service",
  MANUAL_ADJUSTMENT: "Adjustment",
};

function SummaryCard({ label, value, accent }) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-white p-4 shadow-xs">
      <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
        {label}
      </p>
      <p
        className={`mt-2 text-2xl font-black ${
          accent || "text-[var(--text-primary)]"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function StatusBadge({ status }) {
  const canonical = normalizeFolioStatus(status);
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
        FOLIO_STATUS_STYLES[canonical] || FOLIO_STATUS_STYLES.NONE
      }`}
    >
      {canonical === "NONE" ? "No folio" : canonical}
    </span>
  );
}

function LineTable({ title, lines, currency }) {
  if (!lines.length) {
    return (
      <section className="rounded-2xl border border-[var(--border)] bg-white p-4">
        <h3 className="text-sm font-bold text-[var(--text-primary)]">{title}</h3>
        <p className="mt-2 text-sm text-[var(--text-muted)]">None</p>
      </section>
    );
  }
  return (
    <section className="rounded-2xl border border-[var(--border)] bg-white p-4">
      <h3 className="text-sm font-bold text-[var(--text-primary)]">{title}</h3>
      <div className="mt-3 overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] text-xs uppercase tracking-wider text-[var(--text-muted)]">
              <th className="py-2 pr-3 font-semibold">Description</th>
              <th className="py-2 pr-3 font-semibold">Type</th>
              <th className="py-2 pr-3 font-semibold">Amount</th>
              <th className="py-2 pr-3 font-semibold">Status</th>
              <th className="py-2 pr-3 font-semibold">When</th>
              <th className="py-2 font-semibold">Ref</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line) => (
              <tr
                key={line.id || line._id}
                className="border-b border-[var(--border)]/60 last:border-0"
              >
                <td className="py-2.5 pr-3 font-medium text-[var(--text-primary)]">
                  {line.description || "—"}
                </td>
                <td className="py-2.5 pr-3 text-[var(--text-muted)]">
                  {LINE_LABELS[line.sourceType] || line.sourceType}
                </td>
                <td className="py-2.5 pr-3 font-semibold">
                  {formatMoney(line.total ?? line.chargeableAmount, currency)}
                </td>
                <td className="py-2.5 pr-3">{line.paymentStatus || "—"}</td>
                <td className="py-2.5 pr-3 text-[var(--text-muted)]">
                  {formatDateTime(line.createdAt)}
                </td>
                <td className="py-2.5 text-xs text-[var(--text-muted)]">
                  {line.sourceType === "FOOD_ORDER"
                    ? String(line.sourceId || "").slice(-8) || "—"
                    : line.sourceId || "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default function FolioManagement() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const restaurantId = user?.restaurantId?._id || user?.restaurantId || null;
  const entitled = hasRoomFolioAccess(user);
  const canView = canViewFolio(user);
  const canPay = canManageFolioPayments(user);

  useRoomManagementCacheSync({ enabled: entitled && canView });

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ACTIVE");
  const [selectedBookingId, setSelectedBookingId] = useState(null);
  const [billingTab, setBillingTab] = useState(DEFAULT_FOLIO_BILLING_TAB);
  const focusHandledRef = useRef(null);
  const checkoutIntentHandledRef = useRef(null);
  const billingTabRef = useRef(DEFAULT_FOLIO_BILLING_TAB);
  billingTabRef.current = billingTab;
  const [popup, setPopup] = useState({ open: false, message: "", tone: "success" });
  const [payOpen, setPayOpen] = useState(false);
  const [serviceOpen, setServiceOpen] = useState(false);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [receiptSummary, setReceiptSummary] = useState(null);
  const [printBusy, setPrintBusy] = useState(false);

  const [payForm, setPayForm] = useState({
    method: "CASH",
    amount: "",
    cashAmount: "",
    upiAmount: "",
    note: "",
  });
  const idempotencyKeyRef = useRef(createIdempotencyKey());

  const [serviceForm, setServiceForm] = useState({
    description: "",
    quantity: "1",
    unitPrice: "",
  });
  const [adjustForm, setAdjustForm] = useState({
    description: "",
    amount: "",
  });

  const showPopup = useCallback((message, tone = "success") => {
    setPopup({ open: true, message, tone });
  }, []);

  useEffect(() => {
    if (!popup.open) return undefined;
    const timer = setTimeout(() => {
      setPopup((prev) => ({ ...prev, open: false }));
    }, 4000);
    return () => clearTimeout(timer);
  }, [popup.open]);

  const bookingsQuery = useQuery({
    queryKey: roomMgmtKeys.bookingsByRestaurant(restaurantId),
    queryFn: async () => {
      const response = await api.get("/rooms/bookings");
      return response.data?.data ?? [];
    },
    enabled: Boolean(restaurantId && entitled && canView),
    staleTime: 20_000,
    ...ROOM_MGMT_QUERY_DEFAULTS,
    retry: (failureCount, err) => {
      if (isFeatureNotAvailable(err)) return false;
      return failureCount < 1;
    },
  });

  const bookings = useMemo(
    () => (Array.isArray(bookingsQuery.data) ? bookingsQuery.data : []),
    [bookingsQuery.data],
  );

  const clearFocusBookingParam = useCallback(() => {
    const hadQuery = searchParams.has(ROOM_FOLIO_BOOKING_QUERY);
    const hadState = Boolean(location.state?.bookingId);
    if (!hadQuery && !hadState) return;
    const next = new URLSearchParams(searchParams);
    next.delete(ROOM_FOLIO_BOOKING_QUERY);
    if (hadState) {
      navigate(
        {
          pathname: location.pathname,
          search: next.toString() ? `?${next}` : "",
        },
        { replace: true, state: {} },
      );
    } else {
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams, location.state, location.pathname, navigate]);

  // Deep-link from Bookings "Checkout" — open folio panel; never auto-checkout.
  useEffect(() => {
    if (!entitled || !canView) return;
    const focusId = resolveRoomFolioFocusBookingId({
      searchParams,
      locationState: location.state,
    });
    if (!focusId) {
      focusHandledRef.current = null;
      return;
    }
    if (focusHandledRef.current === focusId) return;

    const booking = bookings.find((b) => bookingIdOf(b) === focusId) || null;
    const decision = evaluateRoomFolioFocusBooking({
      bookingId: focusId,
      booking,
      bookingsLoaded: Boolean(bookingsQuery.isSuccess),
    });

    if (decision.action === "wait" || decision.action === "none") return;

    focusHandledRef.current = focusId;

    if (decision.action === "error") {
      showPopup(decision.message, "error");
      clearFocusBookingParam();
      return;
    }

    if (decision.bookingStatus === "CHECKED_OUT") {
      setStatusFilter("CHECKED_OUT");
    } else if (decision.bookingStatus === "CHECKED_IN") {
      setStatusFilter("CHECKED_IN");
    } else {
      setStatusFilter("ACTIVE");
    }

    setSelectedBookingId(focusId);
    if (decision.action === "open-with-warning") {
      showPopup(decision.message, "error");
    }
    clearFocusBookingParam();
  }, [
    entitled,
    canView,
    searchParams,
    location.state,
    bookings,
    bookingsQuery.isSuccess,
    showPopup,
    clearFocusBookingParam,
  ]);

  const listCandidates = useMemo(() => {
    return bookings.filter((b) => {
      const st = normalizeBookingStatus(b.bookingStatus);
      return ["CONFIRMED", "CHECKED_IN", "CHECKED_OUT"].includes(st);
    });
  }, [bookings]);

  const folioSummariesQuery = useQuery({
    queryKey: [
      ...roomMgmtKeys.folioSummariesByRestaurant(restaurantId),
      listCandidates.map((b) => bookingIdOf(b)).join(","),
    ],
    queryFn: async () => {
      const entries = await Promise.all(
        listCandidates.map(async (booking) => {
          const id = bookingIdOf(booking);
          try {
            const res = await api.get(`/rooms/bookings/${id}/folio`);
            return [id, { ok: true, data: res.data?.data || null }];
          } catch (error) {
            const code = error?.response?.data?.code;
            if (code === "FOLIO_NOT_FOUND") {
              return [id, { ok: false, missing: true }];
            }
            return [
              id,
              {
                ok: false,
                error: getFolioApiErrorMessage(error),
              },
            ];
          }
        }),
      );
      return Object.fromEntries(entries);
    },
    enabled: Boolean(
      restaurantId &&
        entitled &&
        canView &&
        listCandidates.length > 0 &&
        !bookingsQuery.isLoading,
    ),
    staleTime: 15_000,
    ...ROOM_MGMT_QUERY_DEFAULTS,
  });

  const folioDetailQuery = useQuery({
    queryKey: roomMgmtKeys.folioByBooking(restaurantId, selectedBookingId),
    queryFn: async () => {
      try {
        const res = await api.get(
          `/rooms/bookings/${selectedBookingId}/folio`,
        );
        return res.data?.data;
      } catch (error) {
        if (
          error?.response?.data?.code === "FOLIO_NOT_FOUND" &&
          canPay
        ) {
          const created = await api.post(
            `/rooms/bookings/${selectedBookingId}/folio`,
          );
          return created.data?.data;
        }
        throw error;
      }
    },
    // selectedBookingId is a string id — must coerce to boolean for React Query
    enabled: Boolean(
      restaurantId && entitled && canView && selectedBookingId,
    ),
    staleTime: 5_000,
    ...ROOM_MGMT_QUERY_DEFAULTS,
    retry: false,
  });

  const invalidateFolioRelated = useCallback(async () => {
    await syncAfterFolioMutation(queryClient, {
      restaurantId,
      bookingId: selectedBookingId,
      includeOrders: true,
    });
  }, [queryClient, restaurantId, selectedBookingId]);

  const syncMutation = useMutation({
    mutationFn: () =>
      api.post(`/rooms/bookings/${selectedBookingId}/folio/sync-orders`),
    onSuccess: async () => {
      await invalidateFolioRelated();
      if (billingTabRef.current !== FOLIO_BILLING_TABS.CHECKOUT) {
        showPopup("Folio synced with rent and room orders");
      }
    },
    onError: (error) => {
      if (billingTabRef.current !== FOLIO_BILLING_TABS.CHECKOUT) {
        showPopup(getFolioApiErrorMessage(error), "error");
      }
    },
  });

  const selectBillingTab = useCallback((tab) => {
    setBillingTab(normalizeFolioBillingTab(tab));
  }, []);

  const closeRoomBillingModal = useCallback(() => {
    setSelectedBookingId(null);
    setBillingTab(DEFAULT_FOLIO_BILLING_TAB);
    setReceiptSummary(null);
  }, []);

  const paymentMutation = useMutation({
    mutationFn: (payload) =>
      api.post(
        `/rooms/bookings/${selectedBookingId}/folio/payments`,
        payload,
      ),
    onSuccess: async (res) => {
      const data = res.data?.data;
      setReceiptSummary({
        replayed: data?.replayed,
        payment: data?.payment,
        paymentAllocations: data?.paymentAllocations,
        folio: data?.folio,
        message: res.data?.message,
      });
      if (payOpen) {
        setPayOpen(false);
        setPayForm({
          method: "CASH",
          amount: "",
          cashAmount: "",
          upiAmount: "",
          note: "",
        });
        idempotencyKeyRef.current = createIdempotencyKey();
        showPopup(
          data?.replayed
            ? "Payment already recorded (idempotent replay)"
            : "Folio payment recorded",
        );
      }
      await invalidateFolioRelated();
    },
    onError: (error) => {
      if (payOpen) {
        showPopup(getFolioApiErrorMessage(error), "error");
      }
    },
  });

  const serviceMutation = useMutation({
    mutationFn: (payload) =>
      api.post(
        `/rooms/bookings/${selectedBookingId}/folio/services`,
        payload,
      ),
    onSuccess: async () => {
      setServiceOpen(false);
      setServiceForm({ description: "", quantity: "1", unitPrice: "" });
      await invalidateFolioRelated();
      showPopup("Hotel service added to folio");
    },
    onError: (error) => {
      showPopup(getFolioApiErrorMessage(error), "error");
    },
  });

  const adjustMutation = useMutation({
    mutationFn: (payload) =>
      api.post(
        `/rooms/bookings/${selectedBookingId}/folio/adjustments`,
        payload,
      ),
    onSuccess: async () => {
      setAdjustOpen(false);
      setAdjustForm({ description: "", amount: "" });
      await invalidateFolioRelated();
      showPopup("Folio adjustment recorded");
    },
    onError: (error) => {
      showPopup(getFolioApiErrorMessage(error), "error");
    },
  });

  const checkoutMutation = useMutation({
    mutationFn: ({ roomId, bookingId }) =>
      api.post(`/rooms/${roomId}/checkout`, { bookingId }),
    onSuccess: async () => {
      await invalidateFolioRelated();
      // Room Billing modal closes only after wizard confirms success + refresh
      // (onCheckoutSuccess). Keep modal open on failure / in-flight submit.
      showPopup("Checkout completed — folio settled");
    },
  });

  const selectedBooking = useMemo(
    () =>
      bookings.find((b) => bookingIdOf(b) === selectedBookingId) ||
      folioDetailQuery.data?.booking ||
      null,
    [bookings, selectedBookingId, folioDetailQuery.data],
  );

  const folioBundle = folioDetailQuery.data;
  const folio = folioBundle?.folio;
  const currency = folio?.currency || "INR";
  const lines = useMemo(
    () => (Array.isArray(folioBundle?.lines) ? folioBundle.lines : []),
    [folioBundle],
  );
  const payments = useMemo(
    () => (Array.isArray(folioBundle?.payments) ? folioBundle.payments : []),
    [folioBundle],
  );
  const allocations = useMemo(
    () =>
      Array.isArray(folioBundle?.allocations) ? folioBundle.allocations : [],
    [folioBundle],
  );
  const pendingKitchen = useMemo(
    () =>
      Array.isArray(folioBundle?.pendingKitchenOrders)
        ? folioBundle.pendingKitchenOrders
        : [],
    [folioBundle],
  );

  const linesByType = useMemo(() => {
    const groups = {
      ROOM_RENT: [],
      FOOD_ORDER: [],
      HOTEL_SERVICE: [],
      MANUAL_ADJUSTMENT: [],
    };
    for (const line of lines) {
      const key = line.sourceType;
      if (groups[key]) groups[key].push(line);
      else groups.MANUAL_ADJUSTMENT.push(line);
    }
    return groups;
  }, [lines]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return listCandidates.filter((booking) => {
      const st = normalizeBookingStatus(booking.bookingStatus);
      if (statusFilter === "ACTIVE" && !["CONFIRMED", "CHECKED_IN"].includes(st)) {
        return false;
      }
      if (statusFilter === "CHECKED_IN" && st !== "CHECKED_IN") return false;
      if (statusFilter === "CHECKED_OUT" && st !== "CHECKED_OUT") return false;
      if (!q) return true;
      const hay = [
        roomNumberOf(booking),
        guestNameOf(booking),
        bookingRefOf(booking),
        booking.mobileNumber,
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [listCandidates, search, statusFilter]);

  const folioMutable =
    folio &&
    normalizeFolioStatus(folio.status) === "OPEN" &&
    Number(folio.dueAmount) >= 0;

  const canCheckout =
    canPay &&
    selectedBooking &&
    normalizeBookingStatus(selectedBooking.bookingStatus) === "CHECKED_IN" &&
    folio &&
    normalizeFolioStatus(folio.status) === "OPEN";

  // Reset billing tab when opening a different folio; default Overview.
  useEffect(() => {
    if (!selectedBookingId) {
      setBillingTab(DEFAULT_FOLIO_BILLING_TAB);
    }
  }, [selectedBookingId]);

  // Bookings "Checkout" passes intent — open folio on Checkout tab
  // (never auto-calls checkout API).
  useEffect(() => {
    if (!entitled || !canView || !canPay) return;
    const intent = location.state?.intent;
    const focusId = selectedBookingId;
    if (intent !== "checkout" || !focusId) return;
    if (checkoutIntentHandledRef.current === focusId) return;
    if (!selectedBooking) return;
    if (normalizeBookingStatus(selectedBooking.bookingStatus) !== "CHECKED_IN") {
      checkoutIntentHandledRef.current = focusId;
      showPopup(
        "Checkout workflow is only available for checked-in stays.",
        "error",
      );
      navigate(
        { pathname: location.pathname, search: location.search },
        { replace: true, state: {} },
      );
      return;
    }
    if (folioDetailQuery.isLoading) return;
    if (!folio) return;
    if (normalizeFolioStatus(folio.status) !== "OPEN") {
      checkoutIntentHandledRef.current = focusId;
      showPopup(
        "Checkout workflow requires an OPEN folio for this booking.",
        "error",
      );
      navigate(
        { pathname: location.pathname, search: location.search },
        { replace: true, state: {} },
      );
      return;
    }
    checkoutIntentHandledRef.current = focusId;
    selectBillingTab(tabForCheckoutIntent(intent));
    navigate(
      { pathname: location.pathname, search: location.search },
      { replace: true, state: {} },
    );
  }, [
    entitled,
    canView,
    canPay,
    location.state,
    location.pathname,
    location.search,
    selectedBookingId,
    selectedBooking,
    folio,
    folioDetailQuery.isLoading,
    navigate,
    showPopup,
    selectBillingTab,
  ]);

  const handlePrintInvoice = useCallback(async () => {
    if (!selectedBookingId || !canView || printBusy) return;
    const status = normalizeFolioStatus(folio?.status);
    if (status === "SETTLING") {
      showPopup(
        "Invoice is unavailable while folio settlement is in progress. Wait for checkout to finish.",
        "error",
      );
      return;
    }
    if (status === "VOID") {
      showPopup(
        "This folio has been voided. A guest invoice cannot be generated.",
        "error",
      );
      return;
    }
    if (status !== "OPEN" && status !== "SETTLED") {
      showPopup("Invoice is unavailable for this folio status.", "error");
      return;
    }

    setPrintBusy(true);
    try {
      const res = await api.get(
        `/rooms/bookings/${selectedBookingId}/folio/receipt`,
      );
      const snapshot = res.data?.data;
      if (!snapshot) {
        throw new Error("Invoice receipt was empty");
      }
      await printFolioInvoice(snapshot, {
        onError: (err) => {
          showPopup(err?.message || "Could not open print dialog", "error");
        },
      });
      showPopup(
        status === "SETTLED"
          ? "Final invoice sent to printer"
          : "Interim bill sent to printer",
      );
    } catch (error) {
      showPopup(getFolioApiErrorMessage(error, "Could not load invoice"), "error");
    } finally {
      setPrintBusy(false);
    }
  }, [
    selectedBookingId,
    canView,
    printBusy,
    folio?.status,
    showPopup,
  ]);

  const openPayment = () => {
    const due = Number(folio?.dueAmount) || 0;
    idempotencyKeyRef.current = createIdempotencyKey();
    setPayForm({
      method: "CASH",
      amount: due > 0 ? String(due) : "",
      cashAmount: "",
      upiAmount: "",
      note: "",
    });
    setReceiptSummary(null);
    setPayOpen(true);
  };

  const submitPayment = (event) => {
    event.preventDefault();
    if (paymentMutation.isPending) return;

    const method = String(payForm.method || "").toUpperCase();
    const amount = Number(payForm.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      showPopup("Payment amount must be greater than zero", "error");
      return;
    }
    const due = Number(folio?.dueAmount) || 0;
    if (amount > due + 0.001) {
      showPopup("Payment cannot exceed outstanding balance", "error");
      return;
    }

    const payload = {
      method,
      amount,
      idempotencyKey: idempotencyKeyRef.current,
      note: payForm.note?.trim() || undefined,
    };

    if (method === "MIXED") {
      const cashAmount = Number(payForm.cashAmount);
      const upiAmount = Number(payForm.upiAmount);
      if (
        !Number.isFinite(cashAmount) ||
        !Number.isFinite(upiAmount) ||
        cashAmount < 0 ||
        upiAmount < 0
      ) {
        showPopup("MIXED requires valid cashAmount and upiAmount", "error");
        return;
      }
      if (Number((cashAmount + upiAmount).toFixed(2)) !== Number(amount.toFixed(2))) {
        showPopup("MIXED cashAmount + upiAmount must equal amount", "error");
        return;
      }
      payload.cashAmount = cashAmount;
      payload.upiAmount = upiAmount;
    }

    paymentMutation.mutate(payload);
  };

  const submitService = (event) => {
    event.preventDefault();
    if (serviceMutation.isPending) return;
    const quantity = Number(serviceForm.quantity);
    const unitPrice = Number(serviceForm.unitPrice);
    if (!serviceForm.description.trim()) {
      showPopup("Service description is required", "error");
      return;
    }
    if (!Number.isFinite(quantity) || quantity <= 0) {
      showPopup("quantity must be a positive number", "error");
      return;
    }
    if (!Number.isFinite(unitPrice) || unitPrice < 0) {
      showPopup("unitPrice must be a non-negative number", "error");
      return;
    }
    serviceMutation.mutate({
      description: serviceForm.description.trim(),
      quantity,
      unitPrice,
    });
  };

  const submitAdjust = (event) => {
    event.preventDefault();
    if (adjustMutation.isPending) return;
    const amount = Number(adjustForm.amount);
    if (!adjustForm.description.trim()) {
      showPopup("Adjustment description is required", "error");
      return;
    }
    if (!Number.isFinite(amount) || amount === 0) {
      showPopup("adjustment amount must be a non-zero number", "error");
      return;
    }
    adjustMutation.mutate({
      description: adjustForm.description.trim(),
      amount,
    });
  };

  if (!entitled || !canView) {
    return <Navigate to="/" replace />;
  }

  const featureBlocked = isFeatureNotAvailable(bookingsQuery.error);
  const busy =
    printBusy ||
    syncMutation.isPending ||
    paymentMutation.isPending ||
    serviceMutation.isPending ||
    adjustMutation.isPending ||
    checkoutMutation.isPending;

  return (
    <div className="space-y-6">
      {popup.open && (
        <div
          className={`fixed right-4 top-20 z-[60] max-w-sm rounded-xl border px-4 py-3 text-sm shadow-lg ${
            popup.tone === "error"
              ? "border-rose-200 bg-rose-50 text-rose-800"
              : "border-emerald-200 bg-emerald-50 text-emerald-800"
          }`}
        >
          <div className="flex items-start gap-2">
            {popup.tone === "error" ? (
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            ) : (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            )}
            <p>{popup.message}</p>
            <button
              type="button"
              className="ml-auto"
              onClick={() => setPopup((p) => ({ ...p, open: false }))}
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-[var(--text-primary)]">
            Room Billing
          </h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            View stay charges, record CASH / UPI / MIXED payments, and checkout.
            Amounts come from the backend folio APIs.
          </p>
        </div>
        <Button
          type="button"
          variant="secondary"
          disabled={bookingsQuery.isFetching || folioSummariesQuery.isFetching}
          onClick={() => {
            bookingsQuery.refetch();
            folioSummariesQuery.refetch();
            if (selectedBookingId) folioDetailQuery.refetch();
          }}
        >
          <RefreshCw
            className={`mr-2 h-4 w-4 ${
              bookingsQuery.isFetching ? "animate-spin" : ""
            }`}
          />
          Refresh
        </Button>
      </div>

      {featureBlocked ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">
          {getFolioApiErrorMessage(bookingsQuery.error)}
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-3">
        <SummaryCard
          label="Eligible bookings"
          value={listCandidates.length}
        />
        <SummaryCard
          label="Checked in"
          value={
            listCandidates.filter(
              (b) =>
                normalizeBookingStatus(b.bookingStatus) === "CHECKED_IN",
            ).length
          }
          accent="text-emerald-700"
        />
        <SummaryCard
          label="Showing"
          value={filteredRows.length}
        />
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-[var(--border)] bg-white p-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            className="w-full rounded-xl border border-[var(--border)] bg-white py-2.5 pl-9 pr-3 text-sm focus:border-[var(--primary)] focus:outline-none focus:ring-4 focus:ring-[rgba(244,63,94,0.12)]"
            placeholder="Search room, guest, booking ref (client-side)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search folios"
          />
        </div>
        <select
          className="rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm font-medium"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="ACTIVE">Active stays</option>
          <option value="CHECKED_IN">Checked in</option>
          <option value="CHECKED_OUT">Checked out</option>
          <option value="ALL">All eligible</option>
        </select>
      </div>

      <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-white">
        {bookingsQuery.isLoading ? (
          <div className="flex min-h-[200px] items-center justify-center gap-2 text-sm text-[var(--text-muted)]">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading bookings…
          </div>
        ) : bookingsQuery.isError && !featureBlocked ? (
          <div className="flex min-h-[200px] flex-col items-center justify-center gap-2 p-6 text-center text-sm text-rose-700">
            <AlertCircle className="h-6 w-6" />
            {getFolioApiErrorMessage(bookingsQuery.error)}
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="flex min-h-[200px] flex-col items-center justify-center gap-2 p-6 text-center text-sm text-[var(--text-muted)]">
            <FileText className="h-6 w-6" />
            No bookings match this filter. Folios are keyed by booking — there
            is no separate list-folios API.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wider text-[var(--text-muted)]">
                <tr>
                  <th className="px-4 py-3 font-semibold">Room</th>
                  <th className="px-4 py-3 font-semibold">Guest</th>
                  <th className="px-4 py-3 font-semibold">Booking</th>
                  <th className="px-4 py-3 font-semibold">Stay</th>
                  <th className="px-4 py-3 font-semibold">Folio</th>
                  <th className="px-4 py-3 font-semibold">Charges</th>
                  <th className="px-4 py-3 font-semibold">Paid</th>
                  <th className="px-4 py-3 font-semibold">Due</th>
                  <th className="px-4 py-3 font-semibold" />
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((booking) => {
                  const id = bookingIdOf(booking);
                  const summary = folioSummariesQuery.data?.[id];
                  const f = summary?.ok ? summary.data?.folio : null;
                  return (
                    <tr
                      key={id}
                      className="border-t border-[var(--border)] hover:bg-slate-50/80"
                    >
                      <td className="px-4 py-3 font-semibold">
                        {roomNumberOf(booking)}
                      </td>
                      <td className="px-4 py-3">{guestNameOf(booking)}</td>
                      <td className="px-4 py-3 text-xs text-[var(--text-muted)]">
                        {bookingRefOf(booking)}
                        <div className="mt-0.5 font-medium text-[var(--text-primary)]">
                          {normalizeBookingStatus(booking.bookingStatus)}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-[var(--text-muted)]">
                        {formatBookingDate(booking.checkInDate)} →{" "}
                        {formatBookingDate(booking.checkOutDate)}
                      </td>
                      <td className="px-4 py-3">
                        {summary?.missing ? (
                          <StatusBadge status="NONE" />
                        ) : f ? (
                          <StatusBadge status={f.status} />
                        ) : summary?.error ? (
                          <span className="text-xs text-rose-600">Error</span>
                        ) : folioSummariesQuery.isLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin text-[var(--text-muted)]" />
                        ) : (
                          <StatusBadge status="NONE" />
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {f ? formatMoney(f.grandTotal, f.currency) : "—"}
                      </td>
                      <td className="px-4 py-3">
                        {f ? formatMoney(f.paidAmount, f.currency) : "—"}
                      </td>
                      <td className="px-4 py-3 font-semibold">
                        {f ? formatMoney(f.dueAmount, f.currency) : "—"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          type="button"
                          className="!px-3 !py-1.5 text-xs"
                          onClick={() => setSelectedBookingId(id)}
                        >
                          Open folio
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail panel — internal tabs; checkout never auto-runs on tab select */}
      <Modal
        isOpen={Boolean(selectedBookingId)}
        onClose={() => {
          if (busy || checkoutMutation.isPending) return;
          closeRoomBillingModal();
        }}
        title={
          folio?.folioNumber
            ? `Folio ${folio.folioNumber}`
            : "Room folio"
        }
        panelClassName="max-w-4xl"
      >
        {folioDetailQuery.isLoading ? (
          <div className="flex min-h-[160px] items-center justify-center gap-2 text-sm text-[var(--text-muted)]">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading folio…
          </div>
        ) : folioDetailQuery.isError ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
            {getFolioApiErrorMessage(folioDetailQuery.error)}
            {!canPay &&
            folioDetailQuery.error?.response?.data?.code ===
              "FOLIO_NOT_FOUND" ? (
              <p className="mt-2">
                Only OWNER/MANAGER can initialize a folio (POST). Ask a manager
                to open it first.
              </p>
            ) : null}
          </div>
        ) : folio ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={folio.status} />
                  <span className="text-[var(--text-muted)]">
                    Room {roomNumberOf(selectedBooking)} ·{" "}
                    {guestNameOf(selectedBooking)}
                  </span>
                </div>
                <p className="text-xs text-[var(--text-muted)]">
                  Booking {bookingRefOf(selectedBooking)} ·{" "}
                  {normalizeBookingStatus(selectedBooking?.bookingStatus)} ·{" "}
                  {formatBookingDate(selectedBooking?.checkInDate)} →{" "}
                  {formatBookingDate(selectedBooking?.checkOutDate)}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {canView &&
                ["OPEN", "SETTLED"].includes(
                  normalizeFolioStatus(folio.status),
                ) ? (
                  <Button
                    type="button"
                    variant="secondary"
                    className="!px-3 !py-1.5 text-xs"
                    disabled={busy}
                    onClick={() => handlePrintInvoice()}
                  >
                    {printBusy ? (
                      <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Printer className="mr-1 h-3.5 w-3.5" />
                    )}
                    {normalizeFolioStatus(folio.status) === "SETTLED"
                      ? "Print invoice"
                      : "Print interim bill"}
                  </Button>
                ) : null}
                <Button
                  type="button"
                  variant="secondary"
                  className="!px-3 !py-1.5 text-xs"
                  disabled={busy || normalizeFolioStatus(folio.status) !== "OPEN"}
                  onClick={() => syncMutation.mutate()}
                >
                  {syncMutation.isPending ? (
                    <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="mr-1 h-3.5 w-3.5" />
                  )}
                  Sync orders
                </Button>
                {canView && normalizeFolioStatus(folio.status) === "OPEN" ? (
                  <Button
                    type="button"
                    variant="secondary"
                    className="!px-3 !py-1.5 text-xs"
                    disabled={busy}
                    onClick={() => setServiceOpen(true)}
                  >
                    Add service
                  </Button>
                ) : null}
                {canPay && normalizeFolioStatus(folio.status) === "OPEN" ? (
                  <Button
                    type="button"
                    variant="secondary"
                    className="!px-3 !py-1.5 text-xs"
                    disabled={busy}
                    onClick={() => setAdjustOpen(true)}
                  >
                    Adjustment
                  </Button>
                ) : null}
                {canPay &&
                normalizeFolioStatus(folio.status) === "OPEN" &&
                Number(folio.dueAmount) > 0 ? (
                  <Button
                    type="button"
                    className="!px-3 !py-1.5 text-xs"
                    disabled={busy}
                    onClick={openPayment}
                  >
                    <Wallet className="mr-1 h-3.5 w-3.5" />
                    Record payment
                  </Button>
                ) : null}
                {canCheckout ? (
                  <Button
                    type="button"
                    variant="secondary"
                    className="!px-3 !py-1.5 text-xs"
                    disabled={busy}
                    onClick={() => selectBillingTab(FOLIO_BILLING_TABS.CHECKOUT)}
                  >
                    <LogOut className="mr-1 h-3.5 w-3.5" />
                    Checkout
                  </Button>
                ) : null}
              </div>
            </div>

            {normalizeFolioStatus(folio.status) === "SETTLING" ? (
              <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                Invoice printing is paused while settlement is in progress. Print
                the final invoice after checkout completes.
              </p>
            ) : null}
            {normalizeFolioStatus(folio.status) === "VOID" ? (
              <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
                This folio is voided. A guest invoice cannot be generated.
              </p>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <SummaryCard
                label="Grand total"
                value={formatMoney(folio.grandTotal, currency)}
              />
              <SummaryCard
                label="Paid"
                value={formatMoney(folio.paidAmount, currency)}
                accent="text-emerald-700"
              />
              <SummaryCard
                label="Outstanding"
                value={formatMoney(folio.dueAmount, currency)}
                accent={
                  Number(folio.dueAmount) > 0
                    ? "text-rose-700"
                    : "text-emerald-700"
                }
              />
              <SummaryCard
                label="Tax / discount"
                value={`${formatMoney(folio.taxTotal, currency)} / ${formatMoney(folio.discountTotal, currency)}`}
              />
            </div>

            <div
              role="tablist"
              aria-label="Room billing sections"
              className="flex flex-wrap gap-1 rounded-xl border border-[var(--border)] bg-slate-50 p-1"
            >
              {FOLIO_BILLING_TAB_ORDER.map((tabId) => {
                const active = billingTab === tabId;
                return (
                  <button
                    key={tabId}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    className={`rounded-lg px-3 py-2 text-xs font-semibold transition-colors sm:text-sm ${
                      active
                        ? "bg-white text-[var(--text-primary)] shadow-sm border border-[var(--border)]"
                        : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                    }`}
                    onClick={() => selectBillingTab(tabId)}
                  >
                    {FOLIO_BILLING_TAB_LABELS[tabId]}
                  </button>
                );
              })}
            </div>

            <div role="tabpanel" className="space-y-4">
              {billingTab === FOLIO_BILLING_TABS.OVERVIEW ? (
                <>
                  {Number(folio.dueAmount) > 0 &&
                  normalizeFolioStatus(folio.status) === "OPEN" ? (
                    <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                      Partial payments are supported. Pay any amount up to the
                      outstanding balance. Overpayment is rejected by the
                      backend.
                    </p>
                  ) : null}
                  <LineTable
                    title="Room rent"
                    lines={linesByType.ROOM_RENT}
                    currency={currency}
                  />
                  <LineTable
                    title="Hotel services"
                    lines={linesByType.HOTEL_SERVICE}
                    currency={currency}
                  />
                  <LineTable
                    title="Manual adjustments"
                    lines={linesByType.MANUAL_ADJUSTMENT}
                    currency={currency}
                  />
                  {!folioMutable &&
                  normalizeFolioStatus(folio.status) === "SETTLED" ? (
                    <p className="text-xs text-[var(--text-muted)]">
                      Settled folios are immutable. Do not reopen or reuse for a
                      new stay.
                    </p>
                  ) : null}
                </>
              ) : null}

              {billingTab === FOLIO_BILLING_TABS.FOOD_ORDERS ? (
                <>
                  {pendingKitchen.length > 0 ? (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                      <p className="font-semibold">
                        Pending kitchen orders ({pendingKitchen.length})
                      </p>
                      <ul className="mt-1 list-inside list-disc text-xs">
                        {pendingKitchen.map((o) => (
                          <li key={o._id || o.orderId}>
                            {o.orderId || String(o._id).slice(-6)} · {o.status} ·{" "}
                            {o.paymentStatus} · {formatMoney(o.total, currency)}
                          </li>
                        ))}
                      </ul>
                      <p className="mt-2 text-xs">
                        Checkout is blocked while kitchen orders remain PENDING
                        or ACCEPTED.
                      </p>
                    </div>
                  ) : (
                    <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
                      No PENDING/ACCEPTED kitchen orders for this stay.
                    </p>
                  )}
                  <LineTable
                    title="Food orders"
                    lines={linesByType.FOOD_ORDER}
                    currency={currency}
                  />
                  <p className="text-xs text-[var(--text-muted)]">
                    Food charges come from synced room orders. Use Sync orders
                    to refresh folio lines from the kitchen.
                  </p>
                </>
              ) : null}

              {billingTab === FOLIO_BILLING_TABS.PAYMENTS ? (
                <>
                  {Number(folio.dueAmount) > 0 &&
                  normalizeFolioStatus(folio.status) === "OPEN" ? (
                    <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                      Outstanding{" "}
                      {formatMoney(folio.dueAmount, currency)}. CASH / UPI /
                      MIXED only — no online gateway.
                    </p>
                  ) : (
                    <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
                      Outstanding is cleared for this folio.
                    </p>
                  )}
                  <section className="rounded-2xl border border-[var(--border)] bg-white p-4">
                    <h3 className="text-sm font-bold text-[var(--text-primary)]">
                      Payment history
                    </h3>
                    {payments.length === 0 ? (
                      <p className="mt-2 text-sm text-[var(--text-muted)]">
                        No payments recorded
                      </p>
                    ) : (
                      <div className="mt-3 space-y-2">
                        {payments.map((p) => (
                          <div
                            key={p.id || p._id}
                            className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--border)] px-3 py-2 text-sm"
                          >
                            <div>
                              <span className="font-semibold">{p.method}</span>
                              <span className="ml-2 text-[var(--text-muted)]">
                                {formatDateTime(p.createdAt)}
                              </span>
                              {p.note ? (
                                <p className="text-xs text-[var(--text-muted)]">
                                  {p.note}
                                </p>
                              ) : null}
                            </div>
                            <div className="text-right">
                              <p className="font-bold">
                                {formatMoney(p.amount, currency)}
                              </p>
                              {p.method === "MIXED" ? (
                                <p className="text-xs text-[var(--text-muted)]">
                                  Cash {formatMoney(p.cashAmount, currency)} ·
                                  UPI {formatMoney(p.upiAmount, currency)}
                                </p>
                              ) : null}
                              <p className="text-xs text-[var(--text-muted)]">
                                {p.allocationStatus || "—"}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>

                  <section className="rounded-2xl border border-[var(--border)] bg-white p-4">
                    <h3 className="text-sm font-bold text-[var(--text-primary)]">
                      Payment allocations
                    </h3>
                    <p className="mt-1 text-xs text-[var(--text-muted)]">
                      Backend FIFO (oldest line first). FOOD_ORDER allocations
                      update source Order paid/due; room rent and services stay
                      folio-only.
                    </p>
                    {allocations.length === 0 ? (
                      <p className="mt-2 text-sm text-[var(--text-muted)]">
                        No allocations
                      </p>
                    ) : (
                      <div className="mt-3 overflow-x-auto">
                        <table className="min-w-full text-left text-xs">
                          <thead>
                            <tr className="border-b border-[var(--border)] text-[var(--text-muted)]">
                              <th className="py-2 pr-2 font-semibold">Source</th>
                              <th className="py-2 pr-2 font-semibold">Order</th>
                              <th className="py-2 pr-2 font-semibold">Amount</th>
                              <th className="py-2 pr-2 font-semibold">
                                Cash / UPI
                              </th>
                              <th className="py-2 font-semibold">Order apply</th>
                            </tr>
                          </thead>
                          <tbody>
                            {allocations.map((row) => (
                              <tr
                                key={row.id || row._id}
                                className="border-b border-[var(--border)]/50"
                              >
                                <td className="py-2 pr-2">
                                  {LINE_LABELS[row.sourceType] ||
                                    row.sourceType}
                                  {row.sourceType === "FOOD_ORDER" ? (
                                    <span className="ml-1 rounded bg-sky-50 px-1 text-[10px] font-semibold text-sky-700">
                                      food
                                    </span>
                                  ) : (
                                    <span className="ml-1 rounded bg-slate-100 px-1 text-[10px] font-semibold text-slate-600">
                                      folio-only
                                    </span>
                                  )}
                                </td>
                                <td className="py-2 pr-2 text-[var(--text-muted)]">
                                  {row.orderId
                                    ? String(row.orderId).slice(-8)
                                    : "—"}
                                </td>
                                <td className="py-2 pr-2 font-semibold">
                                  {formatMoney(row.amount, currency)}
                                </td>
                                <td className="py-2 pr-2 text-[var(--text-muted)]">
                                  {formatMoney(row.cashAmount, currency)} /{" "}
                                  {formatMoney(row.upiAmount, currency)}
                                </td>
                                <td className="py-2">
                                  {row.orderApplyStatus || "—"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </section>

                  {receiptSummary?.payment ? (
                    <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
                      <p className="font-bold">
                        {receiptSummary.message || "Payment summary"}
                      </p>
                      <p className="mt-1">
                        {receiptSummary.payment.method}{" "}
                        {formatMoney(receiptSummary.payment.amount, currency)}
                        {receiptSummary.replayed
                          ? " (idempotent replay)"
                          : ""}
                      </p>
                      <p className="mt-1 text-xs">
                        Folio due now:{" "}
                        {formatMoney(
                          receiptSummary.folio?.dueAmount,
                          currency,
                        )}
                      </p>
                    </section>
                  ) : null}
                </>
              ) : null}

              {/* Keep checkout mounted while folio is open so tab switches preserve wizard state */}
              <div
                className={
                  billingTab === FOLIO_BILLING_TABS.CHECKOUT ? "block" : "hidden"
                }
                aria-hidden={billingTab !== FOLIO_BILLING_TABS.CHECKOUT}
              >
                <FolioCheckoutFlow
                  embedded
                  isOpen={Boolean(selectedBookingId)}
                  isActive={billingTab === FOLIO_BILLING_TABS.CHECKOUT}
                  onClose={() => selectBillingTab(FOLIO_BILLING_TABS.OVERVIEW)}
                  onCheckoutSuccess={() => {
                    // Done after COMPLETE only — never close on submit/failure.
                    if (checkoutMutation.isPending) return;
                    if (
                      !shouldCloseRoomBillingAfterCheckout({
                        checkoutSucceeded: true,
                        dataRefreshed: true,
                        checkoutInFlight: false,
                      })
                    ) {
                      return;
                    }
                    closeRoomBillingModal();
                  }}
                  booking={selectedBooking}
                  bookingId={selectedBookingId}
                  folio={folio}
                  pendingKitchen={pendingKitchen}
                  currency={currency}
                  busy={busy}
                  onSyncOrders={async () => {
                    await syncMutation.mutateAsync();
                  }}
                  onFetchReceipt={async () => {
                    const res = await api.get(
                      `/rooms/bookings/${selectedBookingId}/folio/receipt`,
                    );
                    return res.data?.data;
                  }}
                  onRecordPayment={async (payload) => {
                    const res = await paymentMutation.mutateAsync(payload);
                    return res.data?.data;
                  }}
                  onCheckout={async () => {
                    const roomId = roomIdOf(selectedBooking);
                    if (!roomId || !selectedBookingId) {
                      throw new Error("Missing room or booking id");
                    }
                    await checkoutMutation.mutateAsync({
                      roomId,
                      bookingId: selectedBookingId,
                    });
                  }}
                  onPrintReceipt={async (snapshot) => {
                    await printFolioInvoice(snapshot, {
                      onError: (err) => {
                        showPopup(
                          err?.message || "Could not open print dialog",
                          "error",
                        );
                      },
                    });
                  }}
                  onRefreshFolio={async () => {
                    await folioDetailQuery.refetch();
                    await invalidateFolioRelated();
                  }}
                />
              </div>
            </div>
          </div>
        ) : null}
      </Modal>

      {/* Payment modal */}
      <Modal
        isOpen={payOpen}
        onClose={() => {
          if (paymentMutation.isPending) return;
          setPayOpen(false);
        }}
        title="Record folio payment"
        panelClassName="max-w-md"
      >
        <form className="space-y-4" onSubmit={submitPayment}>
          <p className="text-sm text-[var(--text-muted)]">
            Outstanding:{" "}
            <span className="font-bold text-[var(--text-primary)]">
              {formatMoney(folio?.dueAmount, currency)}
            </span>
          </p>
          <p className="text-xs text-[var(--text-muted)]">
            Methods: CASH, UPI, or MIXED. No online gateway. Idempotency key is
            sent with each submit and reused only while this dialog retries the
            same attempt.
          </p>
          <label className="block text-sm font-medium">
            Method
            <select
              className="mt-1 w-full rounded-xl border border-[var(--border)] px-3 py-2"
              value={payForm.method}
              disabled={paymentMutation.isPending}
              onChange={(e) =>
                setPayForm((f) => ({ ...f, method: e.target.value }))
              }
            >
              <option value="CASH">CASH</option>
              <option value="UPI">UPI</option>
              <option value="MIXED">MIXED (CASH + UPI)</option>
            </select>
          </label>
          <label className="block text-sm font-medium">
            Amount
            <Input
              type="number"
              min="0.01"
              step="0.01"
              required
              disabled={paymentMutation.isPending}
              value={payForm.amount}
              onChange={(e) =>
                setPayForm((f) => ({ ...f, amount: e.target.value }))
              }
            />
          </label>
          {payForm.method === "MIXED" ? (
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-sm font-medium">
                Cash amount
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  disabled={paymentMutation.isPending}
                  value={payForm.cashAmount}
                  onChange={(e) =>
                    setPayForm((f) => ({ ...f, cashAmount: e.target.value }))
                  }
                />
              </label>
              <label className="block text-sm font-medium">
                UPI amount
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  disabled={paymentMutation.isPending}
                  value={payForm.upiAmount}
                  onChange={(e) =>
                    setPayForm((f) => ({ ...f, upiAmount: e.target.value }))
                  }
                />
              </label>
            </div>
          ) : null}
          <label className="block text-sm font-medium">
            Note (optional)
            <Input
              disabled={paymentMutation.isPending}
              value={payForm.note}
              onChange={(e) =>
                setPayForm((f) => ({ ...f, note: e.target.value }))
              }
            />
          </label>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              disabled={paymentMutation.isPending}
              onClick={() => setPayOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={paymentMutation.isPending}>
              {paymentMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Recording…
                </>
              ) : (
                "Confirm payment"
              )}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Service modal */}
      <Modal
        isOpen={serviceOpen}
        onClose={() => !serviceMutation.isPending && setServiceOpen(false)}
        title="Add hotel service"
        panelClassName="max-w-md"
      >
        <form className="space-y-4" onSubmit={submitService}>
          <label className="block text-sm font-medium">
            Description
            <Input
              required
              disabled={serviceMutation.isPending}
              value={serviceForm.description}
              onChange={(e) =>
                setServiceForm((f) => ({ ...f, description: e.target.value }))
              }
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm font-medium">
              Quantity
              <Input
                type="number"
                min="0.01"
                step="0.01"
                required
                disabled={serviceMutation.isPending}
                value={serviceForm.quantity}
                onChange={(e) =>
                  setServiceForm((f) => ({ ...f, quantity: e.target.value }))
                }
              />
            </label>
            <label className="block text-sm font-medium">
              Unit price
              <Input
                type="number"
                min="0"
                step="0.01"
                required
                disabled={serviceMutation.isPending}
                value={serviceForm.unitPrice}
                onChange={(e) =>
                  setServiceForm((f) => ({ ...f, unitPrice: e.target.value }))
                }
              />
            </label>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              disabled={serviceMutation.isPending}
              onClick={() => setServiceOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={serviceMutation.isPending}>
              {serviceMutation.isPending ? "Saving…" : "Add service"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Adjustment modal */}
      <Modal
        isOpen={adjustOpen}
        onClose={() => !adjustMutation.isPending && setAdjustOpen(false)}
        title="Manual adjustment"
        panelClassName="max-w-md"
      >
        <form className="space-y-4" onSubmit={submitAdjust}>
          <p className="text-xs text-[var(--text-muted)]">
            Positive amount adds a charge. Negative amount is a discount
            (OWNER/MANAGER only).
          </p>
          <label className="block text-sm font-medium">
            Description
            <Input
              required
              disabled={adjustMutation.isPending}
              value={adjustForm.description}
              onChange={(e) =>
                setAdjustForm((f) => ({ ...f, description: e.target.value }))
              }
            />
          </label>
          <label className="block text-sm font-medium">
            Amount
            <Input
              type="number"
              step="0.01"
              required
              disabled={adjustMutation.isPending}
              value={adjustForm.amount}
              onChange={(e) =>
                setAdjustForm((f) => ({ ...f, amount: e.target.value }))
              }
            />
          </label>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              disabled={adjustMutation.isPending}
              onClick={() => setAdjustOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={adjustMutation.isPending}>
              {adjustMutation.isPending ? "Saving…" : "Record adjustment"}
            </Button>
          </div>
        </form>
      </Modal>

    </div>
  );
}
