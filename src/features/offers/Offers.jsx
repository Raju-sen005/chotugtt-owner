import {
  useState,
  useCallback,
  useMemo,
  memo,
  useEffect,
} from "react";
import axios from "axios";
import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import {
  Tag,
  X,
  Trash2,
  PlusCircle,
  Sparkles,
  Percent,
  IndianRupee,
  CheckCircle2,
  CalendarClock,
  Layers3,
  PackageSearch,
  Clock3,
  AlertCircle,
  Search,
  ChevronDown,
  RefreshCw,
} from "lucide-react";
import { useSocket } from "../../context/SocketContext";

const api = axios.create({
  baseURL: import.meta.env.VITE_APP_API_BASE,
  withCredentials: true,
});

const EMPTY_FORM = {
  title: "",
  discountType: "PERCENTAGE",
  discountValue: "",
  description: "",
  targetScope: "SPECIFIC_ITEMS",
  targetItems: [],
  startsAt: "",
  expiresAt: "",
};

const formatDateTime = (value) => {
  if (!value) return "No expiry";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Invalid date";

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const toDateTimeLocalValue = (date) => {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "";

  const pad = (n) => String(n).padStart(2, "0");

  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(
    d.getDate(),
  )}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const getOfferStatus = (offer) => {
  const now = Date.now();
  const startsAt = offer?.startsAt
    ? new Date(offer.startsAt).getTime()
    : null;
  const expiresAt = offer?.expiresAt
    ? new Date(offer.expiresAt).getTime()
    : null;

  if (offer?.isActive === false) {
    return "INACTIVE";
  }

  if (startsAt && startsAt > now) {
    return "SCHEDULED";
  }

  if (expiresAt && expiresAt <= now) {
    return "EXPIRED";
  }

  return "ACTIVE";
};

const getDiscountLabel = (offer) => {
  if (offer?.discountType === "FLAT") {
    return `₹${Number(offer.discountValue || 0).toLocaleString(
      "en-IN",
    )} OFF`;
  }

  return `${Number(offer?.discountValue || 0)}% OFF`;
};

const getTargetLabel = (offer) => {
  if (offer?.targetScope === "ALL_ITEMS") {
    return "All menu items";
  }

  return `${offer?.targetItems?.length || 0} selected items`;
};

const StatusBadge = memo(function StatusBadge({ status }) {
  const config = {
    ACTIVE: {
      label: "Active",
      className:
        "bg-emerald-50 text-emerald-700 border-emerald-100",
      dot: "bg-emerald-500",
    },
    SCHEDULED: {
      label: "Scheduled",
      className:
        "bg-blue-50 text-blue-700 border-blue-100",
      dot: "bg-blue-500",
    },
    EXPIRED: {
      label: "Expired",
      className:
        "bg-slate-100 text-slate-500 border-slate-200",
      dot: "bg-slate-400",
    },
    INACTIVE: {
      label: "Inactive",
      className:
        "bg-amber-50 text-amber-700 border-amber-100",
      dot: "bg-amber-500",
    },
  };

  const item = config[status] || config.INACTIVE;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide ${item.className}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${item.dot}`} />
      {item.label}
    </span>
  );
});

const OfferCard = memo(function OfferCard({
  offer,
  onDelete,
  deleting,
}) {
  const status = getOfferStatus(offer);

  return (
    <article className="group overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-red-200 hover:shadow-lg">
      <div className="flex flex-col gap-5 p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-red-500 to-rose-600 text-white shadow-lg shadow-red-500/20">
              <Tag size={20} strokeWidth={2.4} />
            </div>

            <div className="min-w-0">
              <div className="mb-1.5 flex flex-wrap items-center gap-2">
                <h3 className="truncate text-sm font-extrabold text-slate-900 sm:text-base">
                  {offer.title}
                </h3>
                <StatusBadge status={status} />
              </div>

              <p className="line-clamp-2 text-xs leading-5 text-slate-500">
                {offer.description || "No description provided."}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onDelete(offer._id)}
            disabled={deleting}
            title="Delete offer"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-400 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {deleting ? (
              <RefreshCw size={16} className="animate-spin" />
            ) : (
              <Trash2 size={16} />
            )}
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-2xl bg-emerald-50/70 p-3">
            <p className="mb-1 text-[9px] font-extrabold uppercase tracking-wider text-emerald-600">
              Discount
            </p>
            <p className="text-sm font-black text-emerald-700">
              {getDiscountLabel(offer)}
            </p>
          </div>

          <div className="rounded-2xl bg-slate-50 p-3">
            <p className="mb-1 text-[9px] font-extrabold uppercase tracking-wider text-slate-400">
              Applies To
            </p>
            <p className="truncate text-xs font-bold text-slate-700">
              {getTargetLabel(offer)}
            </p>
          </div>

          <div className="rounded-2xl bg-slate-50 p-3">
            <p className="mb-1 text-[9px] font-extrabold uppercase tracking-wider text-slate-400">
              Starts
            </p>
            <p className="truncate text-xs font-bold text-slate-700">
              {formatDateTime(offer.startsAt)}
            </p>
          </div>

          <div className="rounded-2xl bg-slate-50 p-3">
            <p className="mb-1 text-[9px] font-extrabold uppercase tracking-wider text-slate-400">
              Expires
            </p>
            <p
              className={`truncate text-xs font-bold ${
                status === "EXPIRED"
                  ? "text-slate-400"
                  : status === "SCHEDULED"
                    ? "text-blue-600"
                    : "text-slate-700"
              }`}
            >
              {formatDateTime(offer.expiresAt)}
            </p>
          </div>
        </div>

        {offer.targetScope === "ALL_ITEMS" && (
          <div className="flex items-center gap-2 rounded-2xl border border-blue-100 bg-blue-50 px-3.5 py-2.5 text-[11px] font-semibold text-blue-700">
            <Layers3 size={14} />
            Automatically applies to new menu items created during
            this offer period.
          </div>
        )}

        {offer.targetScope === "SPECIFIC_ITEMS" &&
          Array.isArray(offer.targetItems) &&
          offer.targetItems.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {offer.targetItems.slice(0, 6).map((item) => (
                <span
                  key={item?._id || item}
                  className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-bold text-slate-600"
                >
                  {item?.name || "Menu item"}
                </span>
              ))}

              {offer.targetItems.length > 6 && (
                <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-bold text-slate-500">
                  +{offer.targetItems.length - 6} more
                </span>
              )}
            </div>
          )}
      </div>
    </article>
  );
});

export default function Offers() {
  const socket = useSocket();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState(EMPTY_FORM);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [offerToDelete, setOfferToDelete] = useState(null);
  const [offerSearch, setOfferSearch] = useState("");
  const [offerFilter, setOfferFilter] = useState("ALL");

  useEffect(() => {
    if (!socket) return;

    const handleOfferCreated = () => {
      queryClient.invalidateQueries({
        queryKey: ["offers"],
      });
    };

    const handleOfferDeleted = () => {
      queryClient.invalidateQueries({
        queryKey: ["offers"],
      });
    };

    socket.on("OFFER_CREATED", handleOfferCreated);
    socket.on("OFFER_DELETED", handleOfferDeleted);

    return () => {
      socket.off("OFFER_CREATED", handleOfferCreated);
      socket.off("OFFER_DELETED", handleOfferDeleted);
    };
  }, [socket, queryClient]);

  const {
    data: offersRaw,
    isLoading: offersLoading,
    isError: offersError,
    refetch: refetchOffers,
    isFetching: offersFetching,
  } = useQuery({
    queryKey: ["offers"],
    queryFn: () =>
      api.get("/offers").then((response) => response.data.data),
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });

  const {
    data: menuItemsRaw,
    isLoading: itemsLoading,
    isError: itemsError,
  } = useQuery({
    queryKey: ["menu-items-list"],
    queryFn: () =>
      api
        .get("/menu/admin/items")
        .then((response) => response.data.data),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  const offers = useMemo(
    () => (Array.isArray(offersRaw) ? offersRaw : []),
    [offersRaw],
  );

  const menuItems = useMemo(
    () => (Array.isArray(menuItemsRaw) ? menuItemsRaw : []),
    [menuItemsRaw],
  );

  const menuItemsById = useMemo(() => {
    const map = {};

    menuItems.forEach((item) => {
      map[String(item._id)] = item;
    });

    return map;
  }, [menuItems]);

  const offerStats = useMemo(() => {
    return offers.reduce(
      (stats, offer) => {
        const status = getOfferStatus(offer);

        stats.total += 1;

        if (status === "ACTIVE") stats.active += 1;
        if (status === "SCHEDULED") stats.scheduled += 1;
        if (status === "EXPIRED") stats.expired += 1;

        return stats;
      },
      {
        total: 0,
        active: 0,
        scheduled: 0,
        expired: 0,
      },
    );
  }, [offers]);

  const filteredOffers = useMemo(() => {
    const search = offerSearch.trim().toLowerCase();

    return offers.filter((offer) => {
      const status = getOfferStatus(offer);

      const matchesFilter =
        offerFilter === "ALL" ||
        status === offerFilter;

      const matchesSearch =
        !search ||
        String(offer.title || "")
          .toLowerCase()
          .includes(search) ||
        String(offer.description || "")
          .toLowerCase()
          .includes(search);

      return matchesFilter && matchesSearch;
    });
  }, [offers, offerSearch, offerFilter]);

  const addMutation = useMutation({
    mutationFn: (data) => api.post("/offers", data),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["offers"],
      });

      setFormData(EMPTY_FORM);
      setSuccessMessage("Offer created successfully");
      setShowSuccessPopup(true);
    },

    onError: (error) => {
      const message =
        error?.response?.data?.message ||
        "Unable to create offer.";

      setSuccessMessage(message);
      setShowSuccessPopup(true);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (offerId) =>
      api.delete(`/offers/${offerId}`),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["offers"],
      });

      setSuccessMessage("Offer deleted successfully");
      setShowSuccessPopup(true);
    },

    onError: (error) => {
      const message =
        error?.response?.data?.message ||
        "Unable to delete offer.";

      setSuccessMessage(message);
      setShowSuccessPopup(true);
    },
  });

  useEffect(() => {
    if (!showSuccessPopup) return;

    const timer = setTimeout(() => {
      setShowSuccessPopup(false);
    }, 3500);

    return () => clearTimeout(timer);
  }, [showSuccessPopup]);

  const updateField = useCallback((field, value) => {
    setFormData((previous) => ({
      ...previous,
      [field]: value,
    }));
  }, []);

  const addTargetItem = useCallback((itemId) => {
    if (!itemId) return;

    setFormData((previous) => {
      if (previous.targetItems.includes(itemId)) {
        return previous;
      }

      return {
        ...previous,
        targetItems: [
          ...previous.targetItems,
          itemId,
        ],
      };
    });
  }, []);

  const removeTargetItem = useCallback((itemId) => {
    setFormData((previous) => ({
      ...previous,
      targetItems: previous.targetItems.filter(
        (id) => id !== itemId,
      ),
    }));
  }, []);

  const handleDeleteOffer = useCallback((offerId) => {
    setOfferToDelete(offerId);
    setShowDeleteModal(true);
  }, []);

  const confirmDeleteOffer = useCallback(() => {
    if (!offerToDelete) return;

    deleteMutation.mutate(offerToDelete, {
      onSettled: () => {
        setShowDeleteModal(false);
        setOfferToDelete(null);
      },
    });
  }, [deleteMutation, offerToDelete]);

  const handleLaunchOffer = useCallback(() => {
    const title = String(
      formData.title || "",
    ).trim();

    const description = String(
      formData.description || "",
    ).trim();

    const discount = Number(
      formData.discountValue,
    );

    if (!title) {
      alert("Please enter an offer title.");
      return;
    }

    if (title.length > 100) {
      alert("Offer title cannot exceed 100 characters.");
      return;
    }

    if (
      !Number.isFinite(discount) ||
      discount <= 0
    ) {
      alert("Please enter a valid discount value.");
      return;
    }

    if (
      formData.discountType === "PERCENTAGE" &&
      discount > 100
    ) {
      alert("Percentage discount cannot exceed 100%.");
      return;
    }

    if (
      formData.targetScope === "SPECIFIC_ITEMS" &&
      formData.targetItems.length === 0
    ) {
      alert("Please select at least one menu item.");
      return;
    }

    if (
      formData.startsAt &&
      formData.expiresAt &&
      new Date(formData.expiresAt) <=
        new Date(formData.startsAt)
    ) {
      alert("Expiry time must be after start time.");
      return;
    }

    if (
      formData.expiresAt &&
      new Date(formData.expiresAt) <= new Date()
    ) {
      alert("Expiry time must be in the future.");
      return;
    }

    addMutation.mutate({
      title,
      description,
      discountType: formData.discountType,
      discountValue: discount,
      targetScope: formData.targetScope,
      targetItems:
        formData.targetScope === "ALL_ITEMS"
          ? []
          : formData.targetItems,
      startsAt: formData.startsAt || undefined,
      expiresAt: formData.expiresAt || undefined,
    });
  }, [addMutation, formData]);

  const setQuickStartNow = useCallback(() => {
    updateField(
      "startsAt",
      toDateTimeLocalValue(new Date()),
    );
  }, [updateField]);

  const setQuickExpiry = useCallback(
    (days) => {
      updateField(
        "expiresAt",
        toDateTimeLocalValue(
          Date.now() + days * 24 * 60 * 60 * 1000,
        ),
      );
    },
    [updateField],
  );

  const isSubmitting = addMutation.isPending;

  return (
    <div className="min-h-screen bg-[#f6f7fb] px-3 py-4 font-sans text-slate-900 sm:px-6 sm:py-6 lg:px-10 lg:py-8">
      {showSuccessPopup && (
        <div className="fixed right-4 top-4 z-[10000] w-[calc(100%-2rem)] max-w-sm animate-in slide-in-from-right-5 fade-in duration-300 sm:right-6 sm:top-6">
          <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-white p-4 shadow-2xl">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
              <CheckCircle2 size={21} strokeWidth={2.5} />
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-sm font-extrabold text-slate-900">
                {successMessage}
              </p>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                The operation has been completed.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowSuccessPopup(false)}
              className="text-slate-400 transition hover:text-slate-700"
              aria-label="Close notification"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      )}

      {showDeleteModal && (
        <div className="fixed inset-0 z-[10001] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[28px] bg-white p-6 shadow-2xl">
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-100 text-rose-600">
              <Trash2 size={22} strokeWidth={2.5} />
            </div>

            <h3 className="text-lg font-black text-slate-900">
              Delete this offer?
            </h3>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              This offer will no longer be available for new
              orders. Existing completed orders remain unchanged.
            </p>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteModal(false);
                  setOfferToDelete(null);
                }}
                className="flex-1 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={confirmDeleteOffer}
                disabled={deleteMutation.isPending}
                className="flex-1 rounded-2xl bg-rose-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {deleteMutation.isPending
                  ? "Deleting..."
                  : "Delete Offer"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
          <div className="relative p-5 sm:p-7 lg:p-8">
            <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-red-100/60 blur-3xl" />

            <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-red-500 to-rose-600 text-white shadow-xl shadow-red-500/20">
                  <Sparkles size={27} strokeWidth={2.2} />
                </div>

                <div>
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <h1 className="text-xl font-black tracking-tight text-slate-950 sm:text-2xl">
                      Offers & Discounts
                    </h1>

                    <span className="rounded-full bg-red-50 px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-wider text-red-600">
                      Promotions
                    </span>
                  </div>

                  <p className="max-w-2xl text-xs leading-5 text-slate-500 sm:text-sm">
                    Create restaurant promotions with percentage or
                    flat discounts, scheduling, expiry and automatic
                    future-item coverage.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                <div className="min-w-[82px] rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-center">
                  <p className="text-lg font-black text-slate-900">
                    {offerStats.total}
                  </p>
                  <p className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400">
                    Total
                  </p>
                </div>

                <div className="min-w-[82px] rounded-2xl border border-emerald-100 bg-emerald-50 px-3 py-2.5 text-center">
                  <p className="text-lg font-black text-emerald-700">
                    {offerStats.active}
                  </p>
                  <p className="text-[9px] font-extrabold uppercase tracking-wider text-emerald-500">
                    Active
                  </p>
                </div>

                <div className="min-w-[82px] rounded-2xl border border-blue-100 bg-blue-50 px-3 py-2.5 text-center">
                  <p className="text-lg font-black text-blue-700">
                    {offerStats.scheduled}
                  </p>
                  <p className="text-[9px] font-extrabold uppercase tracking-wider text-blue-500">
                    Scheduled
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Create Offer */}
        <section className="rounded-[28px] border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-5 sm:px-7">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-600">
                <PlusCircle size={20} />
              </div>

              <div>
                <h2 className="text-base font-black text-slate-900">
                  Create New Offer
                </h2>
                <p className="text-xs text-slate-500">
                  Configure the promotion rules and validity period.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-6 p-5 sm:p-7">
            {/* Basic details */}
            <div>
              <div className="mb-3 flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-slate-100 text-[10px] font-black text-slate-600">
                  01
                </span>
                <p className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                  Offer Details
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                <div className="lg:col-span-2">
                  <label className="mb-1.5 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                    Offer Title
                  </label>

                  <input
                    value={formData.title}
                    maxLength={100}
                    onChange={(e) =>
                      updateField("title", e.target.value)
                    }
                    placeholder="e.g. Weekend Mega Special"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm font-semibold text-slate-900 outline-none transition focus:border-red-400 focus:bg-white focus:ring-4 focus:ring-red-500/10"
                  />
                  <div className="mt-1 flex justify-end text-[9px] font-semibold text-slate-400">
                    {formData.title.length}/100
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                    Discount Type
                  </label>

                  <select
                    value={formData.discountType}
                    onChange={(e) =>
                      updateField(
                        "discountType",
                        e.target.value,
                      )
                    }
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm font-semibold text-slate-900 outline-none transition focus:border-red-400 focus:bg-white focus:ring-4 focus:ring-red-500/10"
                  >
                    <option value="PERCENTAGE">
                      Percentage (%)
                    </option>
                    <option value="FLAT">
                      Flat Amount (₹)
                    </option>
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                    Discount Value
                  </label>

                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      max={
                        formData.discountType === "PERCENTAGE"
                          ? 100
                          : undefined
                      }
                      step="0.01"
                      value={formData.discountValue}
                      onChange={(e) =>
                        updateField(
                          "discountValue",
                          e.target.value,
                        )
                      }
                      placeholder={
                        formData.discountType === "PERCENTAGE"
                          ? "20"
                          : "100"
                      }
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3.5 pl-4 pr-11 text-sm font-semibold text-slate-900 outline-none transition focus:border-red-400 focus:bg-white focus:ring-4 focus:ring-red-500/10"
                    />

                    <div className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                      {formData.discountType === "PERCENTAGE" ? (
                        <Percent size={16} />
                      ) : (
                        <IndianRupee size={16} />
                      )}
                    </div>
                  </div>

                  <p className="mt-1.5 text-[10px] font-medium text-slate-400">
                    {formData.discountType === "PERCENTAGE"
                      ? "Maximum 100%"
                      : "Flat discount in INR"}
                  </p>
                </div>

                <div className="lg:col-span-2">
                  <label className="mb-1.5 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                    Description
                  </label>

                  <textarea
                    rows={3}
                    maxLength={500}
                    value={formData.description}
                    onChange={(e) =>
                      updateField(
                        "description",
                        e.target.value,
                      )
                    }
                    placeholder="Describe the promotion for your customers..."
                    className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm font-medium text-slate-900 outline-none transition focus:border-red-400 focus:bg-white focus:ring-4 focus:ring-red-500/10"
                  />
                </div>
              </div>
            </div>

            {/* Targeting */}
            <div>
              <div className="mb-3 flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-slate-100 text-[10px] font-black text-slate-600">
                  02
                </span>
                <p className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                  Targeting
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                <label className="mb-1.5 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                  Apply Offer To
                </label>

                <select
                  value={formData.targetScope}
                  onChange={(e) => {
                    const value = e.target.value;

                    updateField(
                      "targetScope",
                      value,
                    );

                    if (value === "ALL_ITEMS") {
                      updateField(
                        "targetItems",
                        [],
                      );
                    }
                  }}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm font-semibold text-slate-900 outline-none transition focus:border-red-400 focus:ring-4 focus:ring-red-500/10"
                >
                  <option value="SPECIFIC_ITEMS">
                    Selected Menu Items
                  </option>
                  <option value="ALL_ITEMS">
                    All Menu Items — Including Future Items
                  </option>
                </select>

                {formData.targetScope === "ALL_ITEMS" ? (
                  <div className="mt-3 flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50 p-3.5 text-blue-700">
                    <Layers3
                      size={17}
                      className="mt-0.5 shrink-0"
                    />
                    <div>
                      <p className="text-xs font-extrabold">
                        Automatic future-item coverage
                      </p>
                      <p className="mt-0.5 text-[11px] leading-5 text-blue-600">
                        Any eligible menu item added while this offer
                        is valid will automatically qualify. No manual
                        offer update is required.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4">
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                        Select Menu Items
                      </p>

                      <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-bold text-slate-500 shadow-sm">
                        {formData.targetItems.length} selected
                      </span>
                    </div>

                    {itemsLoading ? (
                      <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white p-4 text-xs font-semibold text-slate-400">
                        <RefreshCw
                          size={15}
                          className="animate-spin"
                        />
                        Loading menu items...
                      </div>
                    ) : itemsError ? (
                      <div className="flex items-start gap-2 rounded-2xl border border-rose-100 bg-rose-50 p-4 text-xs font-semibold text-rose-600">
                        <AlertCircle size={16} className="mt-0.5" />
                        <span>
                          Failed to load menu items. Please check your
                          authentication and try again.
                        </span>
                      </div>
                    ) : (
                      <>
                        <div className="relative">
                          <select
                            value=""
                            onChange={(e) => {
                              addTargetItem(e.target.value);
                            }}
                            className="w-full appearance-none rounded-2xl border border-slate-200 bg-white px-4 py-3.5 pr-10 text-sm font-semibold text-slate-700 outline-none transition focus:border-red-400 focus:ring-4 focus:ring-red-500/10"
                          >
                            <option value="">
                              Select a menu item to add...
                            </option>

                            {menuItems
                              .filter(
                                (item) =>
                                  !formData.targetItems.includes(
                                    String(item._id),
                                  ),
                              )
                              .map((item) => (
                                <option
                                  key={item._id}
                                  value={item._id}
                                >
                                  {item.name} — ₹
                                  {Number(
                                    item.price || 0,
                                  ).toLocaleString("en-IN")}
                                </option>
                              ))}
                          </select>

                          <ChevronDown
                            size={16}
                            className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
                          />
                        </div>

                        {formData.targetItems.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {formData.targetItems.map((itemId) => {
                              const item =
                                menuItemsById[String(itemId)];

                              return (
                                <span
                                  key={itemId}
                                  className="inline-flex items-center gap-2 rounded-full border border-red-100 bg-red-50 px-3 py-1.5 text-[11px] font-bold text-red-700"
                                >
                                  {item?.name || "Unknown item"}

                                  <button
                                    type="button"
                                    onClick={() =>
                                      removeTargetItem(
                                        itemId,
                                      )
                                    }
                                    className="rounded-full text-red-400 transition hover:text-red-700"
                                    aria-label={`Remove ${
                                      item?.name || "item"
                                    }`}
                                  >
                                    <X size={13} />
                                  </button>
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Schedule */}
            <div>
              <div className="mb-3 flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-slate-100 text-[10px] font-black text-slate-600">
                  03
                </span>
                <p className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                  Schedule & Expiry
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <label className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                      <Clock3 size={14} />
                      Starts At
                    </label>

                    <button
                      type="button"
                      onClick={setQuickStartNow}
                      className="text-[10px] font-extrabold text-red-600 hover:text-red-700"
                    >
                      Start Now
                    </button>
                  </div>

                  <input
                    type="datetime-local"
                    value={formData.startsAt}
                    onChange={(e) =>
                      updateField(
                        "startsAt",
                        e.target.value,
                      )
                    }
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-red-400 focus:ring-4 focus:ring-red-500/10"
                  />

                  <p className="mt-2 text-[10px] font-medium text-slate-400">
                    Leave empty to start immediately.
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <label className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                      <CalendarClock size={14} />
                      Expires At
                    </label>

                    <button
                      type="button"
                      onClick={() => setQuickExpiry(7)}
                      className="text-[10px] font-extrabold text-red-600 hover:text-red-700"
                    >
                      +7 Days
                    </button>
                  </div>

                  <input
                    type="datetime-local"
                    value={formData.expiresAt}
                    onChange={(e) =>
                      updateField(
                        "expiresAt",
                        e.target.value,
                      )
                    }
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-red-400 focus:ring-4 focus:ring-red-500/10"
                  />

                  <p className="mt-2 text-[10px] font-medium text-slate-400">
                    Leave empty for no expiry.
                  </p>
                </div>
              </div>
            </div>

            {/* Summary + submit */}
            <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-slate-600 shadow-sm">
                  <PackageSearch size={17} />
                </div>

                <div>
                  <p className="text-xs font-extrabold text-slate-800">
                    Promotion summary
                  </p>

                  <p className="mt-0.5 text-[11px] leading-5 text-slate-500">
                    {formData.discountValue
                      ? getDiscountLabel({
                          discountType:
                            formData.discountType,
                          discountValue:
                            formData.discountValue,
                        })
                      : "Discount not configured"}{" "}
                    •{" "}
                    {formData.targetScope === "ALL_ITEMS"
                      ? "All menu items"
                      : `${formData.targetItems.length} selected item(s)`}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleLaunchOffer}
                disabled={isSubmitting}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-red-500 to-rose-600 px-6 text-sm font-extrabold text-white shadow-lg shadow-red-500/20 transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-red-500/25 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw
                      size={17}
                      className="animate-spin"
                    />
                    Creating Offer...
                  </>
                ) : (
                  <>
                    <PlusCircle size={17} />
                    Launch Offer
                  </>
                )}
              </button>
            </div>
          </div>
        </section>

        {/* Offer list */}
        <section>
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-black tracking-tight text-slate-900">
                Offer Management
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Manage active, scheduled and expired promotions.
              </p>
            </div>

            <button
              type="button"
              onClick={() => refetchOffers()}
              disabled={offersFetching}
              className="inline-flex items-center justify-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:opacity-50 lg:self-auto"
            >
              <RefreshCw
                size={14}
                className={
                  offersFetching
                    ? "animate-spin"
                    : ""
                }
              />
              Refresh
            </button>
          </div>

          <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:flex-row">
            <div className="relative flex-1">
              <Search
                size={16}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                value={offerSearch}
                onChange={(e) =>
                  setOfferSearch(e.target.value)
                }
                placeholder="Search offers..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-xs font-semibold outline-none transition focus:border-red-300 focus:bg-white focus:ring-4 focus:ring-red-500/10"
              />
            </div>

            <div className="flex gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1">
              {[
                ["ALL", "All"],
                ["ACTIVE", "Active"],
                ["SCHEDULED", "Scheduled"],
                ["EXPIRED", "Expired"],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() =>
                    setOfferFilter(value)
                  }
                  className={`whitespace-nowrap rounded-lg px-3 py-2 text-[10px] font-extrabold transition ${
                    offerFilter === value
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {offersLoading ? (
            <div className="grid grid-cols-1 gap-3">
              {[1, 2, 3].map((item) => (
                <div
                  key={item}
                  className="h-48 animate-pulse rounded-[24px] border border-slate-200 bg-white"
                />
              ))}
            </div>
          ) : offersError ? (
            <div className="rounded-[24px] border border-rose-100 bg-white p-10 text-center shadow-sm">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-500">
                <AlertCircle size={22} />
              </div>
              <h3 className="text-sm font-black text-slate-900">
                Unable to load offers
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                Please refresh and try again.
              </p>
            </div>
          ) : filteredOffers.length === 0 ? (
            <div className="rounded-[24px] border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                <Tag size={25} />
              </div>

              <h3 className="text-sm font-black text-slate-800">
                {offers.length === 0
                  ? "No offers created yet"
                  : "No matching offers"}
              </h3>

              <p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-slate-500">
                {offers.length === 0
                  ? "Create your first promotion using the offer builder above."
                  : "Try a different search term or status filter."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {filteredOffers.map((offer) => (
                <OfferCard
                  key={offer._id}
                  offer={offer}
                  onDelete={handleDeleteOffer}
                  deleting={
                    deleteMutation.isPending &&
                    deleteMutation.variables ===
                      offer._id
                  }
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
