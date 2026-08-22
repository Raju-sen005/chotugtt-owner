import { useState, useCallback, useMemo, memo, useEffect } from "react";
import axios from "axios";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Tag,
  X,
  Trash2,
  PlusCircle,
  Sparkles,
  Percent,
  CheckCircle2,
} from "lucide-react";
import { useSocket } from "../../context/SocketContext";
// const api = axios.create({ baseURL: `${import.meta.env.VITE_APP_API_BASE}` });

const api = axios.create({
  baseURL: import.meta.env.VITE_APP_API_BASE,
  withCredentials: true,
});

// Offer Card Component
const OfferCard = memo(function OfferCard({ offer, onDelete }) {
  return (
    <div className="bg-white p-5 rounded-3xl border border-slate-200/80 hover:border-red-200 transition-all shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 group">
      <div className="flex gap-4 items-center flex-1 min-w-0">
        <div className="p-3 bg-red-50 text-red-500 rounded-2xl shrink-0 group-hover:bg-red-500 group-hover:text-white transition-colors">
          <Tag size={20} />
        </div>
        <div className="min-w-0 space-y-0.5">
          <h3 className="font-black text-slate-900 text-sm sm:text-base truncate">
            {offer.title}
          </h3>
          <p className="text-xs text-slate-500 truncate font-medium">
            {offer.description || "No description provided."}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between sm:justify-end gap-6 shrink-0 border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100">
        <div className="text-left sm:text-right">
          <div className="text-emerald-600 font-black text-base sm:text-lg">
            {offer.discountValue}% OFF
          </div>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider whitespace-nowrap">
            {offer.targetItems?.length || 0} Target Items
          </p>
        </div>
        <button
          onClick={() => onDelete(offer._id)}
          className="p-2.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all cursor-pointer"
          title="Delete Offer"
        >
          <Trash2 size={18} />
        </button>
      </div>
    </div>
  );
});

