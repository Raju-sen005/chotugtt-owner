import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  Crown,
  FileText,
  Loader2,
  LogIn,
  LogOut,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Upload,
  UserRound,
  X,
  XCircle,
} from "lucide-react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import Modal from "../../components/ui/Modal";
import {
  ROOM_MGMT_QUERY_DEFAULTS,
  syncAfterBookingMutation,
  syncAfterGuestMutation,
  useRoomManagementCacheSync,
} from "../rooms/roomManagementCache";
import { roomMgmtKeys } from "../rooms/roomManagementQueryKeys";
import { buildRoomFoliosCheckoutHref } from "./bookingsCheckoutNav";
import {
  displayMobileNumber,
  displayPhone,
} from "../../utils/displayText";
import {
  BOOKING_STATUSES,
  ID_PROOF_TYPES,
  bookingIdOf,
  canEditBookingStay,
  canWriteBookings,
  formatBookingDate,
  formatBookingDateTime,
  getBookingApiErrorMessage,
  applyIdProofInputFilter,
  canonicalizeIdProofType,
  CHECKOUT_EXTENSION_ONLY_MESSAGE,
  getIdProofInputConstraints,
  hasRoomBookingAccess,
  isCheckoutDateExtended,
  isFeatureNotAvailable,
  isRoomSelectableForBooking,
  nightsBetween,
  normalizeBookingStatus,
  normalizeRoomStatus,
  parseIndianMobile,
  formatAvailabilityEmptyMessage,
  pickBookableRoomsFromAvailability,
  resolveProofNumberAfterTypeChange,
  roomIdOf,
  roomNumberOf,
  normalizeMobileInputValue,
  sanitizeMobileDigitsInput,
  toDateInputValue,
  validateIdProof,
} from "./bookingsAccess";
import {
  ALLOWED_DOCUMENT_ACCEPT,
  canManageGuestDocuments,
  hasGuestManagementAccess,
} from "../guests/guestsAccess";
import {
  buildGuestCreatePayload,
  buildGuestIdentityPatch,
  createPendingDocument,
  isGuestEncryptionConfigError,
  mapProofTypeToDocumentType,
} from "./bookingIdentityDocs";

const api = axios.create({
  baseURL: import.meta.env.VITE_APP_API_BASE,
  withCredentials: true,
});

const STATUS_STYLES = {
  CONFIRMED: "bg-amber-50 text-amber-800 border-amber-200",
  CHECKED_IN: "bg-emerald-50 text-emerald-700 border-emerald-200",
  CHECKED_OUT: "bg-slate-100 text-slate-700 border-slate-300",
  CANCELLED: "bg-rose-50 text-rose-700 border-rose-200",
};

const STATUS_LABELS = {
  CONFIRMED: "Confirmed",
  CHECKED_IN: "Checked in",
  CHECKED_OUT: "Checked out",
  CANCELLED: "Cancelled",
};

const EMPTY_FORM = {
  roomId: "",
  guestId: "",
  customerName: "",
  mobileNumber: "",
  checkInDate: "",
  checkOutDate: "",
  guestCount: "1",
  proofType: "Aadhaar",
  proofNumber: "",
};

function SummaryCard({ label, value, accent }) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-white p-4 shadow-xs">
      <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
        {label}
      </p>
      <p
        className={`mt-2 text-2xl font-black ${
          accent || "text-[var(--text-primary)]"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function StatusBadge({ status }) {
  const canonical = normalizeBookingStatus(status);
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
        STATUS_STYLES[canonical] || STATUS_STYLES.CONFIRMED
      }`}
    >
      {STATUS_LABELS[canonical] || canonical}
    </span>
  );
}

