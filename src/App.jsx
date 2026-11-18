import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";

import AuthGate from "./features/auth/AuthGate";

const MerchantLayout = lazy(() => import("./layouts/MerchantLayout"));
const PublicMenu = lazy(() => import("./features/public/PublicMenu"));
const RoomMenu = lazy(() => import("./features/public/RoomMenu"));
const SubscriptionCheckout = lazy(
  () => import("./components/SubscriptionCheckout"),
);
const ForgotPassword = lazy(() => import("./features/auth/ForgotPassword"));

function ScreenLoading() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-[var(--background)]">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-[var(--primary)]" />
    </div>
  );
}

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
    user?.role === "OWNER" && user?.requiresSubscription === true;

  return (
    <Suspense fallback={<ScreenLoading />}>
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
        <Route path="/catalog/:restaurantId" element={<PublicMenu />} />

        {/*
      |--------------------------------------------------------------------------
      | Guest Room QR Menu (Phase C)
      |--------------------------------------------------------------------------
      |
      | Public — no merchant auth. Token is validated by the backend.
      | Ordering eligibility is enforced server-side on every placeOrder.
      |
      */}
        <Route path="/room-menu/:token" element={<RoomMenu />} />

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

        <Route path="/forgot-password" element={<ForgotPassword />} />
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
              <Navigate to="/subscription-checkout" replace />
            ) : (
              <MerchantLayout />
            )
          }
        />
      </Routes>
    </Suspense>
  );
}
