import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Check, ShieldAlert, Sparkles, Zap, Building2 } from "lucide-react";
import axios from "axios";
import logo from "../assets/cho.png";

export default function SubscriptionCheckout() {
  const location = useLocation();
  const navigate = useNavigate();
  const restaurantId = location.state?.restaurantId;

  const [loadingPlan, setLoadingPlan] = useState(null);
  const [error, setError] = useState("");

  const handlePaymentAndRenewal = async (planType, amount) => {
    if (!restaurantId) {
      setError("Restaurant ID missing. Please login again.");
      return;
    }

    setLoadingPlan(planType);
    setError("");

    try {
      const res = await axios.post("/auth/renew-subscription", {
        restaurantId,
        plan: planType,
        amount,
      });

      if (res.data.success) {
        alert(`Successfully subscribed to ${planType} Plan!`);
        navigate("/dashboard");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Payment processing failed");
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-slate-900 font-sans flex flex-col justify-between p-6 lg:p-12">
      {/* Top Header */}
      <div className="max-w-7xl mx-auto w-full flex items-center justify-between pb-8 border-b border-slate-200/80">
        <div className="flex items-center gap-3">
          <img src={logo} alt="Logo" className="h-10 object-contain" />
          <span className="font-black text-xl tracking-tight">Chotu</span>
        </div>
        <div className="bg-rose-50 text-rose-600 px-4 py-2 rounded-xl text-xs font-bold border border-rose-100 flex items-center gap-2">
          <ShieldAlert size={16} /> Subscription Expired / Action Required
        </div>
      </div>

      {/* Main Pricing Section */}
      <div className="max-w-6xl mx-auto w-full py-10 space-y-12">
        <div className="text-center space-y-3">
          <h1 className="text-3xl lg:text-4xl font-black tracking-tight text-slate-900">
            Scale Your Restaurant Operations
          </h1>
          <p className="text-slate-500 text-sm max-w-xl mx-auto font-medium">
            Select a plan to keep your store live and access advanced automation, WhatsApp billing, and analytics.
          </p>

          {error && (
            <div className="max-w-md mx-auto bg-rose-50 text-rose-600 p-3 rounded-xl text-xs font-semibold border border-rose-100">
              ⚠️ {error}
            </div>
          )}
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid lg:grid-cols-3 gap-8 items-center">
          {/* 1. STARTER PLAN */}
          <div className="bg-white rounded-3xl p-8 border border-slate-200/80 shadow-sm space-y-6 flex flex-col justify-between relative hover:border-slate-300 transition-all">
            <div className="space-y-4">
              <div>
                <h3 className="text-xl font-bold text-slate-900">Starter</h3>
                <p className="text-slate-500 text-xs mt-1">
                  Single outlet, up to 10 tables
                </p>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-black text-slate-900">₹999</span>
                <span className="text-xs text-slate-400 font-medium">
                  /month
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">
                billed monthly, cancel anytime
              </p>

              <hr className="border-slate-100" />

              <ul className="space-y-3 text-xs text-slate-600 font-medium">
                <li className="flex items-center gap-2.5">
                  <Check size={16} className="text-emerald-500 shrink-0" /> QR
                  menu & ordering
                </li>
                <li className="flex items-center gap-2.5">
                  <Check size={16} className="text-emerald-500 shrink-0" />{" "}
                  Kitchen display screen (KDS)
                </li>
                <li className="flex items-center gap-2.5">
                  <Check size={16} className="text-emerald-500 shrink-0" />{" "}
                  WhatsApp invoicing
                </li>
                <li className="flex items-center gap-2.5">
                  <Check size={16} className="text-emerald-500 shrink-0" />{" "}
                  Email support
                </li>
              </ul>
            </div>

            {/* Pass "STARTER" */}
            <button
              onClick={() => handlePaymentAndRenewal("STARTER", 999)}
              disabled={loadingPlan !== null}
              className="w-full py-3.5 rounded-xl border border-slate-900 text-slate-900 font-bold text-sm hover:bg-slate-900 hover:text-white transition-all cursor-pointer disabled:opacity-50"
            >
              {loadingPlan === "STARTER" ? "Processing..." : "Get Started"}
            </button>
          </div>

          {/* 2. PRO PLAN (Mapped to schema 'PRO') */}
          <div className="bg-slate-900 text-white rounded-3xl p-8 shadow-2xl space-y-6 flex flex-col justify-between relative border border-slate-800 scale-105 z-10">
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-red-500 to-rose-500 text-white text-[10px] font-black tracking-wider uppercase px-4 py-1.5 rounded-full shadow-md flex items-center gap-1">
              <Sparkles size={12} /> MOST POPULAR
            </div>

            <div className="space-y-4 pt-2">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  Pro <Zap size={18} className="text-rose-500 fill-rose-500" />
                </h3>
                <p className="text-slate-400 text-xs mt-1">
                  Single outlet, unlimited tables
                </p>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-black text-white">₹2,499</span>
                <span className="text-xs text-slate-400 font-medium">
                  /month
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">
                billed monthly, cancel anytime
              </p>

              <hr className="border-slate-800" />

              <ul className="space-y-3 text-xs text-slate-300 font-medium">
                <li className="flex items-center gap-2.5">
                  <Check size={16} className="text-rose-500 shrink-0" />{" "}
                  Everything in Starter
                </li>
                <li className="flex items-center gap-2.5">
                  <Check size={16} className="text-rose-500 shrink-0" /> Live
                  order analytics dashboard
                </li>
                <li className="flex items-center gap-2.5">
                  <Check size={16} className="text-rose-500 shrink-0" /> Menu &
                  inventory sync
                </li>
                <li className="flex items-center gap-2.5">
                  <Check size={16} className="text-rose-500 shrink-0" />{" "}
                  Priority WhatsApp support
                </li>
              </ul>
            </div>

            {/* Pass "PRO" */}
            <button
              onClick={() => handlePaymentAndRenewal("PRO", 2499)}
              disabled={loadingPlan !== null}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-red-500 to-rose-600 text-white font-bold text-sm hover:opacity-95 active:scale-[0.99] transition-all shadow-lg shadow-rose-500/25 cursor-pointer disabled:opacity-50"
            >
              {loadingPlan === "PRO" ? "Processing..." : "Get Started"}
            </button>
          </div>

          {/* 3. ENTERPRISE PLAN */}
          <div className="bg-white rounded-3xl p-8 border border-slate-200/80 shadow-sm space-y-6 flex flex-col justify-between relative hover:border-slate-300 transition-all">
            <div className="space-y-4">
              <div>
                <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  Enterprise <Building2 size={16} className="text-slate-400" />
                </h3>
                <p className="text-slate-500 text-xs mt-1">
                  Multi-outlet chains & franchises
                </p>
              </div>
              <div className="py-2">
                <span className="text-3xl font-black text-slate-900 tracking-tight">
                  Custom
                </span>
                <p className="text-xs text-slate-400 font-medium mt-0.5">
                  volume pricing per outlet
                </p>
              </div>

              <hr className="border-slate-100" />

              <ul className="space-y-3 text-xs text-slate-600 font-medium">
                <li className="flex items-center gap-2.5">
                  <Check size={16} className="text-emerald-500 shrink-0" />{" "}
                  Everything in Pro
                </li>
                <li className="flex items-center gap-2.5">
                  <Check size={16} className="text-emerald-500 shrink-0" />{" "}
                  Multi-outlet master dashboard
                </li>
                <li className="flex items-center gap-2.5">
                  <Check size={16} className="text-emerald-500 shrink-0" />{" "}
                  Custom POS integrations
                </li>
                <li className="flex items-center gap-2.5">
                  <Check size={16} className="text-emerald-500 shrink-0" />{" "}
                  Dedicated account manager
                </li>
              </ul>
            </div>

            {/* Pass "ENTERPRISE" */}
            <button
              onClick={() => handlePaymentAndRenewal("ENTERPRISE", 4999)}
              disabled={loadingPlan !== null}
              className="w-full py-3.5 rounded-xl border border-slate-900 text-slate-900 font-bold text-sm hover:bg-slate-900 hover:text-white transition-all cursor-pointer disabled:opacity-50"
            >
              {loadingPlan === "ENTERPRISE" ? "Processing..." : "Talk to Sales"}
            </button>
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="max-w-7xl mx-auto w-full text-center pt-8 border-t border-slate-200/80 text-xs text-slate-400 font-medium">
        Secure SSL 256-bit Encrypted Checkout • Powered by Chotu Billing Gateway
      </div>
    </div>
  );
}
