import { lazy, Suspense, useEffect, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

import { Menu, X } from "lucide-react";

import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import GlobalOrderAlert from "../components/GlobalOrderAlert";
import {
  isHotelOnlyPlan,
  resolveMerchantHomePath,
} from "../components/sidebarHotelNav";
import {
  FEATURE_KEYS,
  hasAvailableFeature,
  hasAnyAvailableFeature,
} from "../features/subscription/featureAccess";

const LiveOrderMonitor = lazy(
  () => import("../features/orders/LiveOrderMonitor"),
);
const DashboardOverview = lazy(
  () => import("../features/dashboard/DashboardOverview"),
);
const HotelOverview = lazy(
  () => import("../features/dashboard/HotelOverview"),
);
const MenuCatalog = lazy(() => import("../features/menu/MenuCatalog"));
const StoreSettings = lazy(() => import("../features/settings/StoreSettings"));
const TableMonitor = lazy(() => import("../components/TableMonitor"));
const SuperAdminPanel = lazy(() => import("../features/admin/SuperAdminPanel"));
const Analysis = lazy(() => import("../features/analysis/Analysis"));
const Offers = lazy(() => import("../features/offers/Offers"));
const Payment = lazy(() => import("../features/payment/Payment"));
const CounterPOS = lazy(() => import("../components/CounterPOS"));
const Profile = lazy(() => import("../features/profile/RestaurantProfile"));
const AIMarketingDashboard = lazy(
  () => import("../components/AIMarketingDashboard"),
);
const StaffManagement = lazy(
  () => import("../features/profile/StaffManagement"),
);
const EventManagement = lazy(() => import("../components/EventManagement"));
const RoomsManagement = lazy(
  () => import("../features/rooms/RoomsManagement"),
);
const GuestManagement = lazy(
  () => import("../features/guests/GuestManagement"),
);
const BookingManagement = lazy(
  () => import("../features/bookings/BookingManagement"),
);
const RoomQrManagement = lazy(
  () => import("../features/roomQr/RoomQrManagement"),
);
const FolioManagement = lazy(
  () => import("../features/folios/FolioManagement"),
);
const SupplyAdmin = lazy(() => import("../features/supply/SupplyAdmin"));

const SupplyStore = lazy(() => import("../features/supply/SupplyStore"));
function PageLoading() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--primary)]" />
    </div>
  );
}

function FeatureRoute({ user, feature, anyOf, children, fallback }) {
  const allowed = anyOf
    ? hasAnyAvailableFeature(user, anyOf)
    : hasAvailableFeature(user, feature);
  if (!allowed) {
    return <Navigate to={fallback} replace />;
  }
  return children;
}

