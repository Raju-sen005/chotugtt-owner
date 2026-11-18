import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import axios from "axios";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { QRCodeCanvas } from "qrcode.react";
import {
  AlertCircle,
  CheckCircle2,
  Crown,
  Download,
  Loader2,
  Printer,
  QrCode,
  RefreshCw,
  ShieldOff,
  X,
} from "lucide-react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";
import {
  canManageRoomQr,
  deriveRoomQrStatus,
  getRoomQrApiErrorMessage,
  hasRoomQrAccess,
  isFeatureNotAvailable,
  isRoomEligibleForQr,
  mapRoomQrApiData,
  normalizeBookingStatus,
  normalizeRoomStatus,
  roomIdOf,
} from "./roomQrAccess";
import { printRoomQrFromCanvas } from "./roomQrPrint";
import { formatBookingDate } from "../bookings/bookingsAccess";
import {
  formatRoomLabel,
  sortRoomRowsByNumber,
  sortRoomsByNumber,
} from "../rooms/roomsAccess";
import {
  ROOM_MGMT_QUERY_DEFAULTS,
  syncAfterRoomQrMutation,
  useRoomManagementCacheSync,
} from "../rooms/roomManagementCache";
import { roomMgmtKeys } from "../rooms/roomManagementQueryKeys";

const api = axios.create({
  baseURL: import.meta.env.VITE_APP_API_BASE,
  withCredentials: true,
});

const QR_STATUS_STYLES = {
  ACTIVE: "bg-emerald-50 text-emerald-700 border-emerald-200",
  NONE: "bg-slate-100 text-slate-600 border-slate-200",
  REVOKED: "bg-rose-50 text-rose-700 border-rose-200",
  INACTIVE: "bg-amber-50 text-amber-800 border-amber-200",
  UNAVAILABLE: "bg-slate-100 text-slate-500 border-slate-200",
};

const QR_STATUS_LABELS = {
  ACTIVE: "QR active",
  NONE: "No QR",
  REVOKED: "Revoked",
  INACTIVE: "Inactive stay",
  UNAVAILABLE: "Unavailable",
};

