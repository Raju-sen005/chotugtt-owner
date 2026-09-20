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

const AuthContext = createContext(null);

/*
|--------------------------------------------------------------------------
| Axios Configuration
|--------------------------------------------------------------------------
*/

axios.defaults.withCredentials = true;
axios.defaults.baseURL = `${import.meta.env.VITE_APP_API_BASE}`;

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
    user.subscriptionExpiresAt ||
    user.restaurant?.subscriptionExpiresAt ||
    null
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
    user.subscriptionStatus ||
    user.restaurant?.subscriptionStatus ||
    null;

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

  const userData =
    data.data ||
    data.user ||
    null;

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
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const expiryTimerRef = useRef(null);
  const mountedRef = useRef(true);

  /*
  |--------------------------------------------------------------------------
  | Redirect To Subscription
  |--------------------------------------------------------------------------
  */

  const redirectToSubscription = useCallback(() => {
    if (window.location.pathname === "/subscription") {
      return;
    }

    window.location.replace("/subscription");
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

      const expiryTime =
        new Date(expiry).getTime();

      if (!Number.isFinite(expiryTime)) {
        redirectToSubscription();
        return;
      }

      const remainingTime =
        expiryTime - Date.now();

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

      const timeout = Math.min(
        remainingTime,
        MAX_TIMEOUT,
      );

      expiryTimerRef.current =
        window.setTimeout(() => {
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

          verifySession();
        }, timeout);
    },
    [
      clearSubscriptionTimer,
      redirectToSubscription,
    ],
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

      const authenticatedUser =
        res.data.data;

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

      if (
        requiresSubscriptionFromResponse(
          res.data,
        )
      ) {
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

      if (
        isSubscriptionExpired(
          authenticatedUser,
        )
      ) {
        if (mountedRef.current) {
          setUser(authenticatedUser);
        }

        clearSubscriptionTimer();

        redirectToSubscription();

        return authenticatedUser;
      }

      /*
      |--------------------------------------------------------------------------
      | Valid authenticated user
      |--------------------------------------------------------------------------
      */

      if (mountedRef.current) {
        setUser(authenticatedUser);
      }

      scheduleSubscriptionCheck(
        authenticatedUser,
      );

      return authenticatedUser;
    } catch (error) {
      /*
      |--------------------------------------------------------------------------
      | Authentication failure
      |--------------------------------------------------------------------------
      |
      | Do NOT redirect normal authentication errors
      | to subscription.
      |
      | Only the explicit requiresSubscription response
      | should redirect to subscription.
      |--------------------------------------------------------------------------
      */

      if (mountedRef.current) {
        setUser(null);
      }

      clearSubscriptionTimer();

      return null;
    }
  }, [
    clearSubscriptionTimer,
    redirectToSubscription,
    scheduleSubscriptionCheck,
  ]);

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
  }, [
    clearSubscriptionTimer,
    verifySession,
  ]);

  /*
  |--------------------------------------------------------------------------
  | Login
  |--------------------------------------------------------------------------
  */

  const login = useCallback(
    async (email, password) => {
      try {
        const res = await axios.post(
          "/auth/login",
          {
            email,
            password,
          },
        );

        /*
        |--------------------------------------------------------------------------
        | Successful Login
        |--------------------------------------------------------------------------
        */

        if (res.data?.success) {
          const authenticatedUser =
            res.data.data;

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

          if (
            isSubscriptionExpired(
              authenticatedUser,
            )
          ) {
            if (mountedRef.current) {
              setUser(authenticatedUser);
            }

            scheduleSubscriptionCheck(
              authenticatedUser,
            );

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

          scheduleSubscriptionCheck(
            authenticatedUser,
          );

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

        const response =
          error?.response;

        const responseData =
          response?.data;

        /*
        |--------------------------------------------------------------------------
        | Subscription Required
        |--------------------------------------------------------------------------
        */

        if (
          responseData?.requiresSubscription ===
          true
        ) {
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
            id:
              responseData.data?.id ||
              null,

            name:
              responseData.data?.name ||
              null,

            email:
              responseData.data?.email ||
              email,

            role:
              responseData.data?.role ||
              "OWNER",

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
    [
      clearSubscriptionTimer,
      redirectToSubscription,
      scheduleSubscriptionCheck,
    ],
  );

  /*
  |--------------------------------------------------------------------------
  | Register Tenant
  |--------------------------------------------------------------------------
  */

  const registerTenant = useCallback(
    async (formData) => {
      try {
        const res = await axios.post(
          "/auth/register",
          formData,
        );

        if (res.data?.success) {
          const registeredUser =
            res.data.data?.user || null;

          /*
          |--------------------------------------------------------------------------
          | Registration creates an OWNER but does not
          | create a paid subscription.
          |
          | Therefore new owner must go to subscription.
          |--------------------------------------------------------------------------
          */

          const registrationUser = {
            ...(registeredUser || {}),
            role:
              registeredUser?.role ||
              "OWNER",

            restaurantId:
              registeredUser?.restaurantId ||
              res.data.data?.restaurant?._id ||
              null,

            subscriptionStatus:
              registeredUser?.subscriptionStatus ||
              res.data.data?.restaurant
                ?.subscriptionStatus ||
              null,

            subscriptionExpiresAt:
              registeredUser?.subscriptionExpiresAt ||
              res.data.data?.restaurant
                ?.subscriptionExpiresAt ||
              null,
          };

          if (mountedRef.current) {
            setUser(registrationUser);
          }

          /*
          |--------------------------------------------------------------------------
          | New registration must have an active subscription
          | before dashboard access.
          |--------------------------------------------------------------------------
          */

          if (
            res.data.requiresSubscription ===
              true ||
            isSubscriptionExpired(
              registrationUser,
            )
          ) {
            clearSubscriptionTimer();

            redirectToSubscription();

            return {
              ...res.data,
              requiresSubscription: true,
            };
          }

          scheduleSubscriptionCheck(
            registrationUser,
          );
        }

        return res.data;
      } catch (error) {
        throw error;
      }
    },
    [
      clearSubscriptionTimer,
      redirectToSubscription,
      scheduleSubscriptionCheck,
    ],
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

    const interval =
      window.setInterval(() => {
        verifySession();
      }, SUBSCRIPTION_CHECK_INTERVAL);

    return () => {
      window.clearInterval(
        interval,
      );
    };
  }, [
    user,
    verifySession,
  ]);

  /*
  |--------------------------------------------------------------------------
  | Re-check When Browser Tab Becomes Active
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    const handleVisibilityChange =
      () => {
        if (
          document.visibilityState ===
            "visible" &&
          user
        ) {
          verifySession();
        }
      };

    document.addEventListener(
      "visibilitychange",
      handleVisibilityChange,
    );

    return () => {
      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange,
      );
    };
  }, [
    user,
    verifySession,
  ]);

  /*
  |--------------------------------------------------------------------------
  | Logout
  |--------------------------------------------------------------------------
  */

  const logout = useCallback(
    async () => {
      try {
        await axios.post(
          "/auth/logout",
        );
      } finally {
        clearSubscriptionTimer();

        if (mountedRef.current) {
          setUser(null);
        }
      }
    },
    [clearSubscriptionTimer],
  );

  /*
  |--------------------------------------------------------------------------
  | Context Value
  |--------------------------------------------------------------------------
  */

  const value = useMemo(
    () => ({
      user,
      login,
      registerTenant,
      logout,
      loading,
    }),
    [
      user,
      login,
      registerTenant,
      logout,
      loading,
    ],
  );

  /*
  |--------------------------------------------------------------------------
  | Provider
  |--------------------------------------------------------------------------
  */

  return (
    <AuthContext.Provider
      value={value}
    >
      {!loading && children}
    </AuthContext.Provider>
  );
};

/*
|--------------------------------------------------------------------------
| useAuth Hook
|--------------------------------------------------------------------------
*/

export const useAuth = () => {
  return useContext(
    AuthContext,
  );
};