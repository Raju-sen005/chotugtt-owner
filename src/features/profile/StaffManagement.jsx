import { useEffect, useMemo, useRef, useState } from "react";
import {
  UserPlus,
  Pencil,
  Trash2,
  Power,
  Loader2,
  Users,
  X,
  Search,
  Eye,
  EyeOff,
  Mail,
  Lock,
  User,
} from "lucide-react";
import {
  displayStaffEmail,
  staffEmailForForm,
  staffEmailSearchText,
} from "./staffDisplay";

const initialsOf = (name) =>
  String(name || "")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] || "")
    .join("")
    .toUpperCase();

const formatCreated = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const AVATAR_COLORS = [
  "bg-rose-100 text-rose-600",
  "bg-violet-100 text-violet-600",
  "bg-sky-100 text-sky-600",
  "bg-amber-100 text-amber-700",
  "bg-emerald-100 text-emerald-700",
  "bg-pink-100 text-pink-600",
];

const API_BASE = import.meta.env.VITE_APP_API_BASE;

export default function StaffManagement() {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [editingStaff, setEditingStaff] = useState(null);

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
  });

  const [error, setError] = useState("");
  const [staffSearch, setStaffSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [showPassword, setShowPassword] = useState(false);
  const nameRef = useRef(null);

  const loadStaff = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `${API_BASE}/staff`,
        {
          credentials: "include",
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Unable to load staff"
        );
      }

      setStaff(data.data || []);
    } catch (error) {
      console.error(error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStaff();
  }, []);

  const openEdit = (item) => {
    setEditingStaff(item);

    setForm({
      name: item.name || "",
      email: staffEmailForForm(item.email),
      password: "",
    });

    setError("");
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setSaving(true);
      setError("");

      const isEdit = Boolean(editingStaff);

      const payload = {
        name: form.name,
        email: form.email,
      };

      if (form.password) {
        payload.password = form.password;
      }

      if (!isEdit && !form.password) {
        setError("Password is required");
        return;
      }

      const url = isEdit
        ? `${API_BASE}/staff/${editingStaff.id}`
        : `${API_BASE}/staff`;

      const response = await fetch(url, {
        method: isEdit ? "PATCH" : "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message ||
            "Unable to save Captain"
        );
      }

      setEditingStaff(null);
      setForm({ name: "", email: "", password: "" });
      setShowPassword(false);

      await loadStaff();
    } catch (error) {
      console.error(error);
      setError(error.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (item) => {
    try {
      const response = await fetch(
        `${API_BASE}/staff/${item.id}/status`,
        {
          method: "PATCH",
          credentials: "include",
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message ||
            "Unable to update status"
        );
      }

      await loadStaff();
    } catch (error) {
      console.error(error);
      setError(error.message);
    }
  };

  const deleteStaff = async (item) => {
    const confirmed = window.confirm(
      `Delete Captain "${item.name}"?`
    );

    if (!confirmed) return;

    try {
      const response = await fetch(
        `${API_BASE}/staff/${item.id}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message ||
            "Unable to delete Captain"
        );
      }

      await loadStaff();
    } catch (error) {
      console.error(error);
      setError(error.message);
    }
  };

  const activeCount = staff.filter((item) => item.isActive).length;
  const inactiveCount = staff.length - activeCount;
  const activeShare = staff.length ? Math.round((activeCount / staff.length) * 100) : 0;
  const inactiveShare = staff.length ? Math.round((inactiveCount / staff.length) * 100) : 0;
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const recentCount = staff.filter(
    (item) => item.createdAt && new Date(item.createdAt) >= monthStart,
  ).length;

  const visibleStaff = useMemo(() => {
    const search = staffSearch.trim().toLowerCase();
    return staff.filter((item) => {
      if (statusFilter === "ACTIVE" && !item.isActive) return false;
      if (statusFilter === "INACTIVE" && item.isActive) return false;
      if (!search) return true;
      return (
        String(item.name || "").toLowerCase().includes(search) ||
        staffEmailSearchText(item.email).includes(search)
      );
    });
  }, [staff, staffSearch, statusFilter]);

  const resetForm = () => {
    setEditingStaff(null);
    setForm({ name: "", email: "", password: "" });
    setShowPassword(false);
    setError("");
  };

  return (
    <div className="-m-4 bg-[var(--background)] p-4 font-sans text-slate-900 md:-m-6 md:p-5 lg:-m-8 lg:p-5">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-rose-500 via-rose-500 to-orange-400  p-5 text-white">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight">Staff Management</h1>
              <p className="mt-1 max-w-xl text-sm text-white/85">
                Manage your restaurant staff and captain accounts. Add, edit, activate or deactivate staff members.
              </p>
            </div>
          </div>
          <div className="rounded-2xl bg-white/15 px-4 py-3 text-right">
            <p className="text-[11px] font-bold text-white/80">Total Staff</p>
            <p className="text-2xl font-black">{staff.length}</p>
            <p className="mt-1 text-[11px] font-semibold text-emerald-100">{activeCount} active · {inactiveCount} inactive</p>
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Total Staff", staff.length, Users, "text-sky-600 bg-sky-50", "All staff members"],
          ["Active Staff", activeCount, UserPlus, "text-emerald-600 bg-emerald-50", `${activeShare}% active`],
          ["Inactive Staff", inactiveCount, Users, "text-rose-600 bg-rose-50", `${inactiveShare}% inactive`],
          ["Recently Added", recentCount, Users, "text-violet-600 bg-violet-50", "This month"],
        ].map(([label, value, Icon, tint, note]) => (
          <div key={label} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${tint}`}><Icon size={16} /></span>
              <p className="text-[11px] font-bold text-slate-400">{label}</p>
            </div>
            <p className="mt-3 text-2xl font-black text-slate-900">{value}</p>
            <p className="mt-1 text-[11px] font-bold text-slate-400">{note}</p>
          </div>
        ))}
      </div>

      {error && (
        <div className="mt-4 rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-600">
          {error}
        </div>
      )}

      <div className="mt-4 grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section className="min-w-0 rounded-3xl border border-slate-100 bg-white shadow-sm">
          <div className="flex flex-col gap-2 border-b border-slate-100 p-3 lg:flex-row lg:items-center">
            <div className="relative min-w-0 flex-1">
              <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={staffSearch}
                onChange={(e) => setStaffSearch(e.target.value)}
                placeholder="Search by name or email..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-8 pr-3 text-xs font-semibold outline-none focus:border-rose-300 focus:bg-white"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Filter by status"
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 outline-none"
            >
              <option value="ALL">All Status</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
            <button
              type="button"
              onClick={() => {
                resetForm();
                nameRef.current?.focus();
              }}
              className="inline-flex items-center justify-center gap-1 rounded-xl bg-rose-500 px-3 py-2 text-xs font-black text-white"
            >
              <UserPlus size={14} /> Add Staff
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="animate-spin text-rose-500" size={28} />
            </div>
          ) : visibleStaff.length === 0 ? (
            <div className="py-16 text-center">
              <Users size={36} className="mx-auto text-slate-300" />
              <h3 className="mt-3 text-sm font-black text-slate-700">
                {staff.length === 0 ? "No captains yet" : "No matching staff"}
              </h3>
              <p className="mt-1 text-xs text-slate-400">
                {staff.length === 0 ? "Create the first captain account." : "Try a different name, email, or status."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px]">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-[11px] font-bold uppercase tracking-wide text-slate-400">
                    <th className="px-4 py-3">#</th>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Created At</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleStaff.map((item, index) => (
                    <tr key={item.id} className="border-b border-slate-50 last:border-0">
                      <td className="px-4 py-3 text-xs font-bold text-slate-400">{index + 1}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className={`flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-black ${AVATAR_COLORS[index % AVATAR_COLORS.length]}`}>
                            {initialsOf(item.name) || "C"}
                          </span>
                          <div>
                            <p className="text-sm font-black text-slate-800">{item.name}</p>
                            <p className="text-[10px] font-bold text-violet-500">Captain</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs font-semibold text-slate-500">{displayStaffEmail(item.email)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-bold ${item.isActive ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${item.isActive ? "bg-emerald-500" : "bg-rose-500"}`} />
                          {item.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs font-semibold text-slate-500">{formatCreated(item.createdAt)}</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <button type="button" onClick={() => openEdit(item)} title="Edit" className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50">
                            <Pencil size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleStatus(item)}
                            title={item.isActive ? "Deactivate" : "Activate"}
                            className={`rounded-lg border p-2 ${item.isActive ? "border-emerald-200 text-emerald-600 hover:bg-emerald-50" : "border-amber-200 text-amber-600 hover:bg-amber-50"}`}
                          >
                            <Power size={14} />
                          </button>
                          <button type="button" onClick={() => deleteStaff(item)} title="Delete" className="rounded-lg border border-rose-200 p-2 text-rose-500 hover:bg-rose-50">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <aside className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm xl:sticky xl:top-4">
          <div className="mb-4 flex items-start justify-between gap-2">
            <div>
              <h2 className="flex items-center gap-2 text-sm font-black text-slate-900">
                <UserPlus size={15} className="text-violet-500" />
                {editingStaff ? "Edit Staff" : "Add New Staff"}
              </h2>
              <p className="mt-1 text-[11px] font-semibold text-slate-400">
                {editingStaff ? "Update this captain account" : "Create a new captain account"}
              </p>
            </div>
            <button type="button" onClick={resetForm} aria-label="Clear staff form" className="rounded-lg p-1 text-slate-400 hover:bg-slate-50">
              <X size={16} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <label className="block">
              <span className="mb-1 block text-[11px] font-bold text-slate-500">Full Name *</span>
              <div className="relative">
                <User size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  ref={nameRef}
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Enter full name"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-8 pr-3 text-sm font-semibold outline-none focus:border-rose-300 focus:bg-white"
                />
              </div>
            </label>
            <label className="block">
              <span className="mb-1 block text-[11px] font-bold text-slate-500">Email Address *</span>
              <div className="relative">
                <Mail size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  required
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="Enter email address"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-8 pr-3 text-sm font-semibold outline-none focus:border-rose-300 focus:bg-white"
                />
              </div>
            </label>
            <label className="block">
              <span className="mb-1 block text-[11px] font-bold text-slate-500">
                {editingStaff ? "New Password" : "Password *"}
              </span>
              <div className="relative">
                <Lock size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  required={!editingStaff}
                  minLength={editingStaff && !form.password ? undefined : 6}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder={editingStaff ? "Leave blank to keep the current password" : "Enter password"}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-8 pr-10 text-sm font-semibold outline-none focus:border-rose-300 focus:bg-white"
                />
                <button type="button" onClick={() => setShowPassword((open) => !open)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" aria-label="Show password">
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </label>
            <div>
              <p className="mb-1 text-[11px] font-bold text-slate-500">Role</p>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-bold text-slate-700">
                Captain
              </div>
              <p className="mt-1 text-[10px] font-medium text-slate-400">Every account created here can sign in to the captain app.</p>
            </div>
            <div className="flex gap-2 pt-1">
              <button type="button" onClick={resetForm} className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-bold text-slate-600">
                Cancel
              </button>
              <button type="submit" disabled={saving} className="inline-flex flex-1 items-center justify-center gap-1 rounded-xl bg-rose-500 py-2.5 text-sm font-black text-white disabled:opacity-60">
                {saving ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
                {editingStaff ? "Update" : "Save Staff"}
              </button>
            </div>
          </form>
        </aside>
      </div>
    </div>

  );
}