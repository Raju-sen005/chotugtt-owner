/* eslint-disable react-refresh/only-export-components */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import axios from "axios";
import { useQueryClient } from "@tanstack/react-query";
import {
  buildWelcomePayloadFromPendingResponse,
  clearPendingRegistration,
  writeWelcomePayload,
} from "../features/auth/pendingRegistration";

const AuthContext = createContext(null);

/*
|--------------------------------------------------------------------------
| Axios Configuration
|--------------------------------------------------------------------------
*/

axios.defaults.withCredentials = true;
axios.defaults.baseURL = `${import.meta.env.VITE_APP_API_BASE}`;

let unauthorizedHandler = null;

export const setUnauthorizedHandler = (handler) => {
  unauthorizedHandler = handler;
};

axios.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const url = String(error?.config?.url || "");
    const isAuthProbe =
      url.includes("/auth/me") ||
      url.includes("/auth/login") ||
      url.includes("/auth/register") ||
      url.includes("/auth/registration-status") ||
      url.includes("/auth/logout");

    if (
      status === 401 &&
      !isAuthProbe &&
      typeof unauthorizedHandler === "function"
    ) {
      unauthorizedHandler(error);
    }

    return Promise.reject(error);
  },
);

/*
|--------------------------------------------------------------------------
| Subscription Configuration
|--------------------------------------------------------------------------
*/

const SUBSCRIPTION_CHECK_INTERVAL = 60 * 1000; // 1 minute

/*
|--------------------------------------------------------------------------
| User Helpers
|--------------------------------------------------------------------------
*/

const isOwner = (user) => {
  return user?.role === "OWNER";
};

/*
|--------------------------------------------------------------------------
| Subscription Helpers
|--------------------------------------------------------------------------
*/

/**
 * Get subscription expiry from either:
 *
 * user.subscriptionExpiresAt
 * OR
 * user.restaurant.subscriptionExpiresAt
 */
const getSubscriptionExpiry = (user) => {
  if (!user) {
    return null;
  }

  return (
    user.subscriptionExpiresAt || user.restaurant?.subscriptionExpiresAt || null
  );
};

/**
 * Determine whether the current user requires
 * an active subscription.
 *
 * OWNER:
 *   - subscriptionStatus must be ACTIVE
 *   - subscriptionExpiresAt must exist
 *   - expiry must be a valid future date
 *
 * Non-OWNER:
 *   - subscription is not checked here.
 */
const isSubscriptionExpired = (user) => {
  if (!isOwner(user)) {
    return false;
  }

  const subscriptionStatus =
    user.subscriptionStatus || user.restaurant?.subscriptionStatus || null;

  /*
  |--------------------------------------------------------------------------
  | No active subscription status
  |--------------------------------------------------------------------------
  */

  if (
    !subscriptionStatus ||
    String(subscriptionStatus).toUpperCase() !== "ACTIVE"
  ) {
    return true;
  }

  /*
  |--------------------------------------------------------------------------
  | Missing expiry
  |--------------------------------------------------------------------------
  |
  | A paid subscription must always have an expiry date.
  |
  | New owner:
  |
  | subscriptionExpiresAt = null
  |
  | => subscription required
  |
  |--------------------------------------------------------------------------
  */

  const expiry = getSubscriptionExpiry(user);

  if (!expiry) {
    return true;
  }

  const expiryTime = new Date(expiry).getTime();

  /*
  |--------------------------------------------------------------------------
  | Invalid expiry
  |--------------------------------------------------------------------------
  */

  if (!Number.isFinite(expiryTime)) {
    return true;
  }

  /*
  |--------------------------------------------------------------------------
  | Expired
  |--------------------------------------------------------------------------
  */

  return Date.now() >= expiryTime;
};

/**
 * Check explicit backend response.
 *
 * Backend remains the source of truth.
 */
