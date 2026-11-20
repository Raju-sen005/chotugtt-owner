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
  History,
  Search,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Wallet,
  Smartphone,
  Banknote,
  TrendingUp,
  UtensilsCrossed,
  Layers,
  ShoppingBag,
  Activity,
  Table2,
  Trash2,
  X,
  Building2,
  Users,
  Eye,
  Phone,
  LayoutDashboard,
  ClipboardList,
  Menu,
} from "lucide-react";
import {
  ASSIGNABLE_PLANS,
  BUSINESS_CATEGORIES,
  FILTERABLE_PLANS,
  formatPlanLabel,
  isLegacyPlanCode,
} from "./adminPlanCatalog";
import { displayEmail, displayPhone } from "../../utils/displayText";

/* ----------------------------------------------------------------------
   Small presentational primitives
   ------------------------------------------------------------------- */

const SectionHeading = ({ title, subtitle, action }) => (
  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
    <div>
      <h2 className="text-base font-semibold text-stone-900">{title}</h2>
      {subtitle && <p className="mt-0.5 text-sm text-stone-500">{subtitle}</p>}
    </div>
    {action}
  </div>
);

const SelectField = ({
  value,
  onChange,
  disabled,
  children,
  className = "",
}) => (
  <div className={`relative ${className}`}>
    <select
      value={value}
      onChange={onChange}
      disabled={disabled}
      className="h-10 w-full appearance-none rounded-lg border border-stone-200 bg-white pl-3 pr-9 text-sm font-medium text-stone-700 outline-none transition focus:border-stone-400 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {children}
    </select>
    <ChevronDown
      size={15}
      className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-stone-400"
    />
  </div>
);

