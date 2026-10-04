import { useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { LogOut } from "lucide-react";
import axios from "axios";

export default function Navbar() {
  const { user } = useAuth();

  const handleLogout = useCallback(async () => {
    try {
      await axios.post("/auth/logout");
      window.location.reload();
    } catch {
      console.error("Logout runtime error");
    }
  }, []);

  return (
    <div className="flex-1 flex items-center justify-between gap-2 min-w-0">
      <div className="flex items-center gap-1.5 sm:gap-2 text-sm font-medium text-slate-600 min-w-0">
        {/* <Building size={16} className="text-slate-400 shrink-0" />
        <span className="hidden sm:inline font-semibold text-slate-800 whitespace-nowrap">
          Tenant Context:
        </span>
        <span className="bg-slate-100 px-2 py-0.5 rounded text-[10px] sm:text-xs font-mono truncate max-w-[90px] sm:max-w-none">
          {user?.restaurantId}
        </span> */}
      </div>

      <div className="flex items-center gap-2 sm:gap-4 shrink-0">
        <div className="hidden xs:flex sm:flex items-center gap-1.5 sm:gap-2 text-right">
          <p className="hidden sm:block text-sm font-semibold text-slate-800 truncate max-w-[120px]">
            {user?.name}
          </p>
          <span className="text-[9px] sm:text-[10px] bg-red-50 text-red-600 font-bold px-1.5 py-0.5 rounded-sm uppercase tracking-wide whitespace-nowrap">
            {user?.role}
          </span>
        </div>

        <button
          onClick={handleLogout}
          className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--primary)] hover:bg-[var(--primary-light)] transition-all cursor-pointer shrink-0"
          title="Sign Out"
        >
          <LogOut size={18} />
        </button>
      </div>
    </div>
  );
}