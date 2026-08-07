import { useState, useEffect } from "react";
import axios from "axios";
import {
  ShieldCheck,
  Loader2,
  Store,
  Mail,
  User,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Power,
  Check,
} from "lucide-react";

export default function SuperAdminPanel() {
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchRestaurants = async () => {
    try {
      const res = await axios.get("/admin/restaurants");
      setRestaurants(res.data.data);
    } catch (err) {
      console.error("Error fetching tenants:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRestaurants();
  }, []);

  const handleStatusUpdate = async (id, field, currentStatus) => {
    try {
      await axios.patch(`/admin/restaurants/${id}/status`, {
        [field]: !currentStatus,
      });
      fetchRestaurants();
    } catch  {
      alert("Update failed!");
    }
  };

  if (loading)
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-red-500" size={48} />
      </div>
    );

  // Quick statistics calculation
  const totalStores = restaurants.length;
  const approvedStores = restaurants.filter((r) => r.isApproved).length;
  const pendingStores = totalStores - approvedStores;

  return (
    <div className="min-h-screen bg-[#F8F9FA] p-4 sm:p-6 lg:p-10 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-red-50 text-red-600 rounded-2xl border border-red-100">
              <ShieldCheck size={32} />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                Super Admin Console
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Manage all registered restaurants and tenants on the platform.
              </p>
            </div>
          </div>

          {/* Quick Metrics Badge */}
          <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-2xl border border-slate-100 self-start md:self-auto">
            <div className="px-3 py-1.5 bg-white rounded-xl shadow-xs text-center">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total</p>
              <p className="text-sm font-black text-slate-800">{totalStores}</p>
            </div>
            <div className="px-3 py-1.5 bg-green-50 rounded-xl text-center border border-green-100">
              <p className="text-[10px] font-bold uppercase tracking-wider text-green-600">Approved</p>
              <p className="text-sm font-black text-green-700">{approvedStores}</p>
            </div>
            <div className="px-3 py-1.5 bg-amber-50 rounded-xl text-center border border-amber-100">
              <p className="text-[10px] font-bold uppercase tracking-wider text-amber-600">Pending</p>
              <p className="text-sm font-black text-amber-700">{pendingStores}</p>
            </div>
          </div>
        </div>

        {/* Content Section: Table for Desktop / Cards for Mobile */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
          {restaurants.length === 0 ? (
            <div className="text-center py-16 space-y-3">
              <Store className="mx-auto text-slate-300" size={48} />
              <p className="text-slate-600 font-bold text-sm">No restaurants registered yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 text-slate-400 text-[10px] uppercase font-black tracking-wider border-b border-slate-100">
                  <tr>
                    <th className="p-4 sm:p-5">Store Details</th>
                    <th className="p-4 sm:p-5">Owner Info</th>
                    <th className="p-4 sm:p-5">Status</th>
                    <th className="p-4 sm:p-5 text-right">Access Control</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
                  {restaurants.map((store) => (
                    <tr
                      key={store._id}
                      className="hover:bg-slate-50/80 transition-colors group"
                    >
                      {/* Store Details */}
                      <td className="p-4 sm:p-5">
                        <div className="flex items-center gap-3">
                          <div className="p-2.5 bg-slate-100 group-hover:bg-red-50 text-slate-600 group-hover:text-red-500 rounded-xl transition-colors">
                            <Store size={20} />
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 text-sm">{store.name}</p>
                            <p className="text-xs text-slate-400 font-mono mt-0.5">
                              /{store.slug}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Owner Info */}
                      <td className="p-4 sm:p-5">
                        <div className="flex flex-col gap-1">
                          <span className="flex items-center gap-2 text-slate-700 font-medium">
                            <User size={14} className="text-slate-400" />
                            {store.ownerName || store.name}
                          </span>
                          <span className="flex items-center gap-2 text-slate-400 text-xs">
                            <Mail size={14} className="text-slate-400" />
                            {store.email}
                          </span>
                        </div>
                      </td>

                      {/* Status Badge */}
                      <td className="p-4 sm:p-5">
                        <div className="flex flex-col gap-1.5 items-start">
                          <span
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                              store.isApproved
                                ? "bg-green-50 text-green-600 border border-green-200"
                                : "bg-amber-50 text-amber-600 border border-amber-200"
                            }`}
                          >
                            {store.isApproved ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
                            {store.isApproved ? "Approved" : "Pending"}
                          </span>

                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[9px] font-bold uppercase ${
                              store.isActive !== false
                                ? "bg-emerald-50 text-emerald-600"
                                : "bg-rose-50 text-rose-600"
                            }`}
                          >
                            {store.isActive !== false ? "Active" : "Blocked"}
                          </span>
                        </div>
                      </td>

                      {/* Access Control Action Buttons */}
                      <td className="p-4 sm:p-5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {/* Block/Unblock Button */}
                          <button
                            onClick={() =>
                              handleStatusUpdate(store._id, "isActive", store.isActive !== false)
                            }
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 cursor-pointer ${
                              store.isActive !== false
                                ? "bg-white text-rose-600 border-rose-200 hover:bg-rose-50"
                                : "bg-white text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                            }`}
                            title={store.isActive !== false ? "Block Restaurant Access" : "Unblock Restaurant"}
                          >
                            <Power size={13} />
                            {store.isActive !== false ? "Block" : "Unblock"}
                          </button>

                          {/* Approve/Reject Button */}
                          <button
                            onClick={() =>
                              handleStatusUpdate(store._id, "isApproved", store.isApproved)
                            }
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 cursor-pointer ${
                              store.isApproved
                                ? "bg-white text-amber-600 border-amber-200 hover:bg-amber-50"
                                : "bg-gradient-to-r from-red-500 to-rose-600 text-white border-transparent hover:opacity-95 shadow-sm shadow-red-500/20"
                            }`}
                          >
                            {store.isApproved ? <XCircle size={13} /> : <Check size={13} />}
                            {store.isApproved ? "Revoke" : "Approve"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}