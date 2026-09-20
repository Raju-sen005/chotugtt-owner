import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import axios from "axios";
import {
  ArrowRight,
  Building2,
  Check,
  ChevronLeft,
  CircleCheck,
  CreditCard,
  Loader2,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";

import logo from "../assets/cho.png";

/*
|--------------------------------------------------------------------------
| Razorpay
|--------------------------------------------------------------------------
*/

const RAZORPAY_SCRIPT_URL =
  "https://checkout.razorpay.com/v1/checkout.js";

/*
|--------------------------------------------------------------------------
| Subscription Plans
|--------------------------------------------------------------------------
|
| IMPORTANT:
| These values are display values only.
|
| Backend remains the source of truth for:
| - plan validity
| - amount
| - currency
| - subscription activation
|
|--------------------------------------------------------------------------
*/

const PLANS = Object.freeze({
  STARTER: {
    code: "STARTER",
    name: "Starter",
    amount: 999,
    description: "For small restaurants getting started.",
    features: [
      "QR menu & ordering",
      "Kitchen display system",
      "WhatsApp invoicing",
      "Email support",
    ],
    icon: CreditCard,
    popular: false,
    buttonText: "Choose Starter",
  },

  PRO: {
    code: "PRO",
    name: "Pro",
    amount: 2499,
    description: "For growing restaurants that need more control.",
    features: [
      "Everything in Starter",
      "Live order analytics",
      "Menu & inventory sync",
      "Priority WhatsApp support",
    ],
    icon: Zap,
    popular: true,
    buttonText: "Choose Pro",
  },

  ENTERPRISE: {
    code: "ENTERPRISE",
    name: "Enterprise",
    amount: 4999,
    description: "For multi-outlet restaurants and larger operations.",
    features: [
      "Everything in Pro",
      "Multi-outlet management",
      "Custom POS integrations",
      "Dedicated account support",
    ],
    icon: Building2,
    popular: false,
    buttonText: "Choose Enterprise",
  },
});

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
| - Resolves only once
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
        existingScript.removeEventListener(
          "load",
          handleLoad,
        );

        existingScript.removeEventListener(
          "error",
          handleError,
        );
      };

      existingScript.addEventListener(
        "load",
        handleLoad,
      );

      existingScript.addEventListener(
        "error",
        handleError,
      );

      return;
    }

    const script =
      document.createElement("script");

    script.src =
      RAZORPAY_SCRIPT_URL;

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
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 12)}`;

  return `${IDEMPOTENCY_PREFIX}-${planCode}-${randomPart}`;
};

const formatPrice = (amount) => {
  return new Intl.NumberFormat(
    "en-IN",
    {
      style: "currency",
      currency: PAYMENT_CURRENCY,
      maximumFractionDigits: 0,
    },
  ).format(amount);
};

/*
|--------------------------------------------------------------------------
| Component
|--------------------------------------------------------------------------
*/

export default function SubscriptionCheckout() {
  const [loadingPlan, setLoadingPlan] =
    useState(null);

  const [error, setError] =
    useState("");

  const [razorpayReady, setRazorpayReady] =
    useState(false);

  const [isInitializing, setIsInitializing] =
    useState(true);

  const [paymentStage, setPaymentStage] =
    useState("");

  const mountedRef =
    useRef(true);

  const razorpayInstanceRef =
    useRef(null);

  const paymentTimeoutRef =
    useRef(null);

  /*
  |--------------------------------------------------------------------------
  | Plans
  |--------------------------------------------------------------------------
  */

  const planList = useMemo(
    () => Object.values(PLANS),
    [],
  );

  /*
  |--------------------------------------------------------------------------
  | Cleanup Payment Timeout
  |--------------------------------------------------------------------------
  */

  const clearPaymentTimeout =
    useCallback(() => {
      if (paymentTimeoutRef.current) {
        window.clearTimeout(
          paymentTimeoutRef.current,
        );

        paymentTimeoutRef.current =
          null;
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

    const initializePaymentGateway =
      async () => {
        setIsInitializing(true);
        setError("");

        const loaded =
          await loadRazorpayScript();

        if (cancelled || !mountedRef.current) {
          return;
        }

        if (!loaded || !window.Razorpay) {
          setRazorpayReady(false);

          setError(
            "Secure payment gateway could not be loaded. Please refresh the page and try again.",
          );

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

        razorpayInstanceRef.current =
          null;
      }
    };
  }, [clearPaymentTimeout]);

  /*
  |--------------------------------------------------------------------------
  | Redirect After Successful Payment
  |--------------------------------------------------------------------------
  |
  | IMPORTANT:
  |
  | Full page navigation is intentional.
  |
  | It forces AuthContext to call /auth/me again and receive
  | the newly activated subscription from the backend.
  |
  |--------------------------------------------------------------------------
  */

  const redirectToDashboard =
    useCallback(() => {
      clearPaymentTimeout();

      /*
      |--------------------------------------------------------------------------
      | Replace current history entry.
      |--------------------------------------------------------------------------
      */

      window.location.replace(
        "/dashboard",
      );
    }, [clearPaymentTimeout]);

  /*
  |--------------------------------------------------------------------------
  | Payment
  |--------------------------------------------------------------------------
  */

  const handlePayment =
    useCallback(
      async (planCode) => {
        /*
        |--------------------------------------------------------------------------
        | Prevent double payment initiation.
        |--------------------------------------------------------------------------
        */

        if (loadingPlan) {
          return;
        }

        const selectedPlan =
          PLANS[planCode];

        if (!selectedPlan) {
          setError(
            "Invalid subscription plan selected.",
          );

          return;
        }

        /*
        |--------------------------------------------------------------------------
        | Razorpay readiness
        |--------------------------------------------------------------------------
        */

        if (
          !razorpayReady ||
          !window.Razorpay
        ) {
          setError(
            "Secure payment gateway is still loading. Please wait a moment and try again.",
          );

          return;
        }

        setLoadingPlan(planCode);
        setError("");
        setPaymentStage(
          "Creating secure payment order...",
        );

        try {
          /*
          |--------------------------------------------------------------------------
          | STEP 1
          | Create backend payment order
          |--------------------------------------------------------------------------
          |
          | IMPORTANT:
          |
          | We send ONLY the plan.
          |
          | Backend derives:
          | - authenticated owner
          | - restaurant
          | - amount
          | - currency
          |
          |--------------------------------------------------------------------------
          */

          const idempotencyKey =
            createIdempotencyKey(
              planCode,
            );

          const createOrderResponse =
            await axios.post(
              "/payments/create-order",
              {
                plan: planCode,
              },
              {
                withCredentials: true,

                timeout:
                  PAYMENT_TIMEOUT_MS,

                headers: {
                  "Content-Type":
                    "application/json",

                  "Idempotency-Key":
                    idempotencyKey,
                },
              },
            );

          const responseData =
            createOrderResponse?.data;

          if (!responseData?.success) {
            throw new Error(
              responseData?.message ||
                "Unable to create payment order.",
            );
          }

          const paymentData =
            responseData?.data;

          const {
            keyId,
            orderId,
            amount,
            currency,
            transactionId,
          } =
            paymentData || {};

          /*
          |--------------------------------------------------------------------------
          | Validate backend response
          |--------------------------------------------------------------------------
          */

          if (
            !keyId ||
            !orderId ||
            !transactionId ||
            !amount ||
            !currency
          ) {
            throw new Error(
              "Invalid payment order received from server.",
            );
          }

          if (
            String(currency).toUpperCase() !==
            PAYMENT_CURRENCY
          ) {
            throw new Error(
              "Unsupported payment currency received from server.",
            );
          }

          /*
          |--------------------------------------------------------------------------
          | STEP 2
          | Open Razorpay
          |--------------------------------------------------------------------------
          */

          setPaymentStage(
            "Opening secure checkout...",
          );

          const options = {
            key: keyId,

            amount,

            currency,

            name: "ChotuGTT",

            description:
              `${selectedPlan.name} Plan Subscription`,

            order_id:
              orderId,

            /*
            |--------------------------------------------------------------------------
            | Payment success handler
            |--------------------------------------------------------------------------
            */

            handler:
              async (razorpayResponse) => {
                try {
                  setPaymentStage(
                    "Verifying your payment...",
                  );

                  setError("");

                  /*
                  |--------------------------------------------------------------------------
                  | Validate Razorpay response
                  |--------------------------------------------------------------------------
                  */

                  const {
                    razorpay_order_id,
                    razorpay_payment_id,
                    razorpay_signature,
                  } =
                    razorpayResponse || {};

                  if (
                    !razorpay_order_id ||
                    !razorpay_payment_id ||
                    !razorpay_signature
                  ) {
                    throw new Error(
                      "Incomplete payment response received from Razorpay.",
                    );
                  }

                  /*
                  |--------------------------------------------------------------------------
                  | STEP 3
                  | Verify payment on backend
                  |--------------------------------------------------------------------------
                  */

                  const verifyResponse =
                    await axios.post(
                      "/payments/verify",
                      {
                        razorpay_order_id,

                        razorpay_payment_id,

                        razorpay_signature,

                        transactionId,
                      },
                      {
                        withCredentials:
                          true,

                        timeout:
                          PAYMENT_TIMEOUT_MS,

                        headers: {
                          "Content-Type":
                            "application/json",
                        },
                      },
                    );

                  const verifyData =
                    verifyResponse?.data;

                  if (
                    !verifyData?.success
                  ) {
                    throw new Error(
                      verifyData?.message ||
                        "Payment verification failed.",
                    );
                  }

                  /*
                  |--------------------------------------------------------------------------
                  | SUCCESS
                  |--------------------------------------------------------------------------
                  |
                  | Backend has verified and activated the subscription.
                  |
                  | Do NOT just navigate with React Router because the
                  | AuthContext may still contain the old subscription state.
                  |
                  | Full reload ensures:
                  |
                  | /auth/me
                  |    ↓
                  | latest DB subscription
                  |    ↓
                  | dashboard
                  |
                  |--------------------------------------------------------------------------
                  */

                  setPaymentStage(
                    "Subscription activated. Opening dashboard...",
                  );

                  clearPaymentTimeout();

                  /*
                  |--------------------------------------------------------------------------
                  | Small delay only for UI feedback.
                  |
                  | This is NOT required for payment processing.
                  | Backend verification has already completed.
                  |--------------------------------------------------------------------------
                  */

                  window.setTimeout(() => {
                    if (
                      mountedRef.current
                    ) {
                      redirectToDashboard();
                    }
                  }, 350);
                } catch (verifyError) {
                  console.error(
                    "Payment verification failed:",
                    verifyError,
                  );

                  if (
                    !mountedRef.current
                  ) {
                    return;
                  }

                  setError(
                    verifyError?.response
                      ?.data?.message ||
                      verifyError?.message ||
                      "Payment was received, but verification could not be completed. If money was deducted, please contact support.",
                  );

                  setPaymentStage("");

                  setLoadingPlan(
                    null,
                  );
                }
              },

            /*
            |--------------------------------------------------------------------------
            | Prefill
            |--------------------------------------------------------------------------
            |
            | Backend remains responsible for identity.
            | Razorpay prefill is only a checkout convenience.
            |--------------------------------------------------------------------------
            */

            prefill: {
              name: "",

              email: "",

              contact: "",
            },

            /*
            |--------------------------------------------------------------------------
            | Notes
            |--------------------------------------------------------------------------
            |
            | Do NOT send tenant identity from frontend.
            |--------------------------------------------------------------------------
            */

            notes: {
              plan: planCode,
            },

            /*
            |--------------------------------------------------------------------------
            | Theme
            |--------------------------------------------------------------------------
            */

            theme: {
              color: "#E11D48",
            },

            /*
            |--------------------------------------------------------------------------
            | Modal
            |--------------------------------------------------------------------------
            */

            modal: {
              escape: true,

              ondismiss: () => {
                clearPaymentTimeout();

                if (
                  !mountedRef.current
                ) {
                  return;
                }

                setLoadingPlan(
                  null,
                );

                setPaymentStage("");

                razorpayInstanceRef.current =
                  null;
              },
            },
          };

          /*
          |--------------------------------------------------------------------------
          | Create Razorpay instance
          |--------------------------------------------------------------------------
          */

          const razorpay =
            new window.Razorpay(
              options,
            );

          razorpayInstanceRef.current =
            razorpay;

          /*
          |--------------------------------------------------------------------------
          | Payment Failure
          |--------------------------------------------------------------------------
          */

          razorpay.on(
            "payment.failed",
            (response) => {
              console.error(
                "Razorpay payment failed:",
                response,
              );

              clearPaymentTimeout();

              if (
                !mountedRef.current
              ) {
                return;
              }

              setError(
                response?.error
                  ?.description ||
                  "Payment failed. Please try again.",
              );

              setPaymentStage("");

              setLoadingPlan(
                null,
              );

              razorpayInstanceRef.current =
                null;
            },
          );

          /*
          |--------------------------------------------------------------------------
          | Open Razorpay
          |--------------------------------------------------------------------------
          */

          razorpay.open();

          /*
          |--------------------------------------------------------------------------
          | Safety timeout
          |--------------------------------------------------------------------------
          |
          | This does NOT cancel the Razorpay transaction.
          | It only prevents the UI from remaining indefinitely in
          | a loading state if something unexpected happens.
          |--------------------------------------------------------------------------
          */

          clearPaymentTimeout();

          paymentTimeoutRef.current =
            window.setTimeout(() => {
              if (
                !mountedRef.current
              ) {
                return;
              }

              setLoadingPlan(
                null,
              );

              setPaymentStage("");

              setError(
                "Payment session timed out. Please try again.",
              );
            }, PAYMENT_TIMEOUT_MS);
        } catch (paymentError) {
          console.error(
            "Subscription payment error:",
            paymentError,
          );

          clearPaymentTimeout();

          if (
            !mountedRef.current
          ) {
            return;
          }

          setError(
            paymentError?.response
              ?.data?.message ||
              paymentError?.message ||
              "Unable to start payment. Please try again.",
          );

          setPaymentStage("");

          setLoadingPlan(null);
        }
      },
      [
        clearPaymentTimeout,
        loadingPlan,
        razorpayReady,
        redirectToDashboard,
      ],
    );

  /*
  |--------------------------------------------------------------------------
  | UI State
  |--------------------------------------------------------------------------
  */

  const isBusy =
    loadingPlan !== null;

  /*
  |--------------------------------------------------------------------------
  | Render
  |--------------------------------------------------------------------------
  */

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 selection:bg-rose-100 selection:text-rose-700">
      {/* ================================================================
          TOP NAVIGATION
          ================================================================ */}

      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-white">
              <img
                src={logo}
                alt="ChotuGTT"
                className="h-9 w-auto object-contain"
              />
            </div>

            <div>
              <div className="text-[17px] font-black tracking-tight text-slate-950">
                Chotu<span className="text-rose-600">GTT</span>
              </div>

              <div className="hidden text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400 sm:block">
                Restaurant Management
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-[11px] font-bold text-amber-700 sm:px-4">
            <LockKeyhole size={13} />
            <span>Subscription required</span>
          </div>
        </div>
      </header>

      {/* ================================================================
          MAIN
          ================================================================ */}

      <main className="mx-auto w-full max-w-7xl px-4 pb-12 pt-8 sm:px-6 lg:px-8 lg:pt-12">
        {/* ============================================================
            HERO
            ============================================================ */}

        <section className="mx-auto max-w-3xl text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-rose-100 bg-white px-3.5 py-1.5 text-[11px] font-bold text-rose-600 shadow-sm">
            <ShieldCheck size={14} />

            Secure monthly subscription
          </div>

          <h1 className="text-3xl font-black tracking-[-0.03em] text-slate-950 sm:text-4xl lg:text-5xl">
            Choose the plan that
            <span className="block text-rose-600">
              fits your restaurant
            </span>
          </h1>

          <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">
            Activate your ChotuGTT workspace and get
            access to restaurant operations, ordering,
            billing, analytics and automation.
          </p>

          {/* Secure indicators */}

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3 text-[11px] font-semibold text-slate-500">
            <span className="inline-flex items-center gap-1.5">
              <CircleCheck
                size={14}
                className="text-emerald-500"
              />
              Secure checkout
            </span>

            <span className="hidden h-3 w-px bg-slate-200 sm:block" />

            <span className="inline-flex items-center gap-1.5">
              <CircleCheck
                size={14}
                className="text-emerald-500"
              />
              Monthly billing
            </span>

            <span className="hidden h-3 w-px bg-slate-200 sm:block" />

            <span className="inline-flex items-center gap-1.5">
              <CircleCheck
                size={14}
                className="text-emerald-500"
              />
              Razorpay secured
            </span>
          </div>
        </section>

        {/* ============================================================
            PAYMENT STATUS
            ============================================================ */}

        {isInitializing && (
          <div className="mx-auto mt-8 flex max-w-md items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm font-semibold text-slate-600 shadow-sm">
            <Loader2
              size={18}
              className="animate-spin text-rose-600"
            />

            Preparing secure checkout...
          </div>
        )}

        {paymentStage && !error && (
          <div className="mx-auto mt-8 flex max-w-lg items-center justify-center gap-3 rounded-2xl border border-rose-100 bg-rose-50 px-5 py-4 text-sm font-semibold text-rose-700">
            <Loader2
              size={18}
              className="animate-spin"
            />

            {paymentStage}
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="mx-auto mt-8 flex max-w-2xl items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-left text-sm text-rose-700"
          >
            <ShieldCheck
              size={19}
              className="mt-0.5 shrink-0"
            />

            <div>
              <p className="font-bold">
                Payment could not be started
              </p>

              <p className="mt-1 text-xs leading-5 text-rose-600">
                {error}
              </p>
            </div>
          </div>
        )}

        {/* ============================================================
            PLANS
            ============================================================ */}

        <section className="mt-10 grid gap-6 lg:grid-cols-3 lg:items-stretch">
          {planList.map((plan) => {
            const Icon =
              plan.icon;

            const isLoading =
              loadingPlan ===
              plan.code;

            const isDisabled =
              isBusy ||
              !razorpayReady ||
              isInitializing;

            return (
              <article
                key={plan.code}
                className={[
                  "relative flex flex-col overflow-visible rounded-3xl border bg-white shadow-sm transition-all duration-200",
                  plan.popular
                    ? "border-slate-900 shadow-xl shadow-slate-200/70 lg:-translate-y-2"
                    : "border-slate-200 hover:-translate-y-1 hover:border-slate-300 hover:shadow-lg",
                ].join(" ")}
              >
                {/* Popular badge */}

                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <div className="inline-flex items-center gap-1.5 rounded-full bg-slate-950 px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-white shadow-lg">
                      <Sparkles
                        size={12}
                        className="text-rose-400"
                      />

                      Most popular
                    </div>
                  </div>
                )}

                <div className="flex flex-1 flex-col p-6 sm:p-7">
                  {/* Plan heading */}

                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <div
                          className={[
                            "flex h-10 w-10 items-center justify-center rounded-xl",
                            plan.popular
                              ? "bg-rose-50 text-rose-600"
                              : "bg-slate-100 text-slate-700",
                          ].join(" ")}
                        >
                          <Icon size={19} />
                        </div>

                        <h2 className="text-xl font-black tracking-tight text-slate-950">
                          {plan.name}
                        </h2>
                      </div>

                      <p className="mt-4 min-h-[40px] text-xs leading-5 text-slate-500">
                        {plan.description}
                      </p>
                    </div>
                  </div>

                  {/* Price */}

                  <div className="mt-7 flex items-end gap-2">
                    <span className="text-4xl font-black tracking-[-0.04em] text-slate-950">
                      {formatPrice(
                        plan.amount,
                      )}
                    </span>

                    <span className="pb-1 text-xs font-semibold text-slate-400">
                      / month
                    </span>
                  </div>

                  <p className="mt-1 text-[11px] font-medium text-slate-400">
                    Billed monthly
                  </p>

                  <div className="my-6 h-px bg-slate-100" />

                  {/* Features */}

                  <div className="flex-1">
                    <p className="mb-4 text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">
                      Included
                    </p>

                    <ul className="space-y-3">
                      {plan.features.map(
                        (feature) => (
                          <li
                            key={
                              feature
                            }
                            className="flex items-start gap-2.5 text-xs font-medium leading-5 text-slate-600"
                          >
                            <Check
                              size={15}
                              className={[
                                "mt-0.5 shrink-0",
                                plan.popular
                                  ? "text-rose-500"
                                  : "text-emerald-500",
                              ].join(
                                " ",
                              )}
                            />

                            <span>
                              {feature}
                            </span>
                          </li>
                        ),
                      )}
                    </ul>
                  </div>

                  {/* CTA */}

                  <button
                    type="button"
                    onClick={() =>
                      handlePayment(
                        plan.code,
                      )
                    }
                    disabled={
                      isDisabled
                    }
                    className={[
                      "mt-8 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3.5 text-sm font-bold transition-all",
                      "disabled:cursor-not-allowed disabled:opacity-50",
                      plan.popular
                        ? "bg-slate-950 text-white shadow-lg shadow-slate-300/50 hover:bg-slate-800"
                        : "border border-slate-900 bg-white text-slate-900 hover:bg-slate-950 hover:text-white",
                    ].join(" ")}
                  >
                    {isLoading ? (
                      <>
                        <Loader2
                          size={17}
                          className="animate-spin"
                        />

                        Processing...
                      </>
                    ) : (
                      <>
                        {plan.buttonText}

                        <ArrowRight
                          size={16}
                        />
                      </>
                    )}
                  </button>

                  <p className="mt-3 text-center text-[10px] font-medium text-slate-400">
                    Secure payment powered by Razorpay
                  </p>
                </div>
              </article>
            );
          })}
        </section>

        {/* ============================================================
            TRUST / SECURITY
            ============================================================ */}

        <section className="mx-auto mt-10 max-w-5xl rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="grid gap-5 sm:grid-cols-3">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <ShieldCheck
                  size={18}
                />
              </div>

              <div>
                <h3 className="text-xs font-black text-slate-900">
                  Secure payments
                </h3>

                <p className="mt-1 text-[11px] leading-5 text-slate-500">
                  Payment signatures are verified on
                  the ChotuGTT backend.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <LockKeyhole
                  size={17}
                />
              </div>

              <div>
                <h3 className="text-xs font-black text-slate-900">
                  Protected account
                </h3>

                <p className="mt-1 text-[11px] leading-5 text-slate-500">
                  Your restaurant identity is derived
                  from your authenticated session.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
                <CircleCheck
                  size={18}
                />
              </div>

              <div>
                <h3 className="text-xs font-black text-slate-900">
                  Instant activation
                </h3>

                <p className="mt-1 text-[11px] leading-5 text-slate-500">
                  After successful verification, your
                  subscription is activated automatically.
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
            By continuing, you agree to the applicable
            subscription and payment terms.
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