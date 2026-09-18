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
import { History } from "lucide-react";
const DetailItem = ({ label, value }) => {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
        {label}
      </p>

      <p className="mt-1.5 text-sm font-bold text-slate-800 break-words">
        {value || "—"}
      </p>
    </div>
  );
};

const OverviewCard = ({ label, value }) => {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
        {label}
      </p>

      <p className="mt-2 text-xl font-black text-slate-900">
        {Number(value || 0).toLocaleString()}
      </p>
    </div>
  );
};

const StatCard = ({ title, value }) => {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
        {title}
      </p>

      <p className="mt-2 text-2xl font-black text-slate-900">{value ?? 0}</p>
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

    default:
      return action || "Unknown";
  }
};

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
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [approvalFilter, setApprovalFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
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
      search ? 400 : 0,
    );

    return () => clearTimeout(timer);
  }, [page, pageSize, search, statusFilter, approvalFilter, sortBy]);

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
    } catch (error) {
      console.error("Restaurant status update failed:", error);

      alert(error?.response?.data?.message || "Update failed!");
    }
  };

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
    if (currentValue === value) {
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

  const handleDeleteRestaurant = async () => {
    if (!selectedRestaurant?._id) return;

    const restaurantName = selectedRestaurant.name || "this restaurant";

    const firstConfirm = window.confirm(
      `Are you sure you want to permanently delete "${restaurantName}"?`,
    );

    if (!firstConfirm) return;

    const secondConfirm = window.confirm(
      "This will permanently delete the restaurant and its tenant data. This action cannot be undone. Continue?",
    );

    if (!secondConfirm) return;

    try {
      setDetailsLoading(true);

      const response = await axios.delete(
        `/admin/restaurants/${selectedRestaurant._id}`,
        {
          withCredentials: true,
        },
      );

      if (!response.data?.success) {
        throw new Error(
          response.data?.message || "Failed to delete restaurant.",
        );
      }

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
      setDetailsLoading(false);
    }
  };
  if (loading)
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-red-500" size={48} />
      </div>
    );

  // Quick statistics calculation
  const totalStores = platformStats?.restaurants?.total ?? 0;
  const approvedStores = platformStats?.restaurants?.approved ?? 0;
  const pendingStores = platformStats?.restaurants?.pending ?? 0;
  const activeStores = platformStats?.restaurants?.active ?? 0;
  const blockedStores = platformStats?.restaurants?.blocked ?? 0;

  const totalOrders = platformStats?.orders?.total ?? 0;
  const activeOrders = platformStats?.orders?.active ?? 0;

  return (
    <>
      {subscriptionModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-4">
          <div
            className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-5">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Subscription Management
              </p>

              <h3 className="mt-1 text-xl font-black text-slate-900">
                Change{" "}
                {subscriptionModal.field === "subscriptionPlan"
                  ? "Plan"
                  : "Status"}
              </h3>

              <p className="mt-2 text-sm text-slate-500">
                Restaurant:{" "}
                <span className="font-bold text-slate-700">
                  {selectedRestaurant?.name || "—"}
                </span>
              </p>
            </div>

            <div>
              <label className="mb-2 block text-[10px] font-black uppercase tracking-wider text-slate-400">
                {subscriptionModal.field === "subscriptionPlan"
                  ? "Select Plan"
                  : "Select Status"}
              </label>

              <select
                value={subscriptionModal.value}
                disabled={subscriptionUpdating}
                onChange={(event) =>
                  setSubscriptionModal((prev) => ({
                    ...prev,
                    value: event.target.value,
                  }))
                }
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-800 outline-none transition focus:border-slate-400 disabled:bg-slate-100"
              >
                {subscriptionModal.field === "subscriptionPlan" ? (
                  <>
                    <option value="STARTER">STARTER</option>
                    <option value="PRO">PRO</option>
                    <option value="ENTERPRISE">ENTERPRISE</option>
                  </>
                ) : (
                  <>
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="PAST_DUE">PAST DUE</option>
                    <option value="CANCELED">CANCELED</option>
                  </>
                )}
              </select>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                disabled={subscriptionUpdating}
                onClick={() => setSubscriptionModal(null)}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-black text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={
                  subscriptionUpdating ||
                  subscriptionModal.value ===
                    selectedRestaurant?.[subscriptionModal.field]
                }
                onClick={handleSubscriptionUpdate}
                className="rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-black text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {subscriptionUpdating ? "Updating..." : "Update"}
              </button>
            </div>
          </div>
        </div>
      )}
      {showDetails && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-sm p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              setShowDetails(false);
            }
          }}
        >
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-3xl shadow-2xl border border-slate-200">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-white border-b border-slate-100 px-6 py-5 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-red-500">
                  Restaurant Details
                </p>

                <h2 className="text-xl font-black text-slate-900 mt-1">
                  {selectedRestaurant?.name || "Restaurant"}
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setShowDetails(false)}
                className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600"
              >
                <XCircle size={18} />
              </button>
            </div>

            {/* Loading */}
            {detailsLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 size={32} className="animate-spin text-red-500" />
              </div>
            ) : selectedRestaurant ? (
              <div className="p-6 space-y-6">
                {/* Status */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                      Approval
                    </p>

                    <p
                      className={`mt-2 text-sm font-black ${
                        selectedRestaurant.isApproved
                          ? "text-green-600"
                          : "text-amber-600"
                      }`}
                    >
                      {selectedRestaurant.isApproved ? "Approved" : "Pending"}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                      Access
                    </p>

                    <p
                      className={`mt-2 text-sm font-black ${
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
                  <h3 className="text-sm font-black text-slate-900 mb-3">
                    Restaurant Information
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <DetailItem
                      label="Restaurant Name"
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
                      value={selectedRestaurant.email || "—"}
                    />

                    <DetailItem
                      label="Phone"
                      value={selectedRestaurant.phone || "—"}
                    />
                  </div>
                </div>

                {/* Owner Information */}
                <div>
                  <h3 className="text-sm font-black text-slate-900 mb-3">
                    Owner Information
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <DetailItem
                      label="Owner Name"
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
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-black text-slate-900">
                      Operational Overview
                    </h3>

                    {overviewLoading && (
                      <Loader2
                        size={16}
                        className="animate-spin text-red-500"
                      />
                    )}
                  </div>

                  {overviewLoading ? (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 flex items-center justify-center">
                      <Loader2
                        size={24}
                        className="animate-spin text-red-500"
                      />
                    </div>
                  ) : restaurantOverview?.stats ? (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <OverviewCard
                        label="Staff"
                        value={restaurantOverview.stats.staffCount}
                      />

                      <OverviewCard
                        label="Menu Items"
                        value={restaurantOverview.stats.menuItemCount}
                      />

                      <OverviewCard
                        label="Combos"
                        value={restaurantOverview.stats.comboCount}
                      />

                      <OverviewCard
                        label="Orders"
                        value={restaurantOverview.stats.orderCount}
                      />

                      <OverviewCard
                        label="Live Orders"
                        value={restaurantOverview.stats.activeOrderCount}
                      />

                      <OverviewCard
                        label="Offers"
                        value={restaurantOverview.stats.offerCount}
                      />

                      <OverviewCard
                        label="Tables"
                        value={restaurantOverview.stats.tableCount}
                      />
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm font-bold text-slate-500">
                      Operational data unavailable.
                    </div>
                  )}
                </div>

                {/* Staff & Users */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="text-sm font-black text-slate-900">
                        Staff & Users
                      </h3>

                      <p className="mt-1 text-[11px] font-medium text-slate-400">
                        Manage restaurant users and their access status
                      </p>
                    </div>

                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                      {restaurantStaff.length} Users
                    </span>
                  </div>

                  {staffLoading ? (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-8 flex items-center justify-center">
                      <Loader2
                        size={24}
                        className="animate-spin text-red-500"
                      />
                    </div>
                  ) : restaurantStaff.length === 0 ? (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm font-bold text-slate-500">
                      No restaurant users found.
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-slate-200 overflow-hidden bg-white">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left min-w-[850px]">
                          <thead className="bg-slate-50 border-b border-slate-100">
                            <tr>
                              <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-slate-400">
                                User
                              </th>

                              <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-slate-400">
                                Role
                              </th>

                              <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-slate-400">
                                Phone
                              </th>

                              <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-slate-400">
                                Status
                              </th>

                              <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-slate-400">
                                Last Login
                              </th>

                              <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-slate-400 text-right">
                                Action
                              </th>
                            </tr>
                          </thead>

                          <tbody className="divide-y divide-slate-100">
                            {restaurantStaff.map((user) => {
                              const isActive = user.isActive !== false;

                              return (
                                <tr
                                  key={user._id}
                                  className="hover:bg-slate-50/70 transition-colors"
                                >
                                  {/* USER */}
                                  <td className="px-4 py-3">
                                    <div className="flex items-center gap-3">
                                      <div className="h-9 w-9 shrink-0 rounded-xl bg-slate-100 flex items-center justify-center">
                                        <User
                                          size={16}
                                          className="text-slate-500"
                                        />
                                      </div>

                                      <div className="min-w-0">
                                        <p className="text-sm font-bold text-slate-800 truncate">
                                          {user.name || "—"}
                                        </p>

                                        <p className="text-xs text-slate-400 mt-0.5 truncate">
                                          {user.email || "—"}
                                        </p>
                                      </div>
                                    </div>
                                  </td>

                                  {/* ROLE */}
                                  <td className="px-4 py-3">
                                    <span
                                      className={`inline-flex px-2.5 py-1 rounded-lg text-[10px] font-black uppercase ${
                                        user.role === "OWNER"
                                          ? "bg-purple-50 text-purple-700"
                                          : user.role === "MANAGER"
                                            ? "bg-blue-50 text-blue-700"
                                            : "bg-slate-100 text-slate-700"
                                      }`}
                                    >
                                      {user.role || "—"}
                                    </span>
                                  </td>

                                  {/* PHONE */}
                                  <td className="px-4 py-3 text-xs font-medium text-slate-600">
                                    {user.phone || "—"}
                                  </td>

                                  {/* STATUS */}
                                  <td className="px-4 py-3">
                                    <span
                                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase ${
                                        isActive
                                          ? "bg-emerald-50 text-emerald-600"
                                          : "bg-rose-50 text-rose-600"
                                      }`}
                                    >
                                      <span
                                        className={`h-1.5 w-1.5 rounded-full ${
                                          isActive
                                            ? "bg-emerald-500"
                                            : "bg-rose-500"
                                        }`}
                                      />

                                      {isActive ? "Active" : "Blocked"}
                                    </span>
                                  </td>

                                  {/* LAST LOGIN */}
                                  <td className="px-4 py-3">
                                    <p className="text-xs font-medium text-slate-600">
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
                                      className={`inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-[10px] font-black uppercase tracking-wide transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                                        isActive
                                          ? "bg-rose-50 text-rose-700 hover:bg-rose-100"
                                          : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                                      }`}
                                    >
                                      {staffLoading ? (
                                        <Loader2
                                          size={14}
                                          className="animate-spin"
                                        />
                                      ) : isActive ? (
                                        <>
                                          <Power size={14} />
                                          Deactivate
                                        </>
                                      ) : (
                                        <>
                                          <Check size={14} />
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

                {/* Subscription */}
                {/* Subscription Management */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-black text-slate-900">
                      Subscription
                    </h3>

                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                      SuperAdmin
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Current Plan */}
                    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                      <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                        Current Plan
                      </p>

                      <div className="mt-2 flex items-center justify-between gap-3">
                        <span className="text-sm font-black text-slate-900">
                          {selectedRestaurant.subscriptionPlan || "STARTER"}
                        </span>

                        <button
                          type="button"
                          disabled={subscriptionUpdating}
                          onClick={() =>
                            setSubscriptionModal({
                              field: "subscriptionPlan",
                              value:
                                selectedRestaurant.subscriptionPlan ||
                                "STARTER",
                            })
                          }
                          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-[10px] font-black uppercase tracking-wider text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Change
                        </button>
                      </div>
                    </div>

                    {/* Subscription Status */}
                    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                      <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                        Status
                      </p>

                      <div className="mt-2 flex items-center justify-between gap-3">
                        <span
                          className={`inline-flex rounded-xl px-3 py-1.5 text-[10px] font-black uppercase tracking-wider ${
                            selectedRestaurant.subscriptionStatus === "ACTIVE"
                              ? "bg-emerald-50 text-emerald-700"
                              : selectedRestaurant.subscriptionStatus ===
                                  "PAST_DUE"
                                ? "bg-amber-50 text-amber-700"
                                : "bg-rose-50 text-rose-700"
                          }`}
                        >
                          {selectedRestaurant.subscriptionStatus || "ACTIVE"}
                        </span>

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
                          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-[10px] font-black uppercase tracking-wider text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Change
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Dates */}
                <div>
                  <h3 className="text-sm font-black text-slate-900 mb-3">
                    Account Timeline
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <DetailItem
                      label="Created At"
                      value={
                        selectedRestaurant.createdAt
                          ? new Date(
                              selectedRestaurant.createdAt,
                            ).toLocaleString()
                          : "—"
                      }
                    />

                    <DetailItem
                      label="Updated At"
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
                <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-sm font-black text-rose-700">
                        Danger Zone
                      </h3>

                      <p className="mt-1 text-xs font-medium text-rose-600">
                        Permanently delete this restaurant and its tenant data.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleDeleteRestaurant}
                      className="shrink-0 rounded-xl bg-rose-600 px-4 py-2.5 text-xs font-black text-white transition hover:bg-rose-700"
                    >
                      Delete Restaurant
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-16 text-center text-sm font-bold text-slate-500">
                Restaurant details unavailable.
              </div>
            )}
          </div>
        </div>
      )}
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                title="Total Restaurants"
                value={statsLoading ? "..." : totalStores}
              />

              <StatCard
                title="Approved"
                value={statsLoading ? "..." : approvedStores}
              />

              <StatCard
                title="Pending Approval"
                value={statsLoading ? "..." : pendingStores}
              />

              <StatCard
                title="Blocked"
                value={statsLoading ? "..." : blockedStores}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
              <StatCard
                title="Active Restaurants"
                value={statsLoading ? "..." : activeStores}
              />

              <StatCard
                title="Total Orders"
                value={statsLoading ? "..." : totalOrders}
              />

              <StatCard
                title="Live Orders"
                value={statsLoading ? "..." : activeOrders}
              />
            </div>
          </div>

          {/* =========================================================
    REVENUE & PAYMENTS
========================================================= */}

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-red-500">
                  Financial Overview
                </p>

                <h2 className="mt-1 text-xl font-black text-slate-900">
                  Revenue & Payments
                </h2>

                <p className="mt-1 text-xs font-medium text-slate-500">
                  Platform-wide completed billing collection
                </p>
              </div>

              <select
                value={revenuePeriod}
                onChange={(event) => setRevenuePeriod(event.target.value)}
                disabled={revenueLoading}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-black text-slate-700 outline-none focus:border-slate-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="today">Today</option>
                <option value="week">Last 7 Days</option>
                <option value="month">Last 30 Days</option>
                <option value="year">Last 12 Months</option>
              </select>
            </div>

            {revenueLoading ? (
              <div className="mt-5 flex min-h-[180px] items-center justify-center rounded-2xl bg-slate-50">
                <Loader2 size={28} className="animate-spin text-red-500" />
              </div>
            ) : revenueStats ? (
              <>
                {/* Revenue Cards */}
                <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                      Total Collected
                    </p>

                    <p className="mt-2 text-2xl font-black text-slate-900">
                      ₹
                      {Number(
                        revenueStats.revenue?.totalCollected || 0,
                      ).toLocaleString("en-IN", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                      Cash
                    </p>

                    <p className="mt-2 text-2xl font-black text-slate-900">
                      ₹
                      {Number(revenueStats.revenue?.cash || 0).toLocaleString(
                        "en-IN",
                        {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        },
                      )}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                      UPI
                    </p>

                    <p className="mt-2 text-2xl font-black text-slate-900">
                      ₹
                      {Number(revenueStats.revenue?.upi || 0).toLocaleString(
                        "en-IN",
                        {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        },
                      )}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                      Due Collected
                    </p>

                    <p className="mt-2 text-2xl font-black text-slate-900">
                      ₹
                      {Number(
                        revenueStats.revenue?.dueCollected || 0,
                      ).toLocaleString("en-IN", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                    <p className="text-[10px] font-black uppercase tracking-wider text-amber-600">
                      Outstanding Due
                    </p>

                    <p className="mt-2 text-2xl font-black text-amber-800">
                      ₹
                      {Number(
                        revenueStats.revenue?.outstandingDue || 0,
                      ).toLocaleString("en-IN", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </p>
                  </div>
                </div>

                {/* Payment Breakdown */}
                <div className="mt-5 grid grid-cols-1 gap-3 lg:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 p-4">
                    <h3 className="text-sm font-black text-slate-900">
                      Payment Breakdown
                    </h3>

                    <div className="mt-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-500">
                          Cash Bills
                        </span>

                        <span className="text-sm font-black text-slate-900">
                          {revenueStats.bills?.cash || 0}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-500">
                          UPI Bills
                        </span>

                        <span className="text-sm font-black text-slate-900">
                          {revenueStats.bills?.upi || 0}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-500">
                          Due Bills
                        </span>

                        <span className="text-sm font-black text-slate-900">
                          {revenueStats.bills?.due || 0}
                        </span>
                      </div>

                      <div className="border-t border-slate-100 pt-3 flex items-center justify-between">
                        <span className="text-xs font-black uppercase text-slate-400">
                          Total Bills
                        </span>

                        <span className="text-base font-black text-slate-900">
                          {revenueStats.bills?.total || 0}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Collection Summary */}
                  <div className="rounded-2xl border border-slate-200 p-4">
                    <h3 className="text-sm font-black text-slate-900">
                      Collection Summary
                    </h3>

                    <div className="mt-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-500">
                          Cash Collection
                        </span>

                        <span className="text-sm font-black text-slate-900">
                          ₹
                          {Number(
                            revenueStats.revenue?.cash || 0,
                          ).toLocaleString("en-IN", {
                            minimumFractionDigits: 2,
                          })}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-500">
                          UPI Collection
                        </span>

                        <span className="text-sm font-black text-slate-900">
                          ₹
                          {Number(
                            revenueStats.revenue?.upi || 0,
                          ).toLocaleString("en-IN", {
                            minimumFractionDigits: 2,
                          })}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-500">
                          Due Collection
                        </span>

                        <span className="text-sm font-black text-slate-900">
                          ₹
                          {Number(
                            revenueStats.revenue?.dueCollected || 0,
                          ).toLocaleString("en-IN", {
                            minimumFractionDigits: 2,
                          })}
                        </span>
                      </div>

                      <div className="border-t border-slate-100 pt-3 flex items-center justify-between">
                        <span className="text-xs font-black uppercase text-slate-400">
                          Total Collected
                        </span>

                        <span className="text-lg font-black text-slate-900">
                          ₹
                          {Number(
                            revenueStats.revenue?.totalCollected || 0,
                          ).toLocaleString("en-IN", {
                            minimumFractionDigits: 2,
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center">
                <p className="text-sm font-bold text-slate-500">
                  Revenue data unavailable.
                </p>
              </div>
            )}
          </div>

          {/* =========================================================
    PLATFORM ANALYTICS
========================================================= */}

          <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-red-500">
                  Platform Insights
                </p>

                <h2 className="mt-1 text-xl font-black text-slate-900">
                  Platform Analytics
                </h2>

                <p className="mt-1 text-xs font-medium text-slate-500">
                  Restaurant, order and revenue trends
                </p>
              </div>

              <select
                value={analyticsPeriod}
                onChange={(event) => setAnalyticsPeriod(event.target.value)}
                disabled={analyticsLoading}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-black text-slate-700 outline-none focus:border-slate-400 disabled:opacity-50"
              >
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
                <option value="90d">Last 90 Days</option>
                <option value="1y">Last 1 Year</option>
              </select>
            </div>

            {analyticsLoading ? (
              <div className="mt-5 flex min-h-[220px] items-center justify-center rounded-2xl bg-slate-50">
                <Loader2 size={28} className="animate-spin text-red-500" />
              </div>
            ) : platformAnalytics ? (
              <>
                {/* Status Summary */}
                <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-5">
                  <StatCard
                    title="Total Restaurants"
                    value={platformAnalytics.restaurants?.total}
                  />

                  <StatCard
                    title="Approved"
                    value={platformAnalytics.restaurants?.approved}
                  />

                  <StatCard
                    title="Pending"
                    value={platformAnalytics.restaurants?.pending}
                  />

                  <StatCard
                    title="Active"
                    value={platformAnalytics.restaurants?.active}
                  />

                  <StatCard
                    title="Blocked"
                    value={platformAnalytics.restaurants?.blocked}
                  />
                </div>

                {/* Subscription Distribution */}
                <div className="mt-5 rounded-2xl border border-slate-200 p-4">
                  <h3 className="text-sm font-black text-slate-900">
                    Subscription Distribution
                  </h3>

                  <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                        Starter
                      </p>

                      <p className="mt-2 text-2xl font-black text-slate-900">
                        {platformAnalytics.subscriptions?.starter || 0}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                        Pro
                      </p>

                      <p className="mt-2 text-2xl font-black text-slate-900">
                        {platformAnalytics.subscriptions?.pro || 0}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                        Enterprise
                      </p>

                      <p className="mt-2 text-2xl font-black text-slate-900">
                        {platformAnalytics.subscriptions?.enterprise || 0}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Restaurant Growth */}
                <div className="mt-5 rounded-2xl border border-slate-200 p-4">
                  <h3 className="text-sm font-black text-slate-900">
                    Restaurant Growth
                  </h3>

                  <div className="mt-4 space-y-2">
                    {(platformAnalytics.restaurantGrowth || []).length === 0 ? (
                      <p className="text-xs font-medium text-slate-400">
                        No restaurant registrations in this period.
                      </p>
                    ) : (
                      platformAnalytics.restaurantGrowth.map((item) => (
                        <div
                          key={item._id}
                          className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3"
                        >
                          <span className="text-xs font-bold text-slate-600">
                            {item._id}
                          </span>

                          <span className="text-sm font-black text-slate-900">
                            {item.count}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Order Trend */}
                <div className="mt-5 rounded-2xl border border-slate-200 p-4">
                  <h3 className="text-sm font-black text-slate-900">
                    Order Trend
                  </h3>

                  <div className="mt-4 space-y-2">
                    {(platformAnalytics.orderTrend || []).length === 0 ? (
                      <p className="text-xs font-medium text-slate-400">
                        No orders in this period.
                      </p>
                    ) : (
                      platformAnalytics.orderTrend.map((item) => (
                        <div
                          key={item._id}
                          className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3"
                        >
                          <span className="text-xs font-bold text-slate-600">
                            {item._id}
                          </span>

                          <span className="text-sm font-black text-slate-900">
                            {item.count}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Revenue Trend */}
                <div className="mt-5 rounded-2xl border border-slate-200 p-4">
                  <h3 className="text-sm font-black text-slate-900">
                    Revenue Trend
                  </h3>

                  <div className="mt-4 space-y-2">
                    {(platformAnalytics.revenueTrend || []).length === 0 ? (
                      <p className="text-xs font-medium text-slate-400">
                        No revenue data in this period.
                      </p>
                    ) : (
                      platformAnalytics.revenueTrend.map((item) => (
                        <div
                          key={item._id}
                          className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3"
                        >
                          <span className="text-xs font-bold text-slate-600">
                            {item._id}
                          </span>

                          <span className="text-sm font-black text-slate-900">
                            ₹
                            {Number(item.revenue || 0).toLocaleString("en-IN", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="mt-5 rounded-2xl bg-slate-50 p-6 text-center">
                <p className="text-sm font-bold text-slate-500">
                  Analytics data unavailable.
                </p>
              </div>
            )}
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
              {/* Search */}
              <div className="lg:col-span-2">
                <div className="relative">
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setPage(1);
                    }}
                    placeholder="Search restaurant, owner, email, phone..."
                    className="w-full h-11 rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100"
                  />
                </div>
              </div>

              {/* Status */}
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-red-400"
              >
                <option value="all">All Access Status</option>
                <option value="active">Active</option>
                <option value="blocked">Blocked</option>
              </select>

              {/* Approval */}
              <select
                value={approvalFilter}
                onChange={(e) => {
                  setApprovalFilter(e.target.value);
                  setPage(1);
                }}
                className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-red-400"
              >
                <option value="all">All Approval</option>
                <option value="approved">Approved</option>
                <option value="pending">Pending</option>
              </select>

              {/* Sort */}
              <select
                value={sortBy}
                onChange={(e) => {
                  setSortBy(e.target.value);
                  setPage(1);
                }}
                className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-red-400"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="name_asc">Name A-Z</option>
                <option value="name_desc">Name Z-A</option>
              </select>
            </div>
          </div>

          {/* Content Section: Table for Desktop / Cards for Mobile */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
            {restaurants.length === 0 ? (
              <div className="text-center py-16 space-y-3">
                <Store className="mx-auto text-slate-300" size={48} />
                <p className="text-slate-600 font-bold text-sm">
                  No restaurants registered yet.
                </p>
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
                              <p className="font-bold text-slate-900 text-sm">
                                {store.name}
                              </p>
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
                              {store.isApproved ? (
                                <CheckCircle2 size={12} />
                              ) : (
                                <AlertCircle size={12} />
                              )}
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
                            <button
                              type="button"
                              onClick={() => handleViewDetails(store._id)}
                              className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 cursor-pointer bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                            >
                              View
                            </button>
                            {/* Block/Unblock Button */}
                            <button
                              onClick={() =>
                                handleStatusUpdate(
                                  store._id,
                                  "isActive",
                                  store.isActive === true,
                                )
                              }
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 cursor-pointer ${
                                store.isActive !== false
                                  ? "bg-white text-rose-600 border-rose-200 hover:bg-rose-50"
                                  : "bg-white text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                              }`}
                              title={
                                store.isActive !== false
                                  ? "Block Restaurant Access"
                                  : "Unblock Restaurant"
                              }
                            >
                              <Power size={13} />
                              {store.isActive !== false ? "Block" : "Unblock"}
                            </button>

                            {/* Approve/Reject Button */}
                            <button
                              onClick={() =>
                                handleStatusUpdate(
                                  store._id,
                                  "isApproved",
                                  store.isApproved === true,
                                )
                              }
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 cursor-pointer ${
                                store.isApproved
                                  ? "bg-white text-amber-600 border-amber-200 hover:bg-amber-50"
                                  : "bg-gradient-to-r from-red-500 to-rose-600 text-white border-transparent hover:opacity-95 shadow-sm shadow-red-500/20"
                              }`}
                            >
                              {store.isApproved ? (
                                <XCircle size={13} />
                              ) : (
                                <Check size={13} />
                              )}
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
          {pagination.totalPages > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-4 border-t border-slate-100">
              <p className="text-xs text-slate-500">
                Showing{" "}
                <span className="font-bold text-slate-700">
                  {Math.min(
                    (pagination.page - 1) * pagination.limit + 1,
                    pagination.total,
                  )}
                </span>
                {" - "}
                <span className="font-bold text-slate-700">
                  {Math.min(
                    pagination.page * pagination.limit,
                    pagination.total,
                  )}
                </span>
                {" of "}
                <span className="font-bold text-slate-700">
                  {pagination.total}
                </span>
                {" restaurants"}
              </p>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={!pagination.hasPreviousPage || loading}
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50"
                >
                  Previous
                </button>

                <span className="px-3 py-2 rounded-xl bg-slate-50 text-xs font-black text-slate-700">
                  {pagination.page} / {pagination.totalPages}
                </span>

                <button
                  type="button"
                  disabled={!pagination.hasNextPage || loading}
                  onClick={() => setPage((prev) => prev + 1)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
          <div className="mt-8 rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <History className="h-5 w-5 text-slate-700" />

                    <h2 className="text-lg font-black text-slate-900">
                      Audit Logs
                    </h2>
                  </div>

                  <p className="mt-1 text-sm text-slate-500">
                    History of sensitive SuperAdmin restaurant actions.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <select
                    value={auditAction}
                    onChange={(e) => {
                      setAuditAction(e.target.value);
                      setAuditPage(1);
                    }}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold outline-none"
                  >
                    <option value="">All Actions</option>
                    <option value="RESTAURANT_APPROVED">Approved</option>
                    <option value="RESTAURANT_APPROVAL_REVOKED">
                      Approval Revoked
                    </option>
                    <option value="RESTAURANT_BLOCKED">Blocked</option>
                    <option value="RESTAURANT_UNBLOCKED">Unblocked</option>
                  </select>

                  <select
                    value={auditSort}
                    onChange={(e) => {
                      setAuditSort(e.target.value);
                      setAuditPage(1);
                    }}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold outline-none"
                  >
                    <option value="newest">Newest First</option>

                    <option value="oldest">Oldest First</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              {auditLoading ? (
                <div className="p-10 text-center text-sm font-semibold text-slate-500">
                  Loading audit logs...
                </div>
              ) : auditLogs.length === 0 ? (
                <div className="p-10 text-center text-sm font-semibold text-slate-500">
                  No audit logs found.
                </div>
              ) : (
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50">
                      <th className="px-5 py-3 text-left text-[10px] font-black uppercase tracking-wider text-slate-400">
                        Restaurant
                      </th>

                      <th className="px-5 py-3 text-left text-[10px] font-black uppercase tracking-wider text-slate-400">
                        Action
                      </th>

                      <th className="px-5 py-3 text-left text-[10px] font-black uppercase tracking-wider text-slate-400">
                        Admin
                      </th>

                      <th className="px-5 py-3 text-left text-[10px] font-black uppercase tracking-wider text-slate-400">
                        Change
                      </th>

                      <th className="px-5 py-3 text-left text-[10px] font-black uppercase tracking-wider text-slate-400">
                        IP
                      </th>

                      <th className="px-5 py-3 text-left text-[10px] font-black uppercase tracking-wider text-slate-400">
                        Date
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {auditLogs.map((log) => (
                      <tr
                        key={log._id}
                        className="border-b border-slate-100 last:border-0"
                      >
                        <td className="px-5 py-4">
                          <p className="font-bold text-slate-900">
                            {log.restaurantId?.name || "Deleted Restaurant"}
                          </p>

                          {log.restaurantId?.email && (
                            <p className="text-xs text-slate-500">
                              {log.restaurantId.email}
                            </p>
                          )}
                        </td>

                        <td className="px-5 py-4">
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                            {getAuditActionLabel(log.action)}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <p className="font-semibold text-slate-800">
                            {log.adminUserId?.name || "Unknown"}
                          </p>

                          {log.adminUserId?.email && (
                            <p className="text-xs text-slate-500">
                              {log.adminUserId.email}
                            </p>
                          )}
                        </td>

                        <td className="px-5 py-4 text-sm font-semibold text-slate-700">
                          {String(log.previousValue)} → {String(log.newValue)}
                        </td>

                        <td className="px-5 py-4 text-xs font-mono text-slate-500">
                          {log.ipAddress || "N/A"}
                        </td>

                        <td className="px-5 py-4 text-xs font-semibold text-slate-500">
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

            {/* Pagination */}
            <div className="flex flex-col gap-3 border-t border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm font-semibold text-slate-500">
                {auditPagination.total} total audit records
              </p>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={!auditPagination.hasPreviousPage}
                  onClick={() =>
                    setAuditPage((current) => Math.max(1, current - 1))
                  }
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Previous
                </button>

                <span className="px-2 text-sm font-bold text-slate-600">
                  Page {auditPagination.page} of{" "}
                  {Math.max(1, auditPagination.totalPages)}
                </span>

                <button
                  type="button"
                  disabled={!auditPagination.hasNextPage}
                  onClick={() => setAuditPage((current) => current + 1)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
