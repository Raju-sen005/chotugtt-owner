import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Crown,
  Download,
  Eye,
  FileText,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Upload,
  UserRound,
  X,
} from "lucide-react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import Modal from "../../components/ui/Modal";
import {
  ROOM_MGMT_QUERY_DEFAULTS,
  syncAfterGuestMutation,
  useRoomManagementCacheSync,
} from "../rooms/roomManagementCache";
import { roomMgmtKeys } from "../rooms/roomManagementQueryKeys";
import {
  ALLOWED_DOCUMENT_ACCEPT,
  IDENTITY_TYPE_SUGGESTIONS,
  canManageGuestDocuments,
  canWriteGuests,
  displayGuestField,
  evaluateGuestDocumentUpload,
  formatGuestDate,
  formatGuestIdentity,
  formatGuestLocation,
  getGuestApiErrorMessage,
  guestIdOf,
  hasGuestManagementAccess,
  isFeatureNotAvailable,
  mapGuestDetailResponse,
  resolveGuestDocumentType,
  toDateInputValue,
  validatePendingDocumentFile,
} from "./guestsAccess";
import {
  canonicalizeIdProofType,
  parseIndianMobile,
  validateIdProof,
} from "../bookings/bookingsAccess";

const api = axios.create({
  baseURL: import.meta.env.VITE_APP_API_BASE,
  withCredentials: true,
});

const EMPTY_FORM = {
  fullName: "",
  phone: "",
  email: "",
  address: "",
  city: "",
  state: "",
  country: "",
  dateOfBirth: "",
  nationality: "",
  notes: "",
  identityType: "",
  identityNumber: "",
};

const PAGE_SIZE = 20;

function SummaryStat({ label, value }) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-white p-4 shadow-xs">
      <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
        {label}
      </p>
      <p className="mt-2 text-2xl font-black text-[var(--text-primary)]">{value}</p>
    </div>
  );
}

async function parseAxiosError(error, fallback) {
  const data = error?.response?.data;
  if (data instanceof Blob) {
    try {
      const text = await data.text();
      const json = JSON.parse(text);
      return json?.message || fallback;
    } catch {
      return fallback;
    }
  }
  return getGuestApiErrorMessage(error, fallback);
}

