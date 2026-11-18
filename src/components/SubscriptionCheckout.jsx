import { useCallback, useEffect, useRef, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  // ChefHat,
  CircleCheck,
  Clock3,
  Loader2,
  LockKeyhole,
  // LogOut,
  Printer,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

/*
|--------------------------------------------------------------------------
| Razorpay
|--------------------------------------------------------------------------
*/

const RAZORPAY_SCRIPT_URL = "https://checkout.razorpay.com/v1/checkout.js";

/*
|--------------------------------------------------------------------------
| Display copy
|--------------------------------------------------------------------------
|
| Amount, currency, and duration are loaded from the backend.
| These entries only describe what each plan includes.
|
|--------------------------------------------------------------------------
*/

const PLAN_COPY = Object.freeze({
  TRIAL: {
    description:
      "Try the full restaurant workspace free for 7 days. The account is blocked when the trial ends.",
    features: [
      "7 days only, once per restaurant",
      "Full workspace during the trial",
      "Account is blocked when the 7 days end",
      "Choose Starter, Basic, Premium, Pro, or Plus to continue",
    ],
    icon: Clock3,
    popular: false,
    buttonText: "Start 7-day free trial",
  },
  STARTER: {
    description: "A simple yearly plan for getting started with ChotuGTT.",
    features: [
      "Counter POS",
      "Table QR ordering",
      "Live orders and KOT",
      "Offers and menu management",
      "Valid for 1 year only",
    ],
    icon: Sparkles,
    popular: false,
    buttonText: "Choose Starter",
  },
  BASIC: {
    description:
      "One year of restaurant operations, ordering, billing, and AI menu tools.",
    features: [
      "Counter POS",
      "Table QR ordering",
      "Captain app",
      "AI menu upload",
      "Analysis and business reports",
      "Live orders and KOT",
      "Offers and menu management",
      "Valid for 1 year only",
    ],
    highlightedFeatures: [
      "Captain app",
      "AI menu upload",
      "Analysis and business reports",
    ],
    icon: Sparkles,
    popular: true,
    buttonText: "Choose Basic",
  },
  PREMIUM: {
    description:
      "Basic for 1 year, plus one thermal printer. Nothing beyond that year and printer.",
    features: [
      "Everything in Basic",
      "Counter POS, table QR, and captain app",
      "AI menu upload and analysis",
      "1 thermal printer included",
      "Valid for 1 year only",
    ],
    icon: Printer,
    popular: false,
    buttonText: "Choose Premium",
  },
  PRO: {
    description:
      "All current restaurant software features plus Event Management and future software upgrades. Does not include Hotel / Room Management (Plus).",
    features: [
      "Everything in Premium software",
      "Event Management",
      "WhatsApp bill and advanced analytics",
      "All future restaurant software features",
      "Valid for 1 year only",
      "Room Management requires Plus separately",
    ],
    highlightedFeatures: ["Event Management", "All future restaurant software features"],
    icon: ShieldCheck,
    popular: false,
    buttonText: "Choose Pro",
  },
  PLUS: {
    description:
      "Independent Hotel / Room Management plan. Rooms, bookings, guests, room QR ordering, and folio. Does not include Event Management or full POS Pro features.",
    features: [
      "Rooms Management",
      "Room Billing",
      "Guest Management",
      "Room QR ordering",
      "Room Folio billing",
      "Valid for 1 year only",
      "Event Management requires Pro separately",
    ],
    highlightedFeatures: [
      "Rooms Management",
      "Room QR ordering",
      "Room Folio billing",
    ],
    icon: Sparkles,
    popular: false,
    buttonText: "Choose Plus",
  },
});

/** Exported for unit tests — display copy keys only; amounts come from API. */
export { PLAN_COPY };

/*
|--------------------------------------------------------------------------
| Constants
|--------------------------------------------------------------------------
*/

const PAYMENT_CURRENCY = "INR";

const PAYMENT_TIMEOUT_MS = 120000;

const IDEMPOTENCY_PREFIX = "subscription";

/*
|--------------------------------------------------------------------------
| Razorpay Script Loader
|--------------------------------------------------------------------------
|
| Production-safe loader:
|
| - Reuses existing Razorpay instance
| - Reuses an existing script
| - Prevents duplicate script insertion
| - Allows retry if loading fails
|
|--------------------------------------------------------------------------
*/

let razorpayLoaderPromise = null;

const loadRazorpayScript = () => {
  if (typeof window === "undefined") {
    return Promise.resolve(false);
  }

  if (window.Razorpay) {
    return Promise.resolve(true);
  }

  if (razorpayLoaderPromise) {
    return razorpayLoaderPromise;
  }

  razorpayLoaderPromise = new Promise((resolve) => {
    const existingScript = document.querySelector(
      `script[src="${RAZORPAY_SCRIPT_URL}"]`,
    );

    if (existingScript) {
      const handleLoad = () => {
        cleanup();
        resolve(Boolean(window.Razorpay));
      };

      const handleError = () => {
        cleanup();
        resolve(false);
      };

      const cleanup = () => {
        existingScript.removeEventListener("load", handleLoad);

        existingScript.removeEventListener("error", handleError);
      };

      existingScript.addEventListener("load", handleLoad);

      existingScript.addEventListener("error", handleError);

      return;
    }

    const script = document.createElement("script");

    script.src = RAZORPAY_SCRIPT_URL;

    script.async = true;

    script.onload = () => {
      resolve(Boolean(window.Razorpay));
    };

    script.onerror = () => {
      resolve(false);
    };

    document.head.appendChild(script);
  }).finally(() => {
    /*
    |--------------------------------------------------------------------------
    | Allow retry if script loading failed.
    |--------------------------------------------------------------------------
    */

    if (!window.Razorpay) {
      razorpayLoaderPromise = null;
    }
  });

  return razorpayLoaderPromise;
};

/*
|--------------------------------------------------------------------------
| Utility Helpers
|--------------------------------------------------------------------------
*/

const createIdempotencyKey = (planCode) => {
  const randomPart =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;

  return `${IDEMPOTENCY_PREFIX}-${planCode}-${randomPart}`;
};

const formatPrice = (amount) => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: PAYMENT_CURRENCY,
    maximumFractionDigits: 0,
  }).format(amount);
};

