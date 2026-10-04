import { lazy, Suspense, useEffect, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

import { Menu, X } from "lucide-react";

import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import GlobalOrderAlert from "../components/GlobalOrderAlert";

const LiveOrderMonitor = lazy(() => import("../features/orders/LiveOrderMonitor"));
const DashboardOverview = lazy(() => import("../features/dashboard/DashboardOverview"));
const MenuCatalog = lazy(() => import("../features/menu/MenuCatalog"));
const StoreSettings = lazy(() => import("../features/settings/StoreSettings"));
const TableMonitor = lazy(() => import("../components/TableMonitor"));
const SuperAdminPanel = lazy(() => import("../features/admin/SuperAdminPanel"));
const Analysis = lazy(() => import("../features/analysis/Analysis"));
const Offers = lazy(() => import("../features/offers/Offers"));
const Payment = lazy(() => import("../features/payment/Payment"));
const CounterPOS = lazy(() => import("../components/CounterPOS"));
const Profile = lazy(() => import("../features/profile/RestaurantProfile"));
const AIMarketingDashboard = lazy(() => import("../components/AIMarketingDashboard"));
const StaffManagement = lazy(() => import("../features/profile/StaffManagement"));

function PageLoading() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--primary)]" />
    </div>
  );
}

export default function MerchantLayout() {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const { user } = useAuth();
  const isSuperAdmin = user?.role === "SUPERADMIN";

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

      <GlobalOrderAlert />

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
            bg-white
            backdrop-blur-md
            border-b
            border-slate-200/60
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
                text-slate-600
                hover:bg-slate-100
                rounded-xl
                cursor-pointer
              "
            >
              <Menu size={20} />
            </button>

            <p className="text-base font-black tracking-tight text-slate-900 lg:hidden">
              Chotu<span className="text-[var(--secondary)]">GTT</span>
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
                <Route
                  path="*"
                  element={<Navigate to="/super-admin" replace />}
                />
              </>
            ) : (
              <>
                <Route path="/" element={<DashboardOverview />} />

                <Route path="/orders" element={<LiveOrderMonitor />} />

                <Route path="/menu" element={<MenuCatalog />} />

                <Route path="/settings" element={<StoreSettings />} />

                <Route path="/table-monitor" element={<TableMonitor />} />

                <Route path="/analysis" element={<Analysis />} />

                <Route path="/offer" element={<Offers />} />

                <Route path="/payment" element={<Payment />} />

                <Route path="/marketing" element={<AIMarketingDashboard />} />

                <Route path="/counter" element={<CounterPOS />} />

                <Route path="/profile" element={<Profile />} />

                <Route path="/staff" element={<StaffManagement />} />

                <Route path="*" element={<Navigate to="/" replace />} />
              </>
            )}
          </Routes>
          </Suspense>
        </main>
      </div>
    </div>
  );
}
