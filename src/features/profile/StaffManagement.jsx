import { useEffect, useState } from "react";
import {
  UserPlus,
  Pencil,
  Trash2,
  Power,
  Loader2,
  Users,
  X,
} from "lucide-react";

const API_BASE =
  import.meta.env.VITE_APP_API_BASE ||
  "http://localhost:5000";

export default function StaffManagement() {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
  });

  const [error, setError] = useState("");

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

  const openCreate = () => {
    setEditingStaff(null);

    setForm({
      name: "",
      email: "",
      password: "",
    });

    setError("");
    setModalOpen(true);
  };

  const openEdit = (item) => {
    setEditingStaff(item);

    setForm({
      name: item.name || "",
      email: item.email || "",
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

      setModalOpen(false);

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

  return (
    <div className="min-h-full bg-slate-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <Users
                size={22}
                className="text-red-500"
              />

              <h1 className="text-2xl font-black text-slate-900">
                Staff & Captains
              </h1>
            </div>

            <p className="text-sm text-slate-500 mt-1">
              Manage restaurant staff who can
              access the Captain POS.
            </p>
          </div>

          <button
            onClick={openCreate}
            className="inline-flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 text-white px-4 py-2.5 rounded-xl font-bold text-sm shadow-sm"
          >
            <UserPlus size={17} />
            Add Captain
          </button>
        </div>

        {/* Error */}

        {error && (
          <div className="mb-4 bg-red-50 border border-red-100 text-red-600 rounded-xl px-4 py-3 text-sm">
            {error}
          </div>
        )}

        {/* Table */}

        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          {loading ? (
            <div className="py-16 flex justify-center">
              <Loader2
                className="animate-spin text-red-500"
                size={28}
              />
            </div>
          ) : staff.length === 0 ? (
            <div className="py-16 text-center">
              <Users
                size={42}
                className="mx-auto text-slate-300"
              />

              <h3 className="mt-3 font-bold text-slate-700">
                No Captains yet
              </h3>

              <p className="text-sm text-slate-400 mt-1">
                Create your first Captain account.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left px-5 py-4 text-xs font-black uppercase text-slate-500">
                      Captain
                    </th>

                    <th className="text-left px-5 py-4 text-xs font-black uppercase text-slate-500">
                      Email
                    </th>

                    <th className="text-left px-5 py-4 text-xs font-black uppercase text-slate-500">
                      Role
                    </th>

                    <th className="text-left px-5 py-4 text-xs font-black uppercase text-slate-500">
                      Status
                    </th>

                    <th className="text-right px-5 py-4 text-xs font-black uppercase text-slate-500">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {staff.map((item) => (
                    <tr
                      key={item.id}
                      className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70"
                    >
                      <td className="px-5 py-4">
                        <div className="font-bold text-slate-800">
                          {item.name}
                        </div>
                      </td>

                      <td className="px-5 py-4 text-sm text-slate-500">
                        {item.email}
                      </td>

                      <td className="px-5 py-4">
                        <span className="px-2.5 py-1 rounded-lg bg-red-50 text-red-600 text-xs font-bold">
                          CAPTAIN
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                            item.isActive
                              ? "bg-emerald-50 text-emerald-600"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {item.isActive
                            ? "Active"
                            : "Disabled"}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() =>
                              openEdit(item)
                            }
                            className="p-2 rounded-lg border border-slate-200 hover:bg-slate-100"
                            title="Edit"
                          >
                            <Pencil size={15} />
                          </button>

                          <button
                            onClick={() =>
                              toggleStatus(item)
                            }
                            className={`p-2 rounded-lg border ${
                              item.isActive
                                ? "border-amber-200 text-amber-600 hover:bg-amber-50"
                                : "border-emerald-200 text-emerald-600 hover:bg-emerald-50"
                            }`}
                            title={
                              item.isActive
                                ? "Disable"
                                : "Enable"
                            }
                          >
                            <Power size={15} />
                          </button>

                          <button
                            onClick={() =>
                              deleteStaff(item)
                            }
                            className="p-2 rounded-lg border border-red-200 text-red-500 hover:bg-red-50"
                            title="Delete"
                          >
                            <Trash2 size={15} />
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

      {/* Modal */}

      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
              <div>
                <h2 className="font-black text-lg text-slate-900">
                  {editingStaff
                    ? "Edit Captain"
                    : "Add Captain"}
                </h2>

                <p className="text-xs text-slate-400 mt-0.5">
                  Captain POS login credentials
                </p>
              </div>

              <button
                onClick={() => setModalOpen(false)}
                className="p-2 rounded-lg hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="p-5 space-y-4"
            >
              <div>
                <label className="text-xs font-bold text-slate-600">
                  Name
                </label>

                <input
                  value={form.name}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      name: e.target.value,
                    })
                  }
                  required
                  className="mt-1.5 w-full px-3.5 py-3 border border-slate-200 rounded-xl outline-none focus:border-red-500"
                  placeholder="Captain name"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600">
                  Email
                </label>

                <input
                  type="email"
                  value={form.email}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      email: e.target.value,
                    })
                  }
                  required
                  className="mt-1.5 w-full px-3.5 py-3 border border-slate-200 rounded-xl outline-none focus:border-red-500"
                  placeholder="captain@restaurant.com"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600">
                  {editingStaff
                    ? "New Password (optional)"
                    : "Password"}
                </label>

                <input
                  type="password"
                  value={form.password}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      password: e.target.value,
                    })
                  }
                  required={!editingStaff}
                  minLength={6}
                  className="mt-1.5 w-full px-3.5 py-3 border border-slate-200 rounded-xl outline-none focus:border-red-500"
                  placeholder="Minimum 6 characters"
                />
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
                <div className="text-xs font-bold text-slate-500">
                  Account Role
                </div>

                <div className="text-sm font-black text-red-500 mt-1">
                  STAFF / CAPTAIN
                </div>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full py-3 rounded-xl bg-red-500 hover:bg-red-600 disabled:opacity-60 text-white font-bold flex items-center justify-center gap-2"
              >
                {saving && (
                  <Loader2
                    size={17}
                    className="animate-spin"
                  />
                )}

                {editingStaff
                  ? "Update Captain"
                  : "Create Captain"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}