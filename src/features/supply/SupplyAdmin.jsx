import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import {
  Package,
  Tags,
  Boxes,
  Truck,
  ClipboardList,
  RefreshCw,
} from "lucide-react";

const API = import.meta.env.VITE_APP_API_BASE;
const dataOf = (r) => r?.data?.data ?? r?.data?.items ?? r?.data ?? [];
const money = (v) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(
    Number(v || 0),
  );
const errorOf = (e) =>
  e?.response?.data?.message || e.message || "Request failed";
const tabs = [
  "Categories",
  "Products",
  "Inventory",
  "Delivery Zones",
  "Orders",
];

export default function SupplyAdmin() {
  const [tab, setTab] = useState("Categories");
  const [cats, setCats] = useState([]);

  const [products, setProducts] = useState([]);
  const [zones, setZones] = useState([]);

  const [orders, setOrders] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [category, setCategory] = useState({
    name: "",
    slug: "",
    description: "",
    sortOrder: 0,
  });
  const [product, setProduct] = useState({
    name: "",
    sku: "",
    categoryId: "",
    description: "",
    unit: "1 unit",
    price: "",
    mrp: "",
    sortOrder: 0,
  });
  const [productImages, setProductImages] = useState([]); // Newly selected files
  const [existingProductImages, setExistingProductImages] = useState([]); // Saved image URLs
  const [productImagePreviews, setProductImagePreviews] = useState([]);
  const [editingProductId, setEditingProductId] = useState(null);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [productCategoryFilter, setProductCategoryFilter] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [productStatusFilter, setProductStatusFilter] = useState("all");
  const [orderStatusFilter, setOrderStatusFilter] = useState("all");
  const [orderSearch, setOrderSearch] = useState("");

  const filteredProducts = products.filter((p) => {
    const categoryId = String(p.categoryId?._id || p.categoryId || "");

    const matchesCategory =
      !productCategoryFilter || categoryId === productCategoryFilter;

    const searchText = productSearch.trim().toLowerCase();

    const matchesSearch =
      !searchText ||
      p.name?.toLowerCase().includes(searchText) ||
      p.sku?.toLowerCase().includes(searchText);

    const matchesStatus =
      productStatusFilter === "all" ||
      (productStatusFilter === "active" && p.isActive !== false) ||
      (productStatusFilter === "inactive" && p.isActive === false);

    return matchesCategory && matchesSearch && matchesStatus;
  });
  const filteredOrders = orders.filter((o) => {
    const matchesStatus =
      orderStatusFilter === "all" || o.status === orderStatusFilter;

    const searchText = orderSearch.trim().toLowerCase();

    const orderNumber = String(o.orderNumber || o._id || "").toLowerCase();
    const restaurantName = String(
      o.restaurant?.name || o.restaurantName || o.restaurantId || "",
    ).toLowerCase();

    const matchesSearch =
      !searchText ||
      orderNumber.includes(searchText) ||
      restaurantName.includes(searchText);

    return matchesStatus && matchesSearch;
  });
  // Create and revoke preview URLs as selected files change to avoid leaking memory.
  useEffect(() => {
    const previews = productImages.map((file) => URL.createObjectURL(file));
    setProductImagePreviews(previews);
    return () => previews.forEach((url) => URL.revokeObjectURL(url));
  }, [productImages]);
  const [stock, setStock] = useState({
    productId: "",
    availableQuantity: 0,
    lowStockThreshold: 5,
  });
  const [inventory, setInventory] = useState([]);
  const [zone, setZone] = useState({
    name: "",
    pincodes: "",
    minimumOrderAmount: 1000,
    deliveryCharge: 500,
    defaultDeliveryDays: 1,
  });
  const [order, setOrder] = useState({
    orderId: "",
    status: "CONFIRMED",
    deliveryCharge: "",
    expectedDeliveryDate: "",
    reason: "",
  });
  const req = useCallback(
    (method, path, body) =>
      axios({
        method,
        url: `${API}${path}`,
        data: body,
        withCredentials: true,
      }),
    [],
  );
  const categoryById = new Map(cats.map((c) => [String(c._id), c.name]));
  const inventoryByProductId = new Map(
    inventory.map((item) => [String(item.productId), item]),
  );
  const load = useCallback(async () => {
    setBusy(true);
    setError("");
    try {
      const [a, b, c, d, e] = await Promise.all([
        req("get", "/admin/supply/categories"),
        req("get", "/admin/supply/products"),
        req("get", "/admin/supply/delivery-zones"),
        req("get", "/admin/supply/orders"),
        req("get", "/admin/supply/inventory"),
      ]);
      setCats(Array.isArray(dataOf(a)) ? dataOf(a) : []);
      setProducts(Array.isArray(dataOf(b)) ? dataOf(b) : []);
      setZones(Array.isArray(dataOf(c)) ? dataOf(c) : []);
      setOrders(Array.isArray(dataOf(d)) ? dataOf(d) : []);
      setInventory(Array.isArray(dataOf(e)) ? dataOf(e) : []);
    } catch (e) {
      setError(errorOf(e));
    } finally {
      setBusy(false);
    }
  }, [req]);
  useEffect(() => {
    load();
  }, [load]);

  const handleProductImageSelect = (e) => {
    const selectedFiles = Array.from(e.target.files || []);

    if (!selectedFiles.length) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    const maxSize = 5 * 1024 * 1024;
    const maxImages = 5;

    const remainingSlots =
      maxImages - existingProductImages.length - productImages.length;

    if (remainingSlots <= 0) {
      setError("Maximum 5 product images allowed.");
      e.target.value = "";
      return;
    }

    const validFiles = [];

    for (const file of selectedFiles) {
      if (!allowedTypes.includes(file.type)) {
        setError("Only JPG, PNG and WEBP images are allowed.");
        continue;
      }

      if (file.size > maxSize) {
        setError(`${file.name} exceeds the 5 MB limit.`);
        continue;
      }

      validFiles.push(file);
    }

    const filesToAdd = validFiles.slice(0, remainingSlots);

    if (validFiles.length > remainingSlots) {
      setError("Maximum 5 product images allowed.");
    } else {
      setError("");
    }

    setProductImages((prev) => [...prev, ...filesToAdd]);

    // Allows selecting the same file again after removing it.
    e.target.value = "";
  };

  const removeProductImage = (index) => {
    setProductImages((prev) => prev.filter((_, i) => i !== index));
  };

  const removeExistingProductImage = (index) => {
    setExistingProductImages((prev) => prev.filter((_, i) => i !== index));
  };

  const resetProductForm = () => {
    setEditingProductId(null);
    setProduct({
      name: "",
      sku: "",
      categoryId: "",
      description: "",
      unit: "1 unit",
      price: "",
      mrp: "",
      sortOrder: 0,
    });
    setExistingProductImages([]);
    setProductImages([]);
    setError("");
  };

  const startEditProduct = (p) => {
    setEditingProductId(p._id);
    setProduct({
      name: p.name || "",
      sku: p.sku || "",
      categoryId: String(p.categoryId?._id || p.categoryId || ""),
      description: p.description || "",
      unit: p.unit || "1 unit",
      price: p.price ?? "",
      mrp: p.mrp ?? "",
      sortOrder: p.sortOrder ?? 0,
    });
    setExistingProductImages(Array.isArray(p.images) ? p.images : []);
    setProductImages([]);
    setError("");
    setNotice("");
    setTab("Products");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  async function save(
    path,
    body,
    method = "post",
    success = "Saved successfully.",
  ) {
    setError("");
    setNotice("");
    try {
      await req(method, path, body);
      setNotice(success);
      await load();
    } catch (e) {
      setError(errorOf(e));
    }
  }

  async function deleteRecord(path, itemName, successMessage) {
    const confirmed = window.confirm(
      `Are you sure you want to ${successMessage.toLowerCase()} "${itemName}"?\n\nThis action cannot be undone from this screen.`,
    );

    if (!confirmed) return;

    setError("");
    setNotice("");

    try {
      await req("delete", path);

      setNotice(`${itemName}: ${successMessage}`);
      await load();
    } catch (e) {
      setError(errorOf(e));
    }
  }
  const field = (label, value, onChange, type = "text", required = false) => (
    <label className="block text-xs font-semibold text-stone-600">
      {label}
      <input
        required={required}
        type={type}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1.5 w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm text-stone-800 outline-none transition placeholder:text-stone-400 focus:border-red-400 focus:ring-4 focus:ring-red-50"
      />
    </label>
  );
  const form = (title, children, onSubmit) => (
    <form
      onSubmit={onSubmit}
      className="space-y-4 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm"
    >
      <h2 className="text-base font-semibold tracking-tight text-stone-900">
        {title}
      </h2>
      {children}
      <button
        disabled={busy || uploadingImages}
        className="w-full rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700 disabled:opacity-50"
      >
        {uploadingImages
          ? "Uploading images..."
          : editingProductId
            ? "Update product"
            : "Save product"}
      </button>
    </form>
  );
  const table = (title, headers, rows) => (
    <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
      <h2 className="border-b border-stone-100 px-5 py-4 text-base font-semibold text-stone-900">
        {title}
      </h2>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-stone-50 text-[11px] font-semibold uppercase tracking-wider text-stone-500">
            <tr>
              {headers.map((h) => (
                <th key={h} className="whitespace-nowrap px-4 py-3">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {rows.length ? (
              rows.map((row, i) => (
                <tr key={i} className="transition hover:bg-stone-50/80">
                  {row.map((v, j) => (
                    <td key={j} className="whitespace-nowrap px-4 py-3">
                      {v ?? "—"}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={headers.length}
                  className="px-4 py-10 text-center text-sm text-stone-400"
                >
                  No records
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 text-stone-800">
      <header className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-stone-200 bg-white px-5 py-5 shadow-sm">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-red-600">
            ChotuGTT · Super Admin
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-stone-900">
            Supply Management
          </h1>
          <p className="text-sm text-stone-500">
            Catalog, stock, delivery zones and restaurant orders.
          </p>
        </div>
        <button
          onClick={load}
          className="inline-flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm font-semibold text-stone-700 shadow-sm transition hover:bg-stone-50"
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </header>
      {error && (
        <p
          role="alert"
          className="rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-700"
        >
          {error}
        </p>
      )}
      {notice && (
        <p className="rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-sm text-emerald-700">
          {notice}
        </p>
      )}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Categories", value: cats.length, icon: Tags },
          { label: "Products", value: products.length, icon: Package },
          { label: "Delivery zones", value: zones.length, icon: Truck },
          { label: "Supply orders", value: orders.length, icon: ClipboardList },
        ].map(({ label, value, icon: Icon }) => (
          <div
            key={label}
            className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm"
          >
            <div className="flex items-center justify-between text-stone-500">
              <span className="text-xs font-medium">{label}</span>
              <span className="rounded-lg bg-red-50 p-2 text-red-600">
                <Icon size={16} />
              </span>
            </div>
            <p className="mt-2 text-2xl font-semibold tracking-tight text-stone-900">
              {value.toLocaleString("en-IN")}
            </p>
          </div>
        ))}
      </div>
      <nav className="flex flex-wrap gap-2 rounded-2xl border border-stone-200 bg-white p-2 shadow-sm">
        {tabs.map((t, i) => {
          const Icon = [Tags, Package, Boxes, Truck, ClipboardList][i];
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold ${tab === t ? "bg-red-600 text-white shadow-sm" : "text-stone-600 hover:bg-stone-100"}`}
            >
              <Icon size={16} />
              {t}
            </button>
          );
        })}
      </nav>
      {busy && <p className="text-sm text-stone-500">Loading Supply data…</p>}
      {tab === "Categories" && (
        <div className="grid gap-4 lg:grid-cols-2">
          {form(
            "Add category",
            <>
              {field(
                "Name",
                category.name,
                (v) => setCategory({ ...category, name: v }),
                "text",
                true,
              )}
              {field(
                "Slug",
                category.slug,
                (v) => setCategory({ ...category, slug: v }),
                "text",
                true,
              )}
              {field("Description", category.description, (v) =>
                setCategory({ ...category, description: v }),
              )}
              {field(
                "Sort order",
                category.sortOrder,
                (v) => setCategory({ ...category, sortOrder: v }),
                "number",
              )}
            </>,
            (e) => {
              e.preventDefault();
              save("/admin/supply/categories", category);
              setCategory({
                name: "",
                slug: "",
                description: "",
                sortOrder: 0,
              });
            },
          )}
          {table(
            "Categories",
            ["Name", "Slug", "Status", "Actions"],
            cats.map((c) => [
              c.name,
              c.slug,
              c.isActive === false ? "Inactive" : "Active",
              <button
                key={`delete-${c._id}`}
                type="button"
                onClick={() =>
                  deleteRecord(
                    `/admin/supply/categories/${c._id}`,
                    c.name,
                    "delete category",
                  )
                }
                className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100"
              >
                Delete
              </button>,
            ]),
          )}
        </div>
      )}
      {tab === "Products" && (
        <div className="grid gap-3 sm:grid-cols-3">
          <input
            type="text"
            placeholder="Search product name or SKU..."
            value={productSearch}
            onChange={(e) => setProductSearch(e.target.value)}
            className="rounded-xl border border-stone-200 px-3 py-2.5 text-sm"
          />

          <select
            value={productCategoryFilter}
            onChange={(e) => setProductCategoryFilter(e.target.value)}
            className="rounded-xl border border-stone-200 px-3 py-2.5 text-sm"
          >
            <option value="">All categories</option>
            {cats.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name}
              </option>
            ))}
          </select>

          <select
            value={productStatusFilter}
            onChange={(e) => setProductStatusFilter(e.target.value)}
            className="rounded-xl border border-stone-200 px-3 py-2.5 text-sm"
          >
            <option value="all">All products</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      )}
      {tab === "Products" && (
        <div className="grid gap-4 lg:grid-cols-2">
          {form(
            editingProductId ? "Edit product" : "Add product",
            <>
              {field(
                "Product name",
                product.name,
                (v) => setProduct({ ...product, name: v }),
                "text",
                true,
              )}
              {field(
                "SKU",
                product.sku,
                (v) => setProduct({ ...product, sku: v }),
                "text",
                true,
              )}
              <label className="block text-xs font-semibold text-stone-600">
                Category
                <select
                  required
                  value={product.categoryId}
                  onChange={(e) =>
                    setProduct({ ...product, categoryId: e.target.value })
                  }
                  className="mt-1.5 w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm text-stone-800 outline-none focus:border-red-400 focus:ring-4 focus:ring-red-50"
                >
                  <option value="">Choose category</option>
                  {cats.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
              {field(
                "Unit / pack",
                product.unit,
                (v) => setProduct({ ...product, unit: v }),
                "text",
                true,
              )}
              {field(
                "Price (₹)",
                product.price,
                (v) => setProduct({ ...product, price: v }),
                "number",
                true,
              )}
              {field(
                "MRP (₹)",
                product.mrp,
                (v) => setProduct({ ...product, mrp: v }),
                "number",
              )}
              {field("Description", product.description, (v) =>
                setProduct({ ...product, description: v }),
              )}
              {field(
                "Sort order",
                product.sortOrder,
                (v) => setProduct({ ...product, sortOrder: v }),
                "number",
              )}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-stone-600">
                  Product images (max 5 total, JPG / PNG / WEBP)
                </label>

                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  onChange={handleProductImageSelect}
                  disabled={
                    existingProductImages.length + productImages.length >= 5 ||
                    uploadingImages
                  }
                  className="block w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm"
                />

                {(existingProductImages.length > 0 ||
                  productImages.length > 0) && (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {existingProductImages.map((imageUrl, index) => (
                      <div
                        key={`saved-${imageUrl}-${index}`}
                        className="relative overflow-hidden rounded-xl border border-stone-200 bg-stone-50"
                      >
                        <img
                          src={imageUrl}
                          alt={`Product image ${index + 1}`}
                          className="h-28 w-full object-cover"
                          loading="lazy"
                        />
                        <button
                          type="button"
                          onClick={() => removeExistingProductImage(index)}
                          disabled={uploadingImages}
                          className="absolute right-2 top-2 rounded-lg bg-red-600 px-2 py-1 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-50"
                        >
                          Remove
                        </button>
                        <p className="truncate px-2 py-1 text-xs text-stone-600">
                          Saved image
                        </p>
                      </div>
                    ))}
                    {productImages.map((file, index) => (
                      <div
                        key={`${file.name}-${index}`}
                        className="relative overflow-hidden rounded-xl border border-stone-200 bg-stone-50"
                      >
                        <img
                          src={productImagePreviews[index]}
                          alt={file.name}
                          className="h-28 w-full object-cover"
                        />

                        <button
                          type="button"
                          onClick={() => removeProductImage(index)}
                          disabled={uploadingImages}
                          className="absolute right-2 top-2 rounded-lg bg-red-600 px-2 py-1 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-50"
                        >
                          Remove
                        </button>

                        <p className="truncate px-2 py-1 text-xs text-stone-600">
                          {file.name}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                <p className="text-xs text-stone-500">
                  {existingProductImages.length + productImages.length}/5 images
                  selected
                </p>
              </div>
              {editingProductId && (
                <button
                  type="button"
                  onClick={resetProductForm}
                  disabled={uploadingImages}
                  className="w-full rounded-xl border border-stone-200 px-4 py-2.5 text-sm font-semibold text-stone-700 hover:bg-stone-50 disabled:opacity-50"
                >
                  Cancel edit
                </button>
              )}
            </>,
            async (e) => {
              e.preventDefault();

              setError("");
              setNotice("");

              // Product creation requires an image; edits may keep saved images.
              if (!editingProductId && !productImages.length) {
                setError("Please select at least one product image.");
                return;
              }

              if (existingProductImages.length + productImages.length > 5) {
                setError("Maximum 5 product images allowed.");
                return;
              }

              setUploadingImages(true);

              try {
                let uploadedImageUrls = [];

                // Upload only newly selected files. Saved images are preserved.
                if (productImages.length) {
                  const formData = new FormData();
                  productImages.forEach((file) =>
                    formData.append("images", file),
                  );

                  const uploadResponse = await axios.post(
                    `${API}/admin/supply/products/upload-images`,
                    formData,
                    { withCredentials: true },
                  );

                  uploadedImageUrls = uploadResponse?.data?.data?.images || [];

                  if (uploadedImageUrls.length !== productImages.length) {
                    throw new Error(
                      "Image upload did not return all image URLs.",
                    );
                  }
                }

                const payload = {
                  ...product,
                  price: Number(product.price),
                  mrp: product.mrp === "" ? undefined : Number(product.mrp),
                  sortOrder: Number(product.sortOrder || 0),
                  images: [...existingProductImages, ...uploadedImageUrls],
                };

                if (editingProductId) {
                  await req(
                    "patch",
                    `/admin/supply/products/${editingProductId}`,
                    payload,
                  );
                  setNotice("Product updated successfully.");
                } else {
                  await req("post", "/admin/supply/products", payload);
                  setNotice("Product created successfully.");
                }

                resetProductForm();
                await load();
              } catch (e) {
                setError(errorOf(e));
              } finally {
                setUploadingImages(false);
              }
            },
          )}

          {table(
            `Products (${filteredProducts.length})`,
            ["Product", "SKU", "Category", "Price", "Stock", "Actions"],
            filteredProducts.map((p) => [
              p.name,
              p.sku,
              p.categoryId?.name ||
                categoryById.get(String(p.categoryId?._id || p.categoryId)) ||
                "—",
              money(p.price),
              inventoryByProductId.get(String(p._id))?.availableQuantity ?? 0,
              <div key={`actions-${p._id}`} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => startEditProduct(p)}
                  className="rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() =>
                    deleteRecord(
                      `/admin/supply/products/${p._id}`,
                      p.name,
                      "delete product",
                    )
                  }
                  className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100"
                >
                  Delete
                </button>
              </div>,
            ]),
          )}
        </div>
      )}
      {tab === "Inventory" && (
        <div className="grid gap-4 lg:grid-cols-2">
          {form(
            "Update inventory",
            <>
              <label className="block text-xs font-semibold text-stone-600">
                Product
                <select
                  required
                  value={stock.productId}
                  onChange={(e) =>
                    setStock({ ...stock, productId: e.target.value })
                  }
                  className="mt-1.5 w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm text-stone-800 outline-none focus:border-red-400 focus:ring-4 focus:ring-red-50"
                >
                  <option value="">Choose product</option>
                  {products.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.name} · {p.sku}
                    </option>
                  ))}
                </select>
              </label>
              {field(
                "Available quantity",
                stock.availableQuantity,
                (v) => setStock({ ...stock, availableQuantity: v }),
                "number",
                true,
              )}
              {field(
                "Low-stock threshold",
                stock.lowStockThreshold,
                (v) => setStock({ ...stock, lowStockThreshold: v }),
                "number",
                true,
              )}
            </>,
            (e) => {
              e.preventDefault();
              save(
                `/admin/supply/inventory/${stock.productId}`,
                {
                  availableQuantity: Number(stock.availableQuantity),
                  lowStockThreshold: Number(stock.lowStockThreshold),
                },
                "patch",
                "Inventory updated.",
              );
            },
          )}
          {table(
            "Current stock",
            ["Product", "SKU", "Available"],
            products.map((p) => [
              p.name,
              p.sku,
              inventoryByProductId.get(String(p._id))?.availableQuantity ?? 0,
            ]),
          )}
        </div>
      )}
      {tab === "Delivery Zones" && (
        <div className="grid gap-4 lg:grid-cols-2">
          {form(
            "Add delivery zone",
            <>
              {field(
                "Zone name",
                zone.name,
                (v) => setZone({ ...zone, name: v }),
                "text",
                true,
              )}
              {field(
                "Pincodes (comma separated)",
                zone.pincodes,
                (v) => setZone({ ...zone, pincodes: v }),
                "text",
                true,
              )}
              {field(
                "Minimum order (₹)",
                zone.minimumOrderAmount,
                (v) => setZone({ ...zone, minimumOrderAmount: v }),
                "number",
                true,
              )}
              {field(
                "Delivery charge (₹)",
                zone.deliveryCharge,
                (v) => setZone({ ...zone, deliveryCharge: v }),
                "number",
                true,
              )}
              {field(
                "Default delivery days",
                zone.defaultDeliveryDays,
                (v) => setZone({ ...zone, defaultDeliveryDays: v }),
                "number",
                true,
              )}
            </>,
            (e) => {
              e.preventDefault();
              save("/admin/supply/delivery-zones", {
                ...zone,
                pincodes: zone.pincodes
                  .split(",")
                  .map((p) => p.trim())
                  .filter(Boolean),
                minimumOrderAmount: Number(zone.minimumOrderAmount),
                deliveryCharge: Number(zone.deliveryCharge),
                defaultDeliveryDays: Number(zone.defaultDeliveryDays),
              });
              setZone({
                name: "",
                pincodes: "",
                minimumOrderAmount: 1000,
                deliveryCharge: 500,
                defaultDeliveryDays: 1,
              });
            },
          )}
          {table(
            "Delivery zones",
            ["Zone", "Pincodes", "Minimum", "Fee", "ETA", "Actions"],
            zones.map((z) => [
              z.name,
              (z.pincodes || []).join(", "),
              money(z.minimumOrderAmount),
              money(z.deliveryCharge),
              `${z.defaultDeliveryDays ?? 1} day(s)`,
              <button
                key={`delete-${z._id}`}
                type="button"
                onClick={() =>
                  deleteRecord(
                    `/admin/supply/delivery-zones/${z._id}`,
                    z.name,
                    "delete delivery zone",
                  )
                }
                className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100"
              >
                Delete
              </button>,
            ]),
          )}
        </div>
      )}
      {tab === "Orders" && (
        <div className="grid gap-3 sm:grid-cols-2">
          <input
            type="text"
            placeholder="Search order..."
            value={orderSearch}
            onChange={(e) => setOrderSearch(e.target.value)}
            className="rounded-xl border border-stone-200 px-3 py-2.5 text-sm"
          />

          <select
            value={orderStatusFilter}
            onChange={(e) => setOrderStatusFilter(e.target.value)}
            className="rounded-xl border border-stone-200 px-3 py-2.5 text-sm"
          >
            <option value="all">All statuses</option>
            <option value="PENDING_CONFIRMATION">Pending confirmation</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="PROCESSING">Processing</option>
            <option value="PACKED">Packed</option>
            <option value="OUT_FOR_DELIVERY">Out for delivery</option>
            <option value="DELIVERED">Delivered</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>
      )}
      {tab === "Orders" && (
        <div className="space-y-4">
          {table(
            "Supply orders",
            [
              "Order",
              "Restaurant",
              "Total",
              "Status",
              "Delivery date",
              "Actions",
            ],
            filteredOrders.map((o) => [
              o.orderNumber || o._id,
              o.restaurant?.name || o.restaurantName || o.restaurantId,
              money(o.totalAmount),
              o.status,
              o.expectedDeliveryDate
                ? new Date(o.expectedDeliveryDate).toLocaleDateString("en-IN")
                : "—",
              <button
                key={`archive-${o._id}`}
                type="button"
                onClick={() =>
                  deleteRecord(
                    `/admin/supply/orders/${o._id}`,
                    o.orderNumber || o._id,
                    "archive order",
                  )
                }
                className="rounded-lg bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-100"
              >
                Archive
              </button>,
            ]),
          )}
          {form(
            "Update order / delivery",
            <>
              <label className="block text-xs font-semibold text-stone-600">
                Order
                <select
                  required
                  value={order.orderId}
                  onChange={(e) =>
                    setOrder({ ...order, orderId: e.target.value })
                  }
                  className="mt-1.5 w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm text-stone-800 outline-none focus:border-red-400 focus:ring-4 focus:ring-red-50"
                >
                  <option value="">Choose order</option>
                  {orders.map((o) => (
                    <option key={o._id} value={o._id}>
                      {o.orderNumber || o._id} · {o.status}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-xs font-semibold text-stone-600">
                Status
                <select
                  value={order.status}
                  onChange={(e) =>
                    setOrder({ ...order, status: e.target.value })
                  }
                  className="mt-1.5 w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm text-stone-800 outline-none focus:border-red-400 focus:ring-4 focus:ring-red-50"
                >
                  {[
                    "PENDING_CONFIRMATION",
                    "CONFIRMED",
                    "PROCESSING",
                    "PACKED",
                    "OUT_FOR_DELIVERY",
                    "DELIVERED",
                    "CANCELLED",
                  ].map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </label>
              {field(
                "Delivery charge (₹)",
                order.deliveryCharge,
                (v) => setOrder({ ...order, deliveryCharge: v }),
                "number",
              )}
              {field(
                "Revised delivery date",
                order.expectedDeliveryDate,
                (v) => setOrder({ ...order, expectedDeliveryDate: v }),
                "date",
              )}
              {field("Reason if delivery date changes", order.reason, (v) =>
                setOrder({ ...order, reason: v }),
              )}
            </>,
            (e) => {
              e.preventDefault();
              save(
                `/admin/supply/orders/${order.orderId}`,
                {
                  status: order.status,
                  deliveryCharge:
                    order.deliveryCharge === ""
                      ? undefined
                      : Number(order.deliveryCharge),
                  expectedDeliveryDate: order.expectedDeliveryDate || undefined,
                  reason: order.reason || undefined,
                },
                "patch",
                "Order updated.",
              );
              setOrder({
                orderId: "",
                status: "CONFIRMED",
                deliveryCharge: "",
                expectedDeliveryDate: "",
                reason: "",
              });
            },
          )}
        </div>
      )}
    </div>
  );
}