export default function Offers() {
  const [formData, setFormData] = useState({
    title: "",
    discountValue: "",
    description: "",
    targetItems: [],
  });
  const socket = useSocket();
  const queryClient = useQueryClient();

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
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [offerToDelete, setOfferToDelete] = useState(null);

  const deleteMutation = useMutation({
    mutationFn: (offerId) => api.delete(`/offers/${offerId}`),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["offers"],
      });

      setSuccessMessage("Offer Deleted Successfully");

      setShowSuccessPopup(true);
    },
  });

  const {
    data: offersRaw,
    isLoading: offersLoading,
    isError: offersError,
  } = useQuery({
    queryKey: ["offers"],
    queryFn: () => api.get("/offers").then((r) => r.data.data),
    staleTime: 30_000,
  });

  const {
    data: menuItemsRaw,
    isLoading: itemsLoading,
    isError: itemsError,
  } = useQuery({
    queryKey: ["menu-items-list"],
    queryFn: () => api.get("/menu/admin/items").then((r) => r.data.data),
    staleTime: 60_000,
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
      map[item._id] = item;
    });
    return map;
  }, [menuItems]);

  const addMutation = useMutation({
    mutationFn: (data) => api.post("/offers", data),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["offers"],
      });

      setFormData({
        title: "",
        discountValue: "",
        description: "",
        targetItems: [],
      });

      setSuccessMessage("Offer Created Successfully");

      setShowSuccessPopup(true);
    },
  });

  const updateField = useCallback((field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }, []);

  const addTargetItem = useCallback((itemId) => {
    setFormData((prev) =>
      prev.targetItems.includes(itemId)
        ? prev
        : { ...prev, targetItems: [...prev.targetItems, itemId] },
    );
  }, []);

  const removeTargetItem = useCallback((itemId) => {
    setFormData((prev) => ({
      ...prev,
      targetItems: prev.targetItems.filter((id) => id !== itemId),
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
    if (!formData.title || !formData.discountValue) {
      alert("Please enter title and discount value.");
      return;
    }
    addMutation.mutate(formData);
  }, [addMutation, formData]);

  return (
    <>
      {showSuccessPopup && (
        <div className="fixed top-6 right-6 z-[9999] animate-in slide-in-from-right-5 fade-in duration-300">
          <div className="flex items-start gap-3 bg-white border border-emerald-200 shadow-2xl rounded-2xl px-5 py-4 min-w-[320px] max-w-[400px]">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
              <CheckCircle2 size={22} strokeWidth={2.5} />
            </div>

            <div className="flex-1">
              <p className="text-sm font-black text-slate-900">
                {successMessage}
              </p>

              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                The operation was completed successfully.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowSuccessPopup(false)}
              className="text-slate-400 hover:text-slate-700 transition-colors text-lg leading-none"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {showDeleteModal && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl p-6 animate-in zoom-in-95 fade-in duration-200">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mb-4">
              <Trash2 size={22} strokeWidth={2.5} />
            </div>

            <h3 className="text-lg font-black text-slate-900">Delete Offer?</h3>

            <p className="text-sm text-slate-500 mt-2 leading-relaxed">
              Are you sure you want to delete this offer? This action cannot be
              undone.
            </p>

            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteModal(false);
                  setOfferToDelete(null);
                }}
                className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-700 text-sm font-bold hover:bg-slate-50 transition-all"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={confirmDeleteOffer}
                disabled={deleteMutation.isPending}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-rose-500 to-red-600 text-white text-sm font-bold hover:opacity-95 transition-all disabled:opacity-50"
              >
                {deleteMutation.isPending ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="max-w-5xl mx-auto p-4 sm:p-6 lg:p-10 space-y-8 font-sans bg-[#F8F9FA] min-h-screen">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-red-50 text-red-600 rounded-2xl border border-red-100">
              <Sparkles size={28} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                Restaurant Offers & Discounts
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Launch special promotional campaigns for customers.
              </p>
            </div>
          </div>
        </div>

        {/* Create Offer Form Container */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xs space-y-5">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
              <PlusCircle size={18} className="text-red-500" /> Create New Offer
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                Offer Title
              </label>
              <input
                placeholder="e.g. Weekend Mega Special"
                className="w-full px-4 py-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-red-500 focus:ring-4 focus:ring-red-500/10 transition-all"
                value={formData.title}
                onChange={(e) => updateField("title", e.target.value)}
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                Discount Value (%)
              </label>
              <div className="relative">
                <input
                  type="number"
                  placeholder="20"
                  className="w-full px-4 py-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-red-500 focus:ring-4 focus:ring-red-500/10 transition-all pr-8"
                  value={formData.discountValue}
                  onChange={(e) => updateField("discountValue", e.target.value)}
                />
                <Percent
                  size={14}
                  className="absolute right-3.5 top-3.5 text-slate-400"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              Brief Description
            </label>
            <textarea
              placeholder="Describe the offer details..."
              className="w-full px-4 py-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-red-500 focus:ring-4 focus:ring-red-500/10 transition-all"
              rows={2}
              value={formData.description}
              onChange={(e) => updateField("description", e.target.value)}
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              Apply to Specific Menu Items
            </label>

            {itemsLoading && (
              <p className="text-xs text-slate-400 mt-1">Loading items...</p>
            )}
            {itemsError && (
              <p className="text-xs text-red-500 mt-1 font-medium">
                Failed to load menu items. Check your authentication token.
              </p>
            )}

            <select
              className="w-full mt-1 px-4 py-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:border-red-500 focus:ring-4 focus:ring-red-500/10 transition-all cursor-pointer"
              value=""
              onChange={(e) => e.target.value && addTargetItem(e.target.value)}
            >
              <option value="">Select menu item to target...</option>
              {menuItems.map((item) => (
                <option key={item._id} value={item._id}>
                  {item.name} - ₹{item.price}
                </option>
              ))}
            </select>

            {/* Selected Item Chips */}
            <div className="flex flex-wrap gap-2 mt-3">
              {formData.targetItems.map((itemId) => {
                const item = menuItemsById[itemId];
                return (
                  <span
                    key={itemId}
                    className="inline-flex items-center gap-1.5 bg-red-50 text-red-600 px-3 py-1.5 rounded-full text-xs font-bold border border-red-100"
                  >
                    {item?.name || "Unknown item"}
                    <X
                      size={14}
                      className="cursor-pointer shrink-0 hover:text-red-800"
                      onClick={() => removeTargetItem(itemId)}
                    />
                  </span>
                );
              })}
            </div>
          </div>

          <button
            onClick={handleLaunchOffer}
            disabled={addMutation.isPending}
            className="w-full bg-gradient-to-r from-red-500 to-rose-600 text-white py-3.5 rounded-2xl font-bold hover:opacity-95 active:scale-[0.99] transition-all shadow-md shadow-red-500/20 text-xs cursor-pointer disabled:opacity-50"
          >
            {addMutation.isPending
              ? "Launching Campaign..."
              : "Launch Offer Campaign"}
          </button>
        </div>

        {/* Offers Listing Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <h3 className="font-black text-slate-800 text-base">
              Active Offers List
            </h3>
            <span className="text-xs font-bold bg-white px-3 py-1 rounded-full border border-slate-200 text-slate-600 shadow-xs">
              {offers.length} Total Offers
            </span>
          </div>

          {offersLoading && (
            <p className="text-sm text-slate-400 p-6 text-center bg-white rounded-3xl border border-slate-200">
              Loading offers...
            </p>
          )}
          {offersError && (
            <p className="text-sm text-red-500 p-6 text-center bg-white rounded-3xl border border-slate-200">
              Failed to load offers.
            </p>
          )}
          {!offersLoading && offers.length === 0 && (
            <div className="text-center py-12 bg-white rounded-3xl border border-slate-200 shadow-xs space-y-2">
              <Tag size={36} className="mx-auto text-slate-300" />
              <p className="text-sm text-slate-500 font-medium">
                No offers created yet.
              </p>
            </div>
          )}

          <div className="space-y-3">
            {offers.map((offer) => (
              <OfferCard
                key={offer._id}
                offer={offer}
                onDelete={handleDeleteOffer}
              />
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
