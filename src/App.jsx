import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";

import MerchantLayout from "./layouts/MerchantLayout";
import PublicMenu from "./features/public/PublicMenu";
import AuthGate from "./features/auth/AuthGate";
import SubscriptionCheckout from "./components/SubscriptionCheckout";

export default function App() {
  const { user } = useAuth();

  /*
  |--------------------------------------------------------------------------
  | Subscription Access
  |--------------------------------------------------------------------------
  |
  | OWNER without an active subscription must never enter
  | the Merchant dashboard.
  |
  | We intentionally keep the authenticated `user` object because
  | the subscription checkout API requires the authenticated
  | HttpOnly JWT cookie.
  |
  | Therefore:
  |
  | user exists
  | +
  | requiresSubscription === true
  |
  | => Subscription Checkout
  |
  |--------------------------------------------------------------------------
  */

  const requiresSubscription =
    user?.role === "OWNER" &&
    user?.requiresSubscription === true;

  return (
    <Routes>
      {/*
      |--------------------------------------------------------------------------
      | Public Customer Menu
      |--------------------------------------------------------------------------
      |
      | This route must remain completely independent from
      | merchant authentication/subscription.
      |
      */}
      <Route
        path="/catalog/:restaurantId"
        element={<PublicMenu />}
      />

      {/*
      |--------------------------------------------------------------------------
      | Subscription Checkout
      |--------------------------------------------------------------------------
      |
      | This route intentionally stays outside MerchantLayout.
      |
      | It must remain accessible even when:
      |
      | user.requiresSubscription === true
      |
      | because the authenticated OWNER needs to create the
      | Razorpay order and complete payment.
      |
      */}
      <Route
        path="/subscription-checkout"
        element={<SubscriptionCheckout />}
      />

      {/*
      |--------------------------------------------------------------------------
      | Merchant Application
      |--------------------------------------------------------------------------
      |
      | Three states:
      |
      | 1. No authenticated user
      |      => AuthGate
      |
      | 2. OWNER requires subscription
      |      => Subscription Checkout
      |
      | 3. Normal authenticated user
      |      => MerchantLayout
      |
      |--------------------------------------------------------------------------
      */}

      <Route
        path="/*"
        element={
          !user ? (
            <AuthGate />
          ) : requiresSubscription ? (
            <Navigate
              to="/subscription-checkout"
              replace
            />
          ) : (
            <MerchantLayout />
          )
        }
      />
    </Routes>
  );
}