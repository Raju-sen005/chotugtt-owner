import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  AlertCircle,
  BedDouble,
  CheckCircle2,
  Crown,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Wrench,
  X,
} from "lucide-react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import Modal from "../../components/ui/Modal";
import {
  ROOM_STATUSES,
  ROOM_TYPES,
  SAFE_STATUS_ACTIONS,
  formatRoomLabel,
  getApiErrorMessage,
  hasRoomManagementAccess,
  isFeatureNotAvailable,
  normalizeRoomStatus,
  sortRoomsByNumber,
} from "./roomsAccess";
import {
  ROOM_MGMT_QUERY_DEFAULTS,
  syncAfterRoomMutation,
  useRoomManagementCacheSync,
} from "./roomManagementCache";
import { roomMgmtKeys } from "./roomManagementQueryKeys";

const api = axios.create({
  baseURL: import.meta.env.VITE_APP_API_BASE,
  withCredentials: true,
});

const EMPTY_FORM = {
  roomNumber: "",
  roomType: "Standard",
  pricePerNight: "",
  capacity: "2",
  description: "",
};

const STATUS_STYLES = {
  AVAILABLE: "bg-emerald-50 text-emerald-700 border-emerald-200",
  RESERVED: "bg-amber-50 text-amber-800 border-amber-200",
  OCCUPIED: "bg-rose-50 text-rose-700 border-rose-200",
  CLEANING: "bg-sky-50 text-sky-700 border-sky-200",
  MAINTENANCE: "bg-slate-100 text-slate-700 border-slate-300",
};

const STATUS_LABELS = {
  AVAILABLE: "Available",
  RESERVED: "Reserved",
  OCCUPIED: "Occupied",
  CLEANING: "Cleaning",
  MAINTENANCE: "Maintenance",
};

function roomIdOf(room) {
  return String(room?.id || room?._id || "");
}