const StatusPill = ({ tone, children, dot = false }) => {
  const tones = {
    emerald: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
    rose: "bg-rose-50 text-rose-700",
    stone: "bg-stone-100 text-stone-600",
  };
  const dots = {
    emerald: "bg-emerald-500",
    amber: "bg-amber-500",
    rose: "bg-rose-500",
    stone: "bg-stone-400",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ${tones[tone]}`}
    >
      {dot && <span className={`h-1.5 w-1.5 rounded-full ${dots[tone]}`} />}
      {children}
    </span>
  );
};

const PaginationBar = ({
  label,
  page,
  totalPages,
  hasPrev,
  hasNext,
  onPrev,
  onNext,
  disabled,
}) => (
  <div className="flex flex-col gap-3 border-t border-stone-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
    <p className="text-xs text-stone-500">{label}</p>
    <div className="flex items-center gap-2">
      <button
        type="button"
        disabled={!hasPrev || disabled}
        onClick={onPrev}
        className="inline-flex items-center gap-1 rounded-lg border border-stone-200 px-3 py-1.5 text-xs font-medium text-stone-600 transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <ChevronLeft size={14} />
        Previous
      </button>
      <span className="rounded-lg bg-stone-50 px-3 py-1.5 text-xs font-semibold text-stone-700">
        {page} / {Math.max(1, totalPages)}
      </span>
      <button
        type="button"
        disabled={!hasNext || disabled}
        onClick={onNext}
        className="inline-flex items-center gap-1 rounded-lg border border-stone-200 px-3 py-1.5 text-xs font-medium text-stone-600 transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Next
        <ChevronRight size={14} />
      </button>
    </div>
  </div>
);

const DetailItem = ({ label, value }) => {
  return (
    <div className="rounded-xl border border-stone-200 bg-white p-3.5">
      <p className="text-xs text-stone-400">{label}</p>
      <p className="mt-1 break-words text-sm font-medium text-stone-800">
        {value || "—"}
      </p>
    </div>
  );
};

const OverviewCard = ({ label, value, icon: Icon }) => {
  return (
    <div className="rounded-xl border border-stone-200 bg-stone-50 p-3.5">
      <div className="flex items-center gap-2 text-stone-400">
        {Icon && <Icon size={13} />}
        <p className="text-xs">{label}</p>
      </div>
      <p className="mt-1.5 text-lg font-semibold tabular-nums text-stone-900">
        {Number(value || 0).toLocaleString()}
      </p>
    </div>
  );
};

const StatCell = ({ title, value, tone = "stone" }) => {
  const toneText = {
    stone: "text-stone-900",
    emerald: "text-emerald-600",
    amber: "text-amber-600",
    rose: "text-rose-600",
    brand: "text-red-600",
  };
  return (
    <div className="flex flex-col gap-1 bg-white p-4">
      <p className="text-xs text-stone-500">{title}</p>
      <p className={`text-xl font-semibold tabular-nums ${toneText[tone]}`}>
        {value}
      </p>
    </div>
  );
};

const currency = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const formatPlan = formatPlanLabel;

const NAV_ITEMS = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "businesses", label: "Businesses", icon: Building2 },
  { id: "pending", label: "Pending Approvals", icon: ClipboardList },
  { id: "revenue", label: "Reports", icon: TrendingUp },
  { id: "logs", label: "Audit Logs", icon: History },
];

const formatJoined = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatDayKey = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const buildDailySeries = (rows, period, valueKey) => {
  const days =
    period === "7d" ? 7 : period === "90d" ? 90 : period === "1y" ? 365 : 30;
  const totals = new Map(
    (rows || []).map((row) => [String(row._id), Number(row[valueKey]) || 0]),
  );
  const series = [];
  const cursor = new Date();

  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const day = new Date(cursor);
    day.setDate(cursor.getDate() - offset);
    const key = formatDayKey(day);
    series.push({
      _id: key,
      label: key.slice(5),
      value: totals.get(key) || 0,
    });
  }

  return series;
};

const TrendChart = ({ title, series, color, formatValue }) => {
  const peak = Math.max(1, ...series.map((point) => point.value));

  return (
    <div className="mt-5 rounded-xl border border-stone-200 p-4">
      <h3 className="text-sm font-semibold text-stone-900">{title}</h3>
      <div className="mt-4 flex h-44 items-end gap-px">
        {series.map((point) => (
          <div
            key={point._id}
            title={`${point._id}: ${formatValue(point.value)}`}
            className="group flex h-full min-w-0 flex-1 items-end"
          >
            <div
              className={`w-full rounded-t ${color}`}
              style={{
                height: `${Math.max(point.value > 0 ? 6 : 2, (point.value / peak) * 100)}%`,
              }}
            />
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-between text-[10px] text-stone-400">
        <span>{series[0]?.label}</span>
        <span>{series[Math.floor(series.length / 2)]?.label}</span>
        <span>{series[series.length - 1]?.label}</span>
      </div>
    </div>
  );
};

const getAuditActionLabel = (action) => {
  switch (action) {
    case "RESTAURANT_APPROVED":
      return "Approved";

    case "RESTAURANT_APPROVAL_REVOKED":
      return "Approval Revoked";

    case "RESTAURANT_BLOCKED":
      return "Blocked";

    case "RESTAURANT_UNBLOCKED":
      return "Unblocked";

    case "SUBSCRIPTION_PLAN_CHANGED":
      return "Subscription Plan Changed";

    case "SUBSCRIPTION_STATUS_CHANGED":
      return "Subscription Status Changed";

    case "STAFF_ACTIVATED":
      return "Staff Activated";

    case "STAFF_DEACTIVATED":
      return "Staff Deactivated";

    case "RESTAURANT_DELETED":
      return "Restaurant Deleted";

    default:
      return action || "Unknown";
  }
};

const getAuditActionTone = (action) => {
  switch (action) {
    case "RESTAURANT_APPROVED":
    case "RESTAURANT_UNBLOCKED":
    case "STAFF_ACTIVATED":
      return "emerald";
    case "RESTAURANT_APPROVAL_REVOKED":
    case "SUBSCRIPTION_PLAN_CHANGED":
    case "SUBSCRIPTION_STATUS_CHANGED":
      return "amber";
    case "RESTAURANT_BLOCKED":
    case "STAFF_DEACTIVATED":
    case "RESTAURANT_DELETED":
      return "rose";
    default:
      return "stone";
  }
};

/* ----------------------------------------------------------------------
   Main component
   ------------------------------------------------------------------- */

export default function SuperAdminPanel() {
  const [restaurants, setRestaurants] = useState([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [restaurantOverview, setRestaurantOverview] = useState(null);
  const [platformStats, setPlatformStats] = useState(null);
  const [restaurantStaff, setRestaurantStaff] = useState([]);
  const [subscriptionUpdating, setSubscriptionUpdating] = useState(false);
  const [subscriptionModal, setSubscriptionModal] = useState(null);
  const [staffLoading, setStaffLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteConfirmName, setDeleteConfirmName] = useState("");
  const [deletingRestaurant, setDeletingRestaurant] = useState(false);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [approvalFilter, setApprovalFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [activeTab, setActiveTab] = useState("overview");
  const [joinedFilter, setJoinedFilter] = useState("all");
  const [planFilter, setPlanFilter] = useState("all");
  const [subscriptionFilter, setSubscriptionFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [districtFilter, setDistrictFilter] = useState("");
  const [pincodeFilter, setPincodeFilter] = useState("");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [approveConfirm, setApproveConfirm] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [revenueStats, setRevenueStats] = useState(null);
  const [revenueLoading, setRevenueLoading] = useState(false);
  const [revenuePeriod, setRevenuePeriod] = useState("today");
  const [auditPage, setAuditPage] = useState(1);
  const [auditPageSize] = useState(20);
  const [auditAction, setAuditAction] = useState("");
  const [auditSort, setAuditSort] = useState("newest");
  const [platformAnalytics, setPlatformAnalytics] = useState(null);

  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  const [analyticsPeriod, setAnalyticsPeriod] = useState("30d");

  const [auditPagination, setAuditPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPreviousPage: false,
  });
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPreviousPage: false,
  });
  const fetchRestaurants = async () => {
    try {
      setLoading(true);

      const params = {
        page,
        limit: pageSize,
        search: search.trim() || undefined,
        status: statusFilter !== "all" ? statusFilter : undefined,
        approval: approvalFilter !== "all" ? approvalFilter : undefined,
        sort: sortBy,
        joined: joinedFilter !== "all" ? joinedFilter : undefined,
        plan: planFilter !== "all" ? planFilter : undefined,
        subscription:
          subscriptionFilter !== "all" ? subscriptionFilter : undefined,
        category: categoryFilter !== "all" ? categoryFilter : undefined,
        district: districtFilter.trim() || undefined,
        pincode: pincodeFilter.trim() || undefined,
      };

      const res = await axios.get("/admin/restaurants", {
        params,
        withCredentials: true,
      });

      setRestaurants(res.data?.data || []);

      setPagination(
        res.data?.pagination || {
          page: 1,
          limit: pageSize,
          total: 0,
          totalPages: 0,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      );
    } catch (error) {
      console.error("Error fetching restaurants:", error);

      setRestaurants([]);

      alert(error?.response?.data?.message || "Unable to fetch restaurants.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(
      () => {
        fetchRestaurants();
      },
      search || districtFilter || pincodeFilter ? 400 : 0,
    );

    return () => clearTimeout(timer);
  }, [
    page,
    pageSize,
    search,
    statusFilter,
    approvalFilter,
    sortBy,
    joinedFilter,
    planFilter,
    subscriptionFilter,
    categoryFilter,
    districtFilter,
    pincodeFilter,
  ]);

  const handleStatusUpdate = async (id, field, currentStatus) => {
    try {
      const nextStatus = currentStatus === true ? false : true;

      await axios.patch(
        `/admin/restaurants/${id}/status`,
        {
          [field]: nextStatus,
        },
        {
          withCredentials: true,
        },
      );

      await fetchRestaurants();
      await fetchPlatformStats();
      await fetchAuditLogs();
      setApproveConfirm(null);
    } catch (error) {
      console.error("Restaurant status update failed:", error);

      alert(error?.response?.data?.message || "Update failed!");
    }
  };

  const requestApprovalToggle = (store) => {
    if (!store?._id) return;
    setApproveConfirm({
      id: store._id,
      name: store.name,
      currentlyApproved: store.isApproved === true,
    });
  };

  const openBusinessesTab = (overrides = {}) => {
    if (overrides.approval) setApprovalFilter(overrides.approval);
    if (overrides.joined) setJoinedFilter(overrides.joined);
    setPage(1);
    setActiveTab(
      overrides.approval === "pending" ? "pending" : "businesses",
    );
    setMobileNavOpen(false);
  };

  useEffect(() => {
    if (activeTab === "pending" && approvalFilter !== "pending") {
      setApprovalFilter("pending");
      setPage(1);
    }
  }, [activeTab, approvalFilter]);

  const handleStaffStatusUpdate = async (userId, isActive) => {
    if (!selectedRestaurant?._id) return;

    try {
      setStaffLoading(true);

      const response = await axios.patch(
        `/admin/restaurants/${selectedRestaurant._id}/staff/${userId}/status`,
        {
          isActive,
        },
        {
          withCredentials: true,
        },
      );

      if (!response.data?.success) {
        throw new Error(
          response.data?.message || "Failed to update staff status.",
        );
      }

      setRestaurantStaff((prev) =>
        prev.map((staff) =>
          staff._id === userId
            ? {
                ...staff,
                isActive,
              }
            : staff,
        ),
      );

      // Refresh audit logs after status change
      await fetchAuditLogs();
    } catch (error) {
      console.error("❌ Staff status update failed:", error);

      alert(error.response?.data?.message || "Failed to update staff status.");
    } finally {
      setStaffLoading(false);
    }
  };

  const handleViewDetails = async (restaurantId) => {
    try {
      setDetailsLoading(true);
      setOverviewLoading(true);
      setStaffLoading(true);

      setShowDetails(true);

      setSelectedRestaurant(null);
      setRestaurantOverview(null);
      setRestaurantStaff([]);

      const [detailsRes, overviewRes, staffRes] = await Promise.all([
        axios.get(`/admin/restaurants/${restaurantId}`, {
          withCredentials: true,
        }),

        axios.get(`/admin/restaurants/${restaurantId}/overview`, {
          withCredentials: true,
        }),

        axios.get(`/admin/restaurants/${restaurantId}/staff`, {
          withCredentials: true,
        }),
      ]);

      setSelectedRestaurant(detailsRes.data?.data || null);

      setRestaurantOverview(overviewRes.data?.data || null);

      setRestaurantStaff(staffRes.data?.data?.staff || []);
    } catch (error) {
      console.error("Restaurant details/overview/staff fetch failed:", error);

      setShowDetails(false);

      alert(
        error?.response?.data?.message || "Unable to fetch restaurant details.",
      );
    } finally {
      setDetailsLoading(false);
      setOverviewLoading(false);
      setStaffLoading(false);
    }
  };

  const handleSubscriptionUpdate = async () => {
    if (!selectedRestaurant?._id || !subscriptionModal) {
      return;
    }

    const { field, value } = subscriptionModal;

    const currentValue = selectedRestaurant[field];

    // Safety: no unnecessary API request
    if (field !== "subscriptionPlan" && currentValue === value) {
      setSubscriptionModal(null);
      return;
    }

    try {
      setSubscriptionUpdating(true);

      const response = await axios.patch(
        `/admin/restaurants/${selectedRestaurant._id}/subscription`,
        {
          [field]: value,
        },
      );

      if (!response?.data?.success) {
        throw new Error(
          response?.data?.message || "Failed to update subscription",
        );
      }

      const updatedRestaurant = response.data.data;

      // Update currently opened restaurant immediately
      setSelectedRestaurant((prev) => ({
        ...prev,
        ...updatedRestaurant,
      }));

      // Keep restaurant list in sync without changing its structure
      setRestaurants((prev) =>
        prev.map((restaurant) =>
          restaurant._id === updatedRestaurant._id
            ? {
                ...restaurant,
                subscriptionPlan: updatedRestaurant.subscriptionPlan,
                subscriptionStatus: updatedRestaurant.subscriptionStatus,
                subscriptionStartedAt: updatedRestaurant.subscriptionStartedAt,
                subscriptionExpiresAt: updatedRestaurant.subscriptionExpiresAt,
                businessCategory:
                  updatedRestaurant.businessCategory ??
                  restaurant.businessCategory,
              }
            : restaurant,
        ),
      );

      setSubscriptionModal(null);

      // Refresh audit log so the new event appears immediately
      await fetchAuditLogs();

      // Optional platform stats refresh
      await fetchPlatformStats();
    } catch (error) {
      console.error("❌ Subscription update error:", error);

      alert(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to update subscription",
      );
    } finally {
      setSubscriptionUpdating(false);
    }
  };

  const fetchPlatformStats = async () => {
    try {
      setStatsLoading(true);

      const response = await axios.get("/admin/stats", {
        withCredentials: true,
      });

      setPlatformStats(response.data?.data || null);
    } catch (error) {
      console.error("Platform stats fetch failed:", error);
    } finally {
      setStatsLoading(false);
    }
  };

  const fetchPlatformRevenue = async () => {
    try {
      setRevenueLoading(true);

      const response = await axios.get("/admin/revenue", {
        params: {
          period: revenuePeriod,
        },
        withCredentials: true,
      });

      if (response.data?.success) {
        setRevenueStats(response.data.data || null);
      } else {
        setRevenueStats(null);
      }
    } catch (error) {
      console.error("❌ Platform revenue fetch failed:", error);

      setRevenueStats(null);
    } finally {
      setRevenueLoading(false);
    }
  };

  useEffect(() => {
    fetchPlatformStats();
  }, []);

  useEffect(() => {
    fetchPlatformRevenue();
  }, [revenuePeriod]);

  // const fetchRestaurantStaff = async (restaurantId) => {
  //   try {
  //     setStaffLoading(true);

  //     const response = await axios.get(
  //       `/admin/restaurants/${restaurantId}/staff`,
  //       {
  //         withCredentials: true,
  //       },
  //     );

  //     setRestaurantStaff(response.data?.data?.staff || []);
  //   } catch (error) {
  //     console.error("Restaurant staff fetch failed:", error);

  //     setRestaurantStaff([]);

  //     alert(
  //       error?.response?.data?.message || "Unable to fetch restaurant staff.",
  //     );
  //   } finally {
  //     setStaffLoading(false);
  //   }
  // };

  const fetchPlatformAnalytics = async () => {
    try {
      setAnalyticsLoading(true);

      const response = await axios.get("/admin/analytics", {
        params: {
          period: analyticsPeriod,
        },
        withCredentials: true,
      });

      if (response.data?.success) {
        setPlatformAnalytics(response.data.data || null);
      } else {
        setPlatformAnalytics(null);
      }
    } catch (error) {
      console.error("❌ Platform analytics fetch failed:", error);

      setPlatformAnalytics(null);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  useEffect(() => {
    fetchPlatformAnalytics();
  }, [analyticsPeriod]);

  const fetchAuditLogs = async () => {
    try {
      setAuditLoading(true);

      const params = new URLSearchParams();

      params.set("page", String(auditPage));
      params.set("limit", String(auditPageSize));

      if (auditAction) {
        params.set("action", auditAction);
      }

      params.set("sort", auditSort);

      const response = await axios.get(
        `/admin/audit-logs?${params.toString()}`,
        {
          withCredentials: true,
        },
      );

      if (response.data?.success) {
        setAuditLogs(response.data.data || []);

        setAuditPagination(
          response.data.pagination || {
            page: auditPage,
            limit: auditPageSize,
            total: 0,
            totalPages: 0,
            hasNextPage: false,
            hasPreviousPage: false,
          },
        );
      }
    } catch (error) {
      console.error("❌ Failed to fetch audit logs:", error);
    } finally {
      setAuditLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditLogs();
  }, [auditPage, auditPageSize, auditAction, auditSort]);

  const openDeleteRestaurant = () => {
    setDeleteConfirmName("");
    setDeleteConfirmOpen(true);
  };

  const handleDeleteRestaurant = async () => {
    if (!selectedRestaurant?._id) return;

    const expectedName = String(selectedRestaurant.name || "").trim();

    if (deleteConfirmName.trim() !== expectedName) {
      return;
    }

    try {
      setDeletingRestaurant(true);

      const response = await axios.delete(
        `/admin/restaurants/${selectedRestaurant._id}`,
        {
          data: {
            confirmName: deleteConfirmName.trim(),
          },
          withCredentials: true,
        },
      );

      if (!response.data?.success) {
        throw new Error(
          response.data?.message || "Failed to delete restaurant.",
        );
      }

      setDeleteConfirmOpen(false);
      setDeleteConfirmName("");
      setShowDetails(false);
      setSelectedRestaurant(null);
      setRestaurantOverview(null);
      setRestaurantStaff([]);

      await fetchRestaurants();
      await fetchPlatformStats();
      await fetchAuditLogs();

      alert("Restaurant deleted successfully.");
    } catch (error) {
      console.error("❌ Restaurant deletion failed:", error);

      alert(error?.response?.data?.message || "Failed to delete restaurant.");
    } finally {
      setDeletingRestaurant(false);
    }
  };
  // Quick statistics calculation
  const totalStores = platformStats?.restaurants?.total ?? 0;
  const approvedStores = platformStats?.restaurants?.approved ?? 0;
  const pendingStores = platformStats?.restaurants?.pending ?? 0;
  const activeStores = platformStats?.restaurants?.active ?? 0;
  const blockedStores = platformStats?.restaurants?.blocked ?? 0;

  const totalOrders = platformStats?.orders?.total ?? 0;
  const activeOrders = platformStats?.orders?.active ?? 0;

  // Derived, presentation-only helpers (do not affect fetched data)
  const subscriptionTotal = Math.max(
    1,
    (platformAnalytics?.subscriptions?.trial || 0) +
      (platformAnalytics?.subscriptions?.basic || 0) +
      (platformAnalytics?.subscriptions?.premium || 0) +
      (platformAnalytics?.subscriptions?.pro || 0),
  );
  const restaurantGrowthSeries = buildDailySeries(
    platformAnalytics?.restaurantGrowth,
    analyticsPeriod,
    "count",
  );
  const orderTrendSeries = buildDailySeries(
    platformAnalytics?.orderTrend,
    analyticsPeriod,
    "count",
  );
  const revenueTrendSeries = buildDailySeries(
    platformAnalytics?.revenueTrend,
    analyticsPeriod,
    "revenue",
  );

  return (
    <>
      {subscriptionModal && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-stone-950/50 p-4 backdrop-blur-sm"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setSubscriptionModal(null);
          }}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-5 flex items-start justify-between">
              <div>
                <h3 className="text-base font-semibold text-stone-900">
                  Change{" "}
                  {subscriptionModal.field === "subscriptionPlan"
                    ? "plan"
                    : "status"}
                </h3>
                <p className="mt-1 text-sm text-stone-500">
                  {selectedRestaurant?.name || "—"}
                </p>
              </div>
              <button
                type="button"
                disabled={subscriptionUpdating}
                onClick={() => setSubscriptionModal(null)}
                className="rounded-lg p-1.5 text-stone-400 transition hover:bg-stone-100 hover:text-stone-600 disabled:opacity-50"
              >
                <X size={16} />
              </button>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-stone-500">
                {subscriptionModal.field === "subscriptionPlan"
                  ? "Plan"
                  : "Status"}
              </label>

              <SelectField
                value={subscriptionModal.value}
                disabled={subscriptionUpdating}
                onChange={(event) =>
                  setSubscriptionModal((prev) => ({
                    ...prev,
                    value: event.target.value,
                  }))
                }
              >
                {subscriptionModal.field === "subscriptionPlan" ? (
                  <>
                    {ASSIGNABLE_PLANS.map((code) => (
                      <option key={code} value={code}>
                        {formatPlan(code)}
                      </option>
                    ))}
                  </>
                ) : (
                  <>
                    <option value="ACTIVE">Active</option>
                    <option value="PAST_DUE">Past due</option>
                    <option value="CANCELED">Canceled</option>
                  </>
                )}
              </SelectField>
              {subscriptionModal.field === "subscriptionPlan" && (
                <p className="mt-2 text-xs text-stone-500">
                  New assignments are limited to TRIAL and the 11 commercial
                  plans. Legacy STARTER/BASIC/PREMIUM/PRO/PLUS remain on
                  existing accounts for display and renewal, but cannot be
                  newly assigned. For an already-active subscription, saving
                  changes entitlements only and preserves the existing expiry.
                  Expired or inactive accounts receive a fresh plan duration
                  from the server catalog.
                </p>
              )}
            </div>

            <div className="mt-6 flex justify-end gap-2.5">
              <button
                type="button"
                disabled={subscriptionUpdating}
                onClick={() => setSubscriptionModal(null)}
                className="rounded-lg border border-stone-200 px-4 py-2 text-sm font-medium text-stone-600 transition hover:bg-stone-50 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={
                  subscriptionUpdating ||
                  (subscriptionModal.field !== "subscriptionPlan" &&
                    subscriptionModal.value ===
                      selectedRestaurant?.[subscriptionModal.field])
                }
                onClick={handleSubscriptionUpdate}
                className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {subscriptionUpdating && (
                  <Loader2 size={14} className="animate-spin" />
                )}
                {subscriptionUpdating ? "Updating…" : "Update"}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteConfirmOpen && selectedRestaurant && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-stone-950/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-base font-semibold text-stone-900">
              Delete {selectedRestaurant.name}
            </h3>
            <p className="mt-2 text-sm text-stone-500">
              This permanently removes the restaurant, its menu, orders, and
              staff. Type the restaurant name to confirm.
            </p>
            <input
              type="text"
              value={deleteConfirmName}
              onChange={(event) => setDeleteConfirmName(event.target.value)}
              placeholder={selectedRestaurant.name}
              autoComplete="off"
              className="mt-4 h-10 w-full rounded-lg border border-stone-200 px-3 text-sm outline-none focus:border-stone-400"
            />
            <div className="mt-5 flex justify-end gap-2.5">
              <button
                type="button"
                disabled={deletingRestaurant}
                onClick={() => setDeleteConfirmOpen(false)}
                className="rounded-lg border border-stone-200 px-4 py-2 text-sm font-medium text-stone-600"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={
                  deletingRestaurant ||
                  deleteConfirmName.trim() !==
                    String(selectedRestaurant.name || "").trim()
                }
                onClick={handleDeleteRestaurant}
                className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {deletingRestaurant && (
                  <Loader2 size={14} className="animate-spin" />
                )}
                Delete permanently
              </button>
            </div>
          </div>
        </div>
      )}

      {showDetails && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-slate-950/30"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              setShowDetails(false);
            }
          }}
        >
          <div className="h-full w-full max-w-md overflow-y-auto border-l border-slate-100 bg-white shadow-2xl">
            {/* Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-stone-100 bg-white/95 px-6 py-4 backdrop-blur">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-stone-100 p-2 text-stone-500">
                  <Building2 size={18} />
                </div>
                <div>
                  <p className="text-xs text-stone-400">Restaurant details</p>
                  <h2 className="text-base font-semibold text-stone-900">
                    {selectedRestaurant?.name || "Restaurant"}
                  </h2>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowDetails(false)}
                className="rounded-lg p-2 text-stone-400 transition hover:bg-stone-100 hover:text-stone-600"
              >
                <X size={18} />
              </button>
            </div>

            {/* Loading */}
            {detailsLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 size={28} className="animate-spin text-red-600" />
              </div>
            ) : selectedRestaurant ? (
              <div className="space-y-7 p-6">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      handleStatusUpdate(
                        selectedRestaurant._id,
                        "isActive",
                        selectedRestaurant.isActive === true,
                      )
                    }
                    className="inline-flex items-center justify-center gap-1 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-black text-amber-700"
                  >
                    <Power size={13} />
                    {selectedRestaurant.isActive !== false
                      ? "Block"
                      : "Unblock"}
                  </button>
                  <button
                    type="button"
                    onClick={() => requestApprovalToggle(selectedRestaurant)}
                    className="inline-flex items-center justify-center gap-1 rounded-xl bg-rose-500 px-3 py-2 text-xs font-black text-white"
                  >
                    {selectedRestaurant.isApproved ? "Revoke" : "Approve"}
                  </button>
                </div>
                {/* Status */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-stone-200 bg-stone-50 p-4">
                    <p className="text-xs text-stone-400">Approval</p>
                    <p
                      className={`mt-1.5 text-sm font-semibold ${
                        selectedRestaurant.isApproved
                          ? "text-emerald-600"
                          : "text-amber-600"
                      }`}
                    >
                      {selectedRestaurant.isApproved ? "Approved" : "Pending"}
                    </p>
                  </div>

                  <div className="rounded-xl border border-stone-200 bg-stone-50 p-4">
                    <p className="text-xs text-stone-400">Access</p>
                    <p
                      className={`mt-1.5 text-sm font-semibold ${
                        selectedRestaurant.isActive !== false
                          ? "text-emerald-600"
                          : "text-rose-600"
                      }`}
                    >
                      {selectedRestaurant.isActive !== false
                        ? "Active"
                        : "Blocked"}
                    </p>
                  </div>
                </div>

                {/* Restaurant Information */}
                <div>
                  <h3 className="mb-3 text-sm font-semibold text-stone-900">
                    Restaurant information
                  </h3>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <DetailItem
                      label="Restaurant name"
                      value={selectedRestaurant.name}
                    />

                    <DetailItem
                      label="Slug"
                      value={
                        selectedRestaurant.slug
                          ? `/${selectedRestaurant.slug}`
                          : "—"
                      }
                    />

                    <DetailItem
                      label="Email"
                      value={displayEmail(selectedRestaurant.email)}
                    />

                    <DetailItem
                      label="Phone"
                      value={displayPhone(selectedRestaurant.phone)}
                    />
                  </div>
                </div>

                {/* Owner Information */}
                <div>
                  <h3 className="mb-3 text-sm font-semibold text-stone-900">
                    Owner information
                  </h3>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <DetailItem
                      label="Owner name"
                      value={selectedRestaurant.ownerName || "—"}
                    />

                    <DetailItem
                      label="Restaurant ID"
                      value={selectedRestaurant._id || "—"}
                    />
                  </div>
                </div>

                {/* Operational Overview */}
                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-stone-900">
                      Operational overview
                    </h3>

                    {overviewLoading && (
                      <Loader2
                        size={15}
                        className="animate-spin text-red-600"
                      />
                    )}
                  </div>

                  {overviewLoading ? (
                    <div className="flex items-center justify-center rounded-xl border border-stone-200 bg-stone-50 p-6">
                      <Loader2
                        size={22}
                        className="animate-spin text-red-600"
                      />
                    </div>
                  ) : restaurantOverview?.stats ? (
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      <OverviewCard
                        label="Staff"
                        value={restaurantOverview.stats.staffCount}
                        icon={Users}
                      />

                      <OverviewCard
                        label="Menu items"
                        value={restaurantOverview.stats.menuItemCount}
                        icon={UtensilsCrossed}
                      />

                      <OverviewCard
                        label="Combos"
                        value={restaurantOverview.stats.comboCount}
                        icon={Layers}
                      />

                      <OverviewCard
                        label="Orders"
                        value={restaurantOverview.stats.orderCount}
                        icon={ShoppingBag}
                      />

                      <OverviewCard
                        label="Live orders"
                        value={restaurantOverview.stats.activeOrderCount}
                        icon={Activity}
                      />

                      <OverviewCard
                        label="Offers"
                        value={restaurantOverview.stats.offerCount}
                        icon={TrendingUp}
                      />

                      <OverviewCard
                        label="Tables"
                        value={restaurantOverview.stats.tableCount}
                        icon={Table2}
                      />
                    </div>
                  ) : (
                    <div className="rounded-xl border border-stone-200 bg-stone-50 p-4 text-sm font-medium text-stone-500">
                      Operational data unavailable.
                    </div>
                  )}
                </div>

                {/* Staff & Users */}
                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-stone-900">
                        Staff & users
                      </h3>
                      <p className="mt-0.5 text-xs text-stone-400">
                        Manage restaurant users and their access status
                      </p>
                    </div>

                    <span className="text-xs font-medium text-stone-400">
                      {restaurantStaff.length} users
                    </span>
                  </div>

                  {staffLoading ? (
                    <div className="flex items-center justify-center rounded-xl border border-stone-200 bg-stone-50 p-8">
                      <Loader2
                        size={22}
                        className="animate-spin text-red-600"
                      />
                    </div>
                  ) : restaurantStaff.length === 0 ? (
                    <div className="rounded-xl border border-stone-200 bg-stone-50 p-4 text-sm font-medium text-stone-500">
                      No restaurant users found.
                    </div>
                  ) : (
                    <div className="overflow-hidden rounded-xl border border-stone-200">
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[820px] text-left">
                          <thead className="border-b border-stone-100 bg-stone-50">
                            <tr>
                              <th className="px-4 py-2.5 text-[11px] font-medium uppercase tracking-wide text-stone-400">
                                User
                              </th>
                              <th className="px-4 py-2.5 text-[11px] font-medium uppercase tracking-wide text-stone-400">
                                Role
                              </th>
                              <th className="px-4 py-2.5 text-[11px] font-medium uppercase tracking-wide text-stone-400">
                                Phone
                              </th>
                              <th className="px-4 py-2.5 text-[11px] font-medium uppercase tracking-wide text-stone-400">
                                Status
                              </th>
                              <th className="px-4 py-2.5 text-[11px] font-medium uppercase tracking-wide text-stone-400">
                                Last login
                              </th>
                              <th className="px-4 py-2.5 text-right text-[11px] font-medium uppercase tracking-wide text-stone-400">
                                Action
                              </th>
                            </tr>
                          </thead>

                          <tbody className="divide-y divide-stone-100">
                            {restaurantStaff.map((user) => {
                              const isActive = user.isActive !== false;

                              return (
                                <tr
                                  key={user._id}
                                  className="transition-colors hover:bg-stone-50/70"
                                >
                                  {/* USER */}
                                  <td className="px-4 py-3">
                                    <div className="flex items-center gap-3">
                                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-stone-100">
                                        <User
                                          size={14}
                                          className="text-stone-500"
                                        />
                                      </div>

                                      <div className="min-w-0">
                                        <p className="truncate text-sm font-medium text-stone-800">
                                          {user.name || "—"}
                                        </p>
                                        <p className="mt-0.5 truncate text-xs text-stone-400">
                                          {displayEmail(user.email)}
                                        </p>
                                      </div>
                                    </div>
                                  </td>

                                  {/* ROLE */}
                                  <td className="px-4 py-3">
                                    <span
                                      className={`inline-flex rounded-md px-2 py-1 text-[11px] font-medium ${
                                        user.role === "OWNER"
                                          ? "bg-purple-50 text-purple-700"
                                          : user.role === "MANAGER"
                                            ? "bg-blue-50 text-blue-700"
                                            : "bg-stone-100 text-stone-600"
                                      }`}
                                    >
                                      {user.role || "—"}
                                    </span>
                                  </td>

                                  {/* PHONE */}
                                  <td className="px-4 py-3 text-xs text-stone-600">
                                    {displayPhone(user.phone)}
                                  </td>

                                  {/* STATUS */}
                                  <td className="px-4 py-3">
                                    <StatusPill
                                      tone={isActive ? "emerald" : "rose"}
                                      dot
                                    >
                                      {isActive ? "Active" : "Blocked"}
                                    </StatusPill>
                                  </td>

                                  {/* LAST LOGIN */}
                                  <td className="px-4 py-3">
                                    <p className="text-xs text-stone-500">
                                      {user.lastLoginAt
                                        ? new Date(
                                            user.lastLoginAt,
                                          ).toLocaleString("en-IN", {
                                            dateStyle: "medium",
                                            timeStyle: "short",
                                          })
                                        : "Never"}
                                    </p>
                                  </td>

                                  {/* ACTION */}
                                  <td className="px-4 py-3 text-right">
                                    <button
                                      type="button"
                                      disabled={staffLoading}
                                      onClick={() =>
                                        handleStaffStatusUpdate(
                                          user._id,
                                          !isActive,
                                        )
                                      }
                                      className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                                        isActive
                                          ? "bg-rose-50 text-rose-700 hover:bg-rose-100"
                                          : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                                      }`}
                                    >
                                      {staffLoading ? (
                                        <Loader2
                                          size={13}
                                          className="animate-spin"
                                        />
                                      ) : isActive ? (
                                        <>
                                          <Power size={13} />
                                          Deactivate
                                        </>
                                      ) : (
                                        <>
                                          <Check size={13} />
                                          Activate
                                        </>
                                      )}
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>

                {/* Subscription Management */}
                <div>
                  <h3 className="mb-3 text-sm font-semibold text-stone-900">
                    Subscription
                  </h3>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {/* Current Plan */}
                    <div className="rounded-xl border border-stone-200 bg-stone-50 p-4">
                      <p className="text-xs text-stone-400">Current plan</p>

                      <div className="mt-2 flex items-center justify-between gap-3">
                        <div>
                          <span className="text-sm font-semibold text-stone-900">
                            {formatPlan(
                              selectedRestaurant.subscriptionPlan,
                            ) || "Not set"}
                          </span>
                          {isLegacyPlanCode(
                            selectedRestaurant.subscriptionPlan,
                          ) ? (
                            <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-amber-700">
                              Legacy plan — preserved for this account
                            </p>
                          ) : null}
                        </div>

                        <button
                          type="button"
                          disabled={subscriptionUpdating}
                          onClick={() =>
                            setSubscriptionModal({
                              field: "subscriptionPlan",
                              value: ASSIGNABLE_PLANS.includes(
                                selectedRestaurant.subscriptionPlan,
                              )
                                ? selectedRestaurant.subscriptionPlan
                                : "RESTAURANT_STARTER",
                            })
                          }
                          className="rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Change
                        </button>
                      </div>
                    </div>

                    {/* Subscription Status */}
                    <div className="rounded-xl border border-stone-200 bg-stone-50 p-4">
                      <p className="text-xs text-stone-400">Status</p>

                      <div className="mt-2 flex items-center justify-between gap-3">
                        <StatusPill
                          tone={
                            selectedRestaurant.subscriptionStatus === "ACTIVE"
                              ? "emerald"
                              : selectedRestaurant.subscriptionStatus ===
                                  "PAST_DUE"
                                ? "amber"
                                : "rose"
                          }
                        >
                          {selectedRestaurant.subscriptionStatus || "ACTIVE"}
                        </StatusPill>

                        <button
                          type="button"
                          disabled={subscriptionUpdating}
                          onClick={() =>
                            setSubscriptionModal({
                              field: "subscriptionStatus",
                              value:
                                selectedRestaurant.subscriptionStatus ||
                                "ACTIVE",
                            })
                          }
                          className="rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Change
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3">
                    <DetailItem
                      label="Valid until"
                      value={
                        selectedRestaurant.subscriptionExpiresAt
                          ? new Date(
                              selectedRestaurant.subscriptionExpiresAt,
                            ).toLocaleString("en-IN", {
                              dateStyle: "medium",
                              timeStyle: "short",
                            })
                          : "Not set"
                      }
                    />
                  </div>
                </div>

                {/* Dates */}
                <div>
                  <h3 className="mb-3 text-sm font-semibold text-stone-900">
                    Account timeline
                  </h3>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <DetailItem
                      label="Created at"
                      value={
                        selectedRestaurant.createdAt
                          ? new Date(
                              selectedRestaurant.createdAt,
                            ).toLocaleString()
                          : "—"
                      }
                    />

                    <DetailItem
                      label="Updated at"
                      value={
                        selectedRestaurant.updatedAt
                          ? new Date(
                              selectedRestaurant.updatedAt,
                            ).toLocaleString()
                          : "—"
                      }
                    />
                  </div>
                </div>

                {/* Danger Zone */}
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-sm font-semibold text-rose-700">
                        Danger zone
                      </h3>
                      <p className="mt-1 text-xs text-rose-600">
                        Permanently delete this restaurant and its tenant data.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={openDeleteRestaurant}
                      className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-rose-600 px-3.5 py-2 text-xs font-medium text-white transition hover:bg-rose-700"
                    >
                      <Trash2 size={13} />
                      Delete restaurant
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-16 text-center text-sm font-medium text-stone-500">
                Restaurant details unavailable.
              </div>
            )}
          </div>
        </div>
      )}

      {approveConfirm && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <h3 className="text-base font-semibold text-slate-900">
              {approveConfirm.currentlyApproved
                ? "Revoke approval?"
                : "Approve and activate?"}
            </h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {approveConfirm.currentlyApproved
                ? `Revoke approval for “${approveConfirm.name}”. The business will return to pending and lose dashboard access.`
                : `Approve “${approveConfirm.name}” using the existing SuperAdmin activation workflow. This activates the selected plan and may notify the owner.`}
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setApproveConfirm(null)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() =>
                  handleStatusUpdate(
                    approveConfirm.id,
                    "isApproved",
                    approveConfirm.currentlyApproved,
                  )
                }
                className={`rounded-lg px-4 py-2 text-sm font-semibold text-white ${
                  approveConfirm.currentlyApproved
                    ? "bg-amber-600 hover:bg-amber-700"
                    : "bg-emerald-600 hover:bg-emerald-700"
                }`}
              >
                {approveConfirm.currentlyApproved ? "Revoke" : "Approve"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="-m-4 min-h-screen bg-slate-100 font-sans text-slate-900 sm:-m-6 lg:-m-8">
        <div className="mx-auto flex min-h-screen max-w-[1500px]">
          <aside
            className={`fixed inset-y-0 left-0 z-40 w-64 border-r border-slate-200 bg-slate-950 text-white transition-transform lg:static lg:translate-x-0 ${
              mobileNavOpen ? "translate-x-0" : "-translate-x-full"
            }`}
          >
            <div className="flex h-16 items-center gap-3 border-b border-white/10 px-5">
              <img
                src="/Untitled.svg"
                alt="Transserve"
                className="h-8 w-8"
              />
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/45">
                  Transserve
                </p>
                <p className="text-sm font-semibold">SuperAdmin</p>
              </div>
            </div>
            <nav className="space-y-1 p-3">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const selected = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      if (item.id === "pending") {
                        setApprovalFilter("pending");
                        setJoinedFilter("all");
                        setPage(1);
                      }
                      if (item.id === "businesses" && activeTab === "pending") {
                        setApprovalFilter("all");
                      }
                      setActiveTab(item.id);
                      setMobileNavOpen(false);
                    }}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition ${
                      selected
                        ? "bg-white text-slate-950"
                        : "text-white/75 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <Icon size={16} />
                    {item.label}
                    {item.id === "pending" && !statsLoading ? (
                      <span
                        className={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          selected
                            ? "bg-amber-100 text-amber-800"
                            : "bg-amber-500/20 text-amber-100"
                        }`}
                      >
                        {pendingStores}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </nav>
          </aside>

          {mobileNavOpen ? (
            <button
              type="button"
              aria-label="Close navigation"
              className="fixed inset-0 z-30 bg-slate-950/40 lg:hidden"
              onClick={() => setMobileNavOpen(false)}
            />
          ) : null}

          <div className="flex min-w-0 flex-1 flex-col">
            <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-3 border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-6">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  className="rounded-lg border border-slate-200 p-2 text-slate-600 lg:hidden"
                  onClick={() => setMobileNavOpen(true)}
                  aria-label="Open navigation"
                >
                  <Menu size={18} />
                </button>
                <div>
                  <h1 className="text-lg font-semibold tracking-tight text-slate-950">
                    {NAV_ITEMS.find((item) => item.id === activeTab)?.label ||
                      "SuperAdmin"}
                  </h1>
                  <p className="text-xs text-slate-500">
                    Manage businesses, approvals, and subscriptions
                  </p>
                </div>
              </div>
              <div className="hidden items-center gap-2 sm:flex">
                <StatusPill tone="emerald" dot>
                  Live admin
                </StatusPill>
                <button
                  type="button"
                  onClick={() => openBusinessesTab({ approval: "pending" })}
                  className="rounded-lg bg-slate-950 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800"
                >
                  Review pending
                </button>
              </div>
            </header>

            <main className="space-y-4 p-4 sm:p-6">
          {activeTab === "overview" && (
            <>
            <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-stone-200 bg-stone-200 sm:grid-cols-4 lg:grid-cols-7">
              <StatCell
                title="Total businesses"
                value={statsLoading ? "…" : totalStores}
              />
              <StatCell
                title="Approved"
                value={statsLoading ? "…" : approvedStores}
                tone="emerald"
              />
              <StatCell
                title="Pending approval"
                value={statsLoading ? "…" : pendingStores}
                tone="amber"
              />
              <StatCell
                title="Suspended"
                value={statsLoading ? "…" : blockedStores}
                tone="rose"
              />
              <StatCell
                title="Active access"
                value={statsLoading ? "…" : activeStores}
                tone="emerald"
              />
              <StatCell
                title="Total orders"
                value={statsLoading ? "…" : totalOrders}
              />
              <StatCell
                title="Live orders"
                value={statsLoading ? "…" : activeOrders}
                tone="brand"
              />
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <h3 className="text-sm font-semibold text-slate-900">
                  Business categories
                </h3>
                <dl className="mt-3 space-y-2 text-sm">
                  {["RESTAURANT", "HOTEL", "RESORT", "UNSET"].map((key) => (
                    <div
                      key={key}
                      className="flex items-center justify-between"
                    >
                      <dt className="text-slate-500">{formatPlan(key)}</dt>
                      <dd className="font-semibold tabular-nums text-slate-900">
                        {statsLoading
                          ? "…"
                          : platformStats?.categoryDistribution?.[key] || 0}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4 lg:col-span-2">
                <h3 className="text-sm font-semibold text-slate-900">
                  Plan distribution
                </h3>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {statsLoading ? (
                    <p className="text-sm text-slate-500">Loading…</p>
                  ) : Object.keys(platformStats?.planDistribution || {}).length ===
                    0 ? (
                    <p className="text-sm text-slate-500">No plan data yet.</p>
                  ) : (
                    Object.entries(platformStats.planDistribution).map(
                      ([plan, count]) => (
                        <div
                          key={plan}
                          className="flex items-center justify-between rounded-xl border border-slate-100 px-3 py-2 text-sm"
                        >
                          <span className="font-medium text-slate-700">
                            {formatPlan(plan)}
                            {isLegacyPlanCode(plan) ? (
                              <span className="ml-2 text-[10px] font-bold uppercase text-amber-700">
                                Legacy
                              </span>
                            ) : null}
                          </span>
                          <span className="font-semibold tabular-nums text-slate-900">
                            {count}
                          </span>
                        </div>
                      ),
                    )
                  )}
                </div>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-900">
                    Recent registrations
                  </h3>
                  <button
                    type="button"
                    onClick={() => openBusinessesTab({ joined: "new" })}
                    className="text-xs font-semibold text-rose-600 hover:underline"
                  >
                    View all
                  </button>
                </div>
                <ul className="space-y-2">
                  {(platformStats?.recentRegistrations || []).length === 0 ? (
                    <li className="text-sm text-slate-500">No recent signups.</li>
                  ) : (
                    (platformStats.recentRegistrations || []).map((row) => (
                      <li
                        key={row._id}
                        className="flex items-start justify-between gap-3 rounded-xl border border-slate-100 px-3 py-2"
                      >
                        <div>
                          <p className="text-sm font-semibold text-slate-900">
                            {row.name}
                          </p>
                          <p className="text-xs text-slate-500">
                            {formatPlan(row.subscriptionPlan)}
                            {row.businessCategory
                              ? ` · ${row.businessCategory}`
                              : ""}
                          </p>
                        </div>
                        <StatusPill
                          tone={row.isApproved ? "emerald" : "amber"}
                          dot
                        >
                          {row.isApproved ? "ACTIVE" : "PENDING"}
                        </StatusPill>
                      </li>
                    ))
                  )}
                </ul>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <h3 className="mb-3 text-sm font-semibold text-slate-900">
                  Recent activations
                </h3>
                <ul className="space-y-2">
                  {(platformStats?.recentApprovals || []).length === 0 ? (
                    <li className="text-sm text-slate-500">
                      No activation markers yet.
                    </li>
                  ) : (
                    (platformStats.recentApprovals || []).map((row) => (
                      <li
                        key={row._id}
                        className="rounded-xl border border-slate-100 px-3 py-2"
                      >
                        <p className="text-sm font-semibold text-slate-900">
                          {row.name}
                        </p>
                        <p className="text-xs text-slate-500">
                          {formatPlan(row.subscriptionPlan)} ·{" "}
                          {formatJoined(row.activationEmailSentAt)}
                        </p>
                      </li>
                    ))
                  )}
                </ul>
              </div>
            </div>
            </>
          )}

          {activeTab === "revenue" && (
            <>
              <div className="rounded-2xl border border-stone-200 bg-white">
                <div className="flex flex-col gap-4 border-b border-stone-100 p-5 sm:flex-row sm:items-center sm:justify-between">
                  <SectionHeading
                    title="Revenue & payments"
                    subtitle="Platform-wide completed billing collection"
                  />

                  <SelectField
                    value={revenuePeriod}
                    onChange={(event) => setRevenuePeriod(event.target.value)}
                    disabled={revenueLoading}
                    className="sm:w-44"
                  >
                    <option value="today">Today</option>
                    <option value="week">Last 7 days</option>
                    <option value="month">Last 30 days</option>
                    <option value="year">Last 12 months</option>
                  </SelectField>
                </div>

                <div className="p-5">
                  {revenueLoading ? (
                    <div className="flex min-h-[160px] items-center justify-center rounded-xl bg-stone-50">
                      <Loader2
                        size={24}
                        className="animate-spin text-red-600"
                      />
                    </div>
                  ) : revenueStats ? (
                    <>
                      {/* Revenue Cards */}
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
                        <div className="rounded-xl border border-red-100 bg-red-50 p-4">
                          <div className="flex items-center gap-1.5 text-red-500">
                            <Wallet size={13} />
                            <p className="text-xs">Total collected</p>
                          </div>
                          <p className="mt-2 text-xl font-semibold tabular-nums text-red-700">
                            {currency(revenueStats.revenue?.totalCollected)}
                          </p>
                        </div>

                        <div className="rounded-xl border border-stone-200 bg-white p-4">
                          <div className="flex items-center gap-1.5 text-stone-400">
                            <Banknote size={13} />
                            <p className="text-xs">Cash</p>
                          </div>
                          <p className="mt-2 text-xl font-semibold tabular-nums text-stone-900">
                            {currency(revenueStats.revenue?.cash)}
                          </p>
                        </div>

                        <div className="rounded-xl border border-stone-200 bg-white p-4">
                          <div className="flex items-center gap-1.5 text-stone-400">
                            <Smartphone size={13} />
                            <p className="text-xs">UPI</p>
                          </div>
                          <p className="mt-2 text-xl font-semibold tabular-nums text-stone-900">
                            {currency(revenueStats.revenue?.upi)}
                          </p>
                        </div>

                        <div className="rounded-xl border border-stone-200 bg-white p-4">
                          <div className="flex items-center gap-1.5 text-stone-400">
                            <TrendingUp size={13} />
                            <p className="text-xs">Due collected</p>
                          </div>
                          <p className="mt-2 text-xl font-semibold tabular-nums text-stone-900">
                            {currency(revenueStats.revenue?.dueCollected)}
                          </p>
                        </div>

                        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                          <p className="text-xs text-amber-600">
                            Outstanding due
                          </p>
                          <p className="mt-2 text-xl font-semibold tabular-nums text-amber-700">
                            {currency(revenueStats.revenue?.outstandingDue)}
                          </p>
                        </div>
                      </div>

                      {/* Payment Breakdown + Collection Summary */}
                      <div className="mt-5 grid grid-cols-1 gap-3 lg:grid-cols-2">
                        <div className="rounded-xl border border-stone-200 p-4">
                          <h3 className="text-sm font-semibold text-stone-900">
                            Payment breakdown
                          </h3>

                          <div className="mt-3.5 space-y-2.5">
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-stone-500">
                                Cash bills
                              </span>
                              <span className="text-sm font-semibold tabular-nums text-stone-900">
                                {revenueStats.bills?.cash || 0}
                              </span>
                            </div>

                            <div className="flex items-center justify-between">
                              <span className="text-xs text-stone-500">
                                UPI bills
                              </span>
                              <span className="text-sm font-semibold tabular-nums text-stone-900">
                                {revenueStats.bills?.upi || 0}
                              </span>
                            </div>

                            <div className="flex items-center justify-between">
                              <span className="text-xs text-stone-500">
                                Due bills
                              </span>
                              <span className="text-sm font-semibold tabular-nums text-stone-900">
                                {revenueStats.bills?.due || 0}
                              </span>
                            </div>

                            <div className="flex items-center justify-between border-t border-stone-100 pt-2.5">
                              <span className="text-xs font-medium text-stone-400">
                                Total bills
                              </span>
                              <span className="text-base font-semibold tabular-nums text-stone-900">
                                {revenueStats.bills?.total || 0}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="rounded-xl border border-stone-200 p-4">
                          <h3 className="text-sm font-semibold text-stone-900">
                            Collection summary
                          </h3>

                          <div className="mt-3.5 space-y-2.5">
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-stone-500">
                                Cash collection
                              </span>
                              <span className="text-sm font-semibold tabular-nums text-stone-900">
                                {currency(revenueStats.revenue?.cash)}
                              </span>
                            </div>

                            <div className="flex items-center justify-between">
                              <span className="text-xs text-stone-500">
                                UPI collection
                              </span>
                              <span className="text-sm font-semibold tabular-nums text-stone-900">
                                {currency(revenueStats.revenue?.upi)}
                              </span>
                            </div>

                            <div className="flex items-center justify-between">
                              <span className="text-xs text-stone-500">
                                Due collection
                              </span>
                              <span className="text-sm font-semibold tabular-nums text-stone-900">
                                {currency(revenueStats.revenue?.dueCollected)}
                              </span>
                            </div>

                            <div className="flex items-center justify-between border-t border-stone-100 pt-2.5">
                              <span className="text-xs font-medium text-stone-400">
                                Total collected
                              </span>
                              <span className="text-base font-semibold tabular-nums text-stone-900">
                                {currency(revenueStats.revenue?.totalCollected)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="rounded-xl border border-stone-200 bg-stone-50 p-6 text-center">
                      <p className="text-sm font-medium text-stone-500">
                        Revenue data unavailable.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-6 rounded-2xl border border-red-100 bg-red-50/40 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-red-500">
                      Transserve Earnings
                    </p>

                    <h3 className="mt-1 text-base font-black text-slate-900">
                      Platform Revenue
                    </h3>

                    <p className="mt-1 text-xs font-medium text-slate-500">
                      Actual platform transactions received from restaurants
                    </p>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                      Net Platform Revenue
                    </p>

                    <p className="mt-2 text-2xl font-black text-red-600">
                      {currency(revenueStats?.platformRevenue?.net || 0)}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                      Subscription
                    </p>

                    <p className="mt-2 text-xl font-black text-slate-900">
                      {currency(
                        revenueStats?.platformRevenue?.subscription || 0,
                      )}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                      Commission
                    </p>

                    <p className="mt-2 text-xl font-black text-slate-900">
                      {currency(revenueStats?.platformRevenue?.commission || 0)}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                      Platform Fees
                    </p>

                    <p className="mt-2 text-xl font-black text-slate-900">
                      {currency(
                        revenueStats?.platformRevenue?.platformFee || 0,
                      )}
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="rounded-xl bg-white/80 p-3">
                    <p className="text-xs text-slate-500">
                      Gross Platform Revenue
                    </p>

                    <p className="mt-1 text-sm font-black text-slate-900">
                      {currency(revenueStats?.platformRevenue?.gross || 0)}
                    </p>
                  </div>

                  <div className="rounded-xl bg-white/80 p-3">
                    <p className="text-xs text-slate-500">Refunds</p>

                    <p className="mt-1 text-sm font-black text-rose-600">
                      {currency(revenueStats?.platformRevenue?.refunds || 0)}
                    </p>
                  </div>

                  <div className="rounded-xl bg-white/80 p-3">
                    <p className="text-xs text-slate-500">
                      Platform Transactions
                    </p>

                    <p className="mt-1 text-sm font-black text-slate-900">
                      {Number(
                        revenueStats?.platformRevenue?.transactionCount || 0,
                      ).toLocaleString("en-IN")}
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === "overview" && (
            <div className="rounded-2xl border border-stone-200 bg-white">
              <div className="flex flex-col gap-4 border-b border-stone-100 p-5 sm:flex-row sm:items-center sm:justify-between">
                <SectionHeading
                  title="Platform analytics"
                  subtitle="Restaurant, order and revenue trends"
                />

                <SelectField
                  value={analyticsPeriod}
                  onChange={(event) => setAnalyticsPeriod(event.target.value)}
                  disabled={analyticsLoading}
                  className="sm:w-44"
                >
                  <option value="7d">Last 7 days</option>
                  <option value="30d">Last 30 days</option>
                  <option value="90d">Last 90 days</option>
                  <option value="1y">Last 1 year</option>
                </SelectField>
              </div>

              <div className="p-5">
                {analyticsLoading ? (
                  <div className="flex min-h-[200px] items-center justify-center rounded-xl bg-stone-50">
                    <Loader2 size={24} className="animate-spin text-red-600" />
                  </div>
                ) : platformAnalytics ? (
                  <>
                    {/* Status Summary */}
                    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-stone-200 bg-stone-200 md:grid-cols-5">
                      <StatCell
                        title="Total restaurants"
                        value={platformAnalytics.restaurants?.total ?? 0}
                      />
                      <StatCell
                        title="Approved"
                        value={platformAnalytics.restaurants?.approved ?? 0}
                        tone="emerald"
                      />
                      <StatCell
                        title="Pending"
                        value={platformAnalytics.restaurants?.pending ?? 0}
                        tone="amber"
                      />
                      <StatCell
                        title="Active"
                        value={platformAnalytics.restaurants?.active ?? 0}
                        tone="emerald"
                      />
                      <StatCell
                        title="Blocked"
                        value={platformAnalytics.restaurants?.blocked ?? 0}
                        tone="rose"
                      />
                    </div>

                    {/* Subscription Distribution */}
                    <div className="mt-5 rounded-xl border border-stone-200 p-4">
                      <h3 className="text-sm font-semibold text-stone-900">
                        Subscription distribution
                      </h3>

                      <div className="mt-4 space-y-3">
                        {[
                          {
                            label: "Trial",
                            value: platformAnalytics.subscriptions?.trial || 0,
                            tone: "bg-amber-400",
                          },
                          {
                            label: "Starter",
                            value:
                              platformAnalytics.subscriptions?.starter || 0,
                            tone: "bg-stone-400",
                          },
                          {
                            label: "Basic",
                            value: platformAnalytics.subscriptions?.basic || 0,
                            tone: "bg-red-500",
                          },
                          {
                            label: "Premium",
                            value:
                              platformAnalytics.subscriptions?.premium || 0,
                            tone: "bg-violet-600",
                          },
                          {
                            label: "Pro",
                            value: platformAnalytics.subscriptions?.pro || 0,
                            tone: "bg-blue-500",
                          },
                          {
                            label: "Plus",
                            value: platformAnalytics.subscriptions?.plus || 0,
                            tone: "bg-emerald-500",
                          },
                        ].map((row) => (
                          <div key={row.label}>
                            <div className="mb-1 flex items-center justify-between">
                              <span className="text-xs text-stone-500">
                                {row.label}
                              </span>
                              <span className="text-xs font-semibold tabular-nums text-stone-800">
                                {row.value}
                              </span>
                            </div>
                            <div className="h-1.5 w-full overflow-hidden rounded-full bg-stone-100">
                              <div
                                className={`h-full rounded-full ${row.tone}`}
                                style={{
                                  width: `${Math.min(100, (row.value / subscriptionTotal) * 100)}%`,
                                }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <TrendChart
                      title="Restaurant growth"
                      series={restaurantGrowthSeries}
                      color="bg-stone-800"
                      formatValue={(value) => String(value)}
                    />
                    <TrendChart
                      title="Order trend"
                      series={orderTrendSeries}
                      color="bg-red-500"
                      formatValue={(value) => String(value)}
                    />
                    <TrendChart
                      title="Revenue trend"
                      series={revenueTrendSeries}
                      color="bg-emerald-500"
                      formatValue={currency}
                    />
                  </>
                ) : (
                  <div className="rounded-xl bg-stone-50 p-6 text-center">
                    <p className="text-sm font-medium text-stone-500">
                      Analytics data unavailable.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {(activeTab === "businesses" || activeTab === "pending") && (
            <>
              {activeTab === "pending" ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
                  Showing businesses awaiting SuperAdmin approval. Approve uses
                  the existing activation workflow — no online payment.
                </div>
              ) : null}
              <div className="rounded-2xl border border-slate-100 bg-white p-3 shadow-sm">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
                  <div className="relative lg:col-span-2">
                    <Search
                      size={16}
                      className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400"
                    />
                    <input
                      type="text"
                      value={search}
                      onChange={(e) => {
                        setSearch(e.target.value);
                        setPage(1);
                      }}
                      placeholder="Restaurant name, owner, email, phone"
                      className="h-10 w-full rounded-lg border border-stone-200 bg-stone-50 pl-10 pr-4 text-sm outline-none transition focus:border-stone-400 focus:bg-white"
                    />
                  </div>

                  <SelectField
                    value={joinedFilter}
                    onChange={(e) => {
                      setJoinedFilter(e.target.value);
                      setPage(1);
                    }}
                  >
                    <option value="all">All restaurants</option>
                    <option value="new">New (last 7 days)</option>
                  </SelectField>

                  <SelectField
                    value={sortBy}
                    onChange={(e) => {
                      setSortBy(e.target.value);
                      setPage(1);
                    }}
                  >
                    <option value="newest">Newest first</option>
                    <option value="oldest">Oldest first</option>
                    <option value="name_asc">Name A–Z</option>
                    <option value="name_desc">Name Z–A</option>
                  </SelectField>

                  {/* Status */}
                  <SelectField
                    value={statusFilter}
                    onChange={(e) => {
                      setStatusFilter(e.target.value);
                      setPage(1);
                    }}
                  >
                    <option value="all">All access status</option>
                    <option value="active">Active</option>
                    <option value="blocked">Blocked</option>
                  </SelectField>

                  <SelectField
                    value={approvalFilter}
                    onChange={(e) => {
                      setApprovalFilter(e.target.value);
                      setPage(1);
                    }}
                  >
                    <option value="all">All approval</option>
                    <option value="approved">Approved</option>
                    <option value="pending">Pending</option>
                  </SelectField>

                  <SelectField
                    value={categoryFilter}
                    onChange={(e) => {
                      setCategoryFilter(e.target.value);
                      setPage(1);
                    }}
                  >
                    <option value="all">All categories</option>
                    {BUSINESS_CATEGORIES.map((code) => (
                      <option key={code} value={code}>
                        {formatPlan(code)}
                      </option>
                    ))}
                  </SelectField>

                  <SelectField
                    value={planFilter}
                    onChange={(e) => {
                      setPlanFilter(e.target.value);
                      setPage(1);
                    }}
                  >
                    <option value="all">All plans</option>
                    <optgroup label="Current commercial">
                      {ASSIGNABLE_PLANS.map((code) => (
                        <option key={code} value={code}>
                          {formatPlan(code)}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="Legacy (existing accounts)">
                      {FILTERABLE_PLANS.filter((code) =>
                        isLegacyPlanCode(code),
                      ).map((code) => (
                        <option key={code} value={code}>
                          {formatPlan(code)} (legacy)
                        </option>
                      ))}
                    </optgroup>
                  </SelectField>

                  <SelectField
                    value={subscriptionFilter}
                    onChange={(e) => {
                      setSubscriptionFilter(e.target.value);
                      setPage(1);
                    }}
                  >
                    <option value="all">Plan active and inactive</option>
                    <option value="active">Plan active</option>
                    <option value="inactive">Plan inactive</option>
                  </SelectField>

                  <input
                    type="text"
                    value={districtFilter}
                    onChange={(e) => {
                      setDistrictFilter(e.target.value);
                      setPage(1);
                    }}
                    placeholder="District"
                    className="h-10 w-full rounded-lg border border-stone-200 bg-white px-3 text-sm outline-none focus:border-stone-400"
                  />

                  <input
                    type="text"
                    value={pincodeFilter}
                    onChange={(e) => {
                      setPincodeFilter(e.target.value);
                      setPage(1);
                    }}
                    placeholder="Pincode"
                    inputMode="numeric"
                    className="h-10 w-full rounded-lg border border-stone-200 bg-white px-3 text-sm outline-none focus:border-stone-400"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setSearch("");
                      setStatusFilter("all");
                      setApprovalFilter("all");
                      setSortBy("newest");
                      setJoinedFilter("all");
                      setPlanFilter("all");
                      setSubscriptionFilter("all");
                      setCategoryFilter("all");
                      setDistrictFilter("");
                      setPincodeFilter("");
                      setPage(1);
                    }}
                    className="h-10 rounded-xl border border-slate-200 px-3 text-xs font-black text-slate-600"
                  >
                    Reset
                  </button>
                </div>
              </div>

              {/* Restaurants table */}
              <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white">
                {loading ? (
                  <div className="flex items-center justify-center gap-2 py-16 text-sm text-stone-500">
                    <Loader2 size={18} className="animate-spin text-red-600" />
                    Loading restaurants…
                  </div>
                ) : restaurants.length === 0 ? (
                  <div className="space-y-3 py-16 text-center">
                    <Store className="mx-auto text-stone-300" size={40} />
                    <p className="text-sm font-medium text-stone-500">
                      No restaurants registered yet.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[980px] border-collapse text-left">
                      <thead className="border-b border-slate-100 text-[11px] font-bold uppercase tracking-wide text-slate-400">
                        <tr>
                          <th className="px-4 py-3">#</th>
                          <th className="px-4 py-3">Restaurant</th>
                          <th className="px-4 py-3">Owner</th>
                          <th className="px-4 py-3">Contact</th>
                          <th className="px-4 py-3">Location</th>
                          <th className="px-4 py-3">Plan</th>
                          <th className="px-4 py-3">Status</th>
                          <th className="px-4 py-3">Joined On</th>
                          <th className="px-4 py-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50 text-xs sm:text-sm">
                        {restaurants.map((store, index) => {
                          const rowStatus = !store.isApproved
                            ? "Pending"
                            : store.isActive === false
                              ? "Blocked"
                              : "Active";
                          const rowTone =
                            rowStatus === "Pending"
                              ? "amber"
                              : rowStatus === "Blocked"
                                ? "rose"
                                : "emerald";
                          return (
                            <tr
                              key={store._id}
                              className="hover:bg-slate-50/80"
                            >
                              <td className="px-4 py-3 text-xs font-bold text-slate-400">
                                {(pagination.page - 1) * pagination.limit +
                                  index +
                                  1}
                              </td>
                              <td className="px-4 py-3">
                                <p className="text-sm font-black text-slate-900">
                                  {store.name}
                                </p>
                                <p className="text-[11px] font-semibold text-slate-400">
                                  {store.slug || "—"}
                                </p>
                              </td>
                              <td className="px-4 py-3 font-semibold text-slate-700">
                                {store.ownerName || "—"}
                              </td>
                              <td className="px-4 py-3">
                                <p className="flex items-center gap-1 font-semibold text-slate-700">
                                  <Phone size={12} className="text-slate-400" />
                                  {displayPhone(store.phone)}
                                </p>
                                <p className="mt-0.5 flex items-center gap-1 text-[11px] text-slate-400">
                                  <Mail size={12} />
                                  {displayEmail(store.email)}
                                </p>
                              </td>
                              <td className="px-4 py-3">
                                <p className="font-semibold text-slate-700">
                                  {store.address?.city ||
                                    store.address?.district ||
                                    "—"}
                                </p>
                                <p className="text-[11px] text-slate-400">
                                  {store.address?.state ||
                                    store.address?.zip ||
                                    ""}
                                </p>
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex flex-col gap-1">
                                  <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-black text-slate-600">
                                    {formatPlan(store.subscriptionPlan)}
                                  </span>
                                  {isLegacyPlanCode(store.subscriptionPlan) ? (
                                    <span className="text-[10px] font-bold uppercase tracking-wide text-amber-700">
                                      Legacy
                                    </span>
                                  ) : null}
                                  {store.businessCategory ? (
                                    <span className="text-[10px] font-semibold text-slate-400">
                                      {store.businessCategory}
                                    </span>
                                  ) : null}
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <StatusPill tone={rowTone} dot>
                                  {rowStatus === "Pending"
                                    ? "PENDING_APPROVAL"
                                    : rowStatus === "Blocked"
                                      ? "SUSPENDED"
                                      : "ACTIVE"}
                                </StatusPill>
                              </td>
                              <td className="px-4 py-3 text-xs font-semibold text-slate-500">
                                {formatJoined(store.createdAt)}
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center justify-end gap-1">
                                  <button
                                    type="button"
                                    onClick={() => handleViewDetails(store._id)}
                                    title="View"
                                    className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"
                                  >
                                    <Eye size={14} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleStatusUpdate(
                                        store._id,
                                        "isActive",
                                        store.isActive === true,
                                      )
                                    }
                                    title={
                                      store.isActive !== false
                                        ? "Block"
                                        : "Unblock"
                                    }
                                    className={`rounded-lg border p-2 ${store.isActive !== false ? "border-rose-200 text-rose-500 hover:bg-rose-50" : "border-emerald-200 text-emerald-600 hover:bg-emerald-50"}`}
                                  >
                                    <Power size={14} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => requestApprovalToggle(store)}
                                    title={
                                      store.isApproved
                                        ? "Revoke approval"
                                        : "Approve"
                                    }
                                    className={`rounded-lg border p-2 ${store.isApproved ? "border-amber-200 text-amber-600 hover:bg-amber-50" : "border-emerald-200 text-emerald-600 hover:bg-emerald-50"}`}
                                  >
                                    {store.isApproved ? (
                                      <XCircle size={14} />
                                    ) : (
                                      <Check size={14} />
                                    )}
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {pagination.totalPages > 0 && (
                  <PaginationBar
                    label={
                      <>
                        Showing{" "}
                        <span className="font-semibold text-stone-700">
                          {Math.min(
                            (pagination.page - 1) * pagination.limit + 1,
                            pagination.total,
                          )}
                        </span>
                        {" – "}
                        <span className="font-semibold text-stone-700">
                          {Math.min(
                            pagination.page * pagination.limit,
                            pagination.total,
                          )}
                        </span>
                        {" of "}
                        <span className="font-semibold text-stone-700">
                          {pagination.total}
                        </span>
                        {" restaurants"}
                      </>
                    }
                    page={pagination.page}
                    totalPages={pagination.totalPages}
                    hasPrev={pagination.hasPreviousPage}
                    hasNext={pagination.hasNextPage}
                    disabled={loading}
                    onPrev={() => setPage((prev) => Math.max(1, prev - 1))}
                    onNext={() => setPage((prev) => prev + 1)}
                  />
                )}
              </div>
            </>
          )}

          {activeTab === "logs" && (
            <div className="rounded-2xl border border-stone-200 bg-white">
              <div className="border-b border-stone-100 p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex items-center gap-2.5">
                    <History className="h-4 w-4 text-stone-400" />
                    <SectionHeading
                      title="Audit logs"
                      subtitle="History of sensitive super-admin restaurant actions"
                    />
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <SelectField
                      value={auditAction}
                      onChange={(e) => {
                        setAuditAction(e.target.value);
                        setAuditPage(1);
                      }}
                      className="w-44"
                    >
                      <option value="">All actions</option>
                      <option value="RESTAURANT_APPROVED">Approved</option>
                      <option value="RESTAURANT_APPROVAL_REVOKED">
                        Approval revoked
                      </option>
                      <option value="RESTAURANT_BLOCKED">Blocked</option>
                      <option value="RESTAURANT_UNBLOCKED">Unblocked</option>
                      <option value="RESTAURANT_DELETED">Deleted</option>
                      <option value="SUBSCRIPTION_PLAN_CHANGED">
                        Plan changed
                      </option>
                      <option value="SUBSCRIPTION_STATUS_CHANGED">
                        Status changed
                      </option>
                      <option value="STAFF_ACTIVATED">Staff activated</option>
                      <option value="STAFF_DEACTIVATED">
                        Staff deactivated
                      </option>
                    </SelectField>

                    <SelectField
                      value={auditSort}
                      onChange={(e) => {
                        setAuditSort(e.target.value);
                        setAuditPage(1);
                      }}
                      className="w-40"
                    >
                      <option value="newest">Newest first</option>
                      <option value="oldest">Oldest first</option>
                    </SelectField>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                {auditLoading ? (
                  <div className="p-10 text-center text-sm font-medium text-stone-500">
                    Loading audit logs…
                  </div>
                ) : auditLogs.length === 0 ? (
                  <div className="p-10 text-center text-sm font-medium text-stone-500">
                    No audit logs found.
                  </div>
                ) : (
                  <table className="min-w-full">
                    <thead>
                      <tr className="border-b border-stone-100 bg-stone-50">
                        <th className="px-5 py-3 text-left text-[11px] font-medium uppercase tracking-wide text-stone-400">
                          Restaurant
                        </th>
                        <th className="px-5 py-3 text-left text-[11px] font-medium uppercase tracking-wide text-stone-400">
                          Action
                        </th>
                        <th className="px-5 py-3 text-left text-[11px] font-medium uppercase tracking-wide text-stone-400">
                          Admin
                        </th>
                        <th className="px-5 py-3 text-left text-[11px] font-medium uppercase tracking-wide text-stone-400">
                          Change
                        </th>
                        <th className="px-5 py-3 text-left text-[11px] font-medium uppercase tracking-wide text-stone-400">
                          IP
                        </th>
                        <th className="px-5 py-3 text-left text-[11px] font-medium uppercase tracking-wide text-stone-400">
                          Date
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {auditLogs.map((log) => (
                        <tr
                          key={log._id}
                          className="border-b border-stone-100 transition-colors last:border-0 hover:bg-stone-50/70"
                        >
                          <td className="px-5 py-4">
                            <p className="font-semibold text-stone-900">
                              {log.restaurantId?.name || "Deleted restaurant"}
                            </p>
                            {displayEmail(log.restaurantId?.email, "") ? (
                              <p className="text-xs text-stone-400">
                                {displayEmail(log.restaurantId?.email)}
                              </p>
                            ) : null}
                          </td>

                          <td className="px-5 py-4">
                            <StatusPill tone={getAuditActionTone(log.action)}>
                              {getAuditActionLabel(log.action)}
                            </StatusPill>
                          </td>

                          <td className="px-5 py-4">
                            <p className="font-medium text-stone-700">
                              {log.adminUserId?.name || "Unknown"}
                            </p>
                            {displayEmail(log.adminUserId?.email, "") ? (
                              <p className="text-xs text-stone-400">
                                {displayEmail(log.adminUserId?.email)}
                              </p>
                            ) : null}
                          </td>

                          <td className="px-5 py-4 text-sm text-stone-600">
                            {String(log.previousValue)} → {String(log.newValue)}
                          </td>

                          <td className="px-5 py-4 font-mono text-xs text-stone-400">
                            {log.ipAddress || "N/A"}
                          </td>

                          <td className="px-5 py-4 text-xs text-stone-500">
                            {log.createdAt
                              ? new Date(log.createdAt).toLocaleString()
                              : "N/A"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              <PaginationBar
                label={`${auditPagination.total} total audit records`}
                page={auditPagination.page}
                totalPages={auditPagination.totalPages}
                hasPrev={auditPagination.hasPreviousPage}
                hasNext={auditPagination.hasNextPage}
                onPrev={() =>
                  setAuditPage((current) => Math.max(1, current - 1))
                }
                onNext={() => setAuditPage((current) => current + 1)}
              />
            </div>
          )}
            </main>
          </div>
        </div>
      </div>
    </>
  );
}
