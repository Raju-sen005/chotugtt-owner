import { useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { Menu, X } from "lucide-react";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import LiveOrderMonitor from "../features/orders/LiveOrderMonitor";
import DashboardOverview from "../features/dashboard/DashboardOverview";
import MenuCatalog from "../features/menu/MenuCatalog";
import StoreSettings from "../features/settings/StoreSettings";
import TableMonitor from "../components/TableMonitor";
import SuperAdminPanel from "../features/admin/SuperAdminPanel";
import Analysis from "../features/analysis/Analysis";
import Offers from "../features/offers/Offers";
import Payment from "../features/payment/Payment";
import logo from "../assets/cho.png";
import CounterPOS from "../components/CounterPOS";
import AIMarketingDashboard from "../components/AIMarketingDashboard";

export default function MerchantLayout() {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#F7F9FB] flex antialiased text-slate-800">
      <div className="hidden lg:block fixed inset-y-0 left-0 w-64 bg-white border-r border-slate-200/80 z-30">
        <Sidebar />
      </div>

      {isMobileSidebarOpen && (
        <div
          onClick={() => setIsMobileSidebarOpen(false)}
          className="lg:hidden fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40 transition-opacity"
        />
      )}

      <div
        className={`lg:hidden fixed inset-y-0 left-0 w-64 bg-white shadow-2xl z-50 transform ${
          isMobileSidebarOpen ? "translate-x-0" : "-translate-x-full"
        } transition-transform duration-300 ease-out`}
      >
        <div
          className="absolute top-4 right-4 p-1 text-slate-500"
          onClick={() => setIsMobileSidebarOpen(false)}
        >
          <X size={20} className="cursor-pointer" />
        </div>
        <Sidebar closeMobileSidebar={() => setIsMobileSidebarOpen(false)} />
      </div>

      <div className="flex-1 w-full lg:pl-64 flex flex-col min-h-screen">
        <header className="sticky top-0 bg-white backdrop-blur-md border-b border-slate-200/60 z-20 px-4 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileSidebarOpen(true)}
              className="lg:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
            >
              <Menu size={20} />
            </button>
            <h2 className="text-sm font-black text-slate-900 tracking-tight lg:hidden">
              <img src={logo} alt="Chotu" style={{ height: "100px" }} />
            </h2>
          </div>
          <Navbar />
        </header>

        <main className="flex-1 p-4 md:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <Routes>
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
            <Route path="/super-admin" element={<SuperAdminPanel />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
