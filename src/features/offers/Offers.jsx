import {
  useState,
  useCallback,
  useMemo,
  memo,
  useEffect,
  useRef,
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
  Plus,
  Sparkles,
  Percent,
  IndianRupee,
  CheckCircle2,
  Layers3,
  Clock3,
  AlertCircle,
  Search,
  ChevronDown,
  RefreshCw,
  Gift,
  Crown,
  Utensils,
} from "lucide-react";
import { useSocket } from "../../context/SocketContext";
import { useAuth } from "../../context/AuthContext";

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

const menuImageSrc = (item) => {
  if (!item?.image) return "";
  const src = String(item.image);
  if (src.startsWith("http") || src.startsWith("blob:")) return src;
  const base = String(import.meta.env.VITE_APP_API_BASE || "").replace(
    /\/api(?:\/v1)?\/?$/,
    "",
  );
  return `${base}${src.startsWith("/") ? src : `/${src}`}`;
};

const resolveOfferItems = (offer, menuItemsById) =>
  (offer?.targetItems || [])
    .map((entry) => {
      const id = entry?._id || entry;
      return menuItemsById[String(id)] || (entry?.name ? entry : null);
    })
    .filter(Boolean);

const offerScopeLabel = (offer, menuItemsById) => {
  if (offer?.targetScope === "ALL_ITEMS") return "All menu items";
  const items = resolveOfferItems(offer, menuItemsById);
  const count = offer?.targetItems?.length || items.length;
  const categories = [
    ...new Set(items.map((item) => item.category).filter(Boolean)),
  ];
  if (categories.length === 1) return `${categories[0]} (${count} items)`;
  if (count === 1 && items[0]?.name) return items[0].name;
  return `${count} selected items`;
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
  menuItemsById,
  onDelete,
  deleting,
}) {
  const status = getOfferStatus(offer);
  const cover = resolveOfferItems(offer, menuItemsById)
    .map(menuImageSrc)
    .find(Boolean);

  return (
    <article className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
      <div className="relative h-36 bg-gradient-to-br from-rose-100 via-orange-50 to-amber-100">
        {cover ? (
          <img src={cover} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-rose-300">
            <Tag size={28} />
          </div>
        )}
        <div className="absolute left-3 top-3">
          <StatusBadge status={status} />
        </div>
        <span className="absolute bottom-3 right-3 rounded-xl bg-rose-500 px-2.5 py-1 text-[11px] font-black text-white shadow-sm">
          {getDiscountLabel(offer)}
        </span>
      </div>
      <div className="space-y-3 p-4">
        <div>
          <h3 className="truncate text-sm font-black text-slate-900">{offer.title}</h3>
          <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">
            {offer.description || "No description provided."}
          </p>
        </div>
        <p className="flex items-center gap-1.5 text-[11px] font-bold text-rose-500">
          <Utensils size={12} />
          {offerScopeLabel(offer, menuItemsById)}
        </p>
        <div className="text-[11px] font-semibold leading-5 text-slate-400">
          <p>{formatDateTime(offer.startsAt)}</p>
          <p>{offer.expiresAt ? formatDateTime(offer.expiresAt) : "No expiry"}</p>
        </div>
        {offer.targetScope === "ALL_ITEMS" && (
          <p className="flex items-center gap-1.5 text-[11px] font-semibold text-blue-600">
            <Layers3 size={12} />
            New menu items are included while this offer is valid.
          </p>
        )}
        <div className="flex items-center justify-between border-t border-slate-100 pt-3">
          <span className="text-[11px] font-bold capitalize text-slate-500">
            {status.toLowerCase()}
          </span>
          <button
            type="button"
            onClick={() => onDelete(offer._id)}
            disabled={deleting}
            title="Delete offer"
            className="inline-flex items-center gap-1 rounded-xl bg-rose-50 px-2.5 py-1.5 text-[11px] font-bold text-rose-600 transition hover:bg-rose-100 disabled:opacity-50"
          >
            {deleting ? <RefreshCw size={13} className="animate-spin" /> : <Trash2 size={13} />}
            Delete
          </button>
        </div>
      </div>
    </article>
  );
});

