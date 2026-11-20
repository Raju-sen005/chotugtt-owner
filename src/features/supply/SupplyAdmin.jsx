import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import * as XLSX from "xlsx";
import {
  Package,
  Tags,
  Boxes,
  Truck,
  ClipboardList,
  RefreshCw,
} from "lucide-react";
import { asDisplayText, displayPhone } from "../../utils/displayText";

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
  const [selectedOrder, setSelectedOrder] = useState(null);
  // Bulk Excel product import state
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [bulkFileName, setBulkFileName] = useState("");
  const [bulkRows, setBulkRows] = useState([]);
  const [bulkPreviewErrors, setBulkPreviewErrors] = useState([]);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkResult, setBulkResult] = useState(null);

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

  const bulkTemplateHeaders = [
    "Product Name",
    "SKU",
    "Category",
    "Unit / Pack",
    "Price",
    "MRP",
    "Description",
    "Sort Order",
  ];

  const downloadBulkTemplate = () => {
    const templateRows = [
      bulkTemplateHeaders,
      [
        "Example Rice 1kg",
        "RICE-001",
        "Grocery",
        "1 kg",
        60,
        70,
        "Example product",
        0,
      ],
    ];
    const worksheet = XLSX.utils.aoa_to_sheet(templateRows);
    worksheet["!cols"] = [
      { wch: 28 },
      { wch: 18 },
      { wch: 22 },
      { wch: 16 },
      { wch: 12 },
      { wch: 12 },
      { wch: 36 },
      { wch: 14 },
    ];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Products");
    XLSX.writeFile(workbook, "supply-products-import-template.xlsx");
  };

  const normalizeImportHeader = (header) =>
    String(header || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, " ");

  const handleBulkExcelSelect = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setError("");
    setNotice("");
    setBulkResult(null);
    setBulkRows([]);
    setBulkPreviewErrors([]);

    const allowedExtensions = [".xlsx", ".xls", ".csv"];
    const extension = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
    if (!allowedExtensions.includes(extension)) {
      setError("Please select an Excel (.xlsx, .xls) or CSV file.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("Maximum import file size is 10 MB.");
      return;
    }

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array", cellDates: false });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      if (!firstSheet) throw new Error("The selected file has no worksheet.");

      const matrix = XLSX.utils.sheet_to_json(firstSheet, {
        header: 1,
        defval: "",
        raw: true,
        blankrows: false,
      });
      if (!matrix.length) throw new Error("The selected file is empty.");

      const headers = matrix[0].map(normalizeImportHeader);
      const headerAliases = {
        name: ["product name", "name"],
        sku: ["sku", "product sku"],
        category: ["category", "category name"],
        unit: ["unit / pack", "unit", "pack"],
        price: ["price", "selling price", "wholesale price"],
        mrp: ["mrp", "maximum retail price"],
        description: ["description", "product description"],
        sortOrder: ["sort order", "sortorder", "display order"],
      };
      const columnIndexes = {};
      Object.entries(headerAliases).forEach(([field, aliases]) => {
        columnIndexes[field] = headers.findIndex((header) =>
          aliases.includes(header),
        );
      });

      const requiredHeaders = ["name", "sku", "category", "unit", "price"];
      const missingHeaders = requiredHeaders.filter(
        (field) => columnIndexes[field] < 0,
      );
      if (missingHeaders.length) {
        throw new Error(
          `Missing required columns: ${missingHeaders.map((field) => headerAliases[field][0]).join(", ")}. Download the template and use its column names.`,
        );
      }

      const parsedRows = matrix
        .slice(1)
        .map((cells, index) => {
          const read = (field) => {
            const column = columnIndexes[field];

            if (column < 0) return "";

            const value = cells[column];

            if (value === null || value === undefined) {
              return "";
            }

            if (["price", "mrp", "sortOrder"].includes(field)) {
              if (typeof value === "number") {
                return value;
              }

              const normalized = String(value)
                .replace(/[₹,\s?]/g, "")
                .trim();

              return normalized === "" ? "" : normalized;
            }

            return String(value).trim();
          };
          return {
            _excelRow: index + 2,
            name: read("name"),
            sku: read("sku").toUpperCase(),
            category: read("category"),
            unit: read("unit"),
            price: read("price"),
            mrp: read("mrp"),
            description: read("description"),
            sortOrder: read("sortOrder") || "0",
          };
        })
        .filter((row) =>
          Object.values(row).some((value) => String(value).trim() !== ""),
        );

      if (!parsedRows.length)
        throw new Error("No product rows found in the worksheet.");
      if (parsedRows.length > 5000) {
        throw new Error("Maximum 5,000 product rows can be imported at once.");
      }

      // Client-side preview checks. The server repeats all validation.
      const seenSKUs = new Map();
      const previewErrors = [];
      parsedRows.forEach((row) => {
        const rowNumber = row._excelRow;
        const sku = row.sku.trim().toUpperCase();
        const rowMessages = [];
        if (!row.name) rowMessages.push("Product name is required.");
        if (!sku) rowMessages.push("SKU is required.");
        if (!row.category) rowMessages.push("Category is required.");
        if (!row.unit) rowMessages.push("Unit / Pack is required.");
        const price = Number(row.price);
        if (row.price === "" || !Number.isFinite(price) || price < 0) {
          rowMessages.push("Price must be a non-negative number.");
        }
        if (row.mrp !== "") {
          const mrp = Number(row.mrp);
          if (!Number.isFinite(mrp) || mrp < price) {
            rowMessages.push(
              "MRP must be a number equal to or greater than price.",
            );
          }
        }
        if (sku && seenSKUs.has(sku)) {
          rowMessages.push(
            `Duplicate SKU in file (also row ${seenSKUs.get(sku)}).`,
          );
        } else if (sku) {
          seenSKUs.set(sku, rowNumber);
        }
        rowMessages.forEach((message) =>
          previewErrors.push({ row: rowNumber, sku, message }),
        );
      });

      setBulkFileName(file.name);
      setBulkRows(
        parsedRows.map((row) => {
          const cleanRow = { ...row };
          delete cleanRow._excelRow;
          return cleanRow;
        }),
      );
      setBulkPreviewErrors(previewErrors);
    } catch (e) {
      setError(e.message || "Could not read the selected Excel file.");
    }
  };

  const submitBulkImport = async () => {
    if (!bulkRows.length) {
      setError("Select an Excel file and review its rows first.");
      return;
    }
    if (bulkPreviewErrors.length) {
      setError(
        "Please fix the preview errors in Excel and upload the corrected file.",
      );
      return;
    }

    const confirmed = window.confirm(
      `Import ${bulkRows.length} product rows from "${bulkFileName}"?\n\nExisting SKUs will not be overwritten. New products will start with zero stock.`,
    );
    if (!confirmed) return;

    setBulkBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await req("post", "/admin/supply/products/bulk-import", {
        rows: bulkRows,
      });
      const result = response?.data?.data || response?.data;
      setBulkResult(result);
      setNotice(result?.message || "Bulk import finished.");
      await load();
    } catch (e) {
      const serverData = e?.response?.data;
      if (serverData?.errors || serverData?.summary) {
        setBulkResult(serverData);
      }
      setError(errorOf(e));
    } finally {
      setBulkBusy(false);
    }
  };

  const downloadBulkErrors = () => {
    const errors = bulkResult?.errors || [];
    if (!errors.length) return;
    const worksheet = XLSX.utils.json_to_sheet(
      errors.map((item) => ({
        "Excel Row": item.row,
        SKU: item.sku || "",
        Error: item.message || "Import failed",
      })),
    );
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Import Errors");
    XLSX.writeFile(workbook, "supply-products-import-errors.xlsx");
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
            Transserve · Super Admin
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
        <section className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-sm font-bold text-stone-900">
                Bulk product import
              </h3>
              <p className="mt-1 text-xs text-stone-500">
                Import up to 5,000 products from Excel or CSV. Existing SKUs are
                never overwritten.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={downloadBulkTemplate}
                className="rounded-xl border border-stone-200 px-3 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50"
              >
                Download template
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowBulkImport((value) => !value);
                  setBulkResult(null);
                  setError("");
                }}
                className="rounded-xl bg-stone-900 px-3 py-2 text-xs font-semibold text-white hover:bg-stone-800"
              >
                {showBulkImport ? "Close import" : "Import Excel"}
              </button>
            </div>
          </div>

          {showBulkImport && (
            <div className="mt-4 space-y-4 border-t border-stone-100 pt-4">
              <label className="block text-xs font-semibold text-stone-700">
                Select Excel / CSV file
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleBulkExcelSelect}
                  disabled={bulkBusy}
                  className="mt-2 block w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm font-normal"
                />
              </label>

              {bulkFileName && (
                <p className="text-xs text-stone-600">
                  Selected:{" "}
                  <span className="font-semibold">{bulkFileName}</span>
                </p>
              )}

              {bulkRows.length > 0 && (
                <>
                  <div className="grid gap-2 sm:grid-cols-3">
                    <div className="rounded-xl bg-stone-50 p-3">
                      <p className="text-xs text-stone-500">Rows read</p>
                      <p className="mt-1 text-lg font-bold text-stone-900">
                        {bulkRows.length}
                      </p>
                    </div>
                    <div className="rounded-xl bg-emerald-50 p-3">
                      <p className="text-xs text-emerald-700">Preview errors</p>
                      <p className="mt-1 text-lg font-bold text-emerald-900">
                        {bulkPreviewErrors.length}
                      </p>
                    </div>
                    <div className="rounded-xl bg-amber-50 p-3">
                      <p className="text-xs text-amber-700">Initial stock</p>
                      <p className="mt-1 text-lg font-bold text-amber-900">
                        0 units
                      </p>
                    </div>
                  </div>

                  {bulkPreviewErrors.length > 0 && (
                    <div className="max-h-48 overflow-auto rounded-xl border border-red-200 bg-red-50 p-3">
                      <p className="mb-2 text-xs font-bold text-red-800">
                        Fix these issues in Excel before importing:
                      </p>
                      <ul className="space-y-1 text-xs text-red-700">
                        {bulkPreviewErrors.slice(0, 100).map((item, index) => (
                          <li key={`${item.row}-${index}`}>
                            Row {item.row} · {item.sku || "No SKU"}:{" "}
                            {item.message}
                          </li>
                        ))}
                      </ul>
                      {bulkPreviewErrors.length > 100 && (
                        <p className="mt-2 text-xs text-red-700">
                          Showing first 100 errors.
                        </p>
                      )}
                    </div>
                  )}

                  <div className="overflow-auto rounded-xl border border-stone-200">
                    <table className="min-w-full text-left text-xs">
                      <thead className="bg-stone-50 text-stone-600">
                        <tr>
                          {[
                            "Product",
                            "SKU",
                            "Category",
                            "Unit",
                            "Price",
                            "MRP",
                          ].map((heading) => (
                            <th
                              key={heading}
                              className="whitespace-nowrap px-3 py-2 font-semibold"
                            >
                              {heading}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {bulkRows.slice(0, 10).map((row, index) => (
                          <tr
                            key={`${row.sku}-${index}`}
                            className="border-t border-stone-100"
                          >
                            <td className="px-3 py-2">{row.name}</td>
                            <td className="px-3 py-2">{row.sku}</td>
                            <td className="px-3 py-2">{row.category}</td>
                            <td className="px-3 py-2">{row.unit}</td>
                            <td className="px-3 py-2">{row.price}</td>
                            <td className="px-3 py-2">
                              {row.mrp || row.price}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {bulkRows.length > 10 && (
                    <p className="text-xs text-stone-500">
                      Showing first 10 rows of {bulkRows.length}.
                    </p>
                  )}

                  <button
                    type="button"
                    onClick={submitBulkImport}
                    disabled={
                      bulkBusy ||
                      bulkPreviewErrors.length > 0 ||
                      !bulkRows.length
                    }
                    className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {bulkBusy
                      ? "Importing products..."
                      : `Import ${bulkRows.length} products`}
                  </button>
                </>
              )}

              {bulkResult?.summary && (
                <div className="rounded-xl border border-stone-200 bg-stone-50 p-3">
                  <p className="text-sm font-bold text-stone-900">
                    Import result
                  </p>
                  <div className="mt-2 flex flex-wrap gap-4 text-xs">
                    <span>
                      Total: <b>{bulkResult.summary.totalRows}</b>
                    </span>
                    <span className="text-emerald-700">
                      Imported: <b>{bulkResult.summary.imported}</b>
                    </span>
                    <span className="text-red-700">
                      Failed: <b>{bulkResult.summary.failed}</b>
                    </span>
                  </div>
                  {!!bulkResult.errors?.length && (
                    <button
                      type="button"
                      onClick={downloadBulkErrors}
                      className="mt-3 rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-100"
                    >
                      Download error report
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </section>
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
              <div className="flex items-center gap-2">
                <button
                  key={`details-${o._id}`}
                  type="button"
                  onClick={() => setSelectedOrder(o)}
                  className="rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                >
                  View Details
                </button>

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
                </button>
              </div>,
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
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-3 backdrop-blur-sm sm:p-6">
          <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4 sm:px-7">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-xl font-bold tracking-tight text-slate-900">
                    Order Details
                  </h2>

                  <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                    {selectedOrder.status || "Pending"}
                  </span>
                </div>

                <p className="mt-1 text-sm text-slate-500">
                  Order ID:{" "}
                  <span className="font-semibold text-slate-700">
                    {selectedOrder.orderNumber || "—"}
                  </span>
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
              >
                Close
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 space-y-7 overflow-y-auto bg-slate-50/70 p-5 sm:p-7">
              {/* Order Summary */}
              <section>
                <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-slate-500">
                  Order Summary
                </h3>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <p className="text-xs font-medium text-slate-500">
                      Order Status
                    </p>
                    <p className="mt-2 text-base font-bold text-slate-900">
                      {selectedOrder.status || "—"}
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <p className="text-xs font-medium text-slate-500">
                      Payment Method
                    </p>
                    <p className="mt-2 text-base font-bold text-slate-900">
                      {selectedOrder.paymentMethod || "COD"}
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <p className="text-xs font-medium text-slate-500">
                      Payment Status
                    </p>
                    <p className="mt-2 text-base font-bold text-slate-900">
                      {selectedOrder.paymentStatus || "PENDING"}
                    </p>
                  </div>
                </div>
              </section>

              {/* Ordered Products */}
              <section>
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">
                    Ordered Products
                  </h3>

                  <span className="rounded-lg bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                    {(selectedOrder.items || []).length} Items
                  </span>
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                  <table className="min-w-[650px] w-full text-sm">
                    <thead className="bg-slate-100/80">
                      <tr className="text-xs uppercase tracking-wide text-slate-500">
                        <th className="px-4 py-3 text-left font-semibold">
                          Product
                        </th>
                        <th className="px-4 py-3 text-left font-semibold">
                          SKU
                        </th>
                        <th className="px-4 py-3 text-right font-semibold">
                          Qty
                        </th>
                         <th className="px-4 py-3 text-right font-semibold">
                          Unit
                        </th>
                        <th className="px-4 py-3 text-right font-semibold">
                          Price
                        </th>
                        <th className="px-4 py-3 text-right font-semibold">
                          Total
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                      {(selectedOrder.items || []).map((item, index) => (
                        <tr
                          key={`${item.productId}-${index}`}
                          className="transition hover:bg-slate-50"
                        >
                          <td className="px-4 py-4 font-semibold text-slate-800">
                            {item.productName}
                          </td>

                          <td className="px-4 py-4 text-slate-500">
                            {item.sku || "—"}
                          </td>

                          <td className="px-4 py-4 text-right text-slate-700">
                            {item.quantity} 
                          </td>

                           <td className="px-4 py-4 text-right text-slate-700">
                            {item.unit || ""}
                          </td>

                          <td className="px-4 py-4 text-right text-slate-700">
                            {money(item.unitPrice)}
                          </td>

                          <td className="px-4 py-4 text-right font-bold text-slate-900">
                            {money(item.lineTotal)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              {/* Payment Summary */}
              <section>
                <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-slate-500">
                  Payment Summary
                </h3>

                <div className="rounded-xl border border-slate-200 bg-white p-5">
                  <div className="space-y-3 text-sm">
                    <div className="flex items-center justify-between text-slate-600">
                      <span>Subtotal</span>
                      <span className="font-medium text-slate-900">
                        {money(selectedOrder.subtotal)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-slate-600">
                      <span>Delivery Charge</span>
                      <span className="font-medium text-slate-900">
                        {money(selectedOrder.deliveryCharge)}
                      </span>
                    </div>

                    <div className="mt-3 flex items-center justify-between border-t border-slate-200 pt-4">
                      <span className="text-base font-bold text-slate-900">
                        Total Amount
                      </span>

                      <span className="text-xl font-extrabold text-emerald-600">
                        {money(selectedOrder.totalAmount)}
                      </span>
                    </div>
                  </div>
                </div>
              </section>

              {/* Delivery Address */}
              <section>
                <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-slate-500">
                  Delivery Address
                </h3>

                <div className="rounded-xl border border-slate-200 bg-white p-5">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <p className="text-xs font-medium text-slate-500">
                        Restaurant Name
                      </p>
                      <p className="mt-1 font-semibold text-slate-900">
                        {selectedOrder.deliveryAddress?.name || "—"}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-medium text-slate-500">
                        Contact Number
                      </p>
                      {displayPhone(
                        selectedOrder.deliveryAddress?.phone,
                        "",
                      ) ? (
                        <a
                          href={`tel:${displayPhone(selectedOrder.deliveryAddress?.phone, "")}`}
                          className="mt-1 inline-block font-semibold text-blue-600 hover:underline"
                        >
                          {displayPhone(
                            selectedOrder.deliveryAddress?.phone,
                            "",
                          )}
                        </a>
                      ) : (
                        <p className="mt-1 font-semibold text-slate-400">
                          Not provided
                        </p>
                      )}
                    </div>

                    <div className="sm:col-span-2">
                      <p className="text-xs font-medium text-slate-500">
                        Address
                      </p>
                      <p className="mt-1 font-medium leading-6 text-slate-800">
                        {asDisplayText(
                          selectedOrder.deliveryAddress?.addressLine,
                          "—",
                        )}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-medium text-slate-500">City</p>
                      <p className="mt-1 font-medium text-slate-800">
                        {selectedOrder.deliveryAddress?.city || "—"}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-medium text-slate-500">
                        State
                      </p>
                      <p className="mt-1 font-medium text-slate-800">
                        {selectedOrder.deliveryAddress?.state || "—"}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-medium text-slate-500">
                        Pincode
                      </p>
                      <p className="mt-1 font-medium text-slate-800">
                        {selectedOrder.deliveryAddress?.pincode || "—"}
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              {/* Additional Details */}
              <section>
                <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-slate-500">
                  Additional Details
                </h3>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <p className="text-xs font-medium text-slate-500">
                      Expected Delivery
                    </p>
                    <p className="mt-2 font-semibold text-slate-800">
                      {selectedOrder.expectedDeliveryDate
                        ? new Date(
                            selectedOrder.expectedDeliveryDate,
                          ).toLocaleString("en-IN")
                        : "—"}
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <p className="text-xs font-medium text-slate-500">
                      Minimum Order Amount
                    </p>
                    <p className="mt-2 font-semibold text-slate-800">
                      {money(selectedOrder.minimumOrderAmount)}
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <p className="text-xs font-medium text-slate-500">
                      Restaurant ID
                    </p>
                    <p className="mt-2 break-all font-medium text-slate-700">
                      {selectedOrder.restaurantId || "—"}
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <p className="text-xs font-medium text-slate-500">Notes</p>
                    <p className="mt-2 font-medium text-slate-700">
                      {selectedOrder.notes || "No notes"}
                    </p>
                  </div>
                </div>
              </section>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end border-t border-slate-200 bg-white px-5 py-4 sm:px-7">
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="rounded-xl bg-slate-900 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