export default function GuestManagement() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const restaurantId = user?.restaurantId?._id || user?.restaurantId || null;
  const entitled = hasGuestManagementAccess(user);
  const canWrite = canWriteGuests(user);
  const canDocs = canManageGuestDocuments(user);

  useRoomManagementCacheSync({ enabled: entitled });

  const [searchInput, setSearchInput] = useState("");
  const [searchQ, setSearchQ] = useState("");
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editingGuest, setEditingGuest] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState({});
  const [detailGuestId, setDetailGuestId] = useState(null);
  const [deleteDocTarget, setDeleteDocTarget] = useState(null);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadError, setUploadError] = useState("");
  const [popup, setPopup] = useState({ open: false, message: "", tone: "success" });
  const fileInputRef = useRef(null);
  const objectUrlRef = useRef(null);

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

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQ(searchInput.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    };
  }, []);

  const guestsQuery = useQuery({
    queryKey: [...roomMgmtKeys.guestsByRestaurant(restaurantId), page, searchQ],
    queryFn: async () => {
      const response = await api.get("/guests", {
        params: { page, limit: PAGE_SIZE, q: searchQ || undefined },
      });
      return response.data;
    },
    enabled: Boolean(restaurantId) && entitled,
    placeholderData: keepPreviousData,
    staleTime: 20_000,
    ...ROOM_MGMT_QUERY_DEFAULTS,
    retry: (failureCount, err) => {
      if (isFeatureNotAvailable(err)) return false;
      return failureCount < 1;
    },
  });

  const guests = useMemo(
    () => (Array.isArray(guestsQuery.data?.data) ? guestsQuery.data.data : []),
    [guestsQuery.data],
  );
  const total = Number(guestsQuery.data?.total || 0);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const detailQuery = useQuery({
    queryKey: roomMgmtKeys.guest(restaurantId, detailGuestId),
    queryFn: async () => {
      const response = await api.get(`/guests/${detailGuestId}`);
      return mapGuestDetailResponse(response.data?.data);
    },
    enabled: Boolean(restaurantId) && entitled && Boolean(detailGuestId),
    ...ROOM_MGMT_QUERY_DEFAULTS,
  });

  const documentsQuery = useQuery({
    queryKey: roomMgmtKeys.guestDocuments(restaurantId, detailGuestId),
    queryFn: async () => {
      const response = await api.get(`/guests/${detailGuestId}/documents`);
      return response.data?.data ?? [];
    },
    enabled:
      Boolean(restaurantId) &&
      entitled &&
      Boolean(detailGuestId) &&
      canDocs,
    ...ROOM_MGMT_QUERY_DEFAULTS,
  });

  const bookingsQuery = useQuery({
    queryKey: roomMgmtKeys.guestBookings(restaurantId, detailGuestId),
    queryFn: async () => {
      const response = await api.get(`/guests/${detailGuestId}/bookings`, {
        params: { page: 1, limit: 10 },
      });
      return response.data;
    },
    enabled: Boolean(restaurantId) && entitled && Boolean(detailGuestId),
    ...ROOM_MGMT_QUERY_DEFAULTS,
  });

  const createMutation = useMutation({
    mutationFn: (payload) => api.post("/guests", payload),
    onSuccess: async (res) => {
      const guestId = String(
        res.data?.data?.id || res.data?.data?._id || "",
      );
      await syncAfterGuestMutation(queryClient, {
        restaurantId,
        guestId: guestId || undefined,
        includeBookings: Boolean(guestId),
      });
      closeForm();
      showPopup("Guest created successfully");
    },
    onError: async (err) => {
      showPopup(await parseAxiosError(err, "Unable to create guest."), "error");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => api.put(`/guests/${id}`, payload),
    onSuccess: async (_res, variables) => {
      await syncAfterGuestMutation(queryClient, {
        restaurantId,
        guestId: variables?.id || detailGuestId,
        includeBookings: true,
      });
      closeForm();
      showPopup("Guest updated successfully");
    },
    onError: async (err) => {
      showPopup(await parseAxiosError(err, "Unable to update guest."), "error");
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async () => {
      const gate = evaluateGuestDocumentUpload({
        entitled,
        canManageDocs: canDocs,
        file: uploadFile,
        isUploading: false,
        documentNumber: "",
        documentType: resolveGuestDocumentType(detailQuery.data?.identityType),
      });
      if (!gate.enabled) {
        throw new Error(gate.reason || "Upload is not available.");
      }
      const body = new FormData();
      body.append("document", uploadFile);
      body.append(
        "documentType",
        resolveGuestDocumentType(detailQuery.data?.identityType),
      );
      return api.post(`/guests/${detailGuestId}/documents`, body, {
        headers: { "Content-Type": "multipart/form-data" },
      });
    },
    onSuccess: async () => {
      setUploadFile(null);
      setUploadError("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      await syncAfterGuestMutation(queryClient, {
        restaurantId,
        guestId: detailGuestId,
        includeBookings: false,
      });
      showPopup("Document uploaded successfully");
    },
    onError: async (err) => {
      const message = await parseAxiosError(err, "Unable to upload document.");
      setUploadError(message);
      showPopup(message, "error");
    },
  });

  const deleteDocMutation = useMutation({
    mutationFn: (documentId) =>
      api.delete(`/guests/${detailGuestId}/documents/${documentId}`),
    onSuccess: async () => {
      setDeleteDocTarget(null);
      await syncAfterGuestMutation(queryClient, {
        restaurantId,
        guestId: detailGuestId,
        includeBookings: false,
      });
      showPopup("Document deleted successfully");
    },
    onError: async (err) => {
      showPopup(await parseAxiosError(err, "Unable to delete document."), "error");
    },
  });

  const [accessPendingId, setAccessPendingId] = useState(null);

  const accessDocument = async (doc) => {
    if (!canDocs || accessPendingId) return;
    const documentId = String(doc.id || doc._id);
    setAccessPendingId(documentId);
    try {
      const response = await api.get(
        `/guests/${detailGuestId}/documents/${documentId}/access`,
        { responseType: "blob" },
      );

      // Reject JSON error payloads disguised as blobs
      const contentType = String(response.headers["content-type"] || "");
      if (contentType.includes("application/json")) {
        const text = await response.data.text();
        const json = JSON.parse(text);
        throw Object.assign(new Error(json?.message || "Access denied"), {
          response: { data: json },
        });
      }

      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
      }
      const blobUrl = URL.createObjectURL(response.data);
      objectUrlRef.current = blobUrl;
      const anchor = document.createElement("a");
      anchor.href = blobUrl;
      anchor.download = `guest-document-${documentId.slice(-8)}`;
      anchor.rel = "noopener";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      // Keep URL briefly for download, then revoke
      window.setTimeout(() => {
        if (objectUrlRef.current === blobUrl) {
          URL.revokeObjectURL(blobUrl);
          objectUrlRef.current = null;
        }
      }, 60_000);
      showPopup("Document download started");
    } catch (err) {
      showPopup(await parseAxiosError(err, "Unable to access document."), "error");
    } finally {
      setAccessPendingId(null);
    }
  };

  const mutating =
    createMutation.isPending ||
    updateMutation.isPending ||
    uploadMutation.isPending ||
    deleteDocMutation.isPending;

  const openCreate = () => {
    setEditingGuest(null);
    setForm(EMPTY_FORM);
    setFormErrors({});
    setFormOpen(true);
  };

  const openEdit = (guest) => {
    // Prefer detail payload when editing from detail modal
    const source =
      detailQuery.data && guestIdOf(detailQuery.data) === guestIdOf(guest)
        ? detailQuery.data
        : guest;
    setEditingGuest(source);
    setForm({
      fullName: source.fullName || "",
      phone: source.phone || "",
      email: source.email || "",
      address: source.address || "",
      city: source.city || "",
      state: source.state || "",
      country: source.country || "",
      dateOfBirth: toDateInputValue(source.dateOfBirth),
      nationality: source.nationality || "",
      notes: source.notes || "",
      identityType: source.identityType || "",
      // Never prefill full identity number — API only returns mask
      identityNumber: "",
    });
    setFormErrors({});
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditingGuest(null);
    setForm(EMPTY_FORM);
    setFormErrors({});
  };

  const validateForm = () => {
    const next = {};
    const fullName = String(form.fullName || "").trim();
    if (!fullName) next.fullName = "Full name is required";
    const mobile = parseIndianMobile(form.phone);
    if (!mobile.ok) next.phone = mobile.message;
    if (form.email) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(form.email).trim())) {
        next.email = "Invalid email address";
      }
    }
    const identityNumber = String(form.identityNumber || "").trim();
    const identityType = String(form.identityType || "").trim();
    if (identityNumber && !identityType) {
      next.identityType = "Identity type is required with identity number";
    } else if (identityNumber && identityType) {
      const proof = validateIdProof(identityType, identityNumber);
      if (!proof.ok) {
        if (!canonicalizeIdProofType(identityType)) {
          next.identityType = proof.message;
        } else {
          next.identityNumber = proof.message;
        }
      }
    }
    setFormErrors(next);
    return Object.keys(next).length === 0;
  };

  const buildPayload = () => {
    const mobile = parseIndianMobile(form.phone);
    const payload = {
      fullName: String(form.fullName).trim(),
      phone: mobile.ok ? mobile.value : String(form.phone).trim(),
      email: String(form.email || "").trim() || null,
      address: String(form.address || "").trim() || null,
      city: String(form.city || "").trim() || null,
      state: String(form.state || "").trim() || null,
      country: String(form.country || "").trim() || null,
      dateOfBirth: form.dateOfBirth || null,
      nationality: String(form.nationality || "").trim() || null,
      notes: String(form.notes || "").trim() || null,
      identityType: String(form.identityType || "").trim() || null,
    };
    const identityNumber = String(form.identityNumber || "").trim();
    if (identityNumber) {
      const proof = validateIdProof(form.identityType, identityNumber);
      if (proof.ok) {
        payload.identityType = proof.value.proofType;
        payload.identityNumber = proof.value.proofNumber;
      } else {
        payload.identityNumber = identityNumber;
      }
    } else if (editingGuest && form.identityType === "" && editingGuest.identityType) {
      // clearing type without number — send nulls only when user cleared type
    }
    return payload;
  };

  const submitForm = (event) => {
    event.preventDefault();
    if (mutating || !canWrite) return;
    if (!validateForm()) return;
    const payload = buildPayload();
    if (editingGuest) {
      updateMutation.mutate({ id: guestIdOf(editingGuest), payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const featureBlocked =
    isFeatureNotAvailable(guestsQuery.error) || (!entitled && Boolean(user));

  if (user && !entitled) {
    return <Navigate to="/" replace />;
  }

  const detailGuest = detailQuery.data;
  const documents = Array.isArray(documentsQuery.data)
    ? documentsQuery.data
    : [];
  const bookings = Array.isArray(bookingsQuery.data?.data)
    ? bookingsQuery.data.data
    : [];

  const uploadGate = evaluateGuestDocumentUpload({
    entitled,
    canManageDocs: canDocs,
    file: uploadFile,
    isUploading: uploadMutation.isPending,
    documentNumber: "",
    documentType: resolveGuestDocumentType(detailGuest?.identityType),
  });

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
            <UserRound size={14} />
            Guest Management
          </div> */}
          <h1 className="text-2xl font-black text-[var(--text-primary)]">
            Guests Management
          </h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Manage guest profiles and private identity documents. Bookings are
            shown read-only when linked.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => guestsQuery.refetch()}
            disabled={guestsQuery.isFetching}
            className="inline-flex items-center gap-2"
          >
            <RefreshCw
              size={16}
              className={guestsQuery.isFetching ? "animate-spin" : ""}
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
              Add Guest
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
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            <SummaryStat label="Total guests" value={total} />
            <SummaryStat label="This page" value={guests.length} />
            <SummaryStat
              label="Page"
              value={`${page} / ${totalPages}`}
            />
          </div>

          <div className="rounded-2xl border border-[var(--border)] bg-white p-4 shadow-xs">
            <div className="relative">
              <Search
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
              />
              <input
                type="search"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Search by name or phone"
                aria-label="Search guests by name or phone"
                className="w-full rounded-xl border border-[var(--border)] bg-white py-2.5 pl-9 pr-3 text-sm focus:border-[var(--primary)] focus:outline-none focus:ring-4 focus:ring-[rgba(244,63,94,0.12)]"
              />
            </div>
            <p className="mt-2 text-xs text-[var(--text-muted)]">
              Backend search matches guest name and phone (not email).
            </p>
          </div>

          {guestsQuery.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, index) => (
                <div
                  key={index}
                  className="h-16 animate-pulse rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)]"
                />
              ))}
            </div>
          ) : guestsQuery.isError ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6">
              <p className="font-semibold text-rose-800">
                {getGuestApiErrorMessage(
                  guestsQuery.error,
                  "Failed to load guests.",
                )}
              </p>
              <Button
                type="button"
                variant="outline"
                className="mt-3"
                onClick={() => guestsQuery.refetch()}
              >
                Try again
              </Button>
            </div>
          ) : guests.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[var(--border)] bg-white px-6 py-16 text-center">
              <UserRound className="mx-auto h-10 w-10 text-[var(--text-muted)]" />
              <h2 className="mt-3 text-lg font-bold text-[var(--text-primary)]">
                {searchQ ? "No guests match your search" : "No guests yet"}
              </h2>
              <p className="mt-1 text-sm text-[var(--text-muted)]">
                {searchQ
                  ? "Try a different name or phone."
                  : "Add your first guest profile to get started."}
              </p>
              {!searchQ && canWrite && (
                <Button type="button" className="mt-4" onClick={openCreate}>
                  Add Guest
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
                      <th className="px-4 py-3 font-semibold">Phone</th>
                      <th className="hidden px-4 py-3 font-semibold md:table-cell">
                        Email
                      </th>
                      <th className="hidden px-4 py-3 font-semibold lg:table-cell">
                        Identity
                      </th>
                      <th className="hidden px-4 py-3 font-semibold sm:table-cell">
                        Created
                      </th>
                      <th className="px-4 py-3 font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {guests.map((guest) => (
                      <tr
                        key={guestIdOf(guest)}
                        className="border-t border-[var(--border)]"
                      >
                        <td className="px-4 py-3 font-semibold text-[var(--text-primary)]">
                          {guest.fullName}
                        </td>
                        <td className="px-4 py-3">
                          {displayGuestField(guest.phone)}
                        </td>
                        <td className="hidden px-4 py-3 md:table-cell">
                          {displayGuestField(guest.email)}
                        </td>
                        <td className="hidden px-4 py-3 lg:table-cell">
                          {guest.identityType ? (
                            <span>
                              {guest.identityType}
                              {guest.maskedIdentityNumber
                                ? ` · ${guest.maskedIdentityNumber}`
                                : ""}
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="hidden px-4 py-3 sm:table-cell">
                          {formatGuestDate(guest.createdAt)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5"
                              onClick={() => setDetailGuestId(guestIdOf(guest))}
                            >
                              <Eye size={14} />
                              View
                            </Button>
                            {canWrite && (
                              <Button
                                type="button"
                                variant="secondary"
                                className="inline-flex items-center gap-1.5 px-3 py-1.5"
                                onClick={() => openEdit(guest)}
                              >
                                <Pencil size={14} />
                                Edit
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-between border-t border-[var(--border)] px-4 py-3">
                <p className="text-xs text-[var(--text-muted)]">
                  Showing {guests.length} of {total}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="inline-flex items-center gap-1 px-3 py-1.5"
                  >
                    <ChevronLeft size={14} />
                    Prev
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={page >= totalPages}
                    onClick={() =>
                      setPage((p) => Math.min(totalPages, p + 1))
                    }
                    className="inline-flex items-center gap-1 px-3 py-1.5"
                  >
                    Next
                    <ChevronRight size={14} />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Create / Edit */}
      <Modal
        isOpen={formOpen}
        onClose={() => {
          if (!mutating) closeForm();
        }}
        title={editingGuest ? "Edit Guest" : "Add Guest"}
        panelClassName="max-w-2xl"
      >
        <form onSubmit={submitForm} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Full name"
              value={form.fullName}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, fullName: e.target.value }))
              }
              error={formErrors.fullName}
              required
              autoFocus
            />
            <Input
              label="Phone"
              value={form.phone}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, phone: e.target.value }))
              }
              error={formErrors.phone}
              required
            />
            <Input
              label="Email"
              type="email"
              value={form.email}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, email: e.target.value }))
              }
              error={formErrors.email}
            />
            <Input
              label="Date of birth"
              type="date"
              value={form.dateOfBirth}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, dateOfBirth: e.target.value }))
              }
            />
            <Input
              label="Nationality"
              value={form.nationality}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, nationality: e.target.value }))
              }
            />
            <Input
              label="Country"
              value={form.country}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, country: e.target.value }))
              }
            />
            <Input
              label="City"
              value={form.city}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, city: e.target.value }))
              }
            />
            <Input
              label="State"
              value={form.state}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, state: e.target.value }))
              }
            />
          </div>
          <Input
            label="Address"
            value={form.address}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, address: e.target.value }))
            }
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block space-y-1 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              Identity type
              <input
                list="guest-identity-types"
                value={form.identityType}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    identityType: e.target.value,
                  }))
                }
                className="mt-1 w-full rounded-xl border border-[var(--border)] bg-white px-4 py-2.5 text-sm"
                placeholder="e.g. Aadhaar"
              />
              <datalist id="guest-identity-types">
                {IDENTITY_TYPE_SUGGESTIONS.map((item) => (
                  <option key={item} value={item} />
                ))}
              </datalist>
              {formErrors.identityType ? (
                <p className="text-xs font-medium text-[var(--danger)]">
                  {formErrors.identityType}
                </p>
              ) : null}
            </label>
            <Input
              label={
                editingGuest
                  ? "Identity number (leave blank to keep existing)"
                  : "Identity number"
              }
              value={form.identityNumber}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  identityNumber: e.target.value,
                }))
              }
              autoComplete="off"
            />
          </div>
          {editingGuest?.maskedIdentityNumber ? (
            <p className="text-xs text-[var(--text-muted)]">
              Current masked identity: {editingGuest.maskedIdentityNumber}
            </p>
          ) : null}
          <label className="block space-y-1 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
            Notes
            <textarea
              value={form.notes}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, notes: e.target.value }))
              }
              rows={3}
              className="mt-1 w-full rounded-xl border border-[var(--border)] bg-white px-4 py-2.5 text-sm"
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
              ) : editingGuest ? (
                "Save changes"
              ) : (
                "Create guest"
              )}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Detail */}
      <Modal
        isOpen={Boolean(detailGuestId)}
        onClose={() => {
          if (!mutating && !accessPendingId) {
            setDetailGuestId(null);
            setUploadFile(null);
            setUploadError("");
            if (fileInputRef.current) fileInputRef.current.value = "";
            setDeleteDocTarget(null);
          }
        }}
        title="Guest details"
        panelClassName="max-w-3xl"
      >
        {detailQuery.isLoading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-[var(--primary)]" />
          </div>
        ) : detailQuery.isError ? (
          <p className="text-sm text-rose-700">
            {getGuestApiErrorMessage(
              detailQuery.error,
              "Failed to load guest.",
            )}
          </p>
        ) : detailGuest ? (
          <div className="space-y-6">
            <section className="space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-black text-[var(--text-primary)]">
                    {displayGuestField(detailGuest.fullName)}
                  </h3>
                  <p className="text-sm text-[var(--text-muted)]">
                    {displayGuestField(detailGuest.phone)}
                    {displayGuestField(detailGuest.email) !== "Not provided"
                      ? ` · ${displayGuestField(detailGuest.email)}`
                      : ""}
                  </p>
                </div>
                {/* {canWrite && (
                  <Button
                    type="button"
                    variant="outline"
                    className="inline-flex items-center gap-1.5"
                    onClick={() => openEdit(detailGuest)}
                  >
                    <Pencil size={14} />
                    Edit profile
                  </Button>
                )} */}
              </div>
              <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-xs font-semibold uppercase text-[var(--text-muted)]">
                    Identity
                  </dt>
                  <dd className="mt-0.5 font-medium">
                    {formatGuestIdentity(detailGuest)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase text-[var(--text-muted)]">
                    Nationality
                  </dt>
                  <dd className="mt-0.5 font-medium">
                    {displayGuestField(detailGuest.nationality)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase text-[var(--text-muted)]">
                    Location
                  </dt>
                  <dd className="mt-0.5 font-medium">
                    {formatGuestLocation(detailGuest)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase text-[var(--text-muted)]">
                    Date of birth
                  </dt>
                  <dd className="mt-0.5 font-medium">
                    {formatGuestDate(detailGuest.dateOfBirth)}
                  </dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-xs font-semibold uppercase text-[var(--text-muted)]">
                    Address
                  </dt>
                  <dd className="mt-0.5 font-medium">
                    {displayGuestField(detailGuest.address)}
                  </dd>
                </div>
                {detailGuest.notes ? (
                  <div className="sm:col-span-2">
                    <dt className="text-xs font-semibold uppercase text-[var(--text-muted)]">
                      Notes
                    </dt>
                    <dd className="mt-0.5 whitespace-pre-wrap font-medium">
                      {detailGuest.notes}
                    </dd>
                  </div>
                ) : null}
              </dl>
            </section>

            <section className="space-y-3 border-t border-[var(--border)] pt-4">
              <h4 className="flex items-center gap-2 text-sm font-bold text-[var(--text-primary)]">
                <FileText size={16} />
                Identity documents
              </h4>
              <>
                <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-3 space-y-3">
                  <p className="text-xs text-[var(--text-muted)]">
                    Private encrypted storage only. Allowed: JPEG, PNG, WEBP,
                    PDF up to 8 MB. Uses the guest profile identity type for
                    upload metadata. Files are never stored in the browser.
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={ALLOWED_DOCUMENT_ACCEPT}
                    disabled={!entitled || !canDocs || uploadMutation.isPending}
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null;
                      setUploadError("");
                      if (!file) {
                        setUploadFile(null);
                        return;
                      }
                      const checked = validatePendingDocumentFile(file);
                      if (!checked.ok) {
                        setUploadFile(null);
                        setUploadError(checked.message);
                        e.target.value = "";
                        return;
                      }
                      setUploadFile(file);
                    }}
                    className="block w-full text-sm disabled:cursor-not-allowed disabled:opacity-60"
                  />
                  {uploadFile ? (
                    <p className="text-xs text-[var(--text-secondary)]">
                      Selected: {uploadFile.name}
                    </p>
                  ) : null}
                  {uploadError ? (
                    <p className="text-xs font-medium text-[var(--danger)]">
                      {uploadError}
                    </p>
                  ) : !uploadGate.enabled ? (
                    <p className="text-xs text-[var(--text-muted)]">
                      {uploadGate.reason}
                    </p>
                  ) : null}
                  <Button
                    type="button"
                    disabled={!uploadGate.enabled}
                    onClick={() => uploadMutation.mutate()}
                    className="inline-flex items-center gap-2"
                  >
                    {uploadMutation.isPending ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Upload size={16} />
                    )}
                    Upload document
                  </Button>
                </div>

                {canDocs ? (
                  documentsQuery.isLoading ? (
                    <p className="text-sm text-[var(--text-muted)]">
                      Loading documents…
                    </p>
                  ) : documents.length === 0 ? (
                    <p className="text-sm text-[var(--text-muted)]">
                      No documents uploaded yet.
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {documents.map((doc) => {
                        const id = String(doc.id || doc._id);
                        return (
                          <li
                            key={id}
                            className="flex flex-col gap-2 rounded-xl border border-[var(--border)] bg-white p-3 sm:flex-row sm:items-center sm:justify-between"
                          >
                            <div>
                              <p className="text-sm font-semibold text-[var(--text-primary)]">
                                {String(doc.documentType || "").replaceAll(
                                  "_",
                                  " ",
                                )}
                              </p>
                              <p className="text-xs text-[var(--text-muted)]">
                                {doc.originalFileNameMasked || "document"} ·{" "}
                                {doc.mimeType} ·{" "}
                                {Math.round((doc.fileSize || 0) / 1024)} KB
                                {doc.maskedDocumentNumber
                                  ? ` · ${doc.maskedDocumentNumber}`
                                  : ""}
                              </p>
                              <p className="text-xs text-[var(--text-muted)]">
                                Uploaded {formatGuestDate(doc.createdAt)}
                              </p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                className="inline-flex items-center gap-1.5 px-3 py-1.5"
                                disabled={Boolean(accessPendingId)}
                                onClick={() => accessDocument(doc)}
                              >
                                {accessPendingId === id ? (
                                  <Loader2 size={14} className="animate-spin" />
                                ) : (
                                  <Download size={14} />
                                )}
                                Access
                              </Button>
                              <Button
                                type="button"
                                variant="danger"
                                className="inline-flex items-center gap-1.5 px-3 py-1.5"
                                disabled={mutating}
                                onClick={() => setDeleteDocTarget(doc)}
                              >
                                <Trash2 size={14} />
                                Delete
                              </Button>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )
                ) : null}
              </>
            </section>

            <section className="space-y-3 border-t border-[var(--border)] pt-4">
              <h4 className="text-sm font-bold text-[var(--text-primary)]">
                Booking history (read-only)
              </h4>
              {bookingsQuery.isLoading ? (
                <p className="text-sm text-[var(--text-muted)]">Loading…</p>
              ) : bookings.length === 0 ? (
                <p className="text-sm text-[var(--text-muted)]">
                  No linked bookings yet.
                </p>
              ) : (
                <ul className="space-y-2">
                  {bookings.map((booking) => (
                    <li
                      key={String(booking.id || booking._id)}
                      className="rounded-xl border border-[var(--border)] px-3 py-2 text-sm"
                    >
                      <span className="font-semibold">
                        {booking.bookingStatus || "—"}
                      </span>
                      {" · Room "}
                      {booking.roomId?.roomNumber ||
                        booking.roomNumber ||
                        "—"}
                      {" · "}
                      {formatGuestDate(booking.checkInDate || booking.checkInAt)}
                      {" → "}
                      {formatGuestDate(
                        booking.checkOutDate || booking.checkOutAt,
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        ) : null}
      </Modal>

      <Modal
        isOpen={Boolean(deleteDocTarget)}
        onClose={() => {
          if (!deleteDocMutation.isPending) setDeleteDocTarget(null);
        }}
        title="Delete document?"
        panelClassName="max-w-md"
      >
        <p className="text-sm text-[var(--text-secondary)]">
          Delete this identity document permanently? This cannot be undone.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={deleteDocMutation.isPending}
            onClick={() => setDeleteDocTarget(null)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="danger"
            disabled={deleteDocMutation.isPending}
            onClick={() =>
              deleteDocMutation.mutate(
                String(deleteDocTarget.id || deleteDocTarget._id),
              )
            }
          >
            {deleteDocMutation.isPending ? "Deleting…" : "Delete document"}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
