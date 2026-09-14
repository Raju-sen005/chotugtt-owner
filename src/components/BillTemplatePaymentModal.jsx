import { useState } from "react";
import axios from "axios";
import { CheckCircle2, Loader2, ShieldCheck, X } from "lucide-react";

const API_BASE = import.meta.env.VITE_APP_API_BASE;
const RAZORPAY_SCRIPT = "https://checkout.razorpay.com/v1/checkout.js";

const loadRazorpay = () =>
  new Promise((resolve, reject) => {
    if (window.Razorpay) return resolve(window.Razorpay);
    const script = document.createElement("script");
    script.src = RAZORPAY_SCRIPT;
    script.onload = () => resolve(window.Razorpay);
    script.onerror = () => reject(new Error("Unable to load secure payment checkout"));
    document.body.appendChild(script);
  });

export default function BillTemplatePaymentModal({ template, onClose, onSuccess }) {
  const [isPaying, setIsPaying] = useState(false);
  const [error, setError] = useState("");

  const startPayment = async () => {
    setIsPaying(true);
    setError("");
    try {
      const { data: orderResponse } = await axios.post(
        `${API_BASE}/restaurant/bill-templates/order`,
        { templateId: template.id },
        { withCredentials: true },
      );
      const order = orderResponse.data;
      if (order.alreadyOwned) {
        onSuccess(template);
        return;
      }
      const Razorpay = await loadRazorpay();
      if (!Razorpay) throw new Error("Secure payment checkout is unavailable");

      const checkout = new Razorpay({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: "ChotuGTT",
        description: `${template.name} bill template license`,
        order_id: order.orderId,
        prefill: { name: order.restaurantName },
        theme: { color: "#e75822" },
        modal: { ondismiss: () => setIsPaying(false) },
        handler: async (response) => {
          try {
            await axios.post(
              `${API_BASE}/restaurant/bill-templates/verify`,
              { templateId: template.id, ...response },
              { withCredentials: true },
            );
            onSuccess(template);
          } catch (verificationError) {
            setError(
              verificationError.response?.data?.message ||
                "Payment verification failed. Your template was not unlocked.",
            );
            setIsPaying(false);
          }
        },
      });
      checkout.on("payment.failed", (paymentError) => {
        setError(paymentError.error?.description || "Payment failed. Please try again.");
        setIsPaying(false);
      });
      checkout.open();
    } catch (paymentError) {
      setError(
        paymentError.response?.data?.message ||
          paymentError.message ||
          "Online payment is currently unavailable.",
      );
      setIsPaying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-rose-500">One-time unlock</p>
            <h3 className="mt-1 text-xl font-black text-slate-900">{template.name}</h3>
            <p className="mt-1 text-sm font-medium text-slate-500">Unlock this professional bill design for your restaurant.</p>
          </div>
          <button type="button" onClick={onClose} disabled={isPaying} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100" aria-label="Close payment dialog">
            <X size={18} />
          </button>
        </div>
        <div className="my-5 flex items-center justify-between rounded-2xl bg-slate-950 px-4 py-4 text-white">
          <span className="text-sm font-bold">Template license</span>
          <span className="text-2xl font-black">₹40</span>
        </div>
        <div className="space-y-2 text-xs font-semibold text-slate-600">
          <p className="flex items-center gap-2"><CheckCircle2 size={15} className="text-emerald-500" /> One-time payment, no subscription</p>
          <p className="flex items-center gap-2"><ShieldCheck size={15} className="text-emerald-500" /> Verified securely by Razorpay</p>
        </div>
        {error && <p className="mt-4 rounded-xl bg-rose-50 p-3 text-xs font-bold text-rose-700">{error}</p>}
        <button type="button" onClick={startPayment} disabled={isPaying} className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-rose-600 px-4 py-3.5 text-sm font-black text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60">
          {isPaying ? <><Loader2 size={17} className="animate-spin" /> Opening secure checkout...</> : "Pay ₹40 & unlock template"}
        </button>
      </div>
    </div>
  );
}
