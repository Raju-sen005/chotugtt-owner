import { useState } from "react";
import {
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import { Menu, X } from "lucide-react";

import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import GlobalOrderAlert from "../components/GlobalOrderAlert";

import LiveOrderMonitor from "../features/orders/LiveOrderMonitor";
import DashboardOverview from "../features/dashboard/DashboardOverview";
import MenuCatalog from "../features/menu/MenuCatalog";
import StoreSettings from "../features/settings/StoreSettings";
import TableMonitor from "../components/TableMonitor";
import SuperAdminPanel from "../features/admin/SuperAdminPanel";
import Analysis from "../features/analysis/Analysis";
import Offers from "../features/offers/Offers";
import Payment from "../features/payment/Payment";
import CounterPOS from "../components/CounterPOS";
import Profile from "../features/profile/RestaurantProfile";
import AIMarketingDashboard from "../components/AIMarketingDashboard";
import StaffManagement from "../features/profile/StaffManagement";

export default function MerchantLayout() {
  const [
    isMobileSidebarOpen,
    setIsMobileSidebarOpen,
  ] = useState(false);

  return (
    <div
      className="
        min-h-screen
        bg-[#F7F9FB]
        flex
        antialiased
        text-slate-800
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
          border-slate-200/80
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
          onClick={() =>
            setIsMobileSidebarOpen(false)
          }
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
        className={`lg:hidden fixed inset-y-0 left-0 w-64 bg-white shadow-2xl z-50 transform ${
          isMobileSidebarOpen
            ? "translate-x-0"
            : "-translate-x-full"
        } transition-transform duration-300 ease-out`}
      >
        <div
          className="
            absolute
            top-2
            right-0
            p-1
            text-slate-500
          "
          onClick={() =>
            setIsMobileSidebarOpen(false)
          }
        >
          <X
            size={20}
            className="cursor-pointer"
          />
        </div>

        <Sidebar
          closeMobileSidebar={() =>
            setIsMobileSidebarOpen(false)
          }
        />
      </div>

      {/* =====================================================
          MAIN APPLICATION
          ===================================================== */}

      <div
        className="
          flex-1
          w-full
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
              onClick={() =>
                setIsMobileSidebarOpen(
                  true
                )
              }
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

            <h2
              className="
                text-sm
                font-black
                text-slate-900
                tracking-tight
                lg:hidden
              "
            >
              <svg
                version="1.0"
                xmlns="http://www.w3.org/2000/svg"
                width="206px"
                height="40px"
                viewBox="0 0 306 79"
                preserveAspectRatio="xMidYMid meet"
              >
                <g fill="#00000000">
                  <path d="M0 39.48 l0 -39.48 153 0 153 0 0 39.48 0 39.48 -153 0 -153 0 0 -39.48z m29.18 23.21 c4.44 -0.59 8.48 -2.08 11.61 -4.32 2.08 -1.48 2.27 -0.93 -1.54 -4.60 l-3.30 -3.21 -0.82 0.60 c-1.48 1.11 -3.50 1.99 -5.57 2.42 -1.43 0.31 -5.01 0.31 -6.55 -0.02 -4.75 -0.97 -8.27 -4.33 -9.56 -9.15 -0.34 -1.30 -0.39 -1.79 -0.40 -4.03 0 -2.31 0.03 -2.68 0.42 -4.09 1.28 -4.66 4.26 -7.63 8.91 -8.90 1.11 -0.29 1.67 -0.34 3.84 -0.34 3.67 0 5.89 0.60 8.39 2.24 l1.20 0.79 0.86 -0.82 c0.49 -0.46 1.97 -1.90 3.30 -3.21 l2.42 -2.38 -0.57 -0.46 c-4.44 -3.58 -11.14 -5.60 -17.26 -5.20 -1.77 0.12 -2.02 0.17 -3.83 0.56 -8.93 1.97 -15.75 8.36 -17.74 16.61 -0.51 2.10 -0.76 4.50 -0.63 6.26 0.72 10.33 7.84 18.40 18.34 20.74 3.22 0.72 5.58 0.86 8.47 0.48z" />
                </g>

                <g fill="#000000">
                  <path d="M23.17 63.22 c-2.88 -0.34 -6.29 -1.34 -8.73 -2.56 -7.53 -3.78 -12.11 -10.78 -12.52 -19.17 -0.60 -11.78 7.23 -21.22 19.59 -23.61 0.43 -0.08 1.70 -0.22 2.81 -0.29 4.60 -0.34 9.44 0.52 13.46 2.41 1.47 0.69 3.90 2.24 5.01 3.18 l0.59 0.51 -2.59 2.56 c-1.43 1.40 -3.15 3.05 -3.79 3.67 l-1.17 1.13 -0.80 -0.63 c-2.51 -1.99 -6.42 -3.15 -9.73 -2.90 -5.71 0.45 -9.87 3.84 -11.34 9.28 -0.83 3.04 -0.48 6.97 0.86 9.66 1.42 2.82 3.52 4.80 6.37 5.97 2.90 1.20 6.72 1.30 9.82 0.22 1.37 -0.48 2.98 -1.34 4.01 -2.17 l0.96 -0.77 3.76 3.64 c2.07 2.01 3.76 3.69 3.76 3.72 0 0.09 -0.96 0.88 -2.22 1.79 -1.40 1 -3.90 2.31 -5.64 2.93 -3.73 1.34 -8.58 1.91 -12.46 1.47z" />
                </g>

                <g fill="#e75822">
                  <path d="M202.43 62.91 c-1.50 -0.22 -3.45 -0.74 -4.94 -1.33 -7.48 -2.93 -12.48 -9.27 -13.65 -17.31 -0.29 -1.93 -0.12 -6.51 0.29 -8.19 2.10 -8.42 7.62 -14.22 15.67 -16.43 2.56 -0.71 6.29 -1 8.79 -0.69 3.10 0.37 6.20 1.39 8.79 2.87 1.74 1 2.71 1.76 4.36 3.36 l1.42 1.39 -1.50 1.51 c-0.83 0.83 -1.56 1.51 -1.63 1.51 -0.06 0 -0.62 -0.49 -1.23 -1.10 -1.56 -1.54 -2.87 -2.50 -4.66 -3.38 -2.99 -1.47 -5.01 -1.91 -8.17 -1.77 -1.19 0.06 -2.61 0.20 -3.16 0.31 -2.56 0.52 -3.36 0.72 -3.90 1 -0.32 0.15 -0.79 0.32 -1.03 0.39 -0.25 0.06 -0.49 0.15 -0.54 0.23 -0.05 0.08 -0.39 0.28 -0.76 0.45 -4.73 5.66 -5.55 14.04 -2.05 20.57 4.40 8.19 15.07 11.37 23.44 6.99 2.31 -1.20 4.72 -3.52 5.94 -5.71 1 -1.76 1.91 -4.80 1.91 -6.29 0 -0.39 -0.08 -0.52 -0.34 -0.60 -0.20 -0.60 -0.20 -0.05 -3.92 -0.09 -8.27 -0.09 l-7.91 0 0.05 -1.88 0.05 -1.90 10.55 -0.05 10.55 -0.03 -0.09 2.81 c-0.12 4.04 -0.66 6.32 -2.22 9.45 -1.74 3.49 -4.49 6.29 -8.19 8.39 -0.63 0.34 -1.25 0.63 -1.40 0.63 -0.14 0 -0.32 0.06 -0.42 0.14 -0.22 0.20 -3.13 1.08 -4.15 1.25 -1.11 0.19 -6.11 0.17 -7.40 -0.02z" />
                  <path d="M245.49 62.36 c-0.06 -0.05 -0.11 -8.76 -0.11 -19.36 l0 -19.25 -7.67 -0.03 -7.68 -0.05 -0.05 -1.94 -0.05 -1.94 2.44 -0.09 c1.34 -0.06 9.33 -0.11 17.75 -0.11 l15.32 0 -0.05 2.05 -0.05 2.04 -7.67 0.05 -7.68 0.03 0 19.36 0 19.36 -2.21 0 c-1.22 0 -2.27 -0.05 -2.31 -0.11z" />
                  <path d="M282.65 61.89 c-0.05 -0.32 -0.09 -9.04 -0.09 -19.36 l0 -18.79 -7.67 -0.03 -7.68 -0.05 -0.05 -2.05 -0.05 -2.04 17.86 0.03 17.86 0.05 -0.02 1.79 c0 0.97 -0.05 1.90 -0.11 2.04 -0.09 0.25 -0.72 0.26 -7.74 0.26 l-7.63 0 -0.03 19.33 -0.05 19.31 -2.25 0.05 -2.25 0.05 -0.11 -0.59z" />
                </g>
              </svg>
            </h2>
          </div>

          <Navbar />
        </header>

        {/* ===================================================
            PAGE CONTENT
            =================================================== */}

        <main
          className="
            flex-1
            p-4
            md:p-6
            lg:p-8
            max-w-7xl
            w-full
            mx-auto
          "
        >
          <Routes>
            <Route
              path="/"
              element={
                <DashboardOverview />
              }
            />

            <Route
              path="/orders"
              element={
                <LiveOrderMonitor />
              }
            />

            <Route
              path="/menu"
              element={
                <MenuCatalog />
              }
            />

            <Route
              path="/settings"
              element={
                <StoreSettings />
              }
            />

            <Route
              path="/table-monitor"
              element={
                <TableMonitor />
              }
            />

            <Route
              path="/analysis"
              element={
                <Analysis />
              }
            />

            <Route
              path="/offer"
              element={
                <Offers />
              }
            />

            <Route
              path="/payment"
              element={
                <Payment />
              }
            />

            <Route
              path="/marketing"
              element={
                <AIMarketingDashboard />
              }
            />

            <Route
              path="/counter"
              element={
                <CounterPOS />
              }
            />

            <Route
              path="/super-admin"
              element={
                <SuperAdminPanel />
              }
            />

            <Route
              path="/profile"
              element={
                <Profile />
              }
            />

            <Route
              path="/staff"
              element={
                <StaffManagement />
              }
            />

            <Route
              path="*"
              element={
                <Navigate
                  to="/"
                  replace
                />
              }
            />
          </Routes>
        </main>
      </div>
    </div>
  );
}