export default function RoomQrManagement() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const restaurantId = user?.restaurantId?._id || user?.restaurantId || null;
  const entitled = hasRoomQrAccess(user);
  const canManage = canManageRoomQr(user);

  useRoomManagementCacheSync({ enabled: entitled });

  const [selectedRoomId, setSelectedRoomId] = useState(null);
  const [activeQr, setActiveQr] = useState(null); // in-memory only — never persisted
  const [revokeTarget, setRevokeTarget] = useState(null);
  const [popup, setPopup] = useState({
    open: false,
    message: "",
    tone: "success",
  });
  const qrCanvasRef = useRef(null);

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

  // Clear in-memory token when leaving the page
  useEffect(() => {
    return () => {
      setActiveQr(null);
    };
  }, []);

  const roomsQuery = useQuery({
    queryKey: roomMgmtKeys.roomsByRestaurant(restaurantId),
    queryFn: async () => {
      const response = await api.get("/rooms");
      return response.data?.data ?? [];
    },
    enabled: Boolean(restaurantId) && entitled,
    staleTime: 30_000,
    ...ROOM_MGMT_QUERY_DEFAULTS,
  });

  const bookingsQuery = useQuery({
    queryKey: roomMgmtKeys.bookingsByRestaurant(restaurantId),
    queryFn: async () => {
      const response = await api.get("/rooms/bookings");
      return response.data?.data ?? [];
    },
    enabled: Boolean(restaurantId) && entitled,
    staleTime: 20_000,
    ...ROOM_MGMT_QUERY_DEFAULTS,
    retry: (failureCount, err) => {
      if (isFeatureNotAvailable(err)) return false;
      return failureCount < 1;
    },
  });

  // Sort as soon as API/cache data arrives (same utility as Room Management).
  const rooms = useMemo(
    () => sortRoomsByNumber(Array.isArray(roomsQuery.data) ? roomsQuery.data : []),
    [roomsQuery.data],
  );
  const bookings = useMemo(
    () => (Array.isArray(bookingsQuery.data) ? bookingsQuery.data : []),
    [bookingsQuery.data],
  );

  const activeBookingByRoom = useMemo(() => {
    const map = new Map();
    for (const booking of bookings) {
      const status = normalizeBookingStatus(booking.bookingStatus);
      if (status !== "CONFIRMED" && status !== "CHECKED_IN") continue;
      const rid = roomIdOf(booking);
      if (!rid) continue;
      const existing = map.get(rid);
      if (!existing) {
        map.set(rid, booking);
        continue;
      }
      // Prefer CHECKED_IN over CONFIRMED
      if (
        normalizeBookingStatus(existing.bookingStatus) !== "CHECKED_IN" &&
        status === "CHECKED_IN"
      ) {
        map.set(rid, booking);
      }
    }
    return map;
  }, [bookings]);

  // Final visible rows: map then sort immediately before render (same comparator).
  const roomRows = useMemo(() => {
    const rows = rooms.map((room) => {
      const id = roomIdOf(room);
      const booking = activeBookingByRoom.get(id) || null;
      return {
        room,
        booking,
        qrStatus: deriveRoomQrStatus(room),
        eligible: isRoomEligibleForQr(room),
      };
    });
    return sortRoomRowsByNumber(rows);
  }, [rooms, activeBookingByRoom]);

  const selectedRow = useMemo(
    () => roomRows.find((row) => roomIdOf(row.room) === selectedRoomId) || null,
    [roomRows, selectedRoomId],
  );

  // Clear in-memory QR preview only after a confirmed revoke (avoid race with generate refetch)
  useEffect(() => {
    if (!selectedRow || !activeQr) return;
    if (selectedRow.qrStatus === "REVOKED") {
      setActiveQr(null);
    }
  }, [selectedRow, activeQr]);

  const generateMutation = useMutation({
    mutationFn: async (roomId) => {
      const response = await api.post(`/rooms/${roomId}/qr/generate`, {});
      return response.data?.data;
    },
    onSuccess: async (data) => {
      try {
        // Keep token only in component memory — encode backend publicUrl only.
        setActiveQr(mapRoomQrApiData(data));
        await syncAfterRoomQrMutation(queryClient);
        showPopup(
          data.usableForOrdering
            ? "Room QR generated. Guests can scan to order."
            : "Room QR generated. Guests can browse the menu; ordering unlocks after check-in.",
        );
      } catch (err) {
        setActiveQr(null);
        showPopup(
          err?.message ||
            "Server did not return a guest menu URL. Check ROOM_QR_PUBLIC_BASE_URL.",
          "error",
        );
      }
    },
    onError: (err) => {
      showPopup(
        getRoomQrApiErrorMessage(err, "Unable to generate room QR."),
        "error",
      );
    },
  });

  const loadQrMutation = useMutation({
    mutationFn: async (roomId) => {
      const response = await api.get(`/rooms/${roomId}/qr`);
      return response.data?.data;
    },
    onSuccess: (data) => {
      try {
        setActiveQr(mapRoomQrApiData(data));
      } catch (err) {
        setActiveQr(null);
        showPopup(
          err?.message ||
            "Server did not return a guest menu URL. Check ROOM_QR_PUBLIC_BASE_URL.",
          "error",
        );
      }
    },
    onError: (err) => {
      setActiveQr(null);
      showPopup(
        getRoomQrApiErrorMessage(err, "Unable to load room QR."),
        "error",
      );
    },
  });

  const revokeMutation = useMutation({
    // Stable wall QR — room-level revoke only (never booking v1 revoke).
    mutationFn: (roomId) => api.post(`/rooms/${roomId}/qr/revoke`),
    onSuccess: async () => {
      setActiveQr(null);
      setRevokeTarget(null);
      await syncAfterRoomQrMutation(queryClient);
      showPopup("Room QR revoked successfully");
    },
    onError: (err) => {
      showPopup(
        getRoomQrApiErrorMessage(err, "Unable to revoke room QR."),
        "error",
      );
    },
  });

  const mutating =
    generateMutation.isPending ||
    loadQrMutation.isPending ||
    revokeMutation.isPending;

  const downloadQr = () => {
    const canvas = qrCanvasRef.current;
    if (!canvas || !activeQr?.publicUrl) return;
    const pngUrl = canvas
      .toDataURL("image/png")
      .replace("image/png", "image/octet-stream");
    const link = document.createElement("a");
    link.href = pngUrl;
    link.download = `Room_${activeQr.roomNumber || "QR"}_QR.png`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const printQr = () => {
    const restaurantName =
      user?.restaurant?.name ||
      user?.restaurantName ||
      "ChotuGTT";
    const result = printRoomQrFromCanvas({
      canvas: qrCanvasRef.current,
      publicUrl: activeQr?.publicUrl,
      roomNumber: activeQr?.roomNumber,
      restaurantName,
    });
    if (!result.ok) {
      showPopup(result.message, "error");
    }
  };

  const featureBlocked =
    isFeatureNotAvailable(bookingsQuery.error) ||
    (!entitled && Boolean(user));

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
            aria-label="Dismiss"
            onClick={() => setPopup((prev) => ({ ...prev, open: false }))}
          >
            <X size={16} />
          </button>
        </div>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          {/* <div className="mb-1 inline-flex items-center gap-2 rounded-full bg-[var(--primary-light)] px-3 py-1 text-xs font-semibold text-[var(--primary-dark)]">
            <QrCode size={14} />
            Room QR Ordering
          </div> */}
          <h1 className="text-2xl font-black text-[var(--text-primary)]">
            Room QR Ordering
          </h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Generate and revoke stable room wall QR codes. Guests can browse
            the menu anytime; ordering unlocks after check-in.
            Tokens are signed by the backend and never stored in the browser.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          className="inline-flex items-center gap-2"
          disabled={roomsQuery.isFetching || bookingsQuery.isFetching}
          onClick={() => {
            roomsQuery.refetch();
            bookingsQuery.refetch();
          }}
        >
          <RefreshCw
            size={16}
            className={
              roomsQuery.isFetching || bookingsQuery.isFetching
                ? "animate-spin"
                : ""
            }
          />
          Refresh
        </Button>
      </div>

      {featureBlocked ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
          <div className="flex items-start gap-3">
            <Crown className="mt-0.5 h-6 w-6 text-amber-600" />
            <div>
              <h2 className="text-base font-bold text-amber-900">
                PLUS feature required
              </h2>
              <p className="mt-1 text-sm text-amber-800">
                Room QR Ordering requires an active PLUS plan with
                ROOM_QR_ORDERING. PRO does not include this feature.
              </p>
            </div>
          </div>
        </div>
      ) : !canManage ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
          <div className="flex items-start gap-3">
            <ShieldOff className="mt-0.5 h-6 w-6 text-slate-500" />
            <div>
              <h2 className="text-base font-bold text-slate-800">
                Manager access required
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Only owners and managers can generate or revoke room QR codes.
              </p>
            </div>
          </div>
        </div>
      ) : roomsQuery.isLoading || bookingsQuery.isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-40 animate-pulse rounded-2xl bg-[var(--surface-muted)]"
            />
          ))}
        </div>
      ) : bookingsQuery.isError ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6">
          <p className="font-semibold text-rose-800">
            {getRoomQrApiErrorMessage(
              bookingsQuery.error,
              "Failed to load bookings.",
            )}
          </p>
        </div>
      ) : roomRows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--border)] bg-white px-6 py-16 text-center">
          <QrCode className="mx-auto h-10 w-10 text-[var(--text-muted)]" />
          <h2 className="mt-3 text-lg font-bold">No rooms found</h2>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Add rooms in Rooms Management first.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--text-muted)]">
              Rooms & stays
            </h2>
            {roomRows.map(({ room, booking, qrStatus, eligible }) => {
              const id = roomIdOf(room);
              const selected = selectedRoomId === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    setSelectedRoomId(id);
                    setActiveQr(null);
                  }}
                  className={`w-full rounded-2xl border p-4 text-left transition ${
                    selected
                      ? "border-[var(--primary)] bg-[var(--primary-light)]"
                      : "border-[var(--border)] bg-white hover:bg-[var(--surface-muted)]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-lg font-black text-[var(--text-primary)]">
                        {formatRoomLabel(room)}
                      </p>
                      <p className="text-sm text-[var(--text-muted)]">
                        {room.roomType || "Standard"} ·{" "}
                        {normalizeRoomStatus(room.status)}
                      </p>
                    </div>
                    <span
                      className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                        QR_STATUS_STYLES[qrStatus] || QR_STATUS_STYLES.NONE
                      }`}
                    >
                      {QR_STATUS_LABELS[qrStatus] || qrStatus}
                    </span>
                  </div>
                  {booking ? (
                    <div className="mt-3 text-sm text-[var(--text-secondary)]">
                      <p className="font-semibold">{booking.customerName}</p>
                      <p className="text-xs text-[var(--text-muted)]">
                        {normalizeBookingStatus(booking.bookingStatus)} ·{" "}
                        {formatBookingDate(booking.checkInDate)} →{" "}
                        {formatBookingDate(booking.checkOutDate)}
                      </p>
                      {!eligible && (
                        <p className="mt-1 text-xs text-amber-700">
                          Not eligible for QR generation
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="mt-3 text-sm text-[var(--text-muted)]">
                      {eligible
                        ? "No active booking — wall QR still allowed"
                        : "Not eligible for QR generation"}
                    </p>
                  )}
                </button>
              );
            })}
          </div>

          <div className="rounded-2xl border border-[var(--border)] bg-white p-5 shadow-xs lg:sticky lg:top-4 lg:self-start">
            {!selectedRow ? (
              <div className="py-12 text-center">
                <QrCode className="mx-auto h-10 w-10 text-[var(--text-muted)]" />
                <p className="mt-3 text-sm font-semibold text-[var(--text-primary)]">
                  Select a room
                </p>
                <p className="mt-1 text-sm text-[var(--text-muted)]">
                  Choose a room to generate or manage its wall QR.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <h3 className="text-xl font-black text-[var(--text-primary)]">
                    {formatRoomLabel(selectedRow.room)}
                  </h3>
                  <p className="text-sm text-[var(--text-muted)]">
                    {selectedRow.booking
                      ? `${selectedRow.booking.customerName} · ${normalizeBookingStatus(selectedRow.booking.bookingStatus)}`
                      : "No active booking — QR can still be printed"}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {selectedRow.eligible && (
                    <Button
                      type="button"
                      disabled={mutating || !canManage}
                      onClick={() =>
                        generateMutation.mutate(roomIdOf(selectedRow.room))
                      }
                      className="inline-flex items-center gap-2"
                    >
                      {generateMutation.isPending ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <QrCode size={16} />
                      )}
                      {selectedRow.qrStatus === "ACTIVE" ||
                      selectedRow.qrStatus === "REVOKED"
                        ? "Regenerate QR"
                        : "Generate QR"}
                    </Button>
                  )}
                  {selectedRow.qrStatus === "ACTIVE" && (
                    <>
                      <Button
                        type="button"
                        variant="outline"
                        disabled={mutating || !canManage}
                        onClick={() =>
                          loadQrMutation.mutate(roomIdOf(selectedRow.room))
                        }
                        className="inline-flex items-center gap-2"
                      >
                        {loadQrMutation.isPending ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <RefreshCw size={16} />
                        )}
                        Show current QR
                      </Button>
                      <Button
                        type="button"
                        variant="danger"
                        disabled={mutating || !canManage}
                        onClick={() =>
                          setRevokeTarget({
                            roomId: roomIdOf(selectedRow.room),
                            roomNumber: formatRoomLabel(selectedRow.room),
                          })
                        }
                        className="inline-flex items-center gap-2"
                      >
                        <ShieldOff size={16} />
                        Revoke QR
                      </Button>
                    </>
                  )}
                </div>

                {!selectedRow.eligible && (
                  <p className="rounded-xl bg-amber-50 px-3 py-3 text-sm text-amber-800">
                    This room is in maintenance and cannot receive a guest QR.
                  </p>
                )}

                {selectedRow.qrStatus === "REVOKED" && (
                  <p className="text-sm text-rose-700">
                    This room QR was revoked. Generate again to issue a new
                    wall credential.
                  </p>
                )}
                {selectedRow.qrStatus === "NONE" && (
                  <p className="text-sm text-[var(--text-muted)]">
                    No QR has been issued for this room yet.
                  </p>
                )}

                {activeQr &&
                  activeQr.roomId === roomIdOf(selectedRow.room) &&
                  activeQr.publicUrl && (
                    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] p-4 text-center">
                      <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                        Guest QR
                      </p>
                      <p className="mt-1 text-lg font-black">
                        {formatRoomLabel(activeQr.roomNumber)}
                      </p>
                      <div className="mt-4 inline-block rounded-xl border border-[var(--border)] bg-white p-3">
                        <QRCodeCanvas
                          ref={qrCanvasRef}
                          value={activeQr.publicUrl}
                          size={180}
                          level="H"
                          includeMargin
                        />
                      </div>
                      <p className="mx-auto mt-3 max-w-xs break-all text-[10px] text-[var(--text-muted)]">
                        {activeQr.publicUrl}
                      </p>
                      <p className="mx-auto mt-3 max-w-xs text-sm text-[var(--text-secondary)]">
                        Scan this QR to view the restaurant menu. Ordering
                        unlocks after check-in.
                      </p>
                      <p className="mt-2 text-xs text-[var(--text-muted)]">
                        {activeQr.usableForOrdering
                          ? "Ordering unlocked (checked in)."
                          : "Ordering unlocks after check-in."}{" "}
                        Version {activeQr.tokenVersion}
                      </p>
                      <div className="mt-4 flex flex-wrap justify-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          className="inline-flex items-center gap-2"
                          onClick={downloadQr}
                        >
                          <Download size={16} />
                          Download
                        </Button>
                        <Button
                          type="button"
                          className="inline-flex items-center gap-2"
                          onClick={printQr}
                        >
                          <Printer size={16} />
                          Print
                        </Button>
                      </div>
                    </div>
                  )}
              </div>
            )}
          </div>
        </div>
      )}

      <Modal
        isOpen={Boolean(revokeTarget)}
        onClose={() => {
          if (!revokeMutation.isPending) setRevokeTarget(null);
        }}
        title="Revoke room QR?"
        panelClassName="max-w-md"
      >
        <p className="text-sm text-[var(--text-secondary)]">
          Revoke the active QR for room{" "}
          <strong>{revokeTarget?.roomNumber}</strong>? Existing scans will stop
          working immediately. This cannot be undone — generate a new QR if
          needed.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={revokeMutation.isPending}
            onClick={() => setRevokeTarget(null)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="danger"
            disabled={revokeMutation.isPending}
            onClick={() => revokeMutation.mutate(revokeTarget.roomId)}
          >
            {revokeMutation.isPending ? "Revoking…" : "Revoke QR"}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