const requiresSubscriptionFromResponse = (data) => {
  if (!data) {
    return false;
  }

  /*
  |--------------------------------------------------------------------------
  | Backend explicit flag
  |--------------------------------------------------------------------------
  */

  if (data.requiresSubscription === true) {
    return true;
  }

  /*
  |--------------------------------------------------------------------------
  | Response user
  |--------------------------------------------------------------------------
  */

  const userData = data.data || data.user || null;

  if (!userData) {
    return false;
  }

  /*
  |--------------------------------------------------------------------------
  | Backend explicit flag inside data
  |--------------------------------------------------------------------------
  */

  if (userData.requiresSubscription === true) {
    return true;
  }

  /*
  |--------------------------------------------------------------------------
  | Client-side fallback
  |--------------------------------------------------------------------------
  */

  return isSubscriptionExpired(userData);
};

/*
|--------------------------------------------------------------------------
| Auth Provider
|--------------------------------------------------------------------------
*/

export const AuthProvider = ({ children }) => {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const expiryTimerRef = useRef(null);
  const mountedRef = useRef(true);
  const verifySessionRef = useRef(null);
  const previousEntitlementKeyRef = useRef(null);

  /*
  |--------------------------------------------------------------------------
  | Redirect To Subscription
  |--------------------------------------------------------------------------
  */

  /*
|--------------------------------------------------------------------------
| Redirect To Subscription
|--------------------------------------------------------------------------
|
| IMPORTANT:
| `/subscription-checkout` is the ONLY canonical subscription route.
|
| Never redirect to `/subscription`.
|
| Also do not reload the page if the owner is already on
| the subscription checkout page.
|
|--------------------------------------------------------------------------
*/

  const redirectToSubscription = useCallback(() => {
    const currentPath = window.location.pathname;

    /*
  |--------------------------------------------------------------------------
  | Already on checkout page
  |--------------------------------------------------------------------------
  |
  | Do absolutely nothing.
  |
  | This is critical because verifySession() may run while the
  | owner is already waiting on the checkout page.
  |
  */

    if (currentPath === "/subscription-checkout") {
      return;
    }

    /*
  |--------------------------------------------------------------------------
  | Canonical subscription route
  |--------------------------------------------------------------------------
  */

    window.location.replace("/subscription-checkout");
  }, []);

  /*
  |--------------------------------------------------------------------------
  | Clear Subscription Timer
  |--------------------------------------------------------------------------
  */

  const clearSubscriptionTimer = useCallback(() => {
    if (expiryTimerRef.current) {
      window.clearTimeout(expiryTimerRef.current);
      expiryTimerRef.current = null;
    }
  }, []);

  /*
  |--------------------------------------------------------------------------
  | Schedule Exact Subscription Expiry Check
  |--------------------------------------------------------------------------
  */

  const scheduleSubscriptionCheck = useCallback(
    (currentUser) => {
      clearSubscriptionTimer();

      /*
      |--------------------------------------------------------------------------
      | Only OWNER needs subscription monitoring
      |--------------------------------------------------------------------------
      */

      if (!isOwner(currentUser)) {
        return;
      }

      /*
      |--------------------------------------------------------------------------
      | If subscription is already required,
      | redirect immediately.
      |--------------------------------------------------------------------------
      */

      if (isSubscriptionExpired(currentUser)) {
        redirectToSubscription();
        return;
      }

      const expiry = getSubscriptionExpiry(currentUser);

      if (!expiry) {
        redirectToSubscription();
        return;
      }

      const expiryTime = new Date(expiry).getTime();

      if (!Number.isFinite(expiryTime)) {
        redirectToSubscription();
        return;
      }

      const remainingTime = expiryTime - Date.now();

      /*
      |--------------------------------------------------------------------------
      | Already expired
      |--------------------------------------------------------------------------
      */

      if (remainingTime <= 0) {
        redirectToSubscription();
        return;
      }

      /*
      |--------------------------------------------------------------------------
      | Browser setTimeout maximum
      |--------------------------------------------------------------------------
      */

      const MAX_TIMEOUT = 2147483647;

      const timeout = Math.min(remainingTime, MAX_TIMEOUT);

      expiryTimerRef.current = window.setTimeout(() => {
        if (!mountedRef.current) {
          return;
        }

        /*
          |--------------------------------------------------------------------------
          | Re-check server before redirecting.
          |
          | This prevents relying only on client clock/state.
          |--------------------------------------------------------------------------
          */

        verifySessionRef.current?.();
      }, timeout);
    },
    [clearSubscriptionTimer, redirectToSubscription],
  );

  /*
  |--------------------------------------------------------------------------
  | Verify Current Authenticated Session
  |--------------------------------------------------------------------------
  */

  const verifySession = useCallback(async () => {
    try {
      const res = await axios.get("/auth/me");

      /*
      |--------------------------------------------------------------------------
      | Invalid response
      |--------------------------------------------------------------------------
      */

      if (!res.data?.success) {
        if (mountedRef.current) {
          setUser(null);
        }

        clearSubscriptionTimer();

        return null;
      }

      const authenticatedUser = res.data.data;

      /*
      |--------------------------------------------------------------------------
      | No user
      |--------------------------------------------------------------------------
      */

      if (!authenticatedUser) {
        if (mountedRef.current) {
          setUser(null);
        }

        clearSubscriptionTimer();

        return null;
      }

      clearPendingRegistration();

      /*
      |--------------------------------------------------------------------------
      | Backend subscription check
      |--------------------------------------------------------------------------
      |
      | /auth/me is now returning:
      |
      | subscriptionPlan
      | subscriptionStatus
      | subscriptionStartedAt
      | subscriptionExpiresAt
      | requiresSubscription
      |
      |--------------------------------------------------------------------------
      */

      if (requiresSubscriptionFromResponse(res.data)) {
        if (mountedRef.current) {
          setUser(authenticatedUser);
        }

        clearSubscriptionTimer();

        redirectToSubscription();

        return authenticatedUser;
      }

      /*
      |--------------------------------------------------------------------------
      | Additional client-side expiry check
      |--------------------------------------------------------------------------
      */

      if (isSubscriptionExpired(authenticatedUser)) {
        if (mountedRef.current) {
          setUser(authenticatedUser);
        }

        clearSubscriptionTimer();

        redirectToSubscription();

        return authenticatedUser;
      }

      const entitlementKey = [
        authenticatedUser.subscriptionPlan,
        authenticatedUser.subscriptionStatus,
        Array.isArray(authenticatedUser.availableFeatures)
          ? authenticatedUser.availableFeatures.join("|")
          : "",
      ].join("::");

      if (
        previousEntitlementKeyRef.current &&
        previousEntitlementKeyRef.current !== entitlementKey
      ) {
        // Plan/feature change: drop stale React Query caches (replace, never merge).
        queryClient.clear();
      }
      previousEntitlementKeyRef.current = entitlementKey;

      if (mountedRef.current) {
        // Full replace from /auth/me — never merge prior availableFeatures.
        setUser(authenticatedUser);
      }

      scheduleSubscriptionCheck(authenticatedUser);

      return authenticatedUser;
    } catch (error) {
      const responseData = error?.response?.data;

      if (
        responseData?.requiresApproval === true ||
        responseData?.code === "PENDING_APPROVAL"
      ) {
        if (mountedRef.current) {
          setUser(null);
        }
        clearSubscriptionTimer();

        const welcome = buildWelcomePayloadFromPendingResponse(
          responseData,
          responseData?.ownerEmail,
        );
        if (welcome) {
          writeWelcomePayload(welcome);
        }

        if (
          typeof window !== "undefined" &&
          !window.location.pathname.startsWith("/registration-success")
        ) {
          window.location.replace("/registration-success");
        }

        return null;
      }

      if (mountedRef.current) {
        setUser(null);
      }

      clearSubscriptionTimer();

      return null;
    }
  }, [
    clearSubscriptionTimer,
    queryClient,
    redirectToSubscription,
    scheduleSubscriptionCheck,
  ]);
  useEffect(() => {
    verifySessionRef.current = verifySession;
  }, [verifySession]);

  /*
  |--------------------------------------------------------------------------
  | Initial Session Verification
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    mountedRef.current = true;

    const initializeSession = async () => {
      try {
        await verifySession();
      } finally {
        if (mountedRef.current) {
          setLoading(false);
        }
      }
    };

    initializeSession();

    return () => {
      mountedRef.current = false;
      clearSubscriptionTimer();
    };
  }, [clearSubscriptionTimer, verifySession]);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      clearSubscriptionTimer();
      queryClient.clear();
      if (mountedRef.current) {
        setUser(null);
      }
    });

    return () => {
      setUnauthorizedHandler(null);
    };
  }, [clearSubscriptionTimer, queryClient]);

  /*
  |--------------------------------------------------------------------------
  | Login
  |--------------------------------------------------------------------------
  */

  const login = useCallback(
    async (email, password) => {
      try {
        const res = await axios.post("/auth/login", {
          email,
          password,
        });

        /*
        |--------------------------------------------------------------------------
        | Successful Login
        |--------------------------------------------------------------------------
        */

        if (res.data?.success) {
          const authenticatedUser = res.data.data;

          if (!authenticatedUser) {
            return res.data;
          }

          /*
          |--------------------------------------------------------------------------
          | Safety check
          |--------------------------------------------------------------------------
          |
          | Normally backend already prevents this.
          | This is an additional frontend guard.
          |--------------------------------------------------------------------------
          */

          if (isSubscriptionExpired(authenticatedUser)) {
            if (mountedRef.current) {
              setUser(authenticatedUser);
            }

            scheduleSubscriptionCheck(authenticatedUser);

            redirectToSubscription();

            return {
              ...res.data,
              requiresSubscription: true,
            };
          }

          /*
          |--------------------------------------------------------------------------
          | Normal authenticated login
          |--------------------------------------------------------------------------
          */

          if (mountedRef.current) {
            setUser(authenticatedUser);
          }

          scheduleSubscriptionCheck(authenticatedUser);

          return res.data;
        }

        return res.data;
      } catch (error) {
        /*
        |--------------------------------------------------------------------------
        | IMPORTANT:
        |
        | Axios throws for HTTP 403.
        |
        | Backend returns:
        |
        | 403
        | requiresSubscription: true
        |
        | for OWNER without active subscription.
        |
        |--------------------------------------------------------------------------
        */

        const response = error?.response;

        const responseData = response?.data;

        /*
        |--------------------------------------------------------------------------
        | Subscription Required
        |--------------------------------------------------------------------------
        */

        if (
          responseData?.requiresApproval === true ||
          responseData?.code === "PENDING_APPROVAL"
        ) {
          if (mountedRef.current) {
            setUser(null);
          }
          clearSubscriptionTimer();

          const welcome = buildWelcomePayloadFromPendingResponse(
            responseData,
            email,
          );
          if (welcome) {
            writeWelcomePayload(welcome);
          }

          return {
            ...responseData,
            requiresApproval: true,
            requiresSubscription: false,
            requiresCheckout: false,
          };
        }

        if (responseData?.requiresSubscription === true) {
          /*
          |--------------------------------------------------------------------------
          | Preserve authenticated session information.
          |
          | Backend has already created the HttpOnly JWT
          | before returning 403.
          |
          | This is important because the user must now
          | call /payments/create-order.
          |--------------------------------------------------------------------------
          */

          const subscriptionUser = {
            id: responseData.data?.id || null,

            name: responseData.data?.name || null,

            email: responseData.data?.email || email,

            role: responseData.data?.role || "OWNER",

            restaurantId:
              responseData.restaurantId ||
              responseData.data?.restaurantId ||
              null,

            subscriptionPlan:
              responseData.subscriptionPlan ||
              responseData.data?.subscriptionPlan ||
              null,

            subscriptionStatus:
              responseData.subscriptionStatus ||
              responseData.data?.subscriptionStatus ||
              null,

            subscriptionExpiresAt:
              responseData.subscriptionExpiresAt ||
              responseData.data?.subscriptionExpiresAt ||
              null,

            availableFeatures: Array.isArray(responseData.availableFeatures)
              ? responseData.availableFeatures
              : Array.isArray(responseData.data?.availableFeatures)
                ? responseData.data.availableFeatures
                : [],

            requiresSubscription: true,
          };

          if (mountedRef.current) {
            setUser(subscriptionUser);
          }

          clearSubscriptionTimer();

          redirectToSubscription();

          /*
          |--------------------------------------------------------------------------
          | Return controlled result.
          |
          | Login page can use this without treating it
          | as a normal login failure.
          |--------------------------------------------------------------------------
          */

          return {
            ...responseData,
            requiresSubscription: true,
          };
        }

        /*
        |--------------------------------------------------------------------------
        | Other login errors
        |--------------------------------------------------------------------------
        |
        | Keep original Axios error behavior so existing
        | login UI can display invalid credentials etc.
        |--------------------------------------------------------------------------
        */

        throw error;
      }
    },
    [clearSubscriptionTimer, redirectToSubscription, scheduleSubscriptionCheck],
  );

  const requestPasswordResetOtp = useCallback(async (email) => {
    const res = await axios.post("/auth/forgot-password", {
      email: email.trim().toLowerCase(),
    });

    return res.data;
  }, []);

  const verifyPasswordResetOtp = useCallback(async (email, otp) => {
    const res = await axios.post("/auth/verify-reset-otp", {
      email: email.trim().toLowerCase(),
      otp: otp.trim(),
    });

    return res.data;
  }, []);

  const resetPassword = useCallback(async (email, resetToken, newPassword) => {
    const res = await axios.post("/auth/reset-password", {
      email: email.trim().toLowerCase(),
      resetToken,
      newPassword,
    });

    return res.data;
  }, []);

  /*
  |--------------------------------------------------------------------------
  | Register Tenant
  |--------------------------------------------------------------------------
  */

  const registerTenant = useCallback(
    async (formData) => {
      const res = await axios.post("/auth/register", formData);

      if (res.data?.success) {
        const registeredUser = res.data.data?.user || null;

        /*
        |--------------------------------------------------------------------------
        | Registration creates an OWNER but does not
        | create a paid subscription.
        |
        | Therefore new owner must go to subscription.
        |--------------------------------------------------------------------------
        */

        const registrationFeatures = Array.isArray(
          registeredUser?.availableFeatures,
        )
          ? registeredUser.availableFeatures
          : Array.isArray(res.data.data?.availableFeatures)
            ? res.data.data.availableFeatures
            : Array.isArray(res.data.data?.restaurant?.availableFeatures)
              ? res.data.data.restaurant.availableFeatures
              : [];

        const registrationUser = {
          ...(registeredUser || {}),
          role: registeredUser?.role || "OWNER",

          restaurantId:
            registeredUser?.restaurantId ||
            res.data.data?.restaurant?._id ||
            res.data.data?.restaurant?.id ||
            null,

          subscriptionPlan:
            registeredUser?.subscriptionPlan ||
            res.data.data?.restaurant?.subscriptionPlan ||
            null,

          subscriptionStatus:
            registeredUser?.subscriptionStatus ||
            res.data.data?.restaurant?.subscriptionStatus ||
            null,

          subscriptionExpiresAt:
            registeredUser?.subscriptionExpiresAt ||
            res.data.data?.restaurant?.subscriptionExpiresAt ||
            null,

          availableFeatures: registrationFeatures,
        };

        /*
        | Manual approval flow: do not keep a dashboard session and do not
        | send the owner to Razorpay / subscription checkout.
        */
        const requiresApproval = Boolean(
          res.data.data?.requiresApproval ||
            res.data.data?.approvalStatus === "PENDING_APPROVAL",
        );

        if (requiresApproval) {
          clearSubscriptionTimer();
          if (mountedRef.current) {
            setUser(null);
          }

          writeWelcomePayload({
            businessName: res.data.data?.restaurant?.name || null,
            businessCategory:
              res.data.data?.businessCategory ||
              res.data.data?.restaurant?.businessCategory ||
              null,
            planCode: res.data.data?.selectedPlan?.code || null,
            planName: res.data.data?.selectedPlan?.name || null,
            planAmount: res.data.data?.selectedPlan?.amount ?? null,
            approvalStatus: "PENDING_APPROVAL",
            ownerEmail:
              res.data.data?.user?.email ||
              registeredUser?.email ||
              null,
          });

          if (typeof window !== "undefined") {
            window.location.replace("/registration-success");
          }

          return {
            ...res.data,
            requiresApproval: true,
            requiresCheckout: false,
            requiresSubscription: false,
          };
        }

        if (mountedRef.current) {
          setUser(registrationUser);
        }

        scheduleSubscriptionCheck(registrationUser);
      }

      return res.data;
    },
    [clearSubscriptionTimer, scheduleSubscriptionCheck],
  );

  /*
  |--------------------------------------------------------------------------
  | Periodic Session / Subscription Verification
  |--------------------------------------------------------------------------
  |
  | Handles:
  |
  | OWNER logged in
  |       ↓
  | Subscription active
  |       ↓
  | One month passes
  |       ↓
  | Subscription expires
  |       ↓
  | /auth/me
  |       ↓
  | /subscription
  |
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    if (!user) {
      return undefined;
    }

    const interval = window.setInterval(() => {
      verifySession();
    }, SUBSCRIPTION_CHECK_INTERVAL);

    return () => {
      window.clearInterval(interval);
    };
  }, [user, verifySession]);

  /*
  |--------------------------------------------------------------------------
  | Re-check When Browser Tab Becomes Active
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && user) {
        verifySession();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [user, verifySession]);

  /*
  |--------------------------------------------------------------------------
  | Logout
  |--------------------------------------------------------------------------
  */

  const logout = useCallback(async () => {
    try {
      await axios.post("/auth/logout");
    } finally {
      clearSubscriptionTimer();
      queryClient.clear();

      if (mountedRef.current) {
        setUser(null);
      }
    }
  }, [clearSubscriptionTimer, queryClient]);

  /*
  |--------------------------------------------------------------------------
  | Context Value
  |--------------------------------------------------------------------------
  */

  const value = useMemo(
    () => ({
      user,
      login,
      requestPasswordResetOtp,
      verifyPasswordResetOtp,
      resetPassword,
      registerTenant,
      logout,
      refreshSession: verifySession,
      loading,
    }),
    [
      user,
      login,
      requestPasswordResetOtp,
      verifyPasswordResetOtp,
      resetPassword,
      registerTenant,
      logout,
      verifySession,
      loading,
    ],
  );

  /*
  |--------------------------------------------------------------------------
  | Provider
  |--------------------------------------------------------------------------
  */

  return (
    <AuthContext.Provider value={value}>
      {loading ? (
        <div className="flex min-h-dvh items-center justify-center bg-[var(--background)]">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-[var(--primary)]" />
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
};

/*
|--------------------------------------------------------------------------
| useAuth Hook
|--------------------------------------------------------------------------
*/

export const useAuth = () => {
  return useContext(AuthContext);
};