function StatusBadge({ status }) {
  const canonical = normalizeRoomStatus(status);
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
        STATUS_STYLES[canonical] || STATUS_STYLES.AVAILABLE
      }`}
    >
      {STATUS_LABELS[canonical] || canonical}
    </span>
  );
}

function SummaryCard({ label, value, accent }) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-white p-4 shadow-xs">
      <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
        {label}
      </p>
      <p className={`mt-2 text-2xl font-black ${accent || "text-[var(--text-primary)]"}`}>
        {value}
      </p>
    </div>
  );
}

function RoomsSkeleton() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={index}
          className="h-40 animate-pulse rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)]"
        />
      ))}
    </div>
  );
}

export default function RoomsManagement() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const restaurantId = user?.restaurantId?._id || user?.restaurantId || null;
  const canManageRooms = ["OWNER", "MANAGER"].includes(user?.role);
  const entitled = hasRoomManagementAccess(user);

  useRoomManagementCacheSync({ enabled: entitled });

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [formOpen, setFormOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState({});
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [popup, setPopup] = useState({ open: false, message: "", tone: "success" });

  const showPopup = useCallback((message, tone = "success") => {
    setPopup({ open: true, message, tone });
  }, []);

  useEffect(() => {
    if (!popup.open) return undefined;
    const timer = setTimeout(() => {
      setPopup((prev) => ({ ...prev, open: false }));
    }, 3500);
    return () => clearTimeout(timer);
  }, [popup.open]);

  const {
    data: roomsRaw,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: roomMgmtKeys.roomsByRestaurant(restaurantId),
    queryFn: async () => {
      const response = await api.get("/rooms");
      return response.data?.data ?? [];
    },
    enabled: Boolean(restaurantId) && entitled,
    staleTime: 30_000,
    ...ROOM_MGMT_QUERY_DEFAULTS,
    retry: (failureCount, err) => {
      if (isFeatureNotAvailable(err)) return false;
      return failureCount < 1;
    },
  });

  // Sort as soon as API/cache data arrives so every consumer sees the same order.
  const rooms = useMemo(
    () => sortRoomsByNumber(Array.isArray(roomsRaw) ? roomsRaw : []),
    [roomsRaw],
  );

  const summary = useMemo(() => {
    const counts = {
      total: rooms.length,
      AVAILABLE: 0,
      RESERVED: 0,
      OCCUPIED: 0,
      CLEANING: 0,
      MAINTENANCE: 0,
    };
    for (const room of rooms) {
      const status = normalizeRoomStatus(room.status);
      if (counts[status] !== undefined) counts[status] += 1;
    }
    return counts;
  }, [rooms]);

  // Final visible array: filter first, then sort immediately before render.
  const filteredRooms = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = rooms.filter((room) => {
      const status = normalizeRoomStatus(room.status);
      const matchesStatus =
        statusFilter === "ALL" || status === statusFilter;
      const matchesType =
        typeFilter === "ALL" ||
        String(room.roomType || "") === typeFilter;
      const label = formatRoomLabel(room).toLowerCase();
      const matchesSearch =
        !q ||
        String(room.roomNumber || "")
          .toLowerCase()
          .includes(q) ||
        label.includes(q) ||
        String(room.roomType || "")
          .toLowerCase()
          .includes(q) ||
        String(room.description || "")
          .toLowerCase()
          .includes(q);
      return matchesStatus && matchesType && matchesSearch;
    });
    return sortRoomsByNumber(filtered);
  }, [rooms, search, statusFilter, typeFilter]);

  const featureBlocked =
    isFeatureNotAvailable(error) ||
    (!entitled && Boolean(user));

  const createMutation = useMutation({
    mutationFn: (payload) => api.post("/rooms", payload),
    onSuccess: async () => {
      await syncAfterRoomMutation(queryClient);
      closeForm();
      showPopup("Room created successfully");
    },
    onError: (err) => {
      showPopup(getApiErrorMessage(err, "Unable to create room."), "error");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => api.put(`/rooms/${id}`, payload),
    onSuccess: async (_data, variables) => {
      await syncAfterRoomMutation(queryClient);
      if (!variables?.statusOnly) closeForm();
      showPopup(
        variables?.statusOnly
          ? "Room status updated"
          : "Room updated successfully",
      );
    },
    onError: (err) => {
      showPopup(getApiErrorMessage(err, "Unable to update room."), "error");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/rooms/${id}`),
    onSuccess: async () => {
      await syncAfterRoomMutation(queryClient);
      setDeleteTarget(null);
      showPopup("Room deleted successfully");
    },
    onError: (err) => {
      showPopup(getApiErrorMessage(err, "Unable to delete room."), "error");
    },
  });

  const mutating =
    createMutation.isPending ||
    updateMutation.isPending ||
    deleteMutation.isPending;

  const openCreate = () => {
    setEditingRoom(null);
    setForm(EMPTY_FORM);
    setFormErrors({});
    setFormOpen(true);
  };

  const openEdit = (room) => {
    setEditingRoom(room);
    setForm({
      roomNumber: room.roomNumber || "",
      roomType: room.roomType || "Standard",
      pricePerNight:
        room.pricePerNight === 0 || room.pricePerNight
          ? String(room.pricePerNight)
          : "",
      capacity:
        room.capacity === 0 || room.capacity
          ? String(room.capacity)
          : "2",
      description: room.description || "",
    });
    setFormErrors({});
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditingRoom(null);
    setForm(EMPTY_FORM);
    setFormErrors({});
  };

  const validateForm = () => {
    const next = {};
    const roomNumber = String(form.roomNumber || "").trim();
    const price = Number(form.pricePerNight);
    const capacity = Number(form.capacity);

    if (!roomNumber) next.roomNumber = "Room number is required";
    if (!Number.isFinite(price) || price < 0) {
      next.pricePerNight = "Enter a valid price (0 or more)";
    }
    if (!Number.isFinite(capacity) || capacity < 1) {
      next.capacity = "Capacity must be at least 1";
    }
    if (!ROOM_TYPES.includes(form.roomType)) {
      next.roomType = "Select a valid room type";
    }
    setFormErrors(next);
    return Object.keys(next).length === 0;
  };

  const submitForm = (event) => {
    event.preventDefault();
    if (mutating || !canManageRooms) return;
    if (!validateForm()) return;

    const payload = {
      roomNumber: String(form.roomNumber).trim(),
      roomType: form.roomType,
      pricePerNight: Number(form.pricePerNight),
      capacity: Number(form.capacity),
      description: String(form.description || "").trim(),
    };

    if (editingRoom) {
      updateMutation.mutate({
        id: roomIdOf(editingRoom),
        payload,
      });
    } else {
      createMutation.mutate(payload);
    }
  };

  const runStatusAction = (room, nextStatus) => {
    if (!canManageRooms || mutating) return;
    updateMutation.mutate({
      id: roomIdOf(room),
      payload: { status: nextStatus },
      statusOnly: true,
    });
  };

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("ALL");
    setTypeFilter("ALL");
  };

  // Direct URL access: non-PLUS (and inactive PLUS) leave Rooms.
  if (user && !entitled) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 p-4 sm:p-6">
      {popup.open && (
        <div
          className={`fixed top-6 right-6 z-[10001] flex max-w-sm items-start gap-3 rounded-2xl border px-4 py-3 shadow-lg ${
            popup.tone === "error"
              ? "border-rose-200 bg-white text-rose-700"
              : "border-emerald-200 bg-white text-emerald-700"
          }`}
          role="status"
        >
          {popup.tone === "error" ? (
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
          ) : (
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
          )}
          <p className="text-sm font-semibold">{popup.message}</p>
          <button
            type="button"
            className="ml-auto text-slate-400 hover:text-slate-600"
            aria-label="Dismiss notification"
            onClick={() => setPopup((prev) => ({ ...prev, open: false }))}
          >
            <X size={16} />
          </button>
        </div>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          {/* <div className="mb-1 inline-flex items-center gap-2 rounded-full bg-[var(--primary-light)] px-3 py-1 text-xs font-semibold text-[var(--primary-dark)]">
            <BedDouble size={14} />
            Rooms Management
          </div> */}
          <h1 className="text-2xl font-black text-[var(--text-primary)]">
            Rooms Management
          </h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Manage hotel rooms, rates, and housekeeping status. Bookings and
            folio are handled separately.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => refetch()}
            disabled={isFetching}
            className="inline-flex items-center gap-2"
          >
            <RefreshCw
              size={16}
              className={isFetching ? "animate-spin" : ""}
            />
            Refresh
          </Button>
          {canManageRooms && (
            <Button
              type="button"
              onClick={openCreate}
              className="inline-flex items-center gap-2"
            >
              <Plus size={16} />
              Add Room
            </Button>
          )}
        </div>
      </div>

      {featureBlocked && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
          <div className="flex items-start gap-3">
            <Crown className="mt-0.5 h-6 w-6 text-amber-600" />
            <div>
              <h2 className="text-base font-bold text-amber-900">
                PLUS feature required
              </h2>
              <p className="mt-1 text-sm text-amber-800">
                Rooms Management is available on an active PLUS plan with
                ROOM_MANAGEMENT. PRO and other plans do not include this
                feature.
              </p>
            </div>
          </div>
        </div>
      )}

      {!featureBlocked && (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            <SummaryCard label="Total Rooms" value={summary.total} />
            <SummaryCard
              label="Available"
              value={summary.AVAILABLE}
              accent="text-emerald-600"
            />
            <SummaryCard
              label="Reserved"
              value={summary.RESERVED}
              accent="text-amber-600"
            />
            <SummaryCard
              label="Occupied"
              value={summary.OCCUPIED}
              accent="text-rose-600"
            />
            <SummaryCard
              label="Cleaning"
              value={summary.CLEANING}
              accent="text-sky-600"
            />
            <SummaryCard
              label="Maintenance"
              value={summary.MAINTENANCE}
              accent="text-slate-600"
            />
          </div>

          <div className="rounded-2xl border border-[var(--border)] bg-white p-4 shadow-xs">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
              <div className="relative flex-1">
                <Search
                  size={16}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
                />
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search by room number, type, or description"
                  aria-label="Search rooms"
                  className="w-full rounded-xl border border-[var(--border)] bg-white py-2.5 pl-9 pr-3 text-sm focus:border-[var(--primary)] focus:outline-none focus:ring-4 focus:ring-[rgba(244,63,94,0.12)]"
                />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:w-[420px]">
                <label className="space-y-1 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  Status
                  <select
                    value={statusFilter}
                    onChange={(event) => setStatusFilter(event.target.value)}
                    className="mt-1 w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2.5 text-sm font-medium text-[var(--text-primary)]"
                  >
                    <option value="ALL">All statuses</option>
                    {ROOM_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {STATUS_LABELS[status]}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  Room type
                  <select
                    value={typeFilter}
                    onChange={(event) => setTypeFilter(event.target.value)}
                    className="mt-1 w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2.5 text-sm font-medium text-[var(--text-primary)]"
                  >
                    <option value="ALL">All types</option>
                    {ROOM_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <Button type="button" variant="outline" onClick={clearFilters}>
                Clear filters
              </Button>
            </div>
          </div>

          {isLoading ? (
            <RoomsSkeleton />
          ) : isError ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-rose-600" />
                <div>
                  <p className="font-semibold text-rose-800">
                    {getApiErrorMessage(error, "Failed to load rooms.")}
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    className="mt-3"
                    onClick={() => refetch()}
                  >
                    Try again
                  </Button>
                </div>
              </div>
            </div>
          ) : filteredRooms.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[var(--border)] bg-white px-6 py-16 text-center">
              <BedDouble className="mx-auto h-10 w-10 text-[var(--text-muted)]" />
              <h2 className="mt-3 text-lg font-bold text-[var(--text-primary)]">
                {rooms.length === 0 ? "No rooms yet" : "No rooms match filters"}
              </h2>
              <p className="mt-1 text-sm text-[var(--text-muted)]">
                {rooms.length === 0
                  ? "Add your first room to start managing inventory."
                  : "Try clearing search or filters."}
              </p>
              {rooms.length === 0 && canManageRooms && (
                <Button type="button" className="mt-4" onClick={openCreate}>
                  Add Room
                </Button>
              )}
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {filteredRooms.map((room) => {
                const status = normalizeRoomStatus(room.status);
                const actions = SAFE_STATUS_ACTIONS[status] || [];
                const canDelete =
                  canManageRooms &&
                  (status === "AVAILABLE" || status === "MAINTENANCE");

                return (
                  <article
                    key={roomIdOf(room)}
                    className="flex flex-col rounded-2xl border border-[var(--border)] bg-white p-4 shadow-xs"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-black text-[var(--text-primary)]">
                          {formatRoomLabel(room)}
                        </h3>
                        <p className="text-sm text-[var(--text-muted)]">
                          {room.roomType || "Standard"}
                        </p>
                      </div>
                      <StatusBadge status={status} />
                    </div>

                    <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <dt className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                          Price / night
                        </dt>
                        <dd className="mt-0.5 font-semibold text-[var(--text-primary)]">
                          ₹
                          {Number(room.pricePerNight || 0).toLocaleString(
                            "en-IN",
                          )}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                          Capacity
                        </dt>
                        <dd className="mt-0.5 font-semibold text-[var(--text-primary)]">
                          {room.capacity ?? "—"}
                        </dd>
                      </div>
                    </dl>

                    {room.description ? (
                      <p className="mt-3 line-clamp-2 text-sm text-[var(--text-secondary)]">
                        {room.description}
                      </p>
                    ) : null}

                    <div className="mt-auto flex flex-wrap gap-2 pt-4">
                      {canManageRooms && (
                        <Button
                          type="button"
                          variant="outline"
                          className="inline-flex items-center gap-1.5"
                          onClick={() => openEdit(room)}
                          disabled={mutating}
                        >
                          <Pencil size={14} />
                          Edit
                        </Button>
                      )}
                      {canManageRooms &&
                        actions.map((action) => (
                          <Button
                            key={action.to}
                            type="button"
                            variant="secondary"
                            className="inline-flex items-center gap-1.5"
                            disabled={mutating}
                            onClick={() => runStatusAction(room, action.to)}
                          >
                            {action.to === "MAINTENANCE" ? (
                              <Wrench size={14} />
                            ) : (
                              <CheckCircle2 size={14} />
                            )}
                            {action.label}
                          </Button>
                        ))}
                      {canDelete && (
                        <Button
                          type="button"
                          variant="danger"
                          className="inline-flex items-center gap-1.5"
                          disabled={mutating}
                          onClick={() => setDeleteTarget(room)}
                        >
                          <Trash2 size={14} />
                          Delete
                        </Button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </>
      )}

      <Modal
        isOpen={formOpen}
        onClose={() => {
          if (!mutating) closeForm();
        }}
        title={editingRoom ? "Edit Room" : "Add Room"}
        panelClassName="max-w-lg"
      >
        <form onSubmit={submitForm} className="space-y-4">
          <Input
            label="Room number"
            value={form.roomNumber}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, roomNumber: event.target.value }))
            }
            error={formErrors.roomNumber}
            required
            autoFocus
          />
          <label className="block space-y-1 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
            Room type
            <select
              value={form.roomType}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, roomType: event.target.value }))
              }
              className="mt-1 w-full rounded-xl border border-[var(--border)] bg-white px-4 py-2.5 text-sm font-medium text-[var(--text-primary)]"
            >
              {ROOM_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
            {formErrors.roomType ? (
              <p className="text-xs font-medium text-[var(--danger)]">
                {formErrors.roomType}
              </p>
            ) : null}
          </label>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Price per night (₹)"
              type="number"
              min="0"
              step="1"
              value={form.pricePerNight}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  pricePerNight: event.target.value,
                }))
              }
              error={formErrors.pricePerNight}
              required
            />
            <Input
              label="Capacity"
              type="number"
              min="1"
              step="1"
              value={form.capacity}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, capacity: event.target.value }))
              }
              error={formErrors.capacity}
              required
            />
          </div>
          <label className="block space-y-1 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
            Description
            <textarea
              value={form.description}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  description: event.target.value,
                }))
              }
              rows={3}
              className="mt-1 w-full rounded-xl border border-[var(--border)] bg-white px-4 py-2.5 text-sm text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none focus:ring-4 focus:ring-[rgba(244,63,94,0.12)]"
              placeholder="Optional notes for staff"
            />
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={closeForm}
              disabled={mutating}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={mutating}>
              {mutating ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 size={16} className="animate-spin" />
                  Saving…
                </span>
              ) : editingRoom ? (
                "Save changes"
              ) : (
                "Create room"
              )}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={Boolean(deleteTarget)}
        onClose={() => {
          if (!deleteMutation.isPending) setDeleteTarget(null);
        }}
        title="Delete room?"
        panelClassName="max-w-md"
      >
        <p className="text-sm text-[var(--text-secondary)]">
          Delete room{" "}
          <span className="font-semibold text-[var(--text-primary)]">
            {formatRoomLabel(deleteTarget)}
          </span>
          ? This cannot be undone. Rooms with active bookings or occupied /
          reserved / cleaning status cannot be deleted.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={deleteMutation.isPending}
            onClick={() => setDeleteTarget(null)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="danger"
            disabled={deleteMutation.isPending}
            onClick={() =>
              deleteMutation.mutate(roomIdOf(deleteTarget))
            }
          >
            {deleteMutation.isPending ? "Deleting…" : "Delete room"}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