const formatDuration = (plan) => {
  if (plan.durationDays) {
    return `${plan.durationDays} days`;
  }

  if (plan.durationMonths === 12) {
    return "1 year";
  }

  if (plan.durationMonths) {
    return `${plan.durationMonths} months`;
  }

  return "";
};

/*
|--------------------------------------------------------------------------
| Component
|--------------------------------------------------------------------------
*/

export default function SubscriptionCheckout() {
  const navigate = useNavigate();
  const { refreshSession, user } = useAuth();

  const [plans, setPlans] = useState([]);
  const [plansLoading, setPlansLoading] = useState(true);

  const [loadingPlan, setLoadingPlan] = useState(null);

  const [error, setError] = useState("");

  const [razorpayReady, setRazorpayReady] = useState(false);

  const [isInitializing, setIsInitializing] = useState(true);

  const [paymentStage, setPaymentStage] = useState("");

  const mountedRef = useRef(true);

  const razorpayInstanceRef = useRef(null);

  const paymentTimeoutRef = useRef(null);

  /*
  |--------------------------------------------------------------------------
  | Plan
  |--------------------------------------------------------------------------
  */

  const planList = plans;
  const planSliderRef = useRef(null);

  /*
  |--------------------------------------------------------------------------
  | Cleanup Payment Timeout
  |--------------------------------------------------------------------------
  */

  const clearPaymentTimeout = useCallback(() => {
    if (paymentTimeoutRef.current) {
      window.clearTimeout(paymentTimeoutRef.current);

      paymentTimeoutRef.current = null;
    }
  }, []);

  /*
  |--------------------------------------------------------------------------
  | Razorpay Initialization
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    mountedRef.current = true;

    let cancelled = false;

    const initializePaymentGateway = async () => {
      setIsInitializing(true);
      setError("");

      const loaded = await loadRazorpayScript();

      if (cancelled || !mountedRef.current) {
        return;
      }

      if (!loaded || !window.Razorpay) {
        setRazorpayReady(false);
        setIsInitializing(false);
        return;
      }

      setRazorpayReady(true);

      setIsInitializing(false);
    };

    initializePaymentGateway();

    return () => {
      cancelled = true;

      mountedRef.current = false;

      clearPaymentTimeout();

      if (razorpayInstanceRef.current) {
        try {
          razorpayInstanceRef.current.close();
        } catch {
          // Ignore Razorpay cleanup errors.
        }

        razorpayInstanceRef.current = null;
      }
    };
  }, [clearPaymentTimeout]);

  useEffect(() => {
    let cancelled = false;

    const loadPlans = async () => {
      try {
        const response = await axios.get(
          `${import.meta.env.VITE_APP_API_BASE}/payments/plans`,
          { withCredentials: true },
        );

        if (cancelled || !mountedRef.current) {
          return;
        }

        const serverPlans = Array.isArray(response.data?.data)
          ? response.data.data
          : [];

        const nextPlans = serverPlans
          .filter((plan) => PLAN_COPY[plan.code])
          .map((plan) => ({
            ...plan,
            ...PLAN_COPY[plan.code],
            code: plan.code,
            name: plan.name,
            amount: plan.amount,
            trial: plan.trial === true,
          }));

        setPlans(nextPlans);

        if (nextPlans.length === 0) {
          setError("Subscription plans are unavailable right now.");
        }
      } catch (loadError) {
        if (cancelled || !mountedRef.current) {
          return;
        }

        setError(
          loadError?.response?.data?.message ||
            "Unable to load subscription plans.",
        );
      } finally {
        if (!cancelled && mountedRef.current) {
          setPlansLoading(false);
        }
      }
    };

    loadPlans();

    return () => {
      cancelled = true;
    };
  }, []);

  /*
  |--------------------------------------------------------------------------
  | Redirect After Successful Payment
  |--------------------------------------------------------------------------
  |
  | Full page navigation forces AuthContext to call /auth/me again
  | and receive the newly activated subscription.
  |--------------------------------------------------------------------------
  */

  const redirectToDashboard = useCallback(() => {
    clearPaymentTimeout();

    window.location.replace("/");
  }, [clearPaymentTimeout]);

  const handleStartTrial = useCallback(() => {
    if (loadingPlan) {
      return;
    }

    setError("");

    navigate("/?auth=signup&plan=TRIAL");
  }, [loadingPlan, navigate]);

  /*
  |--------------------------------------------------------------------------
  | Payment
  |--------------------------------------------------------------------------
  */

  const handlePayment = useCallback(
    (planCode) => {
      // Prevent multiple clicks
      if (loadingPlan) {
        return;
      }

      // Validate selected plan
      const selectedPlan = plans.find((plan) => plan.code === planCode);

      if (!selectedPlan) {
        setError("Invalid subscription plan selected.");
        return;
      }

      // Clear any previous error
      setError("");

      // Redirect to Register page
      navigate(`/?auth=signup&plan=${encodeURIComponent(planCode)}`);
    },
    [loadingPlan, plans, navigate],
  );

  /*
  |--------------------------------------------------------------------------
  | UI State
  |--------------------------------------------------------------------------
  */

  const isBusy = loadingPlan !== null;

  const activeExpiry = user?.subscriptionExpiresAt
    ? new Date(user.subscriptionExpiresAt)
    : null;

  const hasActiveSubscription =
    String(user?.subscriptionStatus || "").toUpperCase() === "ACTIVE" &&
    activeExpiry instanceof Date &&
    !Number.isNaN(activeExpiry.getTime()) &&
    activeExpiry.getTime() > Date.now();

  const activePlanLabel = user?.subscriptionPlan || "current";

  /*
  |--------------------------------------------------------------------------
  | Render
  |--------------------------------------------------------------------------
  */

  return (
    <div className="min-h-screen bg-[var(--background)] text-slate-900 selection:bg-rose-100 selection:text-rose-700">
      {/* ================================================================
          TOP NAVIGATION
          ================================================================ */}

      <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-slate-950 text-white">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-[var(--primary)] shadow-sm">
              {/* <ChefHat size={20} strokeWidth={2.25} /> */}
              <img
                src="/ChotuGTT__1_-removebg-preview.png"
                alt="ChotuGTT Logo"
                className="h-6 w-6"
              />
            </span>

            <div className="min-w-0 leading-tight">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/45">
                Restaurant
              </p>
              <p className="truncate text-base font-black tracking-tight sm:text-lg">
                Chotu<span className="text-[var(--secondary)]">GTT</span>
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <div
              className={`hidden items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold sm:inline-flex ${
                hasActiveSubscription
                  ? "border border-emerald-400/30 bg-emerald-500/15 text-emerald-300"
                  : "border border-amber-400/30 bg-amber-500/15 text-amber-200"
              }`}
            >
              {hasActiveSubscription ? (
                <ShieldCheck size={13} />
              ) : (
                <LockKeyhole size={13} />
              )}
              <span>
                {hasActiveSubscription
                  ? `${activePlanLabel} active`
                  : "Subscription required"}
              </span>
            </div>

            {(user?.name || user?.role) && (
              <div className="hidden items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-2.5 py-1.5 md:flex">
                {user?.name ? (
                  <span className="max-w-[120px] truncate text-sm font-semibold text-white">
                    {user.name}
                  </span>
                ) : null}
                {user?.role ? (
                  <span className="rounded-md bg-[var(--primary)]/20 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#FB7185]">
                    {user.role}
                  </span>
                ) : null}
              </div>
            )}

            {/* <button
              type="button"
              onClick={async () => {
                try {
                  await logout();
                } finally {
                  window.location.replace("/");
                }
              }}
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-2.5 py-2 text-sm font-semibold text-white/80 transition hover:border-rose-400/40 hover:bg-rose-500/15 hover:text-white"
              title="Sign out"
            >
              <LogOut size={16} />
              <span className="hidden sm:inline">Sign out</span>
            </button> */}
          </div>
        </div>
      </header>

      {/* ================================================================
          MAIN
          ================================================================ */}

      <main className="mx-auto w-full max-w-6xl px-4 pb-12 pt-8 sm:px-6 lg:px-8 lg:pt-12">
        {/* ============================================================
            HERO
            ============================================================ */}

        <section className="mx-auto max-w-3xl text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-rose-100 bg-white px-3.5 py-1.5 text-[11px] font-bold text-rose-600 shadow-sm">
            <ShieldCheck size={14} />
            Choose a plan
          </div>

          <h1 className="text-3xl font-black tracking-[-0.03em] text-slate-950 sm:text-4xl lg:text-5xl">
            Start free, or run
            <span className="block text-rose-600">the full restaurant</span>
          </h1>

          <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">
            Trial lasts 7 days, then the restaurant account is blocked. Starter,
            Basic, Premium, Pro, and Plus plans are available for your
            restaurant. Premium includes one thermal printer. Pro covers
            restaurant software and Event Management. Plus is the independent
            Hotel / Room Management plan.
          </p>

          {/* Secure indicators */}

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3 text-[11px] font-semibold text-slate-500">
            <span className="inline-flex items-center gap-1.5">
              <CircleCheck size={14} className="text-emerald-500" />
              7-day trial
            </span>

            <span className="hidden h-3 w-px bg-slate-200 sm:block" />

            <span className="inline-flex items-center gap-1.5">
              <CircleCheck size={14} className="text-emerald-500" />
              Basic ₹4,000 / year
            </span>

            <span className="hidden h-3 w-px bg-slate-200 sm:block" />

            <span className="inline-flex items-center gap-1.5">
              <CircleCheck size={14} className="text-emerald-500" />
              Premium includes a printer
            </span>
          </div>
        </section>

        {/* ============================================================
            PAYMENT STATUS
            ============================================================ */}

        {isInitializing && (
          <div className="mx-auto mt-8 flex max-w-md items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm font-semibold text-slate-600 shadow-sm">
            <Loader2 size={18} className="animate-spin text-rose-600" />
            Preparing secure checkout...
          </div>
        )}

        {paymentStage && !error && (
          <div className="mx-auto mt-8 flex max-w-lg items-center justify-center gap-3 rounded-2xl border border-rose-100 bg-rose-50 px-5 py-4 text-sm font-semibold text-rose-700">
            <Loader2 size={18} className="animate-spin" />

            {paymentStage}
          </div>
        )}

        {hasActiveSubscription && (
          <div className="mx-auto mt-8 max-w-2xl rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-left">
            <p className="text-sm font-black text-emerald-800">
              {activePlanLabel} is already active until{" "}
              {activeExpiry.toLocaleDateString("en-IN", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}
            </p>
            <p className="mt-1 text-xs leading-5 text-emerald-700">
              The free trial cannot replace this subscription. Continue to the
              dashboard, or choose Starter, Basic, Premium, Pro, or Plus below
              to extend it.
            </p>
            <button
              type="button"
              onClick={() => window.location.assign("/")}
              className="mt-3 inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2 text-xs font-black text-white"
            >
              Open dashboard
              <ArrowRight size={14} />
            </button>
          </div>
        )}
        {/* <div
          role="alert"
          className="mx-auto mt-8 flex max-w-2xl items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-left text-sm text-rose-700"
        >
          <ShieldCheck size={19} className="mt-0.5 shrink-0" />

          <div>
            <p className="font-bold">Unable to continue</p>

            <p className="mt-1 text-xs leading-5 text-rose-600">{error}</p>
          </div>
        </div> */}

        {/* ============================================================
            PLANS
            ============================================================ */}

        <section className="mx-auto mt-10 max-w-6xl">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-black tracking-tight text-slate-950 sm:text-2xl">
                Plans made for your restaurant
              </h2>
              <p className="mt-1 text-xs font-medium text-slate-500 sm:text-sm">
                Compare plans and choose what fits your business.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label="Previous plans"
                onClick={() =>
                  planSliderRef.current?.scrollBy({
                    left: -360,
                    behavior: "smooth",
                  })
                }
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-slate-400 hover:bg-slate-50"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                type="button"
                aria-label="Next plans"
                onClick={() =>
                  planSliderRef.current?.scrollBy({
                    left: 360,
                    behavior: "smooth",
                  })
                }
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-slate-400 hover:bg-slate-50"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>

          <div
            ref={planSliderRef}
            className="flex snap-x snap-mandatory gap-5 overflow-x-auto overscroll-x-contain scroll-smooth pb-6 pt-3 [scrollbar-width:thin] [scrollbar-color:#cbd5e1_transparent]"
          >
            {plansLoading && (
              <div className="col-span-full flex items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-8 text-sm font-semibold text-slate-600">
                <Loader2 size={18} className="animate-spin text-rose-600" />
                Loading plans...
              </div>
            )}

            {planList.map((plan) => {
              const Icon = plan.icon;
              const isLoading = loadingPlan === plan.code;
              const isDisabled =
                isBusy ||
                plansLoading ||
                (plan.trial && hasActiveSubscription) ||
                (!plan.trial && (!razorpayReady || isInitializing));
              const durationLabel = formatDuration(plan);

              return (
                <article
                  key={plan.code}
                  className={`relative flex min-w-0 flex-[0_0_100%] snap-start flex-col rounded-[1.75rem] border bg-white p-6 shadow-sm transition-shadow hover:shadow-lg sm:flex-[0_0_calc(50%-0.625rem)] lg:flex-[0_0_calc(33.333%-0.833rem)] ${
                    plan.popular
                      ? "border-slate-900 shadow-xl shadow-slate-200"
                      : "border-slate-200"
                  }`}
                >
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <div className="inline-flex items-center gap-1.5 rounded-full bg-slate-950 px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-white">
                        <Sparkles size={12} className="text-rose-400" />
                        Most used
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
                      <Icon size={20} />
                    </div>
                    <div>
                      <h2 className="text-xl font-black text-slate-950">
                        {plan.name}
                      </h2>
                      <p className="text-[11px] font-semibold text-slate-400">
                        {durationLabel}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5">
                    <p className="text-4xl font-black tracking-tight text-slate-950">
                      {plan.trial ? "Free" : formatPrice(plan.amount)}
                    </p>
                    <p className="mt-1 text-xs font-bold text-rose-600">
                      {plan.trial
                        ? "Then the account is blocked"
                        : `Valid for ${durationLabel}`}
                    </p>
                  </div>

                  {Array.isArray(plan.components) &&
                    plan.components.length > 0 && (
                      <div className="mt-4 space-y-1 rounded-xl bg-slate-50 px-3 py-3">
                        {plan.components.map((component) => (
                          <div
                            key={component.label}
                            className="flex items-center justify-between text-[11px] font-semibold text-slate-600"
                          >
                            <span>{component.label}</span>
                            <span>{formatPrice(component.amount)}</span>
                          </div>
                        ))}
                      </div>
                    )}

                  <p className="mt-4 text-xs leading-5 text-slate-500">
                    {plan.description}
                  </p>

                  <div className="mt-5 space-y-2">
                    {plan.features.map((feature) => {
                      const isHighlighted =
                        plan.highlightedFeatures?.includes(feature);

                      return (
                        <div
                          key={feature}
                          className={`flex items-start gap-2 rounded-xl px-3 py-2 transition ${
                            isHighlighted
                              ? "border border-orange-200 bg-orange-50"
                              : ""
                          }`}
                        >
                          <Check
                            size={isHighlighted ? 16 : 14}
                            strokeWidth={isHighlighted ? 3 : 2}
                            className={`mt-0.5 shrink-0 ${
                              isHighlighted
                                ? "text-emerald-600"
                                : "text-emerald-600"
                            }`}
                          />

                          <span
                            className={`text-xs leading-5 ${
                              isHighlighted
                                ? "font-extrabold text-slate-600"
                                : "font-semibold text-slate-600"
                            }`}
                          >
                            {feature}
                          </span>

                          {/* {isHighlighted && (
          <span className="ml-auto shrink-0 rounded-full bg-orange-100 px-2 py-0.5 text-[9px] font-black text-orange-700">
            FEATURED
          </span>
        )} */}
                        </div>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    onClick={() => handlePayment(plan.code)}
                    disabled={isDisabled}
                    className={`mt-6 flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-3.5 text-sm font-black text-white transition disabled:cursor-not-allowed disabled:opacity-50 ${
                      plan.popular
                        ? "bg-slate-950 hover:bg-slate-800"
                        : "bg-rose-600 hover:bg-rose-700"
                    }`}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        {plan.trial ? "Starting trial..." : "Redirecting..."}
                      </>
                    ) : (
                      <>
                        {plan.buttonText}
                        <ArrowRight size={16} />
                      </>
                    )}
                  </button>

                  <p className="mt-3 text-center text-[10px] font-semibold text-slate-400">
                    {plan.trial
                      ? hasActiveSubscription
                        ? "Trial is only for a restaurant with no active plan."
                        : "No payment required. One trial per restaurant."
                      : "Choose your plan and continue to registration."}
                  </p>
                </article>
              );
            })}
          </div>
        </section>

        {/* ============================================================
            TRUST / SECURITY
            ============================================================ */}

        <section className="mx-auto mt-10 max-w-5xl rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="grid gap-5 sm:grid-cols-3">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <ShieldCheck size={18} />
              </div>

              <div>
                <h3 className="text-xs font-black text-slate-900">
                  Secure payments
                </h3>

                <p className="mt-1 text-[11px] leading-5 text-slate-500">
                  Payment signatures are verified on the ChotuGTT backend.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <LockKeyhole size={17} />
              </div>

              <div>
                <h3 className="text-xs font-black text-slate-900">
                  Protected account
                </h3>

                <p className="mt-1 text-[11px] leading-5 text-slate-500">
                  Your restaurant identity is derived from your authenticated
                  session.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
                <CircleCheck size={18} />
              </div>

              <div>
                <h3 className="text-xs font-black text-slate-900">
                  Instant activation
                </h3>

                <p className="mt-1 text-[11px] leading-5 text-slate-500">
                  After successful verification, the selected 1-year plan is
                  activated automatically. The Basic trial needs no payment.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================
            FOOTER NOTE
            ============================================================ */}

        <div className="mt-8 flex flex-col items-center justify-center gap-2 text-center">
          <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-400">
            <LockKeyhole size={13} />
            Secure SSL encrypted checkout
          </div>

          <p className="text-[10px] font-medium text-slate-400">
            By continuing, you agree to the applicable subscription and payment
            terms.
          </p>
        </div>
      </main>

      {/* ================================================================
          LOADING OVERLAY
          ================================================================ */}

      {isBusy && (
        <div className="pointer-events-none fixed inset-0 z-30 bg-slate-950/[0.02]" />
      )}
    </div>
  );
}