export default function MerchantLayout() {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const { user } = useAuth();
  const isSuperAdmin = user?.role === "SUPERADMIN";
  const hotelOnlyPlan = !isSuperAdmin && isHotelOnlyPlan(user);
  const merchantHomePath = resolveMerchantHomePath(user);

  useEffect(() => {
    if (!isMobileSidebarOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        setIsMobileSidebarOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isMobileSidebarOpen]);

  return (
    <div
      className="
        min-h-screen
        bg-[var(--background)]
        flex
        antialiased
        text-[var(--text-secondary)]
      "
    >
      {/* =====================================================
          GLOBAL ORDER ALERT
          ===================================================== */}

      {!hotelOnlyPlan ? <GlobalOrderAlert /> : null}

      {/* =====================================================
          DESKTOP SIDEBAR
          ===================================================== */}

      <div
        className="
          hidden
          lg:block
          fixed
          inset-y-0
          left-0
          w-64
          bg-white
          border-r
          border-[var(--border)]
          overflow-hidden
          z-30
        "
      >
        <Sidebar />
      </div>

      {/* =====================================================
          MOBILE SIDEBAR BACKDROP
          ===================================================== */}

      {isMobileSidebarOpen && (
        <div
          onClick={() => setIsMobileSidebarOpen(false)}
          className="
            lg:hidden
            fixed
            inset-0
            bg-slate-900/40
            backdrop-blur-xs
            z-40
            transition-opacity
          "
        />
      )}

      {/* =====================================================
          MOBILE SIDEBAR
          ===================================================== */}

      <div
        className={`lg:hidden fixed inset-y-0 left-0 w-64 overflow-hidden bg-white shadow-2xl z-50 transform ${
          isMobileSidebarOpen ? "translate-x-0" : "-translate-x-full"
        } transition-transform duration-300 ease-out`}
      >
        <div
          className="
            absolute
            top-2
            right-0
            p-1
            text-[var(--text-muted)]
          "
        >
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setIsMobileSidebarOpen(false)}
            className="cursor-pointer rounded-lg p-1 hover:bg-[var(--primary-light)] hover:text-[var(--primary-dark)]"
          >
            <X size={20} />
          </button>
        </div>

        <Sidebar closeMobileSidebar={() => setIsMobileSidebarOpen(false)} />
      </div>

      {/* =====================================================
          MAIN APPLICATION
          ===================================================== */}

      <div
        className="
          flex-1
          w-full
          min-w-0
          lg:pl-64
          flex
          flex-col
          min-h-screen
        "
      >
        {/* ===================================================
            NAVBAR
            =================================================== */}

        <header
          className="
            sticky
            top-0
            bg-[var(--surface)]/95
            backdrop-blur-md
            border-b
            border-[var(--border)]
            z-20
            px-4
            lg:px-8
            h-16
            flex
            items-center
            justify-between
          "
        >
          <div
            className="
              flex
              items-center
              gap-3
            "
          >
            <button
              onClick={() => setIsMobileSidebarOpen(true)}
              className="
                lg:hidden
                p-2
                text-[var(--text-secondary)]
                hover:bg-[var(--hover-bg)]
                rounded-[14px]
                cursor-pointer
              "
              aria-label="Open navigation"
            >
              <Menu size={20} />
            </button>

            <p className="font-display text-base font-bold tracking-tight text-[var(--brand-navy)] lg:hidden">
              Transserve
            </p>
          </div>

          <Navbar />
        </header>

        {/* ===================================================
            PAGE CONTENT
            =================================================== */}

        <main
          className="
            flex-1
            min-w-0
            overflow-x-hidden
            p-4
            md:p-6
            lg:p-8
            max-w-7xl
            w-full
            mx-auto
          "
        >
          <Suspense fallback={<PageLoading />}>
            <Routes>
              {isSuperAdmin ? (
                <>
                  <Route path="/super-admin" element={<SuperAdminPanel />} />

                  <Route path="/super-admin/supply" element={<SupplyAdmin />} />

                  <Route
                    path="*"
                    element={<Navigate to="/super-admin" replace />}
                  />
                </>
              ) : (
                <>
                  <Route
                    path="/"
                    element={
                      hotelOnlyPlan ? (
                        <HotelOverview />
                      ) : (
                        <DashboardOverview />
                      )
                    }
                  />

                  <Route
                    path="/orders"
                    element={
                      hotelOnlyPlan ? (
                        <Navigate to={merchantHomePath} replace />
                      ) : (
                        <FeatureRoute
                          user={user}
                          feature={FEATURE_KEYS.POS}
                          fallback={merchantHomePath}
                        >
                          <LiveOrderMonitor />
                        </FeatureRoute>
                      )
                    }
                  />

                  <Route
                    path="/menu"
                    element={
                      hotelOnlyPlan ? (
                        <Navigate to={merchantHomePath} replace />
                      ) : (
                        <FeatureRoute
                          user={user}
                          feature={FEATURE_KEYS.MENU}
                          fallback={merchantHomePath}
                        >
                          <MenuCatalog />
                        </FeatureRoute>
                      )
                    }
                  />
                  <Route
                    path="/supply"
                    element={
                      hotelOnlyPlan ? (
                        <Navigate to={merchantHomePath} replace />
                      ) : (
                        <SupplyStore />
                      )
                    }
                  />
                  <Route
                    path="/settings"
                    element={
                      hotelOnlyPlan ? (
                        <Navigate to={merchantHomePath} replace />
                      ) : (
                        <StoreSettings />
                      )
                    }
                  />

                  <Route
                    path="/table-monitor"
                    element={
                      hotelOnlyPlan ? (
                        <Navigate to={merchantHomePath} replace />
                      ) : (
                        <FeatureRoute
                          user={user}
                          feature={FEATURE_KEYS.QR_TABLE}
                          fallback={merchantHomePath}
                        >
                          <TableMonitor />
                        </FeatureRoute>
                      )
                    }
                  />

                  <Route
                    path="/analysis"
                    element={
                      hotelOnlyPlan ? (
                        <Navigate to={merchantHomePath} replace />
                      ) : (
                        <FeatureRoute
                          user={user}
                          feature={FEATURE_KEYS.ANALYSIS}
                          fallback={merchantHomePath}
                        >
                          <Analysis />
                        </FeatureRoute>
                      )
                    }
                  />

                  <Route
                    path="/offer"
                    element={
                      hotelOnlyPlan ? (
                        <Navigate to={merchantHomePath} replace />
                      ) : (
                        <FeatureRoute
                          user={user}
                          feature={FEATURE_KEYS.OFFERS}
                          fallback={merchantHomePath}
                        >
                          <Offers />
                        </FeatureRoute>
                      )
                    }
                  />

                  <Route
                    path="/payment"
                    element={
                      hotelOnlyPlan ? (
                        <Navigate to={merchantHomePath} replace />
                      ) : (
                        <FeatureRoute
                          user={user}
                          anyOf={[FEATURE_KEYS.PAYMENTS, FEATURE_KEYS.BILLING]}
                          fallback={merchantHomePath}
                        >
                          <Payment />
                        </FeatureRoute>
                      )
                    }
                  />

                  <Route
                    path="/marketing"
                    element={
                      hotelOnlyPlan ? (
                        <Navigate to={merchantHomePath} replace />
                      ) : (
                        <AIMarketingDashboard />
                      )
                    }
                  />

                  <Route
                    path="/counter"
                    element={
                      hotelOnlyPlan ? (
                        <Navigate to={merchantHomePath} replace />
                      ) : (
                        <FeatureRoute
                          user={user}
                          feature={FEATURE_KEYS.POS}
                          fallback={merchantHomePath}
                        >
                          <CounterPOS />
                        </FeatureRoute>
                      )
                    }
                  />

                  <Route path="/profile" element={<Profile />} />

                  <Route
                    path="/events"
                    element={
                      hotelOnlyPlan ? (
                        <Navigate to={merchantHomePath} replace />
                      ) : (
                        <FeatureRoute
                          user={user}
                          feature={FEATURE_KEYS.EVENT_MANAGEMENT}
                          fallback={merchantHomePath}
                        >
                          <EventManagement />
                        </FeatureRoute>
                      )
                    }
                  />
                  <Route
                    path="/rooms"
                    element={
                      <FeatureRoute
                        user={user}
                        feature={FEATURE_KEYS.ROOM_MANAGEMENT}
                        fallback={merchantHomePath}
                      >
                        <RoomsManagement />
                      </FeatureRoute>
                    }
                  />
                  <Route
                    path="/guests"
                    element={
                      <FeatureRoute
                        user={user}
                        feature={FEATURE_KEYS.GUEST_MANAGEMENT}
                        fallback={merchantHomePath}
                      >
                        <GuestManagement />
                      </FeatureRoute>
                    }
                  />
                  <Route
                    path="/bookings"
                    element={
                      <FeatureRoute
                        user={user}
                        feature={FEATURE_KEYS.ROOM_BOOKING}
                        fallback={merchantHomePath}
                      >
                        <BookingManagement />
                      </FeatureRoute>
                    }
                  />
                  <Route
                    path="/room-qr"
                    element={
                      <FeatureRoute
                        user={user}
                        feature={FEATURE_KEYS.ROOM_QR_ORDERING}
                        fallback={merchantHomePath}
                      >
                        <RoomQrManagement />
                      </FeatureRoute>
                    }
                  />
                  <Route
                    path="/room-folios"
                    element={
                      <FeatureRoute
                        user={user}
                        feature={FEATURE_KEYS.ROOM_FOLIO}
                        fallback={merchantHomePath}
                      >
                        <FolioManagement />
                      </FeatureRoute>
                    }
                  />
                  <Route path="/staff" element={<StaffManagement />} />

                  <Route
                    path="*"
                    element={<Navigate to={merchantHomePath} replace />}
                  />
                </>
              )}
            </Routes>
          </Suspense>
        </main>
      </div>
    </div>
  );
}
