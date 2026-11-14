import { useState, useMemo, useCallback, useEffect } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import {
  Plus,
  UtensilsCrossed,
  Edit2,
  Trash2,
  Image as ImageIcon,
  Sparkles,
  Upload,
  Leaf,
  Beef,
  Search,
  ChefHat,
  X,
} from "lucide-react";
import Input from "../../components/ui/Input";
import Modal from "../../components/ui/Modal";
import { useSocket } from "../../context/SocketContext";
import { useAuth } from "../../context/AuthContext";
import { orderCategoryNames, sortMenuEntries } from "../../utils/menuOrder";
import { resolveMediaUrl } from "../../utils/mediaUrl";

export default function MenuCatalog() {
  const queryClient = useQueryClient();

  const socket = useSocket();
  const { user } = useAuth();

  const restaurantId =
    typeof user?.restaurantId === "object"
      ? user.restaurantId?._id
      : user?.restaurantId;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [activeCategoryFilter, setActiveCategoryFilter] = useState("ALL");
  const [formMode, setFormMode] = useState("DISH");
  const [selectedItems, setSelectedItems] = useState([]);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  // const [isAiLocked, setIsAiLocked] = useState(false);
  // const [aiNextAvailableDate, setAiNextAvailableDate] = useState(null);
  const [aiImageFiles, setAiImageFiles] = useState([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("");
  const [isVeg, setIsVeg] = useState(true); // 🆕 Veg/Non-Veg toggle state
  const [itemAvailable, setItemAvailable] = useState(true);
  const [menuSearch, setMenuSearch] = useState("");
  const [vegFilter, setVegFilter] = useState("ALL");
  const [sortMode, setSortMode] = useState("default");

  // 🔑 File state and image preview state
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");

  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [showErrorPopup, setShowErrorPopup] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const MIN_AI_MENU_IMAGES = 2;
  const MAX_AI_MENU_IMAGES = 8;
  const MAX_AI_IMAGE_BYTES = 5 * 1024 * 1024;
  const MAX_AI_TOTAL_BYTES = 25 * 1024 * 1024;
  const MULTIPLE_IMAGES_MESSAGE =
    "Please upload multiple menu page images together. A single image is not accepted. Upload every page of your menu in one go so AI can add all items at once.";

  // MenuCatalog.jsx ke top pe — restaurant approval status fetch karo
  const { data: restaurantProfile } = useQuery({
    queryKey: ["restaurant-profile", restaurantId],
    queryFn: async () => {
      const res = await axios.get(
        `${import.meta.env.VITE_APP_API_BASE}/restaurant/profile`,
        { withCredentials: true },
      );
      return res.data.data;
    },
    staleTime: 60_000,
  });

  const isApproved = restaurantProfile?.isApproved === true;
  const currentPlan = String(restaurantProfile?.subscriptionPlan || "")
    .trim()
    .toUpperCase();

  const isStarterPlan = currentPlan === "STARTER";
  const [showUpgradePopup, setShowUpgradePopup] = useState(false);
  const { data: aiStatus } = useQuery({
    queryKey: ["ai-menu-status", restaurantId],
    queryFn: async () => {
      const res = await axios.get(
        `${import.meta.env.VITE_APP_API_BASE}/menu/admin/menu/ai-status`,
        { withCredentials: true },
      );
      return res.data.data;
    },
    staleTime: 60_000,
  });

  const isAiLocked = aiStatus?.locked === true;
  const aiNextAvailableDate = aiStatus?.nextAvailableAt
    ? new Date(aiStatus.nextAvailableAt)
    : null;

  const {
    data: menuItems = { items: [], combos: [], categoryOrder: [] },
    isLoading,
  } = useQuery({
    queryKey: ["menu-items", restaurantId],
    queryFn: async () => {
      const [itemsRes, combosRes] = await Promise.all([
        axios.get(`${import.meta.env.VITE_APP_API_BASE}/menu/admin/items`, {
          withCredentials: true,
        }),
        axios.get(`${import.meta.env.VITE_APP_API_BASE}/menu/admin/combos`, {
          withCredentials: true,
        }),
      ]);
      return {
        items: itemsRes.data.data || [],
        combos: combosRes.data.data || [],
        categoryOrder: itemsRes.data.categoryOrder || [],
      };
    },
    staleTime: 60_000,
  });

  useEffect(() => {
    if (!socket || !restaurantId) {
      return;
    }

    const isOwnRestaurantEvent = (payload) => {
      if (!payload?.restaurantId) {
        return true;
      }

      return String(payload.restaurantId) === String(restaurantId);
    };

    const invalidateMenu = () => {
      queryClient.invalidateQueries({
        queryKey: ["menu-items"],
      });
    };

    const handleMenuCreated = (payload) => {
      if (!isOwnRestaurantEvent(payload)) {
        return;
      }

      invalidateMenu();
    };

    const handleMenuUpdated = (payload) => {
      if (!isOwnRestaurantEvent(payload)) {
        return;
      }

      invalidateMenu();
    };

    const handleMenuDeleted = (payload) => {
      if (!isOwnRestaurantEvent(payload)) {
        return;
      }

      invalidateMenu();
    };

    const handleCatalogUpdated = (payload) => {
      if (!isOwnRestaurantEvent(payload)) {
        return;
      }

      invalidateMenu();
    };

    const handleReconnect = () => {
      /*
       * Socket recovery ke baad API se canonical
       * state dubara sync.
       */
      invalidateMenu();
    };

    socket.on("MENU_ITEM_CREATED", handleMenuCreated);

    socket.on("MENU_ITEM_UPDATED", handleMenuUpdated);

    socket.on("MENU_ITEM_DELETED", handleMenuDeleted);

    socket.on("COMBO_CREATED", handleMenuCreated);

    socket.on("COMBO_UPDATED", handleMenuUpdated);

    socket.on("COMBO_DELETED", handleMenuDeleted);

    socket.on("MENU_CATALOG_UPDATED", handleCatalogUpdated);

    socket.on("connect", handleReconnect);

    return () => {
      socket.off("MENU_ITEM_CREATED", handleMenuCreated);

      socket.off("MENU_ITEM_UPDATED", handleMenuUpdated);

      socket.off("MENU_ITEM_DELETED", handleMenuDeleted);

      socket.off("COMBO_CREATED", handleMenuCreated);

      socket.off("COMBO_UPDATED", handleMenuUpdated);

      socket.off("COMBO_DELETED", handleMenuDeleted);

      socket.off("MENU_CATALOG_UPDATED", handleCatalogUpdated);

      socket.off("connect", handleReconnect);
    };
  }, [socket, restaurantId, queryClient]);

  // useEffect(() => {
  //   if (!restaurantId) return;

  //   const storageKey = `ai_menu_upload_${restaurantId}`;
  //   const lastUsedAt = localStorage.getItem(storageKey);

  //   if (!lastUsedAt) {
  //     setIsAiLocked(false);
  //     setAiNextAvailableDate(null);
  //     return;
  //   }

  //   const lastUsedDate = new Date(lastUsedAt);
  //   const nextAvailableDate = new Date(lastUsedDate);
  //   nextAvailableDate.setDate(nextAvailableDate.getDate() + 30);

  //   const now = new Date();

  //   if (now < nextAvailableDate) {
  //     setIsAiLocked(true);
  //     setAiNextAvailableDate(nextAvailableDate);
  //   } else {
  //     localStorage.removeItem(storageKey);
  //     setIsAiLocked(false);
  //     setAiNextAvailableDate(null);
  //   }
  // }, [restaurantId]);

  const showSuccess = useCallback((message) => {
    setSuccessMessage(message);
    setShowSuccessPopup(true);

    setTimeout(() => {
      setShowSuccessPopup(false);
    }, 3000);
  }, []);

  const showError = useCallback((message) => {
    setErrorMessage(message);
    setShowErrorPopup(true);

    setTimeout(() => {
      setShowErrorPopup(false);
    }, 5000);
  }, []);

  const clearAiImages = useCallback(() => {
    setAiImageFiles((current) => {
      current.forEach((item) => URL.revokeObjectURL(item.preview));
      return [];
    });
  }, []);

  const aiExtractMutation = useMutation({
    mutationFn: async (formData) => {
      return await axios.post(
        `${import.meta.env.VITE_APP_API_BASE}/menu/admin/menu/ai-extract`,
        formData,
        {
          withCredentials: true,
          timeout: 240000,
        },
      );
    },

    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["menu-items"] });
      queryClient.invalidateQueries({ queryKey: ["ai-menu-status"] });

      setIsAiModalOpen(false);
      clearAiImages();
      showSuccess(res.data?.message || "Menu items imported successfully!");
    },

    onError: (err) => {
      if (err.response?.data?.code === "AI_MONTHLY_LIMIT_REACHED") {
        queryClient.invalidateQueries({ queryKey: ["ai-menu-status"] });
        setIsAiModalOpen(false);
        clearAiImages();
      }
      showError(
        err.response?.data?.message || "Error processing AI menu extraction.",
      );
    },
  });

  const categoriesList = useMemo(
    () => [
      "ALL",
      ...orderCategoryNames(
        (menuItems.items || []).map((item) => item.category).filter(Boolean),
        menuItems.categoryOrder,
        (menuItems.combos || []).length > 0,
      ),
    ],
    [menuItems.items, menuItems.combos, menuItems.categoryOrder],
  );

  const allCatalogItems = useMemo(
    () =>
      sortMenuEntries(
        [
          ...(menuItems.items || []),
          ...(menuItems.combos || []).map((c) => ({
            ...c,
            isCombo: true,
            category: "COMBO",
          })),
        ],
        menuItems.categoryOrder,
      ),
    [menuItems.items, menuItems.combos, menuItems.categoryOrder],
  );

  const filteredMenuItems = useMemo(() => {
    let rows = allCatalogItems;
    if (activeCategoryFilter === "COMBO") {
      rows = rows.filter((item) => item.isCombo);
    } else if (activeCategoryFilter !== "ALL") {
      rows = rows.filter((item) => item.category === activeCategoryFilter);
    }

    if (vegFilter === "VEG") rows = rows.filter((item) => item.isVeg !== false);
    if (vegFilter === "NONVEG")
      rows = rows.filter((item) => item.isVeg === false);

    const query = menuSearch.trim().toLowerCase();
    if (query) {
      rows = rows.filter((item) =>
        `${item.name || ""} ${item.category || ""} ${item.description || ""}`
          .toLowerCase()
          .includes(query),
      );
    }

    if (sortMode === "name") {
      rows = [...rows].sort((a, b) =>
        String(a.name).localeCompare(String(b.name)),
      );
    } else if (sortMode === "price") {
      rows = [...rows].sort(
        (a, b) => Number(a.price || 0) - Number(b.price || 0),
      );
    }

    return rows;
  }, [allCatalogItems, activeCategoryFilter, vegFilter, menuSearch, sortMode]);

  const comboCalculatedPrice = useMemo(() => {
    return menuItems.items
      .filter((item) => selectedItems.includes(item._id))
      .reduce((sum, item) => sum + (Number(item.price) || 0), 0);
  }, [menuItems.items, selectedItems]);

  // Helper to build FormData payload
  const createFormData = () => {
    const formData = new FormData();
    formData.append("name", name);
    formData.append("description", description);
    formData.append(
      "price",
      formMode === "COMBO" ? comboCalculatedPrice : price,
    );
    formData.append("isVeg", isVeg ? "true" : "false"); // 🆕
    formData.append("isAvailable", itemAvailable ? "true" : "false");

    if (formMode === "DISH") {
      formData.append("category", category);
    }

    if (formMode === "COMBO") {
      selectedItems.forEach((itemId) => formData.append("items[]", itemId));
    }

    if (imageFile) {
      formData.append("image", imageFile);
    }
    return formData;
  };

  const upsertMutation = useMutation({
    mutationFn: async (formData) => {
      const config = {
        withCredentials: true,
        headers: { "Content-Type": "multipart/form-data" },
      };

      if (editingItem) {
        return await axios.patch(
          `${import.meta.env.VITE_APP_API_BASE}/menu/admin/items/${editingItem._id}`,
          formData,
          config,
        );
      }

      return await axios.post(
        `${import.meta.env.VITE_APP_API_BASE}/menu/admin/items`,
        formData,
        config,
      );
    },

    onSuccess: () => {
      queryClient.invalidateQueries(["menu-items"]);

      showSuccess(
        editingItem ? "Dish Updated Successfully" : "Dish Added Successfully",
      );

      closeAndResetModal();
    },

    onError: (err) => {
      alert(
        err.response?.data?.message || "Unable to save dish. Please try again.",
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (itemId) =>
      await axios.delete(
        `${import.meta.env.VITE_APP_API_BASE}/menu/admin/items/${itemId}`,
        { withCredentials: true },
      ),

    onSuccess: () => {
      queryClient.invalidateQueries(["menu-items"]);

      setShowDeleteModal(false);
      setItemToDelete(null);

      showSuccess("Dish Deleted Successfully");
    },

    onError: (err) => {
      alert(
        err.response?.data?.message ||
          "Unable to delete dish. Please try again.",
      );
    },
  });

  const deleteComboMutation = useMutation({
    mutationFn: async (comboId) =>
      await axios.delete(
        `${import.meta.env.VITE_APP_API_BASE}/menu/admin/combos/${comboId}`,
        { withCredentials: true },
      ),

    onSuccess: () => {
      queryClient.invalidateQueries(["menu-items"]);

      setShowDeleteModal(false);
      setItemToDelete(null);

      showSuccess("Combo Deleted Successfully");
    },

    onError: (err) => {
      alert(
        err.response?.data?.message ||
          "Unable to delete combo. Please try again.",
      );
    },
  });

  const comboMutation = useMutation({
    mutationFn: async (formData) =>
      await axios.post(
        `${import.meta.env.VITE_APP_API_BASE}/menu/admin/combos`,
        formData,
        {
          withCredentials: true,
          headers: { "Content-Type": "multipart/form-data" },
        },
      ),

    onSuccess: () => {
      queryClient.invalidateQueries(["menu-items"]);

      showSuccess("Combo Added Successfully");

      closeAndResetModal();
    },

    onError: (err) => {
      alert(
        err.response?.data?.message ||
          "Unable to create combo. Please try again.",
      );
    },
  });

  const updateComboMutation = useMutation({
    mutationFn: async ({ id, formData }) =>
      await axios.patch(
        `${import.meta.env.VITE_APP_API_BASE}/menu/admin/combos/${id}`,
        formData,
        {
          withCredentials: true,
          headers: { "Content-Type": "multipart/form-data" },
        },
      ),

    onSuccess: () => {
      queryClient.invalidateQueries(["menu-items"]);

      showSuccess("Combo Updated Successfully");

      closeAndResetModal();
    },

    onError: (err) => {
      alert(
        err.response?.data?.message ||
          "Unable to update combo. Please try again.",
      );
    },
  });

  const handleOpenAddModal = useCallback(() => {
    setEditingItem(null);
    setIsVeg(true); // 🆕 default veg for a fresh item
    setItemAvailable(true);
    setIsModalOpen(true);
  }, []);

  const handleOpenEditModal = useCallback((item) => {
    setEditingItem(item);
    setName(item.name);
    setDescription(item.description || "");
    setPrice(item.price);
    setCategory(item.category || "");
    setImagePreview(item.image || "");
    setImageFile(null);
    setIsVeg(item.isVeg !== false); // 🆕 populate existing veg/non-veg value
    setItemAvailable(item.isAvailable !== false);

    if (item.isCombo) {
      setFormMode("COMBO");
      setSelectedItems(item.items || []);
    } else {
      setFormMode("DISH");
      setSelectedItems([]);
    }
    setIsModalOpen(true);
  }, []);

  const closeAndResetModal = useCallback(() => {
    setIsModalOpen(false);
    setEditingItem(null);
    setName("");
    setDescription("");
    setPrice("");
    setCategory("");
    setImageFile(null);
    setImagePreview("");
    setSelectedItems([]);
    setFormMode("DISH");
    setIsVeg(true); // 🆕
    setItemAvailable(true);
  }, []);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = useCallback(
    (e) => {
      e.preventDefault();
      const formData = createFormData();

      if (editingItem) {
        if (formMode === "COMBO") {
          updateComboMutation.mutate({ id: editingItem._id, formData });
        } else {
          upsertMutation.mutate(formData);
        }
      } else {
        if (formMode === "DISH") {
          upsertMutation.mutate(formData);
        } else {
          comboMutation.mutate(formData);
        }
      }
    },
    [
      formMode,
      editingItem,
      createFormData,
      updateComboMutation,
      upsertMutation,
      comboMutation,
    ],
  );

  const handleDeleteClick = useCallback((item) => {
    setItemToDelete(item);
    setShowDeleteModal(true);
  }, []);

  const toggleSelectedItem = useCallback((itemId, checked) => {
    setSelectedItems((prev) =>
      checked ? [...prev, itemId] : prev.filter((id) => id !== itemId),
    );
  }, []);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <div className="w-8 h-8 border-4 border-red-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-bold text-slate-400 tracking-wider uppercase">
          Syncing Digital Menu Matrix...
        </p>
      </div>
    );
  }

  return (
    <>
      {showDeleteModal && itemToDelete && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl p-6 animate-in zoom-in-95 fade-in duration-200">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mb-4">
              <Trash2 size={22} strokeWidth={2.5} />
            </div>

            <h3 className="text-lg font-black text-slate-900">
              Delete {itemToDelete.isCombo ? "Combo" : "Dish"}?
            </h3>

            <p className="text-sm text-slate-500 mt-2 leading-relaxed">
              Are you sure you want to delete{" "}
              <span className="font-bold text-slate-700">
                "{itemToDelete.name}"
              </span>
              ?
            </p>

            <p className="text-xs text-rose-600 bg-rose-50 border border-rose-100 rounded-xl p-3 mt-3">
              This action cannot be undone.
            </p>

            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteModal(false);
                  setItemToDelete(null);
                }}
                className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-700 text-sm font-bold hover:bg-slate-50 transition-all"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={
                  deleteMutation.isPending || deleteComboMutation.isPending
                }
                onClick={() => {
                  if (itemToDelete.isCombo) {
                    deleteComboMutation.mutate(itemToDelete._id);
                  } else {
                    deleteMutation.mutate(itemToDelete._id);
                  }
                }}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-rose-500 to-red-600 text-white text-sm font-bold hover:opacity-95 transition-all disabled:opacity-50"
              >
                {deleteMutation.isPending || deleteComboMutation.isPending
                  ? "Deleting..."
                  : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showSuccessPopup && (
        <div className="fixed top-6 right-6 z-[10001] animate-in slide-in-from-right-5 fade-in duration-300">
          <div className="flex items-start gap-3 bg-white border border-emerald-200 shadow-2xl rounded-2xl px-5 py-4 w-[calc(100%-2rem)] max-w-sm">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <path d="M20 6 9 17l-5-5" />
              </svg>
            </div>

            <div className="flex-1">
              <p className="text-sm font-black text-slate-900">Success</p>

              <p className="text-xs text-slate-500 mt-1">{successMessage}</p>
            </div>

            <button
              type="button"
              onClick={() => setShowSuccessPopup(false)}
              className="text-slate-400 hover:text-slate-700 text-lg"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {showErrorPopup && (
        <div className="fixed top-6 right-6 z-[10002] animate-in slide-in-from-right-5 fade-in duration-300">
          <div className="flex items-start gap-3 bg-white border border-rose-200 shadow-2xl rounded-2xl px-5 py-4 w-[calc(100%-2rem)] max-w-sm">
            <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
              <span className="text-lg font-black">!</span>
            </div>

            <div className="flex-1">
              <p className="text-sm font-black text-slate-900">Error</p>

              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                {errorMessage}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowErrorPopup(false)}
              className="text-slate-400 hover:text-slate-700 text-lg"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {!isApproved && (
        <div className="bg-amber-50 border border-amber-200 text-amber-700 text-xs font-bold px-5 py-3.5 rounded-2xl">
          ⚠️ Your restaurant is currently under review. You will be able to add
          and edit your menu items as soon as your profile is verified and
          approved.
        </div>
      )}

      {/* <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl p-4">
        <div className="text-amber-600 text-lg">⚠️</div>

        <div>
          <p className="text-xs font-black text-amber-800">
            Important: AI can be used only once every 30 days
          </p>

          <p className="text-[11px] text-amber-700 mt-1 leading-relaxed">
            Please upload a clear and complete menu image. Once the AI menu
            upload is completed, you will not be able to use AI menu upload
            again for 30 days.
          </p>
        </div>
      </div> */}
      <div className="-m-4 bg-[var(--background)] p-4 font-sans md:-m-6 md:p-5 lg:-m-8 lg:p-5">
        <div className="grid items-stretch gap-3 xl:grid-cols-[minmax(0,1fr)_280px]">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[var(--primary)] via-[var(--primary)] to-[var(--secondary)] p-5 text-white">
            <div className="relative z-10 flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20">
                  <UtensilsCrossed className="h-6 w-6" />
                </div>
                <div>
                  <h1 className="text-2xl font-black tracking-tight">
                    Menu Catalog
                  </h1>
                  <p className="mt-1 max-w-md text-sm text-white/85">
                    Manage your restaurant menu, add delicious items, combos and
                    keep your menu updated.
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-2xl bg-white/15 px-4 py-3">
                  <p className="text-[10px] font-bold uppercase text-white/80">
                    Total Items
                  </p>
                  <p className="text-2xl font-black">
                    {menuItems.items.length}
                  </p>
                </div>
                <div className="rounded-2xl bg-white/15 px-4 py-3">
                  <p className="text-[10px] font-bold uppercase text-white/80">
                    Total Combos
                  </p>
                  <p className="text-2xl font-black">
                    {menuItems.combos.length}
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div className="rounded-3xl border border-rose-100 bg-gradient-to-b from-rose-50 to-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-black text-slate-900">
                  AI Menu Import
                </p>
                <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
                  Add menu items using AI from menu images. Upload every page
                  together.
                </p>
              </div>
              <span className="rounded-full bg-rose-500 px-2 py-0.5 text-[9px] font-black text-white">
                POPULAR
              </span>
            </div>
            {isAiLocked && aiNextAvailableDate && (
              <p className="mt-2 text-[11px] font-bold text-amber-700">
                Next upload{" "}
                {aiNextAvailableDate.toLocaleDateString("en-IN", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}
              </p>
            )}
            <button
              type="button"
              onClick={() => {
                if (isStarterPlan) {
                  setShowUpgradePopup(true);
                  return;
                }

                if (isAiLocked) {
                  showError(
                    "AI menu upload can be used only once every 30 days. Please wait until your next available date.",
                  );
                  return;
                }

                setIsAiModalOpen(true);
              }}
              disabled={!isApproved || isAiLocked }
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-rose-500 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Upload size={16} />
              {isAiLocked ? "AI Upload Used" : "Upload Menu Images"}
            </button>
          </div>
        </div>
        <div className="mt-4 flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {categoriesList.map((cat) => {
            const count =
              cat === "ALL"
                ? allCatalogItems.length
                : cat === "COMBO"
                  ? allCatalogItems.filter((item) => item.isCombo).length
                  : allCatalogItems.filter((item) => item.category === cat)
                      .length;
            const active = activeCategoryFilter === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveCategoryFilter(cat)}
                className={`whitespace-nowrap rounded-2xl border px-3 py-2 text-xs font-black ${active ? "border-rose-500 bg-rose-500 text-white" : "border-slate-100 bg-white text-slate-600"}`}
              >
                {cat === "ALL" ? "All Items" : cat === "COMBO" ? "Combos" : cat}{" "}
                {count}
              </button>
            );
          })}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <div className="relative min-w-[200px] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={menuSearch}
              onChange={(event) => setMenuSearch(event.target.value)}
              placeholder="Search menu items..."
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-rose-300"
            />
          </div>
          <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold text-slate-600">
            Sort:
            <select
              value={sortMode}
              onChange={(event) => setSortMode(event.target.value)}
              className="bg-transparent outline-none"
            >
              <option value="default">Default</option>
              <option value="name">Name</option>
              <option value="price">Price</option>
            </select>
          </label>
          {[
            ["ALL", "All"],
            ["VEG", "Veg"],
            ["NONVEG", "Non-Veg"],
          ].map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setVegFilter(key)}
              className={`rounded-xl border px-3 py-2.5 text-xs font-black ${vegFilter === key ? "border-rose-500 bg-rose-500 text-white" : "border-slate-200 bg-white text-slate-600"}`}
            >
              {label}
            </button>
          ))}
          {/* <Link to="/counter" className="rounded-xl border border-rose-200 bg-white px-3 py-2.5 text-xs font-black text-rose-500">Arrange Menu</Link> */}
          <button
            type="button"
            onClick={handleOpenAddModal}
            disabled={!isApproved}
            className="inline-flex items-center gap-1 rounded-xl bg-rose-500 px-3 py-2.5 text-xs font-black text-white disabled:opacity-50"
          >
            <Plus size={14} /> Add Item
          </button>
        </div>
        <div
          className={`mt-4 grid items-start gap-4 ${isModalOpen ? "xl:grid-cols-[minmax(0,1fr)_340px]" : ""}`}
        >
          {filteredMenuItems.length === 0 ? (
            <div className="rounded-3xl border border-slate-100 bg-white px-6 py-16 text-center">
              <ChefHat className="mx-auto mb-2 h-8 w-8 text-slate-300" />
              <p className="text-sm font-bold text-slate-800">
                No menu items found
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
              {filteredMenuItems.map((item) => {
                const image = resolveMediaUrl(item.image);
                return (
                  <div
                    key={item._id}
                    className="rounded-2xl border border-slate-100 bg-white p-2.5 shadow-sm"
                  >
                    <div className="relative mb-2 h-28 overflow-hidden rounded-xl bg-slate-100">
                      {image ? (
                        <img
                          src={image}
                          alt={item.name}
                          className="h-full w-full object-cover"
                          loading="lazy"
                          decoding="async"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-slate-300">
                          <ImageIcon size={22} />
                        </div>
                      )}
                      {item.isCombo && (
                        <span className="absolute left-2 top-2 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-black text-white">
                          Combo
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 px-0.5">
                      <span
                        className={`h-2 w-2 rounded-full ${item.isVeg === false ? "bg-red-500" : "bg-emerald-500"}`}
                      />
                      <h3 className="truncate text-sm font-bold text-slate-900">
                        {item.name}
                      </h3>
                    </div>
                    <div className="mt-1 flex items-center justify-between px-0.5">
                      <p className="text-sm font-black text-slate-800">
                        ₹{Number(item.price || 0).toLocaleString("en-IN")}
                      </p>
                      <span
                        className={`text-[10px] font-bold ${item.isAvailable === false ? "text-slate-400" : "text-emerald-600"}`}
                      >
                        {item.isAvailable === false ? "Hidden" : "Available"}
                      </span>
                    </div>
                    <div className="mt-2 flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleOpenEditModal(item)}
                        className="inline-flex flex-1 items-center justify-center gap-1 rounded-xl border border-slate-200 py-1.5 text-[11px] font-bold text-slate-600"
                      >
                        <Edit2 size={12} /> Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteClick(item)}
                        className="inline-flex flex-1 items-center justify-center gap-1 rounded-xl border border-rose-100 py-1.5 text-[11px] font-bold text-rose-500"
                      >
                        <Trash2 size={12} /> Delete
                      </button>
                    </div>
                    <p className="mt-1 truncate px-0.5 text-[10px] font-semibold text-slate-400">
                      {item.category}
                    </p>
                  </div>
                );
              })}
            </div>
          )}

          {isModalOpen && (
            <aside className="sticky top-4 max-h-[calc(100vh-6rem)] overflow-y-auto rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-base font-black text-slate-900">
                  Item Details
                </h3>
                <button
                  type="button"
                  onClick={closeAndResetModal}
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
                  aria-label="Close item details"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="flex bg-slate-100 p-1.5 rounded-2xl mb-6">
                <button
                  type="button"
                  onClick={() => setFormMode("DISH")}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${formMode === "DISH" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-900"}`}
                >
                  Add Dish
                </button>
                <button
                  type="button"
                  onClick={() => setFormMode("COMBO")}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${formMode === "COMBO" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-900"}`}
                >
                  Add Combo
                </button>
              </div>

              {formMode === "COMBO" && (
                <div className="space-y-3 mb-6">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Select Items for Combo
                  </label>
                  <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-2xl p-2 bg-slate-50 space-y-1">
                    {menuItems.items.map((item) => (
                      <label
                        key={item._id}
                        className="flex items-center gap-3 p-2.5 hover:bg-white rounded-xl cursor-pointer text-sm transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={selectedItems.includes(item._id)}
                          onChange={(e) =>
                            toggleSelectedItem(item._id, e.target.checked)
                          }
                          className="rounded text-red-500 focus:ring-red-500/20"
                        />
                        <span className="flex-1 font-bold text-slate-800 text-xs">
                          {item.name}
                        </span>
                        <span className="text-xs font-black text-slate-500">
                          ₹{item.price}
                        </span>
                      </label>
                    ))}
                  </div>

                  <div className="flex justify-between items-center px-5 py-3.5 bg-red-50 rounded-2xl border border-red-100">
                    <span className="text-[11px] font-black uppercase tracking-wider text-red-600">
                      Combo Total Price
                    </span>
                    <span className="text-base font-black text-red-700">
                      ₹{comboCalculatedPrice}
                    </span>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                  label="Title"
                  required
                  placeholder={
                    formMode === "DISH"
                      ? "e.g., Spicy Paneer Tikka"
                      : "e.g., Weekend Special Combo"
                  }
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />

                {/* 🆕 Veg / Non-Veg toggle */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Food Type
                  </label>
                  <div className="flex bg-slate-100 p-1.5 rounded-2xl">
                    <button
                      type="button"
                      onClick={() => setIsVeg(true)}
                      className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        isVeg
                          ? "bg-white text-emerald-700 shadow-xs"
                          : "text-slate-500 hover:text-slate-900"
                      }`}
                    >
                      <Leaf size={13} /> Veg
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsVeg(false)}
                      className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        !isVeg
                          ? "bg-white text-red-700 shadow-xs"
                          : "text-slate-500 hover:text-slate-900"
                      }`}
                    >
                      <Beef size={13} /> Non-Veg
                    </button>
                  </div>
                </div>

                {formMode === "DISH" && (
                  <Input
                    label="Category Classification"
                    required
                    placeholder="e.g., Starters, Main Course"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  />
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label={
                      formMode === "COMBO"
                        ? "Calculated Price (INR)"
                        : "Selling Price (INR)"
                    }
                    type="number"
                    required
                    readOnly={formMode === "COMBO"}
                    placeholder="250"
                    value={formMode === "COMBO" ? comboCalculatedPrice : price}
                    onChange={(e) => setPrice(e.target.value)}
                  />

                  {/* 🔑 File Input Field */}
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Upload Dish Image
                    </label>
                    <label className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-2xl border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer transition-all shadow-xs">
                      <Upload size={15} />
                      <span className="truncate">
                        {imageFile ? imageFile.name : "Choose File..."}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                {/* Image Preview */}
                {imagePreview && (
                  <div className="relative w-20 h-20 rounded-2xl overflow-hidden border border-slate-200">
                    <img
                      src={
                        imagePreview.startsWith("http") ||
                        imagePreview.startsWith("blob:")
                          ? imagePreview
                          : resolveMediaUrl(imagePreview)
                      }
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Description
                  </label>
                  <textarea
                    rows="3"
                    placeholder="Culinary description..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-white text-sm text-slate-900 focus:border-red-500 focus:ring-4 focus:ring-red-500/10 transition-all resize-none shadow-xs"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => setItemAvailable((current) => !current)}
                  className="flex w-full items-center justify-between rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700"
                >
                  Item Available
                  <span
                    className={`relative h-6 w-11 rounded-full ${itemAvailable ? "bg-emerald-500" : "bg-slate-300"}`}
                  >
                    <span
                      className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${itemAvailable ? "left-5" : "left-0.5"}`}
                    />
                  </span>
                </button>

                <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={closeAndResetModal}
                    disabled={
                      upsertMutation.isPending ||
                      comboMutation.isPending ||
                      updateComboMutation.isPending
                    }
                    className="px-5 py-3 rounded-2xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={
                      upsertMutation.isPending ||
                      comboMutation.isPending ||
                      updateComboMutation.isPending
                    }
                    className="min-w-[130px] flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-red-500 text-white font-bold text-xs hover:bg-red-600 transition cursor-pointer shadow-sm shadow-red-500/20 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {upsertMutation.isPending ||
                    comboMutation.isPending ||
                    updateComboMutation.isPending ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />

                        {editingItem
                          ? "Updating..."
                          : formMode === "COMBO"
                            ? "Adding Combo..."
                            : "Adding Dish..."}
                      </>
                    ) : (
                      <>
                        {editingItem
                          ? "Save Changes"
                          : `Add ${formMode === "COMBO" ? "Combo" : "Dish"}`}
                      </>
                    )}
                  </button>
                </div>
              </form>
            </aside>
          )}
        </div>

        {/* AI Menu Upload Modal */}
        <Modal
          isOpen={isAiModalOpen}
          onClose={() => {
            if (aiExtractMutation.isPending) return;
            setIsAiModalOpen(false);
            clearAiImages();
          }}
          title="Auto-Fill Menu via AI Vision"
          panelClassName="max-w-2xl"
        >
          <div className="space-y-6">
            <p className="text-xs text-slate-500 leading-relaxed">
              Upload every page of the printed menu together. AI reads all of
              the pages in this one monthly upload and adds every detected item
              to your catalog. A single image is not accepted.
            </p>

            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Upload Menu Pages ({MIN_AI_MENU_IMAGES}–{MAX_AI_MENU_IMAGES})
              </label>
              <label className="flex flex-col items-center justify-center gap-2 w-full p-6 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 hover:bg-slate-100/50 cursor-pointer transition-all">
                <Upload size={24} className="text-purple-500" />
                <span className="text-xs font-bold text-slate-700">
                  {aiImageFiles.length > 0
                    ? `${aiImageFiles.length} menu page${aiImageFiles.length === 1 ? "" : "s"} selected`
                    : "Click to browse menu page images"}
                </span>
                <span className="text-[10px] text-slate-400">
                  JPG, PNG, or WEBP. Select at least {MIN_AI_MENU_IMAGES}{" "}
                  different pages.
                </span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  disabled={aiExtractMutation.isPending}
                  onChange={(e) => {
                    const incoming = Array.from(e.target.files || []);
                    e.target.value = "";

                    if (incoming.length === 0) {
                      return;
                    }

                    if (
                      aiImageFiles.length === 0 &&
                      incoming.length < MIN_AI_MENU_IMAGES
                    ) {
                      showError(MULTIPLE_IMAGES_MESSAGE);
                      return;
                    }

                    const accepted = [];

                    for (const file of incoming) {
                      const extension = file.name
                        .slice(file.name.lastIndexOf("."))
                        .toLowerCase();
                      const allowed =
                        ["image/jpeg", "image/png", "image/webp"].includes(
                          file.type,
                        ) &&
                        [".jpg", ".jpeg", ".png", ".webp"].includes(extension);

                      if (!allowed) {
                        showError(
                          "Unsupported image format. Please upload JPG, PNG, or WEBP.",
                        );
                        return;
                      }

                      if (file.size > MAX_AI_IMAGE_BYTES) {
                        showError("Each menu image must be 5 MB or smaller.");
                        return;
                      }

                      accepted.push(file);
                    }

                    const merged = [
                      ...aiImageFiles.map((item) => item.file),
                      ...accepted,
                    ];

                    if (merged.length > MAX_AI_MENU_IMAGES) {
                      showError(
                        `You can upload up to ${MAX_AI_MENU_IMAGES} menu page images in one go.`,
                      );
                      return;
                    }

                    const totalBytes = merged.reduce(
                      (sum, file) => sum + file.size,
                      0,
                    );

                    if (totalBytes > MAX_AI_TOTAL_BYTES) {
                      showError(
                        "These menu images are too large together. Keep the total under 25 MB.",
                      );
                      return;
                    }

                    setAiImageFiles((current) => [
                      ...current,
                      ...accepted.map((file) => ({
                        id: `${file.name}-${file.size}-${file.lastModified}-${crypto.randomUUID()}`,
                        file,
                        preview: URL.createObjectURL(file),
                      })),
                    ]);
                  }}
                  className="hidden"
                />
              </label>
            </div>

            {aiImageFiles.length === 1 && (
              <p className="text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-100 rounded-xl p-3">
                {MULTIPLE_IMAGES_MESSAGE}
              </p>
            )}

            {aiImageFiles.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {aiImageFiles.map((item) => (
                  <div
                    key={item.id}
                    className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-50"
                  >
                    <img
                      src={item.preview}
                      alt={item.file.name}
                      className="w-full h-28 object-cover"
                    />
                    <div className="flex items-center justify-between gap-2 px-2 py-1.5">
                      <p className="text-[10px] font-semibold text-slate-600 truncate">
                        {item.file.name}
                      </p>
                      <button
                        type="button"
                        disabled={aiExtractMutation.isPending}
                        onClick={() => {
                          const next = aiImageFiles.filter(
                            (entry) => entry.id !== item.id,
                          );
                          URL.revokeObjectURL(item.preview);
                          setAiImageFiles(next);
                          if (next.length === 1) {
                            showError(MULTIPLE_IMAGES_MESSAGE);
                          }
                        }}
                        className="text-slate-400 hover:text-rose-600 text-sm leading-none disabled:opacity-40"
                        aria-label={`Remove ${item.file.name}`}
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  if (aiExtractMutation.isPending) return;
                  setIsAiModalOpen(false);
                  clearAiImages();
                }}
                className="px-5 py-3 rounded-2xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={
                  aiImageFiles.length < MIN_AI_MENU_IMAGES ||
                  aiExtractMutation.isPending ||
                  isAiLocked
                }
                onClick={() => {
                  if (isAiLocked) {
                    showError(
                      "AI menu upload can be used only once every 30 days.",
                    );
                    return;
                  }

                  if (aiImageFiles.length < MIN_AI_MENU_IMAGES) {
                    showError(MULTIPLE_IMAGES_MESSAGE);
                    return;
                  }

                  const formData = new FormData();
                  aiImageFiles.forEach((item) =>
                    formData.append("images", item.file),
                  );
                  aiExtractMutation.mutate(formData);
                }}
                className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-purple-600 text-white font-bold text-xs hover:bg-purple-700 transition cursor-pointer shadow-sm shadow-purple-500/20 disabled:opacity-50"
              >
                {aiExtractMutation.isPending ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Analyzing Menu...
                  </>
                ) : (
                  <>
                    <Sparkles size={14} /> Extract & Save Items
                  </>
                )}
              </button>
            </div>
          </div>
        </Modal>
        {showUpgradePopup && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
              <h2 className="text-xl font-black text-gray-900">
                Upgrade Your Plan
              </h2>

              <p className="mt-3 text-sm leading-6 text-gray-600">
                AI Menu is not available in the Starter plan. Please upgrade
                your subscription plan to use this feature.
              </p>

              <button
                type="button"
                onClick={() => setShowUpgradePopup(false)}
                className="mt-6 w-full rounded-xl bg-rose-500 py-3 text-sm font-bold text-white"
              >
                OK
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