export default function Offers() {
  const socket = useSocket();
  const { user } = useAuth();
  const restaurantId = user?.restaurantId?._id || user?.restaurantId || null;
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState(EMPTY_FORM);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [offerToDelete, setOfferToDelete] = useState(null);
  const [offerSearch, setOfferSearch] = useState("");
  const [offerFilter, setOfferFilter] = useState("ALL");
  const [sortMode, setSortMode] = useState("newest");
  const titleRef = useRef(null);

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
    queryKey: ["offers", restaurantId],
    queryFn: () =>
      api.get("/offers").then((response) => response.data.data),
    staleTime: 30_000,
    enabled: !!restaurantId,
    refetchOnWindowFocus: true,
  });

  const {
    data: menuItemsRaw,
    isLoading: itemsLoading,
    isError: itemsError,
  } = useQuery({
    queryKey: ["menu-items-list", restaurantId],
    queryFn: () =>
      api
        .get("/menu/admin/items")
        .then((response) => response.data.data),
    staleTime: 60_000,
    enabled: !!restaurantId,
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
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    return offers.reduce(
      (stats, offer) => {
        const status = getOfferStatus(offer);

        stats.total += 1;

        if (status === "ACTIVE") stats.active += 1;
        if (status === "SCHEDULED") stats.scheduled += 1;
        if (status === "EXPIRED") stats.expired += 1;
        if (status === "INACTIVE") stats.inactive += 1;
        if (offer.createdAt && new Date(offer.createdAt) >= monthStart) {
          stats.newThisMonth += 1;
        }

        return stats;
      },
      {
        total: 0,
        active: 0,
        scheduled: 0,
        expired: 0,
        inactive: 0,
        newThisMonth: 0,
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

  const visibleOffers = useMemo(() => {
    const list = [...filteredOffers];
    if (sortMode === "title") {
      list.sort((left, right) =>
        String(left.title || "").localeCompare(String(right.title || "")),
      );
    } else if (sortMode === "discount") {
      list.sort(
        (left, right) =>
          Number(right.discountValue || 0) - Number(left.discountValue || 0),
      );
    }
    return list;
  }, [filteredOffers, sortMode]);

  const activeShare = offerStats.total
    ? Math.round((offerStats.active / offerStats.total) * 100)
    : 0;

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
    <div className="-m-4 min-h-screen bg-[var(--background)] p-4 font-sans text-slate-900 md:-m-6 md:p-5 lg:-m-8 lg:p-5">
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

      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[var(--primary)] via-[var(--primary)] to-[var(--secondary)] p-5 text-white">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20">
              <Percent className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight">Offers & Discounts</h1>
              <p className="mt-1 max-w-xl text-sm text-white/85">
                Create and manage special offers to boost your sales and attract more customers.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-2xl bg-white px-3 py-2 text-rose-500 shadow-sm">
            <Crown size={16} />
            <span className="text-xs font-black tracking-wide">SPECIAL OFFER</span>
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Total Offers", offerStats.total, Tag, "text-emerald-600 bg-emerald-50", `${offerStats.newThisMonth} new this month`],
          ["Active Offers", offerStats.active, Gift, "text-blue-600 bg-blue-50", `${activeShare}% of total`],
          ["Scheduled Offers", offerStats.scheduled, Clock3, "text-violet-600 bg-violet-50", "Start in future"],
          ["Expired Offers", offerStats.expired, AlertCircle, "text-rose-600 bg-rose-50", "Past end date"],
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

      <div className="mt-4 grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <section className="min-w-0">
          <div className="mb-3 flex flex-col gap-3 rounded-2xl border border-slate-100 bg-white p-3 shadow-sm lg:flex-row lg:items-center">
            <div className="flex gap-1 overflow-x-auto">
              {[
                ["ALL", "All", offerStats.total],
                ["ACTIVE", "Active", offerStats.active],
                ["SCHEDULED", "Scheduled", offerStats.scheduled],
                ["EXPIRED", "Expired", offerStats.expired],
                ["INACTIVE", "Inactive", offerStats.inactive],
              ].map(([value, label, count]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setOfferFilter(value)}
                  className={`whitespace-nowrap rounded-xl px-3 py-2 text-xs font-black ${offerFilter === value ? "bg-rose-500 text-white" : "bg-slate-50 text-slate-600"}`}
                >
                  {label} <span className="opacity-80">{count}</span>
                </button>
              ))}
            </div>
            <div className="flex flex-1 items-center gap-2 lg:justify-end">
              <div className="relative min-w-[160px] flex-1 lg:max-w-xs">
                <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={offerSearch}
                  onChange={(e) => setOfferSearch(e.target.value)}
                  placeholder="Search offers..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-8 pr-3 text-xs font-semibold outline-none focus:border-rose-300 focus:bg-white"
                />
              </div>
              <select
                value={sortMode}
                onChange={(e) => setSortMode(e.target.value)}
                aria-label="Sort offers"
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 outline-none"
              >
                <option value="newest">Newest</option>
                <option value="title">Name</option>
                <option value="discount">Discount</option>
              </select>
              <button
                type="button"
                onClick={() => refetchOffers()}
                disabled={offersFetching}
                className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 disabled:opacity-50"
              >
                <RefreshCw size={13} className={offersFetching ? "animate-spin" : ""} />
              </button>
            </div>
          </div>

          {offersLoading ? (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {[1, 2, 3, 4].map((item) => (
                <div key={item} className="h-72 animate-pulse rounded-3xl border border-slate-100 bg-white" />
              ))}
            </div>
          ) : offersError ? (
            <div className="rounded-3xl border border-rose-100 bg-white p-10 text-center shadow-sm">
              <AlertCircle className="mx-auto mb-2 text-rose-500" size={22} />
              <h3 className="text-sm font-black text-slate-900">Unable to load offers</h3>
              <p className="mt-1 text-xs text-slate-500">Please refresh and try again.</p>
            </div>
          ) : visibleOffers.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
              <Tag className="mx-auto mb-3 text-slate-300" size={26} />
              <h3 className="text-sm font-black text-slate-800">
                {offers.length === 0 ? "No offers created yet" : "No matching offers"}
              </h3>
              <p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-slate-500">
                {offers.length === 0
                  ? "Create your first promotion using the form."
                  : "Try a different search term or status filter."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {visibleOffers.map((offer) => (
                <OfferCard
                  key={offer._id}
                  offer={offer}
                  menuItemsById={menuItemsById}
                  onDelete={handleDeleteOffer}
                  deleting={deleteMutation.isPending && deleteMutation.variables === offer._id}
                />
              ))}
            </div>
          )}
        </section>

        <aside className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm xl:sticky xl:top-4">
          <div className="mb-4 flex items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-sm font-black text-slate-900">
              <Sparkles size={15} className="text-rose-500" />
              Add New Offer
            </h2>
            <button
              type="button"
              onClick={() => titleRef.current?.focus()}
              className="inline-flex items-center gap-1 rounded-xl bg-rose-500 px-3 py-2 text-[11px] font-black text-white"
            >
              <Plus size={13} /> Create Offer
            </button>
          </div>

          <div className="space-y-3">
            <label className="block">
              <span className="mb-1 block text-[11px] font-bold text-slate-500">Offer Title *</span>
              <input
                ref={titleRef}
                value={formData.title}
                maxLength={100}
                onChange={(e) => updateField("title", e.target.value)}
                placeholder="Enter offer title (e.g. Weekend Special)"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold outline-none focus:border-rose-300 focus:bg-white"
              />
            </label>

            <div>
              <p className="mb-1 text-[11px] font-bold text-slate-500">Discount Type *</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  ["PERCENTAGE", "Percentage (%)"],
                  ["FLAT", "Flat Amount (₹)"],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => updateField("discountType", value)}
                    className={`rounded-xl border px-2 py-2 text-[11px] font-bold ${formData.discountType === value ? "border-rose-400 bg-rose-50 text-rose-600" : "border-slate-200 text-slate-500"}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <label className="block">
              <span className="mb-1 block text-[11px] font-bold text-slate-500">Discount Value *</span>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  max={formData.discountType === "PERCENTAGE" ? 100 : undefined}
                  step="0.01"
                  value={formData.discountValue}
                  onChange={(e) => updateField("discountValue", e.target.value)}
                  placeholder={formData.discountType === "PERCENTAGE" ? "20" : "100"}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-3 pr-10 text-sm font-semibold outline-none focus:border-rose-300 focus:bg-white"
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                  {formData.discountType === "PERCENTAGE" ? <Percent size={14} /> : <IndianRupee size={14} />}
                </span>
              </div>
            </label>

            <label className="block">
              <span className="mb-1 block text-[11px] font-bold text-slate-500">Description</span>
              <textarea
                rows={3}
                maxLength={500}
                value={formData.description}
                onChange={(e) => updateField("description", e.target.value)}
                placeholder="Enter offer description..."
                className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium outline-none focus:border-rose-300 focus:bg-white"
              />
            </label>

            <div>
              <p className="mb-1 text-[11px] font-bold text-slate-500">Target Scope *</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  ["SPECIFIC_ITEMS", "Specific Items"],
                  ["ALL_ITEMS", "All Menu Items"],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => {
                      updateField("targetScope", value);
                      if (value === "ALL_ITEMS") updateField("targetItems", []);
                    }}
                    className={`rounded-xl border px-2 py-2 text-[11px] font-bold ${formData.targetScope === value ? "border-rose-400 bg-rose-50 text-rose-600" : "border-slate-200 text-slate-500"}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {formData.targetScope === "ALL_ITEMS" ? (
              <p className="rounded-xl bg-blue-50 px-3 py-2 text-[11px] font-semibold leading-5 text-blue-700">
                New menu items added while this offer is valid are included automatically.
              </p>
            ) : (
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-500">Select Menu Items *</span>
                  <span className="text-[10px] font-bold text-slate-400">{formData.targetItems.length} selected</span>
                </div>
                {itemsLoading ? (
                  <p className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-400">Loading menu items...</p>
                ) : itemsError ? (
                  <p className="rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-600">Failed to load menu items.</p>
                ) : (
                  <>
                    <div className="relative">
                      <select
                        value=""
                        onChange={(e) => addTargetItem(e.target.value)}
                        className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 pr-8 text-sm font-semibold text-slate-700 outline-none focus:border-rose-300"
                      >
                        <option value="">Select menu items...</option>
                        {menuItems
                          .filter((item) => !formData.targetItems.includes(String(item._id)))
                          .map((item) => (
                            <option key={item._id} value={item._id}>
                              {item.name} — ₹{Number(item.price || 0).toLocaleString("en-IN")}
                            </option>
                          ))}
                      </select>
                      <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    </div>
                    {formData.targetItems.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {formData.targetItems.map((itemId) => {
                          const item = menuItemsById[String(itemId)];
                          return (
                            <span key={itemId} className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-1 text-[10px] font-bold text-rose-700">
                              {item?.name || "Unknown item"}
                              <button type="button" onClick={() => removeTargetItem(itemId)} aria-label={`Remove ${item?.name || "item"}`}>
                                <X size={11} />
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

            <div className="grid grid-cols-1 gap-2">
              <label className="block">
                <span className="mb-1 flex items-center justify-between text-[11px] font-bold text-slate-500">
                  Start Date & Time
                  <button type="button" onClick={setQuickStartNow} className="font-extrabold text-rose-500">Start now</button>
                </span>
                <input
                  type="datetime-local"
                  value={formData.startsAt}
                  onChange={(e) => updateField("startsAt", e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold outline-none focus:border-rose-300"
                />
              </label>
              <label className="block">
                <span className="mb-1 flex items-center justify-between text-[11px] font-bold text-slate-500">
                  End Date & Time
                  <button type="button" onClick={() => setQuickExpiry(7)} className="font-extrabold text-rose-500">+7 days</button>
                </span>
                <input
                  type="datetime-local"
                  value={formData.expiresAt}
                  onChange={(e) => updateField("expiresAt", e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold outline-none focus:border-rose-300"
                />
              </label>
            </div>
            <p className="text-[10px] font-medium text-slate-400">Leave start empty to begin now. Leave end empty for no expiry.</p>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setFormData(EMPTY_FORM)}
                className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-bold text-slate-600"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleLaunchOffer}
                disabled={isSubmitting}
                className="inline-flex flex-1 items-center justify-center gap-1 rounded-xl bg-rose-500 py-2.5 text-sm font-black text-white disabled:opacity-60"
              >
                {isSubmitting ? <RefreshCw size={14} className="animate-spin" /> : <Plus size={14} />}
                {isSubmitting ? "Creating..." : "Create Offer"}
              </button>
            </div>
          </div>
        </aside>
      </div>

    </div>
  );
}