export default function BookingManagement() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const restaurantId = user?.restaurantId?._id || user?.restaurantId || null;
  const entitled = hasRoomBookingAccess(user);
  const canWrite = canWriteBookings(user);

  useRoomManagementCacheSync({ enabled: entitled });
  const canUploadGuestDocs =
    hasGuestManagementAccess(user) && canManageGuestDocuments(user);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [roomFilter, setRoomFilter] = useState("ALL");
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState({});
  const [guestMode, setGuestMode] = useState("existing"); // existing | new
  const [guestSearch, setGuestSearch] = useState("");
  const [selectedGuestRecord, setSelectedGuestRecord] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);
  const [stayEdit, setStayEdit] = useState(null);
  const [stayForm, setStayForm] = useState({
    checkInDate: "",
    checkOutDate: "",
  });
  const [stayErrors, setStayErrors] = useState({});
  const [pendingDocs, setPendingDocs] = useState([]);
  const [docError, setDocError] = useState("");
  const [uploadProgress, setUploadProgress] = useState("");
  const docFileInputRef = useRef(null);
  const [popup, setPopup] = useState({
    open: false,
    message: "",
    tone: "success",
  });

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

  const guestsQuery = useQuery({
    queryKey: [...roomMgmtKeys.guestsByRestaurant(restaurantId), "booking-picker", guestSearch],
    queryFn: async () => {
      const response = await api.get("/guests", {
        params: {
          page: 1,
          limit: 20,
          q: guestSearch.trim() || undefined,
          isActive: "true",
        },
      });
      return response.data?.data ?? [];
    },
    enabled: Boolean(restaurantId) && entitled && formOpen && canWrite,
    staleTime: 15_000,
    ...ROOM_MGMT_QUERY_DEFAULTS,
  });

  const bookings = useMemo(
    () => (Array.isArray(bookingsQuery.data) ? bookingsQuery.data : []),
    [bookingsQuery.data],
  );
  const rooms = useMemo(
    () => (Array.isArray(roomsQuery.data) ? roomsQuery.data : []),
    [roomsQuery.data],
  );
  const guests = useMemo(
    () => (Array.isArray(guestsQuery.data) ? guestsQuery.data : []),
    [guestsQuery.data],
  );

  const availabilityQuery = useQuery({
    queryKey: [
      ...roomMgmtKeys.availabilityByRestaurant(restaurantId),
      form.checkInDate,
      form.checkOutDate,
    ],
    queryFn: async () => {
      const response = await api.get("/rooms/availability", {
        params: {
          checkInDate: form.checkInDate,
          checkOutDate: form.checkOutDate,
        },
      });
      return response.data;
    },
    enabled:
      Boolean(restaurantId) &&
      entitled &&
      formOpen &&
      Boolean(form.checkInDate) &&
      Boolean(form.checkOutDate) &&
      new Date(form.checkOutDate) > new Date(form.checkInDate),
    staleTime: 15_000,
    ...ROOM_MGMT_QUERY_DEFAULTS,
    retry: (failureCount, err) => {
      if (isFeatureNotAvailable(err)) return false;
      return failureCount < 1;
    },
  });

  const selectableRooms = useMemo(() => {
    const rows = availabilityQuery.data?.data;
    if (Array.isArray(rows) && rows.length > 0) {
      return pickBookableRoomsFromAvailability(rows, rooms);
    }
    return rooms.filter(isRoomSelectableForBooking);
  }, [rooms, availabilityQuery.data]);

  const availabilityEmptyReason = formatAvailabilityEmptyMessage(
    availabilityQuery.data,
  );

  useEffect(() => {
    if (!form.roomId) return;
    const stillSelectable = selectableRooms.some(
      (room) => roomIdOf(room) === form.roomId,
    );
    if (!stillSelectable) {
      setForm((prev) => ({ ...prev, roomId: "" }));
    }
  }, [selectableRooms, form.roomId]);

  const summary = useMemo(() => {
    const counts = {
      total: bookings.length,
      CONFIRMED: 0,
      CHECKED_IN: 0,
      CHECKED_OUT: 0,
      CANCELLED: 0,
    };
    for (const booking of bookings) {
      const status = normalizeBookingStatus(booking.bookingStatus);
      if (counts[status] !== undefined) counts[status] += 1;
    }
    return counts;
  }, [bookings]);

  const filteredBookings = useMemo(() => {
    const q = search.trim().toLowerCase();
    return bookings
      .filter((booking) => {
        const status = normalizeBookingStatus(booking.bookingStatus);
        const matchesStatus =
          statusFilter === "ALL" || status === statusFilter;
        const rid = roomIdOf(booking);
        const matchesRoom = roomFilter === "ALL" || rid === roomFilter;
        const matchesSearch =
          !q ||
          String(booking.customerName || "")
            .toLowerCase()
            .includes(q) ||
          String(booking.mobileNumber || "")
            .toLowerCase()
            .includes(q) ||
          String(roomNumberOf(booking)).toLowerCase().includes(q) ||
          String(bookingIdOf(booking)).toLowerCase().includes(q);
        return matchesStatus && matchesRoom && matchesSearch;
      })
      .sort(
        (a, b) =>
          new Date(b.createdAt || 0).getTime() -
          new Date(a.createdAt || 0).getTime(),
      );
  }, [bookings, search, statusFilter, roomFilter]);

  const selectedRoom = useMemo(
    () => rooms.find((room) => roomIdOf(room) === form.roomId) || null,
    [rooms, form.roomId],
  );

  const estimatedAmount = useMemo(() => {
    if (!selectedRoom || !form.checkInDate || !form.checkOutDate) return null;
    const nights = nightsBetween(form.checkInDate, form.checkOutDate);
    if (!nights) return null;
    return Number(
      (nights * Number(selectedRoom.pricePerNight || 0)).toFixed(2),
    );
  }, [selectedRoom, form.checkInDate, form.checkOutDate]);

  const proofConstraints = useMemo(
    () => getIdProofInputConstraints(form.proofType),
    [form.proofType],
  );

  const invalidateAll = useCallback(
    (options = {}) => syncAfterBookingMutation(queryClient, options),
    [queryClient],
  );

  const createMutation = useMutation({
    mutationFn: (payload) => api.post("/rooms/bookings", payload),
    onSuccess: async () => {
      await invalidateAll();
      closeForm();
      showPopup("Booking created successfully");
    },
    onError: (err) => {
      showPopup(
        getBookingApiErrorMessage(err, "Unable to create booking."),
        "error",
      );
    },
  });

  const createGuestMutation = useMutation({
    mutationFn: (payload) => api.post("/guests", payload),
  });

  const updateGuestMutation = useMutation({
    mutationFn: ({ id, payload }) => api.put(`/guests/${id}`, payload),
  });

  const uploadGuestDocument = useCallback(async (guestId, pending) => {
    const body = new FormData();
    body.append("document", pending.file);
    body.append("documentType", pending.documentType);
    if (pending.documentNumber) {
      body.append("documentNumber", pending.documentNumber);
    }
    return api.post(`/guests/${guestId}/documents`, body, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  }, []);

  const checkInMutation = useMutation({
    mutationFn: (bookingId) =>
      api.post(`/rooms/bookings/${bookingId}/check-in`),
    onSuccess: async () => {
      await invalidateAll({ includeOrders: true });
      setConfirmAction(null);
      showPopup("Guest checked in successfully");
    },
    onError: (err) => {
      showPopup(
        getBookingApiErrorMessage(err, "Unable to check in."),
        "error",
      );
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (bookingId) =>
      api.post(`/rooms/bookings/${bookingId}/cancel`),
    onSuccess: async () => {
      await invalidateAll();
      setConfirmAction(null);
      showPopup("Booking cancelled successfully");
    },
    onError: (err) => {
      showPopup(
        getBookingApiErrorMessage(err, "Unable to cancel booking."),
        "error",
      );
    },
  });

  const stayMutation = useMutation({
    mutationFn: ({ bookingId, checkInDate, checkOutDate }) =>
      api.patch(`/rooms/bookings/${bookingId}/stay`, {
        checkInDate,
        checkOutDate,
      }),
    onSuccess: async () => {
      await invalidateAll();
      setStayEdit(null);
      setStayErrors({});
      showPopup("Stay dates updated");
    },
    onError: (err) => {
      showPopup(
        getBookingApiErrorMessage(err, "Unable to update stay dates."),
        "error",
      );
    },
  });

  const [docsUploading, setDocsUploading] = useState(false);

  const mutating =
    createMutation.isPending ||
    createGuestMutation.isPending ||
    updateGuestMutation.isPending ||
    docsUploading ||
    checkInMutation.isPending ||
    cancelMutation.isPending ||
    stayMutation.isPending;

  const goToRoomFolioCheckout = useCallback(
    (booking) => {
      const id = bookingIdOf(booking);
      if (!id) {
        showPopup("Missing booking id — cannot open Room Booking.", "error");
        return;
      }
      navigate(buildRoomFoliosCheckoutHref(id), {
        state: { bookingId: id, intent: "checkout" },
      });
    },
    [navigate, showPopup],
  );

  const openCreate = () => {
    const today = toDateInputValue(new Date());
    const tomorrowDate = new Date();
    tomorrowDate.setDate(tomorrowDate.getDate() + 1);
    setForm({
      ...EMPTY_FORM,
      checkInDate: today,
      checkOutDate: toDateInputValue(tomorrowDate),
    });
    setFormErrors({});
    setGuestMode("existing");
    setGuestSearch("");
    setSelectedGuestRecord(null);
    setPendingDocs([]);
    setDocError("");
    setUploadProgress("");
    if (docFileInputRef.current) docFileInputRef.current.value = "";
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setForm(EMPTY_FORM);
    setFormErrors({});
    setSelectedGuestRecord(null);
    setPendingDocs([]);
    setDocError("");
    setUploadProgress("");
    if (docFileInputRef.current) docFileInputRef.current.value = "";
  };

  const addPendingDocument = (file) => {
    setDocError("");
    const created = createPendingDocument({
      file,
      documentType: mapProofTypeToDocumentType(form.proofType),
      documentNumber: form.proofNumber,
    });
    if (!created.ok) {
      setDocError(created.message);
      return;
    }
    setPendingDocs((prev) => [...prev, created.value]);
    if (docFileInputRef.current) docFileInputRef.current.value = "";
  };

  const removePendingDocument = (id) => {
    setPendingDocs((prev) => prev.filter((doc) => doc.id !== id));
  };

  const openStayEdit = (booking) => {
    setStayEdit(booking);
    setStayForm({
      checkInDate: toDateInputValue(booking.checkInDate),
      checkOutDate: toDateInputValue(booking.checkOutDate),
    });
    setStayErrors({});
  };

  const submitStayEdit = (event) => {
    event.preventDefault();
    const next = {};
    if (!stayForm.checkInDate) next.checkInDate = "Check-in date is required";
    if (!stayForm.checkOutDate) next.checkOutDate = "Check-out date is required";
    if (
      stayForm.checkInDate &&
      stayForm.checkOutDate &&
      new Date(stayForm.checkOutDate) <= new Date(stayForm.checkInDate)
    ) {
      next.checkOutDate = "Check-out must be after check-in";
    }
    if (
      !next.checkOutDate &&
      stayForm.checkOutDate &&
      stayEdit?.checkOutDate &&
      !isCheckoutDateExtended(stayEdit.checkOutDate, stayForm.checkOutDate)
    ) {
      next.checkOutDate = CHECKOUT_EXTENSION_ONLY_MESSAGE;
    }
    setStayErrors(next);
    if (Object.keys(next).length > 0) return;
    stayMutation.mutate({
      bookingId: bookingIdOf(stayEdit),
      checkInDate: stayForm.checkInDate,
      checkOutDate: stayForm.checkOutDate,
    });
  };

  const selectGuest = (guest) => {
    setSelectedGuestRecord(guest);
    setForm((prev) => ({
      ...prev,
      guestId: String(guest.id || guest._id),
      customerName: guest.fullName || "",
      mobileNumber: sanitizeMobileDigitsInput(guest.phone || ""),
    }));
  };

  const validateForm = () => {
    const next = {};
    if (!form.roomId) next.roomId = "Select a bookable room";
    if (!String(form.customerName || "").trim()) {
      next.customerName = "Guest name is required";
    }
    const mobile = parseIndianMobile(form.mobileNumber);
    if (!mobile.ok) {
      next.mobileNumber = mobile.message;
    }
    if (!form.checkInDate) next.checkInDate = "Check-in date is required";
    if (!form.checkOutDate) next.checkOutDate = "Check-out date is required";
    if (
      form.checkInDate &&
      form.checkOutDate &&
      new Date(form.checkOutDate) <= new Date(form.checkInDate)
    ) {
      next.checkOutDate = "Check-out must be after check-in";
    }
    const count = Number(form.guestCount);
    if (!Number.isFinite(count) || !Number.isInteger(count) || count < 1) {
      next.guestCount = "Guest count must be a positive whole number";
    } else if (
      selectedRoom &&
      Number(selectedRoom.capacity) > 0 &&
      count > Number(selectedRoom.capacity)
    ) {
      next.guestCount = `Max capacity is ${selectedRoom.capacity}`;
    }
    const proof = validateIdProof(form.proofType, form.proofNumber);
    if (!proof.ok) {
      if (!String(form.proofType || "").trim()) {
        next.proofType = "ID proof type is required";
      } else if (!canonicalizeIdProofType(form.proofType)) {
        next.proofType = proof.message;
      } else if (!String(form.proofNumber || "").trim()) {
        next.proofNumber = "ID proof number is required";
      } else {
        next.proofNumber = proof.message;
      }
    }
    setFormErrors(next);
    return Object.keys(next).length === 0;
  };

  const submitForm = async (event) => {
    event.preventDefault();
    if (mutating || !canWrite) return;
    if (!validateForm()) return;

    const mobile = parseIndianMobile(form.mobileNumber);
    const proof = validateIdProof(form.proofType, form.proofNumber);
    if (!mobile.ok || !proof.ok) return;

    if (pendingDocs.length > 0 && !canUploadGuestDocs) {
      showPopup(
        "This feature is not included in your current plan. Contact your administrator to enable this feature.",
        "error",
      );
      return;
    }

    try {
      let guestId = form.guestId || null;
      let selectedGuest = selectedGuestRecord;

      if (guestMode === "new" || (!guestId && pendingDocs.length > 0)) {
        const withIdentity = buildGuestCreatePayload({
          fullName: String(form.customerName).trim(),
          phone: mobile.value,
          identityType: proof.value.proofType,
          identityNumber: proof.value.proofNumber,
          includeIdentity: true,
        });

        let guestRes;
        try {
          guestRes = await createGuestMutation.mutateAsync(withIdentity);
        } catch (createErr) {
          if (
            withIdentity.identityNumber &&
            isGuestEncryptionConfigError(createErr)
          ) {
            guestRes = await createGuestMutation.mutateAsync(
              buildGuestCreatePayload({
                fullName: String(form.customerName).trim(),
                phone: mobile.value,
                includeIdentity: false,
              }),
            );
          } else {
            throw createErr;
          }
        }

        guestId = String(
          guestRes.data?.data?.id || guestRes.data?.data?._id || "",
        );
        selectedGuest = guestRes.data?.data || null;
        if (!guestId) {
          showPopup(
            "Guest was created but no guest id was returned. Booking was not created.",
            "error",
          );
          return;
        }
        await syncAfterGuestMutation(queryClient, {
          restaurantId,
          guestId,
          includeBookings: true,
        });
      } else if (guestId) {
        const patch = buildGuestIdentityPatch({
          guest: selectedGuest,
          identityType: proof.value.proofType,
          identityNumber: proof.value.proofNumber,
        });
        if (patch) {
          try {
            const updated = await updateGuestMutation.mutateAsync({
              id: guestId,
              payload: patch,
            });
            selectedGuest = updated.data?.data || selectedGuest;
            await syncAfterGuestMutation(queryClient, {
              restaurantId,
              guestId,
              includeBookings: true,
            });
          } catch (patchErr) {
            if (!isGuestEncryptionConfigError(patchErr)) {
              throw patchErr;
            }
            // Booking idProof still saved below; guest CRM identity stays empty.
          }
        }
      }

      if (pendingDocs.length > 0) {
        if (!guestId) {
          showPopup(
            "Select or create a guest before uploading identity documents.",
            "error",
          );
          return;
        }
        setDocsUploading(true);
        setUploadProgress(`Uploading 0/${pendingDocs.length}…`);
        try {
          const documentType = mapProofTypeToDocumentType(
            proof.value.proofType,
          );
          const documentNumber = proof.value.proofNumber;
          for (let i = 0; i < pendingDocs.length; i += 1) {
            setUploadProgress(`Uploading ${i + 1}/${pendingDocs.length}…`);
            await uploadGuestDocument(guestId, {
              ...pendingDocs[i],
              documentType,
              documentNumber,
            });
          }
          setPendingDocs([]);
          await syncAfterGuestMutation(queryClient, {
            restaurantId,
            guestId,
            includeBookings: false,
          });
        } finally {
          setDocsUploading(false);
          setUploadProgress("");
        }
      }

      const payload = {
        roomId: form.roomId,
        customerName: String(form.customerName).trim(),
        mobileNumber: mobile.value,
        checkInDate: form.checkInDate,
        checkOutDate: form.checkOutDate,
        guestCount: Number(form.guestCount),
        idProof: proof.value,
      };
      if (guestId) payload.guestId = guestId;

      // Documents already on the guest stay if booking fails — no orphan files
      // outside guest CRM; staff can retry booking with the same guest.
      await createMutation.mutateAsync(payload);
    } catch (err) {
      showPopup(
        getBookingApiErrorMessage(err, "Unable to create booking."),
        "error",
      );
    }
  };

  const runConfirm = () => {
    if (!confirmAction || mutating) return;
    const { type, booking } = confirmAction;
    const id = bookingIdOf(booking);
    if (type === "check-in") checkInMutation.mutate(id);
    if (type === "cancel") cancelMutation.mutate(id);
    // Checkout is handled via Room Folios navigation — never call checkout API here.
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
            <CalendarDays size={14} />
            Room Bookings
          </div> */}
          <h1 className="text-2xl font-black text-[var(--text-primary)]">
            Room Bookings
          </h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Create stays, check guests in/out, and cancel confirmed bookings.
            Folio settlement runs on checkout via the backend.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => bookingsQuery.refetch()}
            disabled={bookingsQuery.isFetching}
            className="inline-flex items-center gap-2"
          >
            <RefreshCw
              size={16}
              className={bookingsQuery.isFetching ? "animate-spin" : ""}
            />
            Refresh
          </Button>
          {canWrite && (
            <Button
              type="button"
              onClick={openCreate}
              className="inline-flex items-center gap-2"
            >
              <Plus size={16} />
              New booking
            </Button>
          )}
        </div>
      </div>

      {featureBlocked ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
          <div className="flex items-start gap-3">
            <Crown className="mt-0.5 h-6 w-6 text-amber-600" />
            <div>
              <h2 className="text-base font-bold text-amber-900">
                This feature is not included in your current plan.
              </h2>
              <p className="mt-1 text-sm text-amber-800">
                Contact your administrator to enable this feature.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
            <SummaryCard label="Total (all loaded)" value={summary.total} />
            <SummaryCard
              label="Confirmed"
              value={summary.CONFIRMED}
              accent="text-amber-600"
            />
            <SummaryCard
              label="Checked in"
              value={summary.CHECKED_IN}
              accent="text-emerald-600"
            />
            <SummaryCard
              label="Checked out"
              value={summary.CHECKED_OUT}
              accent="text-slate-600"
            />
            <SummaryCard
              label="Cancelled"
              value={summary.CANCELLED}
              accent="text-rose-600"
            />
          </div>
          <p className="text-xs text-[var(--text-muted)]">
            Counts are derived from the full booking list returned by{" "}
            <code className="rounded bg-[var(--surface-muted)] px-1">
              GET /rooms/bookings
            </code>{" "}
            (no server-side summary or pagination endpoint).
          </p>

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
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search guest, phone, room, or booking id"
                  aria-label="Search bookings"
                  className="w-full rounded-xl border border-[var(--border)] bg-white py-2.5 pl-9 pr-3 text-sm focus:border-[var(--primary)] focus:outline-none focus:ring-4 focus:ring-[rgba(244,63,94,0.12)]"
                />
              </div>
              <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                Status
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="mt-1 block w-full min-w-[160px] rounded-xl border border-[var(--border)] bg-white px-3 py-2.5 text-sm"
                >
                  <option value="ALL">All statuses</option>
                  {BOOKING_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {STATUS_LABELS[status]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                Room
                <select
                  value={roomFilter}
                  onChange={(e) => setRoomFilter(e.target.value)}
                  className="mt-1 block w-full min-w-[160px] rounded-xl border border-[var(--border)] bg-white px-3 py-2.5 text-sm"
                >
                  <option value="ALL">All rooms</option>
                  {rooms.map((room) => (
                    <option key={roomIdOf(room)} value={roomIdOf(room)}>
                      {room.roomNumber} ({normalizeRoomStatus(room.status)})
                    </option>
                  ))}
                </select>
              </label>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setSearch("");
                  setStatusFilter("ALL");
                  setRoomFilter("ALL");
                }}
              >
                Clear
              </Button>
            </div>
          </div>

          {bookingsQuery.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="h-16 animate-pulse rounded-2xl bg-[var(--surface-muted)]"
                />
              ))}
            </div>
          ) : bookingsQuery.isError ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6">
              <p className="font-semibold text-rose-800">
                {getBookingApiErrorMessage(
                  bookingsQuery.error,
                  "Failed to load bookings.",
                )}
              </p>
              <Button
                type="button"
                variant="outline"
                className="mt-3"
                onClick={() => bookingsQuery.refetch()}
              >
                Try again
              </Button>
            </div>
          ) : filteredBookings.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[var(--border)] bg-white px-6 py-16 text-center">
              <CalendarDays className="mx-auto h-10 w-10 text-[var(--text-muted)]" />
              <h2 className="mt-3 text-lg font-bold text-[var(--text-primary)]">
                {bookings.length === 0
                  ? "No bookings yet"
                  : "No bookings match filters"}
              </h2>
              {bookings.length === 0 && canWrite && (
                <Button type="button" className="mt-4" onClick={openCreate}>
                  New booking
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-white shadow-xs">
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-[var(--surface-muted)] text-xs uppercase tracking-wider text-[var(--text-muted)]">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Guest</th>
                      <th className="px-4 py-3 font-semibold">Room</th>
                      <th className="hidden px-4 py-3 font-semibold md:table-cell">
                        Stay
                      </th>
                      <th className="hidden px-4 py-3 font-semibold lg:table-cell">
                        Guests
                      </th>
                      <th className="hidden px-4 py-3 font-semibold sm:table-cell">
                        Amount
                      </th>
                      <th className="px-4 py-3 font-semibold">Status</th>
                      <th className="px-4 py-3 font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBookings.map((booking) => {
                      const status = normalizeBookingStatus(
                        booking.bookingStatus,
                      );
                      const id = bookingIdOf(booking);
                      return (
                        <tr
                          key={id}
                          className="border-t border-[var(--border)]"
                        >
                          <td className="px-4 py-3">
                            <p className="font-semibold text-[var(--text-primary)]">
                              {booking.customerName}
                            </p>
                            <p className="text-xs text-[var(--text-muted)]">
                              {displayMobileNumber(booking.mobileNumber)}
                            </p>
                            {booking.idProof?.proofType ? (
                              <p className="text-[10px] text-[var(--text-muted)]">
                                {booking.idProof.proofType}
                                {booking.idProof.proofNumber
                                  ? ` · ${booking.idProof.proofNumber}`
                                  : ""}
                              </p>
                            ) : null}
                            <p className="text-[10px] text-[var(--text-muted)]">
                              #{id.slice(-8)}
                            </p>
                          </td>
                          <td className="px-4 py-3 font-medium">
                            {roomNumberOf(booking)}
                          </td>
                          <td className="hidden px-4 py-3 md:table-cell">
                            <p>
                              {formatBookingDate(booking.checkInDate)} →{" "}
                              {formatBookingDate(booking.checkOutDate)}
                            </p>
                            {(booking.checkedInAt || booking.checkedOutAt) && (
                              <p className="mt-1 text-[10px] text-[var(--text-muted)]">
                                {booking.checkedInAt
                                  ? `In ${formatBookingDateTime(booking.checkedInAt)}`
                                  : "In —"}
                                {" · "}
                                {booking.checkedOutAt
                                  ? `Out ${formatBookingDateTime(booking.checkedOutAt)}`
                                  : "Out —"}
                              </p>
                            )}
                          </td>
                          <td className="hidden px-4 py-3 lg:table-cell">
                            {booking.guestCount ?? "—"}
                          </td>
                          <td className="hidden px-4 py-3 sm:table-cell">
                            ₹
                            {Number(booking.totalAmount || 0).toLocaleString(
                              "en-IN",
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <StatusBadge status={status} />
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-2">
                              {canWrite && canEditBookingStay(booking) && (
                                <Button
                                  type="button"
                                  variant="outline"
                                  className="inline-flex items-center gap-1 px-3 py-1.5"
                                  disabled={mutating}
                                  onClick={() => openStayEdit(booking)}
                                >
                                  <Pencil size={14} />
                                  Change Stay Dates
                                </Button>
                              )}
                              {canWrite && status === "CONFIRMED" && (
                                <>
                                  <Button
                                    type="button"
                                    variant="secondary"
                                    className="inline-flex items-center gap-1 px-3 py-1.5"
                                    disabled={mutating}
                                    onClick={() =>
                                      setConfirmAction({
                                        type: "check-in",
                                        booking,
                                      })
                                    }
                                  >
                                    <LogIn size={14} />
                                    Check in
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="danger"
                                    className="inline-flex items-center gap-1 px-3 py-1.5"
                                    disabled={mutating}
                                    onClick={() =>
                                      setConfirmAction({
                                        type: "cancel",
                                        booking,
                                      })
                                    }
                                  >
                                    <XCircle size={14} />
                                    Cancel
                                  </Button>
                                </>
                              )}
                              {canWrite && status === "CHECKED_IN" && (
                                <Button
                                  type="button"
                                  className="inline-flex items-center gap-1 px-3 py-1.5"
                                  disabled={mutating}
                                  onClick={() => goToRoomFolioCheckout(booking)}
                                >
                                  <LogOut size={14} />
                                  Checkout
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Create booking */}
      <Modal
        isOpen={formOpen}
        onClose={() => {
          if (!mutating) closeForm();
        }}
        title="New room booking"
        panelClassName="max-w-2xl"
      >
        <form onSubmit={submitForm} className="space-y-4">
          <label className="block space-y-1 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
            Room
            <select
              value={form.roomId}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, roomId: e.target.value }))
              }
              className="mt-1 w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2.5 text-sm"
            >
              <option value="">Select a bookable room</option>
              {selectableRooms.map((room) => (
                <option key={roomIdOf(room)} value={roomIdOf(room)}>
                  {room.roomNumber} · {room.roomType} · ₹{room.pricePerNight}
                  /night · cap {room.capacity} ·{" "}
                  {normalizeRoomStatus(room.status)}
                </option>
              ))}
            </select>
            {formErrors.roomId ? (
              <p className="text-xs text-[var(--danger)]">{formErrors.roomId}</p>
            ) : selectableRooms.length === 0 ? (
              <p className="text-xs font-normal normal-case text-[var(--danger)]">
                {availabilityEmptyReason ||
                  "No rooms available for these dates. After early checkout the booking is CHECKED_OUT (scheduled dates stay historical), but the room stays CLEANING until marked AVAILABLE in Rooms."}
              </p>
            ) : (
              <p className="text-xs font-normal normal-case text-[var(--text-muted)]">
                Showing rooms free for the selected dates. CLEANING /
                MAINTENANCE stay blocked; confirmed and checked-in overlaps are
                excluded. Early checkout frees remaining scheduled nights once
                the room is marked AVAILABLE again.
              </p>
            )}
          </label>

          <div className="flex gap-2">
            <Button
              type="button"
              variant={guestMode === "existing" ? "primary" : "outline"}
              className="flex-1"
              onClick={() => setGuestMode("existing")}
            >
              Existing guest
            </Button>
            <Button
              type="button"
              variant={guestMode === "new" ? "primary" : "outline"}
              className="flex-1"
              onClick={() => {
                setGuestMode("new");
                setSelectedGuestRecord(null);
                setForm((prev) => ({ ...prev, guestId: "" }));
              }}
            >
              New guest
            </Button>
          </div>

          {guestMode === "existing" && (
            <div className="space-y-2 rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-3">
              <Input
                label="Search guests"
                value={guestSearch}
                onChange={(e) => setGuestSearch(e.target.value)}
                placeholder="Name or phone"
              />
              <div className="max-h-36 space-y-1 overflow-y-auto">
                {guestsQuery.isLoading ? (
                  <p className="text-xs text-[var(--text-muted)]">Searching…</p>
                ) : guests.length === 0 ? (
                  <p className="text-xs text-[var(--text-muted)]">
                    No guests found. Switch to New guest or type walk-in
                    details below.
                  </p>
                ) : (
                  guests.map((guest) => {
                    const id = String(guest.id || guest._id);
                    const selected = form.guestId === id;
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => selectGuest(guest)}
                        className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm ${
                          selected
                            ? "bg-[var(--primary-light)] text-[var(--primary-dark)]"
                            : "bg-white hover:bg-slate-50"
                        }`}
                      >
                        <UserRound size={14} />
                        <span className="font-medium">{guest.fullName}</span>
                        <span className="text-xs text-[var(--text-muted)]">
                          {displayPhone(guest.phone)}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Guest name"
              value={form.customerName}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, customerName: e.target.value }))
              }
              error={formErrors.customerName}
              required
            />
            <div>
              <Input
                label="Mobile number"
                value={form.mobileNumber}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    mobileNumber: sanitizeMobileDigitsInput(e.target.value),
                  }))
                }
                onPaste={(e) => {
                  e.preventDefault();
                  const pasted = e.clipboardData?.getData("text") || "";
                  setForm((prev) => ({
                    ...prev,
                    mobileNumber: normalizeMobileInputValue(pasted),
                  }));
                }}
                inputMode="numeric"
                autoComplete="tel"
                maxLength={10}
                pattern="[0-9]*"
                placeholder="10-digit mobile"
                error={formErrors.mobileNumber}
                required
              />
              {!formErrors.mobileNumber ? (
                <p className="mt-1 text-xs text-[var(--text-muted)]">
                  Digits only · exactly 10 digits · Indian mobiles start with
                  6–9.
                </p>
              ) : null}
            </div>
            <Input
              label="Check-in"
              type="date"
              value={form.checkInDate}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, checkInDate: e.target.value }))
              }
              error={formErrors.checkInDate}
              required
            />
            <Input
              label="Check-out"
              type="date"
              value={form.checkOutDate}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, checkOutDate: e.target.value }))
              }
              error={formErrors.checkOutDate}
              required
            />
            <Input
              label="Number of guests"
              type="number"
              min="1"
              value={form.guestCount}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, guestCount: e.target.value }))
              }
              error={formErrors.guestCount}
              required
            />
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-3 text-sm">
              <p className="text-xs font-semibold uppercase text-[var(--text-muted)]">
                Estimated amount
              </p>
              <p className="mt-1 font-bold text-[var(--text-primary)]">
                {estimatedAmount == null
                  ? "—"
                  : `₹${estimatedAmount.toLocaleString("en-IN")}`}
              </p>
              <p className="mt-1 text-xs text-[var(--text-muted)]">
                Billed as nights × room rate on the server. Not editable here.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block space-y-1 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              ID proof type
              <select
                value={form.proofType}
                onChange={(e) => {
                  const nextType = e.target.value;
                  setForm((prev) => {
                    const resolved = resolveProofNumberAfterTypeChange(
                      nextType,
                      prev.proofNumber,
                    );
                    return {
                      ...prev,
                      proofType: nextType,
                      proofNumber: resolved.proofNumber,
                    };
                  });
                  setFormErrors((prev) => {
                    const next = { ...prev };
                    delete next.proofType;
                    delete next.proofNumber;
                    return next;
                  });
                }}
                className="mt-1 w-full rounded-xl border border-[var(--border)] bg-white px-4 py-2.5 text-sm"
                required
              >
                {ID_PROOF_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type === "Driving License" ? "Driving Licence" : type}
                  </option>
                ))}
              </select>
              {formErrors.proofType ? (
                <p className="text-xs text-[var(--danger)]">
                  {formErrors.proofType}
                </p>
              ) : null}
            </label>
            <div>
              <Input
                label="ID proof number"
                value={form.proofNumber}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    proofNumber: applyIdProofInputFilter(
                      prev.proofType,
                      e.target.value,
                    ),
                  }))
                }
                error={formErrors.proofNumber}
                autoComplete="off"
                inputMode={proofConstraints.inputMode}
                maxLength={proofConstraints.maxLength}
                placeholder={proofConstraints.placeholder}
                required
              />
              {!formErrors.proofNumber ? (
                <p className="mt-1 text-xs text-[var(--text-muted)]">
                  {proofConstraints.hint}
                </p>
              ) : null}
            </div>
          </div>
          <p className="text-xs text-[var(--text-muted)]">
            Full proof numbers are never shown again after create (API returns
            masked values only). Guest CRM identity is updated when encryption
            is configured — booking idProof is always stored on the booking.
          </p>

          <section className="space-y-3 rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-3">
            <h4 className="flex items-center gap-2 text-sm font-bold text-[var(--text-primary)]">
              <FileText size={16} />
              Identity documents
            </h4>
            {!canUploadGuestDocs ? (
              <p className="text-xs text-[var(--text-muted)]">
                This feature is not included in your current plan. Contact your
                administrator to enable this feature. You can still create the
                booking with ID proof details above.
              </p>
            ) : (
              <>
                <p className="text-xs text-[var(--text-muted)]">
                  Private encrypted storage only (AES-256-GCM). Allowed: JPEG,
                  PNG, WEBP, PDF up to 8 MB. Uses the ID proof fields above for
                  upload metadata. Files are never stored in the browser.
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    ref={docFileInputRef}
                    type="file"
                    accept={ALLOWED_DOCUMENT_ACCEPT}
                    className="block w-full text-sm text-[var(--text-secondary)] file:mr-3 file:rounded-lg file:border-0 file:bg-white file:px-3 file:py-2 file:text-sm file:font-semibold"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) addPendingDocument(file);
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="inline-flex items-center gap-1.5"
                    onClick={() => docFileInputRef.current?.click()}
                  >
                    <Upload size={14} />
                    Choose file
                  </Button>
                </div>
                {docError ? (
                  <p className="text-xs text-[var(--danger)]">{docError}</p>
                ) : null}
                {pendingDocs.length > 0 ? (
                  <ul className="space-y-2">
                    {pendingDocs.map((doc) => (
                      <li
                        key={doc.id}
                        className="flex items-center justify-between gap-2 rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-medium">{doc.fileName}</p>
                          <p className="text-xs text-[var(--text-muted)]">
                            {doc.status}
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          className="inline-flex shrink-0 items-center gap-1 px-2 py-1"
                          disabled={mutating}
                          onClick={() => removePendingDocument(doc.id)}
                        >
                          <Trash2 size={14} />
                          Remove
                        </Button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-[var(--text-muted)]">
                    No files selected. You can upload after booking from Guest
                    details, or add files here first.
                  </p>
                )}
                {uploadProgress ? (
                  <p className="inline-flex items-center gap-2 text-xs text-[var(--text-muted)]">
                    <Loader2 size={14} className="animate-spin" />
                    {uploadProgress}
                  </p>
                ) : null}
              </>
            )}
          </section>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              disabled={mutating}
              onClick={closeForm}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={mutating}>
              {mutating ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 size={16} className="animate-spin" />
                  {uploadProgress || "Saving…"}
                </span>
              ) : (
                "Create booking"
              )}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Change Stay Dates */}
      <Modal
        isOpen={Boolean(stayEdit)}
        onClose={() => {
          if (!mutating) {
            setStayEdit(null);
            setStayErrors({});
          }
        }}
        title="Change Stay Dates"
        panelClassName="max-w-md"
      >
        {stayEdit ? (
          <form onSubmit={submitStayEdit} className="space-y-4">
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-3 text-sm">
              <p className="font-semibold text-[var(--text-primary)]">
                {stayEdit.customerName} · {roomNumberOf(stayEdit)}
              </p>
              <p className="mt-1 text-xs text-[var(--text-muted)]">
                Status:{" "}
                {STATUS_LABELS[normalizeBookingStatus(stayEdit.bookingStatus)] ||
                  stayEdit.bookingStatus}
              </p>
              <p className="mt-2 text-xs text-[var(--text-muted)]">
                Actual in: {formatBookingDateTime(stayEdit.checkedInAt)} · Actual
                out: {formatBookingDateTime(stayEdit.checkedOutAt)}
              </p>
              <p className="mt-1 text-xs text-[var(--text-muted)]">
                Scheduled dates only are updated. Actual check-in/out timestamps
                stay unchanged.
              </p>
              <p className="mt-2 text-xs text-[var(--text-muted)]">
                Checkout can only be extended here. For early checkout, use the
                Checkout action.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Input
                  label="Check-in date"
                  type="date"
                  value={stayForm.checkInDate}
                  onChange={(e) =>
                    setStayForm((prev) => ({
                      ...prev,
                      checkInDate: e.target.value,
                    }))
                  }
                  error={stayErrors.checkInDate}
                  required
                  disabled={
                    normalizeBookingStatus(stayEdit.bookingStatus) ===
                    "CHECKED_IN"
                  }
                />
                {normalizeBookingStatus(stayEdit.bookingStatus) ===
                  "CHECKED_IN" && (
                  <p className="mt-1 text-xs text-[var(--text-muted)]">
                    Check-in date is locked after actual check-in. Only
                    scheduled checkout can be extended.
                  </p>
                )}
              </div>
              <div>
                <Input
                  label="Scheduled checkout"
                  type="date"
                  value={stayForm.checkOutDate}
                  min={
                    stayEdit.checkOutDate
                      ? (() => {
                          const current = toDateInputValue(stayEdit.checkOutDate);
                          if (!current) return undefined;
                          const next = new Date(`${current}T12:00:00`);
                          next.setDate(next.getDate() + 1);
                          return toDateInputValue(next);
                        })()
                      : undefined
                  }
                  onChange={(e) =>
                    setStayForm((prev) => ({
                      ...prev,
                      checkOutDate: e.target.value,
                    }))
                  }
                  error={stayErrors.checkOutDate}
                  required
                />
                <p className="mt-1 text-xs text-[var(--text-muted)]">
                  Must be later than the current scheduled checkout (
                  {toDateInputValue(stayEdit.checkOutDate) || "—"}).
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={mutating}
                onClick={() => setStayEdit(null)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={mutating}>
                {stayMutation.isPending ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 size={16} className="animate-spin" />
                    Saving…
                  </span>
                ) : (
                  "Save stay dates"
                )}
              </Button>
            </div>
          </form>
        ) : null}
      </Modal>

      {/* Lifecycle confirm */}
      <Modal
        isOpen={Boolean(confirmAction)}
        onClose={() => {
          if (!mutating) setConfirmAction(null);
        }}
        title={
          confirmAction?.type === "check-in"
            ? "Confirm check-in?"
            : "Cancel booking?"
        }
        panelClassName="max-w-md"
      >
        {confirmAction ? (
          <div className="space-y-4">
            <p className="text-sm text-[var(--text-secondary)]">
              {confirmAction.type === "check-in" && (
                <>
                  Check in{" "}
                  <strong>{confirmAction.booking.customerName}</strong> to room{" "}
                  <strong>{roomNumberOf(confirmAction.booking)}</strong>? Room
                  becomes OCCUPIED.
                </>
              )}
              {confirmAction.type === "cancel" && (
                <>
                  Cancel the confirmed booking for{" "}
                  <strong>{confirmAction.booking.customerName}</strong>? This
                  fails if the folio has payments or outstanding charges.
                </>
              )}
            </p>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={mutating}
                onClick={() => setConfirmAction(null)}
              >
                Back
              </Button>
              <Button
                type="button"
                variant={
                  confirmAction.type === "cancel" ? "danger" : "primary"
                }
                disabled={mutating}
                onClick={runConfirm}
              >
                {mutating ? "Working…" : "Confirm"}
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
