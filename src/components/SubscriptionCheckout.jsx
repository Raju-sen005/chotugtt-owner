import { useCallback, useEffect, useRef, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import CommercialCatalogPreview from "../features/subscription/CommercialCatalogPreview";
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
  /*
  | PLAN_COPY legacy entries are renewal-only display helpers for existing
  | OWNER accounts still on STARTER/BASIC/PREMIUM/PRO/PLUS. New acquisition
  | uses CommercialCatalogPreview (11 commercial plans). Do not surface these
  | as new-customer marketing options.
  */
  TRIAL: {
    description:
      "Try the full restaurant workspace free for 7 days. The account is blocked when the trial ends.",
    features: [
      "7 days only, once per restaurant",
      "Full workspace during the trial",
      "Account is blocked when the 7 days end",
      "Continue with a current Restaurant, Hotel, or Resort plan after trial",
    ],
    icon: Clock3,
    popular: false,
    buttonText: "Start 7-day free trial",
  },
  STARTER: {
    description:
      "Legacy yearly starter plan (existing customers / renewal only).",
    features: [
      "Counter POS",
      "Table QR ordering",
      "Live orders and KOT",
      "Offers and menu management",
      "Valid for 1 year only",
    ],
    icon: Sparkles,
    popular: false,
    buttonText: "Renew Starter",
  },
  BASIC: {
    description:
      "Legacy yearly Basic plan (existing customers / renewal only).",
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
    buttonText: "Renew Basic",
  },
  PREMIUM: {
    description:
      "Legacy Premium plan with printer entitlement (existing customers / renewal only).",
    features: [
      "Everything in Basic",
      "Counter POS, table QR, and captain app",
      "AI menu upload and analysis",
      "1 thermal printer included",
      "Valid for 1 year only",
    ],
    icon: Printer,
    popular: false,
    buttonText: "Renew Premium",
  },
  PRO: {
    description:
      "Legacy Pro plan with Event Management (existing customers / renewal only).",
    features: [
      "Everything in Premium software",
      "Event Management",
      "WhatsApp bill and advanced analytics",
      "Valid for 1 year only",
    ],
    highlightedFeatures: ["Event Management"],
    icon: ShieldCheck,
    popular: false,
    buttonText: "Renew Pro",
  },
  PLUS: {
    description:
      "Legacy Plus hotel/room plan (existing customers / renewal only).",
    features: [
      "Rooms Management",
      "Room Billing",
      "Guest Management",
      "Room QR ordering",
      "Room Folio billing",
      "Valid for 1 year only",
    ],
    highlightedFeatures: [
      "Rooms Management",
      "Room QR ordering",
      "Room Folio billing",
    ],
    icon: Sparkles,
    popular: false,
    buttonText: "Renew Plus",
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
  const [acquisitionPlans, setAcquisitionPlans] = useState([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("RESTAURANT");
  /** OWNER renewal audience from server: COMMERCIAL | LEGACY */
  const [renewalAudienceMode, setRenewalAudienceMode] = useState(null);
  const [renewalPlanFamily, setRenewalPlanFamily] = useState(null);

  const [loadingPlan, setLoadingPlan] = useState(null);

  const [error, setError] = useState("");

  const [razorpayReady, setRazorpayReady] = useState(false);

  const [isInitializing, setIsInitializing] = useState(true);

  const [paymentStage, setPaymentStage] = useState("");

  const mountedRef = useRef(true);

  const razorpayInstanceRef = useRef(null);

  const paymentTimeoutRef = useRef(null);

  const paymentInFlightRef = useRef(false);

  const pendingAutoPayRef = useRef(false);

  /*
  |--------------------------------------------------------------------------
  | Mode
  |--------------------------------------------------------------------------
  |
  | Logged-in OWNER with a restaurant → renewal (Razorpay / start-trial).
  | Everyone else → acquisition (public plans → signup redirect).
  |
  |--------------------------------------------------------------------------
  */

  const isOwnerRenewal = Boolean(
    user?.role === "OWNER" && (user?.restaurantId || user?.restaurant?.id),
  );

  /*
  |--------------------------------------------------------------------------
  | Plan
  |--------------------------------------------------------------------------
  */

  const planList = plans;
  const planSliderRef = useRef(null);

  const apiBase = import.meta.env.VITE_APP_API_BASE || "";

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

    const mapLegacyRenewalPlans = (serverPlans) =>
      (Array.isArray(serverPlans) ? serverPlans : [])
        .filter((plan) => PLAN_COPY[plan.code])
        .map((plan) => ({
          ...plan,
          ...PLAN_COPY[plan.code],
          code: plan.code,
          name: plan.name,
          amount: plan.amount,
          trial: plan.trial === true,
          buttonText:
            plan.trial === true
              ? "Start 7-day free trial"
              : `Renew ${plan.name}`,
        }));

    const loadPlans = async () => {
      setPlansLoading(true);
      try {
        if (isOwnerRenewal) {
          const response = await axios.get(`${apiBase}/payments/renewal-plans`, {
            withCredentials: true,
          });
          if (cancelled || !mountedRef.current) return;
          const payload = response.data?.data || {};
          const serverPlans = Array.isArray(payload.plans) ? payload.plans : [];
          const mode =
            payload.audienceMode === "COMMERCIAL" ? "COMMERCIAL" : "LEGACY";
          const family = String(payload.planFamily || "")
            .trim()
            .toUpperCase();
          setRenewalAudienceMode(mode);
          setRenewalPlanFamily(family || null);

          if (mode === "COMMERCIAL") {
            // Server already filtered to the tenant's commercial family.
            setAcquisitionPlans(
              serverPlans.filter((p) => p.planFamily !== "LEGACY" && !p.trial),
            );
            setPlans([]);
            if (["RESTAURANT", "HOTEL", "RESORT"].includes(family)) {
              setActiveCategory(family);
            }
          } else {
            setAcquisitionPlans([]);
            setPlans(mapLegacyRenewalPlans(serverPlans));
          }
        } else {
          const response = await axios.get(`${apiBase}/payments/plans`, {
            withCredentials: true,
          });
          if (cancelled || !mountedRef.current) return;
          const serverPlans = Array.isArray(response.data?.data)
            ? response.data.data
            : [];
          setRenewalAudienceMode(null);
          setRenewalPlanFamily(null);
          setAcquisitionPlans(
            serverPlans.filter((p) => !p.trial && p.planFamily !== "LEGACY"),
          );
          setPlans(
            serverPlans
              .filter((p) => p.trial === true)
              .map((p) => ({
                ...p,
                ...PLAN_COPY.TRIAL,
                buttonText: PLAN_COPY.TRIAL.buttonText,
              })),
          );
        }

        if (mountedRef.current) setError("");
      } catch (loadError) {
        if (cancelled || !mountedRef.current) return;
        setError(
          loadError?.response?.data?.message ||
            "Unable to load subscription plans.",
        );
      } finally {
        if (!cancelled && mountedRef.current) setPlansLoading(false);
      }
    };

    loadPlans();

    return () => {
      cancelled = true;
    };
  }, [apiBase, isOwnerRenewal]);

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

  const finishSuccessfulPayment = useCallback(async () => {
    clearPaymentTimeout();
    setPaymentStage("Refreshing your subscription...");

    try {
      if (typeof refreshSession === "function") {
        await refreshSession();
      }
    } catch {
      // Dashboard reload still picks up /auth/me.
    }

    redirectToDashboard();
  }, [clearPaymentTimeout, redirectToDashboard, refreshSession]);

  const handleStartTrialRenewal = useCallback(async () => {
    if (loadingPlan || paymentInFlightRef.current) {
      return;
    }

    paymentInFlightRef.current = true;
    setLoadingPlan("TRIAL");
    setError("");
    setPaymentStage("Starting free trial...");

    try {
      const response = await axios.post(
        `${apiBase}/payments/start-trial`,
        {},
        { withCredentials: true },
      );

      if (!response.data?.success) {
        throw new Error(
          response.data?.message || "Unable to start the free trial.",
        );
      }

      await finishSuccessfulPayment();
    } catch (trialError) {
      if (mountedRef.current) {
        setError(
          trialError?.response?.data?.message ||
            trialError?.message ||
            "Unable to start the free trial.",
        );
        setPaymentStage("");
      }
    } finally {
      paymentInFlightRef.current = false;
      if (mountedRef.current) {
        setLoadingPlan(null);
      }
    }
  }, [apiBase, finishSuccessfulPayment, loadingPlan]);

  const openRazorpayCheckout = useCallback(
    (orderPayload, planCode) => {
      if (!window.Razorpay) {
        setError("Payment gateway is not ready. Please refresh and try again.");
        setLoadingPlan(null);
        paymentInFlightRef.current = false;
        return;
      }

      const amountPaise = Math.round(Number(orderPayload.amount) * 100);

      const options = {
        key: orderPayload.keyId,
        amount: amountPaise,
        currency: orderPayload.currency || PAYMENT_CURRENCY,
        name: "Transserve",
        description: `${orderPayload.planName || planCode} subscription`,
        order_id: orderPayload.orderId,
        prefill: {
          name: orderPayload.restaurant?.name || user?.name || "",
          email: orderPayload.restaurant?.email || user?.email || "",
          contact: orderPayload.restaurant?.phone || "",
        },
        handler: async (razorpayResponse) => {
          try {
            if (mountedRef.current) {
              setPaymentStage("Verifying payment...");
            }

            const verifyRes = await axios.post(
              `${apiBase}/payments/verify`,
              {
                razorpay_payment_id: razorpayResponse.razorpay_payment_id,
                razorpay_order_id: razorpayResponse.razorpay_order_id,
                razorpay_signature: razorpayResponse.razorpay_signature,
              },
              { withCredentials: true },
            );

            if (!verifyRes.data?.success) {
              throw new Error(
                verifyRes.data?.message || "Payment verification failed.",
              );
            }

            await finishSuccessfulPayment();
          } catch (verifyError) {
            if (mountedRef.current) {
              setError(
                verifyError?.response?.data?.message ||
                  verifyError?.message ||
                  "Payment verification failed.",
              );
              setPaymentStage("");
              setLoadingPlan(null);
            }
            paymentInFlightRef.current = false;
          }
        },
        modal: {
          ondismiss: () => {
            if (mountedRef.current) {
              setPaymentStage("");
              setLoadingPlan(null);
              setError("Payment was cancelled. No subscription was activated.");
            }
            paymentInFlightRef.current = false;
            clearPaymentTimeout();
          },
        },
      };

      clearPaymentTimeout();
      paymentTimeoutRef.current = window.setTimeout(() => {
        if (mountedRef.current) {
          setError("Payment timed out. Please try again.");
          setPaymentStage("");
          setLoadingPlan(null);
        }
        paymentInFlightRef.current = false;
        try {
          razorpayInstanceRef.current?.close();
        } catch {
          // ignore
        }
      }, PAYMENT_TIMEOUT_MS);

      const instance = new window.Razorpay(options);
      razorpayInstanceRef.current = instance;
      instance.on("payment.failed", (failure) => {
        if (mountedRef.current) {
          setError(
            failure?.error?.description ||
              "Payment failed. No subscription was activated.",
          );
          setPaymentStage("");
          setLoadingPlan(null);
        }
        paymentInFlightRef.current = false;
        clearPaymentTimeout();
      });
      instance.open();
      if (mountedRef.current) {
        setPaymentStage("Complete payment in the Razorpay window...");
      }
    },
    [
      apiBase,
      clearPaymentTimeout,
      finishSuccessfulPayment,
      user?.email,
      user?.name,
    ],
  );

  /*
  |--------------------------------------------------------------------------
  | Payment / acquisition CTA
  |--------------------------------------------------------------------------
  */

  const handlePayment = useCallback(
    async (planCode) => {
      if (loadingPlan || paymentInFlightRef.current) {
        return;
      }

      const selectedPlan =
        plans.find((plan) => plan.code === planCode) ||
        acquisitionPlans.find((plan) => plan.code === planCode);

      if (!selectedPlan) {
        setError("Invalid subscription plan selected.");
        return;
      }

      setError("");

      /*
      | Acquisition (not logged-in OWNER): signup with plan + category.
      */
      if (!isOwnerRenewal) {
        if (selectedPlan.trial) {
          navigate("/?auth=signup&plan=TRIAL");
          return;
        }
        const category =
          selectedPlan.planFamily ||
          selectedPlan.category ||
          "RESTAURANT";
        navigate(
          `/?auth=signup&plan=${encodeURIComponent(planCode)}&category=${encodeURIComponent(category)}`,
        );
        return;
      }

      /*
      | OWNER renewal: TRIAL → start-trial; paid → create-order + Razorpay.
      */
      if (selectedPlan.trial) {
        await handleStartTrialRenewal();
        return;
      }

      if (!razorpayReady) {
        setError("Payment gateway is not ready. Please refresh and try again.");
        return;
      }

      paymentInFlightRef.current = true;
      setLoadingPlan(planCode);
      setPaymentStage("Creating secure payment order...");

      try {
        const orderRes = await axios.post(
          `${apiBase}/payments/create-order`,
          { plan: planCode },
          {
            withCredentials: true,
            headers: {
              "Idempotency-Key": createIdempotencyKey(planCode),
            },
          },
        );

        if (!orderRes.data?.success || !orderRes.data?.data?.orderId) {
          throw new Error(
            orderRes.data?.message || "Unable to create payment order.",
          );
        }

        openRazorpayCheckout(orderRes.data.data, planCode);
      } catch (orderError) {
        paymentInFlightRef.current = false;
        if (mountedRef.current) {
          setError(
            orderError?.response?.data?.message ||
              orderError?.message ||
              "Unable to create payment order.",
          );
          setPaymentStage("");
          setLoadingPlan(null);
        }
      }
    },
    [
      apiBase,
      handleStartTrialRenewal,
      isOwnerRenewal,
      loadingPlan,
      navigate,
      openRazorpayCheckout,
      plans,
      acquisitionPlans,
      razorpayReady,
    ],
  );

  /*
  | Online Razorpay registration handoff is disabled.
  | New registrations use manual SuperAdmin approval.
  | Clear any leftover pending-checkout marker without opening Checkout.
  */
  useEffect(() => {
    if (typeof sessionStorage === "undefined") return;
    sessionStorage.removeItem("chotugtt_pending_checkout_plan");
  }, []);

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
                src="/brand/Vibrant_Transserve_Gradient_Logo-removebg-preview.png"
                alt="Transserve Logo"
                className="h-6 w-6"
              />
            </span>

            <div className="min-w-0 leading-tight">
              {/* <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/45">
                Restaurant
              </p> */}
              <p className="truncate text-base font-black tracking-tight sm:text-lg">
               Transserve
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
          {isOwnerRenewal ? (
            <>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-rose-100 bg-white px-3.5 py-1.5 text-[11px] font-bold text-rose-600 shadow-sm">
                <ShieldCheck size={14} />
                Renew your plan
              </div>
              <h1 className="text-3xl font-black tracking-[-0.03em] text-slate-950 sm:text-4xl lg:text-5xl">
                Renew or extend
                <span className="block text-rose-600">your subscription</span>
              </h1>
              <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">
                Choose an eligible plan to renew. Amounts come from the server.
                The free trial does not use payment and remains one-time per
                restaurant.
              </p>
            </>
          ) : (
            <>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-[11px] font-bold text-slate-700 shadow-sm">
                <ShieldCheck size={14} className="text-rose-600" />
                Transserve pricing
              </div>
              <h1 className="text-3xl font-black tracking-[-0.03em] text-slate-950 sm:text-4xl lg:text-5xl">
                Choose the Right Plan for Your Business
              </h1>
              <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">
                Transserve helps restaurants, hotels, and resorts run operations
                from one platform. All paid plans are annual. After registration,
                our team contacts you for activation and payment — no online
                checkout during signup.
              </p>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-3 text-[11px] font-semibold text-slate-500">
                <span className="inline-flex items-center gap-1.5">
                  <CircleCheck size={14} className="text-emerald-500" />
                  7-day free trial available
                </span>
                <span className="hidden h-3 w-px bg-slate-200 sm:block" />
                <span className="inline-flex items-center gap-1.5">
                  <CircleCheck size={14} className="text-emerald-500" />
                  Annual pricing in INR
                </span>
                <span className="hidden h-3 w-px bg-slate-200 sm:block" />
                <span className="inline-flex items-center gap-1.5">
                  <CircleCheck size={14} className="text-emerald-500" />
                  Manual activation after signup
                </span>
              </div>
              <div className="mt-8">
                <button
                  type="button"
                  onClick={() => handlePayment("TRIAL")}
                  disabled={isBusy}
                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-900 shadow-sm transition hover:border-slate-400 hover:bg-slate-50 disabled:opacity-50"
                >
                  <Clock3 size={16} className="text-rose-600" />
                  Start 7-day free trial
                  <ArrowRight size={16} />
                </button>
              </div>
            </>
          )}
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
              dashboard, or renew with an eligible plan below.
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
            OWNER RENEWAL — legacy-only cards (server-filtered)
            ============================================================ */}

        {isOwnerRenewal && renewalAudienceMode === "LEGACY" ? (
        <section className="mx-auto mt-10 max-w-6xl">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-black tracking-tight text-slate-950 sm:text-2xl">
                Eligible renewal plans
              </h2>
              <p className="mt-1 text-xs font-medium text-slate-500 sm:text-sm">
                Compare eligible plans for your existing account.
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
                        {plan.trial
                          ? "Starting trial..."
                          : isOwnerRenewal
                            ? "Opening checkout..."
                            : "Redirecting..."}
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
                      : isOwnerRenewal
                        ? "Secure Razorpay payment. Your restaurant is charged the server plan amount."
                        : "Choose your plan and continue to registration."}
                  </p>
                </article>
              );
            })}
          </div>
        </section>
        ) : null}

        {!plansLoading &&
          (!isOwnerRenewal || renewalAudienceMode === "COMMERCIAL") && (
          <CommercialCatalogPreview
            className={isOwnerRenewal ? "mt-10" : "mt-10"}
            serverPlans={acquisitionPlans}
            activeCategory={
              isOwnerRenewal && renewalPlanFamily
                ? renewalPlanFamily
                : activeCategory
            }
            onCategoryChange={
              isOwnerRenewal && renewalPlanFamily
                ? undefined
                : setActiveCategory
            }
            lockCategory={Boolean(isOwnerRenewal && renewalPlanFamily)}
            busyPlan={loadingPlan}
            showHero={!isOwnerRenewal}
            ctaLabel={isOwnerRenewal ? "Renew / purchase" : "Get Started"}
            onSelectPlan={(plan) => handlePayment(plan.code)}
            footnote={
              isOwnerRenewal
                ? "Plans shown are limited to your business category. Amounts come from the server."
                : "After you register, the Transserve team will contact your business regarding account activation and payment. Online checkout is not used during new registration."
            }
          />
        )}

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
                  {isOwnerRenewal ? "Secure payments" : "Verified catalog"}
                </h3>

                <p className="mt-1 text-[11px] leading-5 text-slate-500">
                  {isOwnerRenewal
                    ? "Payment signatures are verified on the Transserve backend."
                    : "Plan codes and annual prices match the approved commercial catalog."}
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
                  {isOwnerRenewal
                    ? "Your restaurant identity is derived from your authenticated session."
                    : "New accounts stay pending until SuperAdmin activation. No paid features unlock early."}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
                <CircleCheck size={18} />
              </div>

              <div>
                <h3 className="text-xs font-black text-slate-900">
                  {isOwnerRenewal ? "Plan activation" : "Team activation"}
                </h3>

                <p className="mt-1 text-[11px] leading-5 text-slate-500">
                  {isOwnerRenewal
                    ? "After successful verification, the selected plan is activated for your restaurant."
                    : "After registration, our team contacts you for verification, payment, and activation."}
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
            {isOwnerRenewal
              ? "Secure SSL encrypted checkout"
              : "Registration leads to awaiting-approval — no online payment step"}
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
