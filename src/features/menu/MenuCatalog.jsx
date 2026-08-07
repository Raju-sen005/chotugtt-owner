import { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import {
  Plus,
  UtensilsCrossed,
  Edit2,
  Trash2,
  IndianRupee,
  Image as ImageIcon,
  Layers,
  Sparkles,
  Upload,
} from "lucide-react";
import Input from "../../components/ui/Input";
import Modal from "../../components/ui/Modal";

export default function MenuCatalog() {
  const queryClient = useQueryClient();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [activeCategoryFilter, setActiveCategoryFilter] = useState("ALL");
  const [formMode, setFormMode] = useState("DISH");
  const [selectedItems, setSelectedItems] = useState([]);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [aiImageFile, setAiImageFile] = useState(null);
  const [aiImagePreview, setAiImagePreview] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("");

  // 🔑 File state and image preview state
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");

  const { data: menuItems = { items: [], combos: [] }, isLoading } = useQuery({
    queryKey: ["menu-items"],
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
      };
    },
    staleTime: 60_000,
  });

  const aiExtractMutation = useMutation({
    mutationFn: async (formData) => {
      return await axios.post(
        `${import.meta.env.VITE_APP_API_BASE}/menu/admin/menu/ai-extract`,
        formData,
        {
          withCredentials: true,
          headers: { "Content-Type": "multipart/form-data" },
        },
      );
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries(["menu-items"]);
      setIsAiModalOpen(false);
      setAiImageFile(null);
      setAiImagePreview("");
      alert(res.data.message || "Menu items imported successfully!");
    },
    onError: (err) => {
      alert(
        err.response?.data?.message || "Error processing AI menu extraction.",
      );
    },
  });

  const categoriesList = useMemo(
    () => [
      "ALL",
      "COMBO",
      ...new Set(
        (menuItems.items || [])
          .map((item) => item.category?.toUpperCase())
          .filter(Boolean),
      ),
    ],
    [menuItems.items],
  );

  const allCatalogItems = useMemo(
    () => [
      ...(menuItems.items || []),
      ...(menuItems.combos || []).map((c) => ({
        ...c,
        isCombo: true,
        category: "COMBO",
      })),
    ],
    [menuItems.items, menuItems.combos],
  );

  const filteredMenuItems = useMemo(() => {
    if (activeCategoryFilter === "ALL") return allCatalogItems;
    return allCatalogItems.filter(
      (item) =>
        item.category?.toUpperCase() === activeCategoryFilter ||
        (!item.category && activeCategoryFilter === "COMBO"),
    );
  }, [allCatalogItems, activeCategoryFilter]);

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
      closeAndResetModal();
    },
    onError: (err) => {
      alert(err.response?.data?.message || "Error processing asset request.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (itemId) =>
      await axios.delete(
        `${import.meta.env.VITE_APP_API_BASE}/menu/admin/items/${itemId}`,
        { withCredentials: true },
      ),
    onSuccess: () => queryClient.invalidateQueries(["menu-items"]),
  });

  const deleteComboMutation = useMutation({
    mutationFn: async (comboId) =>
      await axios.delete(
        `${import.meta.env.VITE_APP_API_BASE}/menu/admin/combos/${comboId}`,
        { withCredentials: true },
      ),
    onSuccess: () => queryClient.invalidateQueries(["menu-items"]),
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
      closeAndResetModal();
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
      closeAndResetModal();
    },
  });

  const handleOpenAddModal = useCallback(() => {
    setEditingItem(null);
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

  const handleDeleteClick = useCallback(
    (item) => {
      if (window.confirm("Are you sure you want to discard this item?")) {
        if (item.isCombo) {
          deleteComboMutation.mutate(item._id);
        } else {
          deleteMutation.mutate(item._id);
        }
      }
    },
    [deleteComboMutation, deleteMutation],
  );

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
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-10 space-y-8 font-sans bg-[#F8F9FA] min-h-screen">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-red-50 text-red-600 rounded-2xl border border-red-100">
            <Layers size={28} />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
              Digital Menu Catalog
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Configure categories, single dishes, and active operational items
              pricing.
            </p>
          </div>
        </div>
        <button
          onClick={handleOpenAddModal}
          className="flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-6 py-3.5 rounded-2xl transition-all shadow-xs shrink-0 cursor-pointer"
        >
          <Plus size={16} strokeWidth={3} /> Add New Dish
        </button>

        <button
          onClick={() => setIsAiModalOpen(true)}
          className="flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-xs px-5 py-3.5 rounded-2xl transition-all shadow-xs shrink-0 cursor-pointer"
        >
          <Sparkles size={16} strokeWidth={2.5} /> Upload Menu Image via AI
        </button>
      </div>

      {/* Category Filter Pills */}
      {menuItems.items.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {categoriesList.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategoryFilter(cat)}
              className={`px-5 py-2.5 rounded-2xl text-xs font-bold tracking-wider border whitespace-nowrap transition-all duration-200 cursor-pointer ${
                activeCategoryFilter === cat
                  ? "bg-red-500 text-white border-red-500 shadow-sm shadow-red-500/10"
                  : "bg-white text-slate-600 border-slate-200/80 hover:bg-slate-50"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* Catalog Grid / Empty State */}
      {filteredMenuItems.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-16 text-center shadow-xs flex flex-col items-center justify-center max-w-xl mx-auto space-y-4">
          <div className="p-4 bg-red-50 rounded-2xl text-red-500 border border-red-100">
            <UtensilsCrossed size={32} />
          </div>
          <div className="space-y-1">
            <h3 className="font-black text-slate-900 text-base">
              No Menu Items Listed
            </h3>
            <p className="text-xs text-slate-500 font-medium leading-relaxed">
              {activeCategoryFilter !== "ALL"
                ? `No dishes found matching target selection criteria "${activeCategoryFilter}" filter context.`
                : "Your operational store terminal catalog database appears empty. Click add button to spawn live entities."}
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMenuItems.map((item) => (
            <div
              key={item._id}
              className="relative bg-white rounded-3xl border border-slate-200/80 shadow-xs hover:border-red-200 transition-all duration-300 flex flex-col justify-between overflow-hidden group"
            >
              {item.isCombo && (
                <div className="absolute top-4 right-4 z-10 bg-purple-500 text-white text-[9px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider flex items-center gap-1 shadow-xs">
                  <Sparkles size={10} /> COMBO
                </div>
              )}

              <div className="p-6 flex gap-4 items-start">
                <div className="w-20 h-20 rounded-2xl bg-slate-50 border border-slate-100 shrink-0 overflow-hidden relative flex items-center justify-center text-slate-300">
                  {item.image ? (
                    <img
                      src={
                        item.image
                          ? item.image.startsWith("http")
                            ? item.image
                            : `${import.meta.env.VITE_APP_API_BASE.replace("/api", "")}${item.image}`
                          : null
                      }
                      alt={item.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <ImageIcon size={24} />
                  )}
                </div>

                <div className="space-y-1.5 flex-1 min-w-0 pr-6">
                  <span className="text-[9px] bg-slate-100 text-slate-600 font-black px-2.5 py-0.5 rounded-lg uppercase tracking-wider inline-block">
                    {item.category}
                  </span>
                  <h3 className="font-black text-slate-900 text-base tracking-tight truncate">
                    {item.name}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium line-clamp-2 leading-relaxed">
                    {item.description ||
                      "No direct kitchen culinary preparations logs specified."}
                  </p>
                </div>
              </div>

              <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-100 flex justify-between items-center">
                <span className="text-base font-black text-slate-900 flex items-center tracking-tight">
                  <IndianRupee
                    size={15}
                    strokeWidth={2.5}
                    className="mt-0.5 text-slate-700"
                  />
                  {item.price?.toLocaleString("en-IN")}
                </span>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleOpenEditModal(item)}
                    className="p-2.5 rounded-xl text-slate-400 hover:text-slate-900 hover:bg-white border border-transparent hover:border-slate-200 transition-all cursor-pointer shadow-xs"
                    title="Edit Item Details"
                  >
                    <Edit2 size={14} strokeWidth={2.5} />
                  </button>
                  <button
                    onClick={() => handleDeleteClick(item)}
                    className="p-2.5 rounded-xl text-slate-400 hover:text-red-600 hover:bg-white border border-transparent hover:border-red-100 transition-all cursor-pointer shadow-xs"
                    title="Delete Asset Item"
                  >
                    <Trash2 size={14} strokeWidth={2.5} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Form */}
      <Modal
        isOpen={isModalOpen}
        onClose={closeAndResetModal}
        title={editingItem ? "Modify Catalog Entry" : "Create New Menu Asset"}
      >
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
                    : `${import.meta.env.VITE_APP_API_BASE.replace("/api", "")}${imagePreview}`
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

          <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
            <button
              type="button"
              onClick={closeAndResetModal}
              className="px-5 py-3 rounded-2xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-3 rounded-2xl bg-red-500 text-white font-bold text-xs hover:bg-red-600 transition cursor-pointer shadow-sm shadow-red-500/20"
            >
              Publish {formMode === "COMBO" ? "Combo" : "Dish"} Live
            </button>
          </div>
        </form>
      </Modal>

      {/* AI Menu Upload Modal */}
      <Modal
        isOpen={isAiModalOpen}
        onClose={() => {
          setIsAiModalOpen(false);
          setAiImageFile(null);
          setAiImagePreview("");
        }}
        title="Auto-Fill Menu via AI Vision"
      >
        <div className="space-y-6">
          <p className="text-xs text-slate-500 leading-relaxed">
           Upload a clear photo of the restaurant's physical menu or printed card. AI will automatically detect items, prices, and categories and add them live to your catalog.
          </p>

          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Upload Menu Snapshot
            </label>
            <label className="flex flex-col items-center justify-center gap-2 w-full p-6 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 hover:bg-slate-100/50 cursor-pointer transition-all">
              <Upload size={24} className="text-purple-500" />
              <span className="text-xs font-bold text-slate-700">
                {aiImageFile ? aiImageFile.name : "Click to browse menu image"}
              </span>
              <span className="text-[10px] text-slate-400">
                Supports JPG, PNG, WEBP
              </span>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files[0];
                  if (file) {
                    setAiImageFile(file);
                    setAiImagePreview(URL.createObjectURL(file));
                  }
                }}
                className="hidden"
              />
            </label>
          </div>

          {aiImagePreview && (
            <div className="relative w-full h-40 rounded-2xl overflow-hidden border border-slate-200">
              <img
                src={aiImagePreview}
                alt="Menu Preview"
                className="w-full h-full object-cover"
              />
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsAiModalOpen(false)}
              className="px-5 py-3 rounded-2xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!aiImageFile || aiExtractMutation.isPending}
              onClick={() => {
                const formData = new FormData();
                formData.append("image", aiImageFile);
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
    </div>
  );
}
