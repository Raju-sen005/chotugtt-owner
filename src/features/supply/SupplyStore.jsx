import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  ShoppingBasket,
  ShoppingCart,
  Search,
  Plus,
  Minus,
  Truck,
  Package,
  ClipboardList,
  ArrowRight,
  RefreshCw,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Box,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
} from "lucide-react";

const API = import.meta.env.VITE_APP_API_BASE;
const MIN_ORDER = 1000;
const dataOf = (r) => r?.data?.data ?? r?.data?.items ?? r?.data ?? [];
const money = (v) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(v || 0));
const errorOf = (e) =>
  e?.response?.data?.message || e.message || "Request failed";

function StatCard({ icon: Icon, label, value, hint }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {label}
        </span>
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-rose-50 text-rose-600">
          <Icon size={17} />
        </span>
      </div>
      <p className="mt-3 text-xl font-black tracking-tight text-slate-900">
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

function QuantityControl({ quantity, onMinus, onPlus, compact = false }) {
  return (
    <div
      className={`inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 ${compact ? "" : "shadow-sm"}`}
    >
      <button
        type="button"
        aria-label="Decrease quantity"
        onClick={onMinus}
        className="grid h-8 w-8 place-items-center rounded-lg text-slate-600 transition hover:bg-slate-100"
      >
        <Minus size={14} />
      </button>
      <span className="min-w-6 text-center text-sm font-extrabold text-slate-900">
        {quantity}
      </span>
      <button
        type="button"
        aria-label="Increase quantity"
        onClick={onPlus}
        className="grid h-8 w-8 place-items-center rounded-lg bg-rose-500 text-white transition hover:bg-rose-600"
      >
        <Plus size={14} />
      </button>
    </div>
  );
}

function Row({ label, value, bold = false }) {
  return (
    <div
      className={`flex items-center justify-between gap-4 ${bold ? "text-base font-black text-slate-900" : "text-sm text-slate-600"}`}
    >
      <span>{label}</span>
      <span className="text-right tabular-nums">{value}</span>
    </div>
  );
}

function StatusPill({ status }) {
  const key = String(status || "PENDING").toUpperCase();
  const tone = ["DELIVERED", "COMPLETED"].includes(key)
    ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
    : ["CANCELLED", "REJECTED"].includes(key)
      ? "bg-rose-50 text-rose-700 ring-rose-100"
      : ["OUT_FOR_DELIVERY", "PROCESSING", "PACKED"].includes(key)
        ? "bg-blue-50 text-blue-700 ring-blue-100"
        : "bg-amber-50 text-amber-700 ring-amber-100";
  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ring-inset ${tone}`}
    >
      {key.replaceAll("_", " ")}
    </span>
  );
}

export default function SupplyStore() {
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [cart, setCart] = useState({});
  const [category, setCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [pincode, setPincode] = useState("");

  const [addressFields, setAddressFields] = useState({
    restaurantName: "",
    street: "",
    city: "",
    state: "",
  });
  const [restaurantPhone, setRestaurantPhone] = useState("");
  const [delivery, setDelivery] = useState(null);
  const [view, setView] = useState("catalog");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [checkingDelivery, setCheckingDelivery] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [additionalNotes, setAdditionalNotes] = useState("");
  useEffect(() => {
    let cancelled = false;

    async function loadRestaurantProfile() {
      try {
        const response = await axios.get(`${API}/restaurant/profile`, {
          withCredentials: true,
        });

        const profile = response?.data?.data;
        if (!profile || cancelled) return;

        const restaurantAddress = profile.address || {};

        setAddressFields({
          restaurantName: profile.name || "",
          street: restaurantAddress.street || "",
          city: restaurantAddress.city || "",
          state: restaurantAddress.state || "",
        });
        setRestaurantPhone(profile.phone || "");
        setPincode(
          String(restaurantAddress.zip || "")
            .replace(/\D/g, "")
            .slice(0, 6),
        );
      } catch (error) {
        console.error("Failed to load restaurant profile:", error);
      }
    }

    loadRestaurantProfile();

    return () => {
      cancelled = true;
    };
  }, []);

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

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [c, p, o] = await Promise.all([
        req("get", "/supply/categories"),
        req("get", "/supply/products"),
        req("get", "/supply/orders"),
      ]);
      const categoryData = dataOf(c);
      const productData = dataOf(p);
      const orderData = dataOf(o);
      setCategories(Array.isArray(categoryData) ? categoryData : []);
      setProducts(Array.isArray(productData) ? productData : []);
      setOrders(Array.isArray(orderData) ? orderData : []);
    } catch (e) {
      setError(errorOf(e));
    } finally {
      setLoading(false);
    }
  }, [req]);

  useEffect(() => {
    const timer = setTimeout(load, 0);
    return () => clearTimeout(timer);
  }, [load]);

  const openProductDetail = (product) => {
    setSelectedProduct(product);
    setActiveImageIndex(0);
  };

  const closeProductDetail = () => {
    setSelectedProduct(null);
    setActiveImageIndex(0);
  };

  const productImages = selectedProduct?.images?.length
    ? selectedProduct.images
    : [];

  const relatedProducts = selectedProduct
    ? products.filter((product) => {
        const currentCategoryId =
          selectedProduct.category?._id || selectedProduct.categoryId;

        const productCategoryId = product.category?._id || product.categoryId;

        return (
          String(product._id) !== String(selectedProduct._id) &&
          String(productCategoryId) === String(currentCategoryId) &&
          product.isActive !== false
        );
      })
    : [];

  const filtered = useMemo(
    () =>
      products.filter((p) => {
        const cid = p.category?._id || p.categoryId;
        return (
          (category === "all" || String(cid) === String(category)) &&
          p.isActive !== false &&
          (!search ||
            [p.name, p.sku, p.description, p.category?.name].some((v) =>
              String(v || "")
                .toLowerCase()
                .includes(search.toLowerCase().trim()),
            ))
        );
      }),
    [products, category, search],
  );

  const items = Object.values(cart);
  const cartCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );
  const fee = Number(delivery?.deliveryCharge || 0);
  const minimum = Number(delivery?.minimumOrderAmount || MIN_ORDER);
  const orderTotal = subtotal + fee;
  const formattedDeliveryAddress = [
    addressFields.restaurantName,
    addressFields.street,
    addressFields.city,
    addressFields.state,
  ]
    .map((part) => String(part || "").trim())
    .filter(Boolean)
    .join(", ");

  const setQty = (product, delta) => {
    setCart((old) => {
      const id = String(product._id || product.productId);
      const quantity = (old[id]?.quantity || 0) + delta;
      if (quantity <= 0) {
        const next = { ...old };
        delete next[id];
        return next;
      }
      const stock = Number(
        product.inventory?.availableQuantity ??
          product.availableQuantity ??
          Infinity,
      );
      if (quantity > stock) {
        setError(`Only ${stock} units are available for ${product.name}.`);
        return old;
      }
      setError("");
      return {
        ...old,
        [id]: {
          productId: id,
          name: product.name,
          sku: product.sku,
          unit: product.unit,
          price: Number(product.price),
          quantity,
        },
      };
    });
  };

  async function checkDelivery(e) {
    e?.preventDefault();
    setError("");
    setNotice("");
    setDelivery(null);
    if (!/^\d{6}$/.test(pincode.trim())) {
      setError("Enter a valid 6-digit pincode.");
      return;
    }
    setCheckingDelivery(true);
    try {
      const r = await req(
        "get",
        `/supply/delivery-options?pincode=${encodeURIComponent(pincode)}`,
      );
      const d = dataOf(r);
      const option = Array.isArray(d) ? d[0] : d;
      if (!option) {
        setError("Delivery is not available for this pincode.");
        return;
      }
      setDelivery(option);
      setNotice(
        "Delivery is available. ETA is subject to Supply confirmation.",
      );
    } catch (e) {
      setError(errorOf(e));
    } finally {
      setCheckingDelivery(false);
    }
  }

  async function placeOrder() {
    setError("");
    setNotice("");
    if (!items.length) return setError("Cart is empty.");
    if (!delivery) return setError("Check delivery availability first.");
    if (subtotal < minimum)
      return setError(`Minimum order value is ${money(minimum)}.`);
    if (
      !addressFields.restaurantName.trim() ||
      !addressFields.street.trim() ||
      !addressFields.city.trim() ||
      !addressFields.state.trim() ||
      !/^\d{6}$/.test(pincode.trim())
    )
      return setError(
        "Complete all delivery address fields and enter a valid pincode.",
      );

    setSubmitting(true);
    try {
      const r = await req("post", "/supply/orders", {
        items: items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
        })),

        deliveryAddress: {
          name: addressFields.restaurantName.trim(),
          phone: restaurantPhone.trim(),
          addressLine: addressFields.street.trim(),
          city: addressFields.city.trim(),
          state: addressFields.state.trim(),
          pincode: pincode.trim(),
        },
        notes: additionalNotes.trim(),
      });
      const result = r?.data?.data ?? r?.data?.order ?? r?.data;
      setCart({});
      setAdditionalNotes("");
      setView("orders");
      setNotice(
        `Order placed${result?.orderNumber ? ` · ${result.orderNumber}` : ""}. Check My Orders for delivery updates.`,
      );
      await load();
    } catch (e) {
      setError(errorOf(e));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-full space-y-6 bg-gradient-to-b from-slate-50 to-white pb-8 text-slate-800">
      {/* Header / overview */}
      <header className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm shadow-slate-200/50">
        <div className="flex flex-col gap-5 bg-gradient-to-r from-[var(--primary)] via-[var(--primary)] to-[var(--secondary)] px-5 py-6 text-white sm:px-7 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-rose-400/25 bg-rose-400/10 px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.16em] text-rose-300">
              <span className="h-1.5 w-1.5 rounded-full bg-rose-400" /> ChotuGTT
              · Restaurant Supply
            </div>
            <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
              Wholesale Supply Store
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-300">
              Bulk raw materials and restaurant essentials, delivered to your
              restaurant.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setView("orders")}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition ${view === "orders" ? "bg-rose-600 text-white" : "border border-white/15 bg-white/5 text-white hover:bg-rose-500"}`}
            >
              <ClipboardList size={16} /> My orders{" "}
              <span className="rounded-full bg-white/15 px-2 py-0.5 text-xs">
                {orders.length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setView("cart")}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition ${view === "cart" ? "bg-rose-600 text-white" : "bg-rose-600 text-white hover:bg-rose-500"}`}
            >
              <ShoppingCart size={16} /> Cart{" "}
              <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs">
                {cartCount}
              </span>
            </button>
          </div>
        </div>
        <div className="grid gap-3 border-t border-slate-100 bg-slate-50/70 p-4 sm:grid-cols-3 sm:p-5">
          <StatCard
            icon={Package}
            label="Products"
            value={products.filter((p) => p.isActive !== false).length}
            hint="Available supply catalog"
          />
          <StatCard
            icon={ShoppingBasket}
            label="Cart items"
            value={cartCount}
            hint={`${money(subtotal)} subtotal`}
          />
          <StatCard
            icon={Truck}
            label="Delivery"
            value={delivery ? "Available" : "Check pincode"}
            hint={
              delivery
                ? `Delivery fee ${money(fee)}`
                : "Check your restaurant location"
            }
          />
        </div>
      </header>

      {/* Inline feedback */}
      {error && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700"
        >
          <AlertCircle size={17} className="mt-0.5 shrink-0" />
          {error}
        </div>
      )}
      {notice && (
        <div
          role="status"
          className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700"
        >
          <CheckCircle2 size={17} className="mt-0.5 shrink-0" />
          {notice}
        </div>
      )}

      {selectedProduct ? (
        <section className="space-y-6">
          {/* Back Button */}
          <button
            type="button"
            onClick={closeProductDetail}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50"
          >
            <ArrowLeft size={16} />
            Back to products
          </button>

          {/* Product Details */}
          <div className="grid gap-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:grid-cols-2">
            {/* Image Slider */}
            <div className="space-y-3">
              <div className="relative flex h-80 items-center justify-center overflow-hidden rounded-2xl bg-slate-50">
                {productImages.length > 0 ? (
                  <img
                    src={productImages[activeImageIndex]}
                    alt={selectedProduct.name}
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <Package size={60} className="text-slate-300" />
                )}

                {productImages.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={() =>
                        setActiveImageIndex((index) =>
                          index === 0 ? productImages.length - 1 : index - 1,
                        )
                      }
                      className="absolute left-3 grid h-10 w-10 place-items-center rounded-full bg-white shadow"
                    >
                      <ChevronLeft size={20} />
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setActiveImageIndex((index) =>
                          index === productImages.length - 1 ? 0 : index + 1,
                        )
                      }
                      className="absolute right-3 grid h-10 w-10 place-items-center rounded-full bg-white shadow"
                    >
                      <ChevronRight size={20} />
                    </button>
                  </>
                )}
              </div>

              {/* Image thumbnails */}
              {productImages.length > 1 && (
                <div className="flex gap-3 overflow-x-auto">
                  {productImages.map((image, index) => (
                    <button
                      key={`${image}-${index}`}
                      type="button"
                      onClick={() => setActiveImageIndex(index)}
                      className={`h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 ${
                        activeImageIndex === index
                          ? "border-rose-500"
                          : "border-slate-200"
                      }`}
                    >
                      <img
                        src={image}
                        alt={`${selectedProduct.name} image ${index + 1}`}
                        className="h-full w-full object-contain"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Product Information */}
            <div className="flex flex-col">
              <p className="text-sm font-bold text-rose-600">
                {selectedProduct.category?.name || "Supply Product"}
              </p>

              <h1 className="mt-2 text-2xl font-black text-slate-900 sm:text-3xl">
                {selectedProduct.name}
              </h1>

              <p className="mt-2 text-sm text-slate-500">
                SKU: {selectedProduct.sku || "—"}
              </p>

              <p className="mt-5 text-3xl font-black text-slate-900">
                {money(selectedProduct.price)}
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Per {selectedProduct.unit || "unit"}
              </p>

              <div className="mt-5 border-t border-slate-100 pt-5">
                <h3 className="font-extrabold text-slate-900">
                  Product Description
                </h3>

                <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-600">
                  {selectedProduct.description || "No description available."}
                </p>
              </div>

              <div className="mt-5 rounded-xl bg-slate-50 p-4">
                <p className="text-sm font-bold text-slate-700">
                  Available Stock
                </p>

                <p className="mt-1 text-sm text-slate-600">
                  {selectedProduct.inventory?.availableQuantity ??
                    selectedProduct.availableQuantity ??
                    "Stock available"}
                </p>
              </div>

              {/* Add to Cart */}
              <div className="mt-6">
                {cart[String(selectedProduct._id)]?.quantity ? (
                  <QuantityControl
                    quantity={cart[String(selectedProduct._id)].quantity}
                    onMinus={() => setQty(selectedProduct, -1)}
                    onPlus={() => setQty(selectedProduct, 1)}
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => setQty(selectedProduct, 1)}
                    className="inline-flex items-center gap-2 rounded-xl bg-rose-500 px-6 py-3 font-extrabold text-white hover:bg-rose-600"
                  >
                    <Plus size={16} />
                    Add to Cart
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Related Products */}
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-black text-slate-900">
                Related Products
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                More products from the same category
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {relatedProducts.slice(0, 8).map((product) => (
                <button
                  key={product._id}
                  type="button"
                  onClick={() => openProductDetail(product)}
                  className="rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-rose-300 hover:shadow-md"
                >
                  <div className="flex h-36 items-center justify-center overflow-hidden rounded-xl bg-slate-50">
                    {product.images?.[0] ? (
                      <img
                        src={product.images[0]}
                        alt={product.name}
                        className="h-full w-full object-contain"
                      />
                    ) : (
                      <Package size={35} className="text-slate-300" />
                    )}
                  </div>

                  <h3 className="mt-3 line-clamp-2 font-extrabold text-slate-900">
                    {product.name}
                  </h3>

                  <p className="mt-2 text-lg font-black text-slate-900">
                    {money(product.price)}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </section>
      ) : view === "orders" ? (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-rose-600">
                Order history
              </p>
              <h2 className="mt-1 text-lg font-black text-slate-900">
                My Supply Orders
              </h2>
            </div>
            <button
              type="button"
              onClick={load}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
            >
              <RefreshCw size={15} /> Refresh
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  {["Order", "Items", "Total", "Status", "Delivery date"].map(
                    (label) => (
                      <th key={label} className="whitespace-nowrap px-4 py-3.5">
                        {label}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-12 text-center text-slate-500"
                    >
                      Loading orders…
                    </td>
                  </tr>
                ) : orders.length ? (
                  orders.map((o) => (
                    <tr key={o._id} className="transition hover:bg-slate-50/70">
                      <td className="whitespace-nowrap px-4 py-4">
                        <p className="font-extrabold text-slate-900">
                          {o.orderNumber || o._id}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {o.createdAt
                            ? new Date(o.createdAt).toLocaleDateString("en-IN")
                            : "Supply order"}
                        </p>
                      </td>
                      <td className="px-4 py-4 text-slate-600">
                        {o.items?.length || 0} item(s)
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 font-bold text-slate-900">
                        {money(o.totalAmount)}
                      </td>
                      <td className="px-4 py-4">
                        <StatusPill status={o.status} />
                        {o.deliveryRevisionReason && (
                          <p className="mt-1 max-w-48 text-xs text-slate-500">
                            Update: {o.deliveryRevisionReason}
                          </p>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-slate-600">
                        {o.expectedDeliveryDate
                          ? new Date(o.expectedDeliveryDate).toLocaleDateString(
                              "en-IN",
                            )
                          : "To be confirmed"}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center">
                      <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-slate-100 text-slate-400">
                        <ClipboardList size={22} />
                      </div>
                      <p className="mt-3 font-bold text-slate-700">
                        No orders yet
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        Your placed supply orders will appear here.
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="border-t border-slate-100 p-4">
            <button
              type="button"
              onClick={() => setView("catalog")}
              className="inline-flex items-center gap-2 rounded-xl bg-rose-500 px-4 py-2.5 text-sm font-extrabold text-white transition hover:bg-rose-600"
            >
              Browse products <ArrowRight size={16} />
            </button>
          </div>
        </section>
      ) : view === "cart" ? (
        <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_390px]">
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 sm:px-6">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-rose-600">
                  Review items
                </p>
                <h2 className="mt-1 text-lg font-black text-slate-900">
                  Your cart{" "}
                  <span className="text-slate-400">({cartCount})</span>
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setView("catalog")}
                className="text-sm font-bold text-rose-600 hover:text-rose-700"
              >
                Continue shopping
              </button>
            </div>
            <div className="divide-y divide-slate-100 px-5 sm:px-6">
              {items.length ? (
                items.map((item) => (
                  <div
                    key={item.productId}
                    className="flex flex-wrap items-center justify-between gap-4 py-4"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-slate-100 text-rose-500">
                        <Package size={21} />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-extrabold text-slate-900">
                          {item.name}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {item.sku || "SKU —"} · {item.unit || "Unit"} ·{" "}
                          {money(item.price)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <QuantityControl
                        quantity={item.quantity}
                        onMinus={() => setQty(item, -1)}
                        onPlus={() => setQty(item, 1)}
                        compact
                      />
                      <p className="min-w-20 text-right text-sm font-black text-slate-900">
                        {money(item.price * item.quantity)}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-14 text-center">
                  <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-rose-50 text-rose-500">
                    <ShoppingCart size={24} />
                  </div>
                  <p className="mt-3 font-bold text-slate-800">
                    Your cart is empty
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    Add products from the catalog to continue.
                  </p>
                  <button
                    type="button"
                    onClick={() => setView("catalog")}
                    className="mt-4 rounded-xl bg-rose-500 px-4 py-2.5 text-sm font-bold text-white"
                  >
                    Browse products
                  </button>
                </div>
              )}
            </div>
          </section>

          <aside className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-4">
              <p className="text-xs font-bold uppercase tracking-wider text-rose-600">
                Checkout
              </p>
              <h2 className="mt-1 text-lg font-black text-slate-900">
                Delivery details
              </h2>
            </div>
            <div className="space-y-4 p-5">
              <form onSubmit={checkDelivery} className="space-y-2">
                <label
                  htmlFor="cart-pincode"
                  className="text-xs font-extrabold text-slate-600"
                >
                  Restaurant pincode
                </label>
                <div className="flex gap-2">
                  <div className="relative min-w-0 flex-1">
                    <MapPin
                      size={16}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                      id="cart-pincode"
                      value={pincode}
                      onChange={(e) => {
                        setPincode(
                          e.target.value.replace(/\D/g, "").slice(0, 6),
                        );
                        setDelivery(null);
                      }}
                      placeholder="6-digit pincode"
                      inputMode="numeric"
                      className="h-11 w-full rounded-xl border border-slate-200 pl-9 pr-3 text-sm outline-none transition focus:border-rose-400 focus:ring-4 focus:ring-rose-100"
                    />
                  </div>
                  <button
                    disabled={checkingDelivery}
                    className="rounded-xl bg-rose-600 px-4 text-sm font-bold text-white transition hover:bg-rose-500 disabled:opacity-50"
                  >
                    {checkingDelivery ? "Checking…" : "Check"}
                  </button>
                </div>
              </form>
              {delivery && (
                <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3">
                  <div className="flex items-center gap-2 text-sm font-extrabold text-emerald-800">
                    <CheckCircle2 size={16} />
                    {delivery.name || "Delivery available"}
                  </div>
                  <p className="mt-1 text-xs leading-5 text-emerald-700">
                    Minimum order {money(minimum)} · Delivery fee {money(fee)}
                  </p>
                  <p className="text-xs text-emerald-700">
                    ETA:{" "}
                    {delivery.defaultDeliveryDays === 1
                      ? "Next day (subject to confirmation)"
                      : `${delivery.defaultDeliveryDays || 1} day(s)`}
                  </p>
                </div>
              )}
              <div className="space-y-3">
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-wide text-slate-600">
                    Delivery address
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Confirm your restaurant address before placing the order.
                  </p>
                </div>
                <label className="block text-xs font-bold text-slate-600">
                  Restaurant name
                  <input
                    value={addressFields.restaurantName}
                    onChange={(e) =>
                      setAddressFields((old) => ({
                        ...old,
                        restaurantName: e.target.value,
                      }))
                    }
                    autoComplete="organization"
                    className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-normal outline-none transition focus:border-rose-400 focus:ring-4 focus:ring-rose-100"
                    placeholder="Restaurant name"
                  />
                </label>
                <label className="block text-xs font-bold text-slate-600">
                  Street / Area
                  <input
                    value={addressFields.street}
                    onChange={(e) =>
                      setAddressFields((old) => ({
                        ...old,
                        street: e.target.value,
                      }))
                    }
                    autoComplete="street-address"
                    className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-normal outline-none transition focus:border-rose-400 focus:ring-4 focus:ring-rose-100"
                    placeholder="Street, landmark, area"
                  />
                </label>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <label className="block text-xs font-bold text-slate-600">
                    City
                    <input
                      value={addressFields.city}
                      onChange={(e) =>
                        setAddressFields((old) => ({
                          ...old,
                          city: e.target.value,
                        }))
                      }
                      autoComplete="address-level2"
                      className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-normal outline-none transition focus:border-rose-400 focus:ring-4 focus:ring-rose-100"
                      placeholder="City"
                    />
                  </label>
                  <label className="block text-xs font-bold text-slate-600">
                    State
                    <input
                      value={addressFields.state}
                      onChange={(e) =>
                        setAddressFields((old) => ({
                          ...old,
                          state: e.target.value,
                        }))
                      }
                      autoComplete="address-level1"
                      className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-normal outline-none transition focus:border-rose-400 focus:ring-4 focus:ring-rose-100"
                      placeholder="State"
                    />
                  </label>
                </div>
                <label className="block text-xs font-bold text-slate-600">
                  Pincode
                  <input
                    value={pincode}
                    onChange={(e) => {
                      setPincode(e.target.value.replace(/\D/g, "").slice(0, 6));
                      setDelivery(null);
                    }}
                    inputMode="numeric"
                    autoComplete="postal-code"
                    className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-normal outline-none transition focus:border-rose-400 focus:ring-4 focus:ring-rose-100"
                    placeholder="6-digit pincode"
                  />
                </label>
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                    Address preview
                  </p>
                  <p className="mt-1 text-xs leading-5 text-slate-700">
                    {formattedDeliveryAddress ||
                      "Your complete delivery address will appear here."}
                  </p>
                </div>
              </div>
              {/* Additional Notes */}
              <div className="space-y-2">
                <label
                  htmlFor="supply-order-notes"
                  className="text-xs font-extrabold text-slate-600"
                >
                  Additional Notes
                  <span className="ml-1 font-normal text-slate-400">
                    (Optional)
                  </span>
                </label>

                <textarea
                  id="supply-order-notes"
                  value={additionalNotes}
                  onChange={(e) => setAdditionalNotes(e.target.value)}
                  maxLength={1000}
                  rows={3}
                  placeholder="Add delivery instructions or any special requirements..."
                  className="w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none transition focus:border-rose-400 focus:ring-4 focus:ring-rose-100"
                />

                <p className="text-right text-xs text-slate-400">
                  {additionalNotes.length}/1000 characters
                </p>
              </div>
              <div className="space-y-3 rounded-xl bg-slate-50 p-4">
                <Row label="Subtotal" value={money(subtotal)} />
                <Row label="Delivery charge" value={money(fee)} />
                <div className="border-t border-slate-200 pt-3">
                  <Row label="Total" value={money(orderTotal)} bold />
                </div>
                <p className="text-xs text-slate-500">
                  Minimum order: {money(minimum)}
                </p>
              </div>
              <button
                type="button"
                disabled={
                  submitting || !items.length || !delivery || subtotal < minimum
                }
                onClick={placeOrder}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-rose-500 px-4 py-3.5 text-sm font-black text-white transition hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {submitting ? "Placing order…" : "Place Supply order"}
                <ArrowRight size={16} />
              </button>
              <p className="text-xs leading-5 text-slate-500">
                Delivery charge is paid by the restaurant. Delivery date may be
                revised by Supply Admin; check My Orders for updates.
              </p>
            </div>
          </aside>
        </div>
      ) : (
        <>
          {/* Catalog controls */}
          <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <form
              onSubmit={checkDelivery}
              className="flex flex-col gap-3 sm:flex-row sm:items-center"
            >
              <div className="flex items-center gap-2 text-sm font-extrabold text-slate-700">
                <Truck size={18} className="text-rose-500" />
                <label htmlFor="catalog-pincode">Delivery pincode</label>
              </div>
              <div className="flex flex-1 flex-wrap gap-2">
                <input
                  id="catalog-pincode"
                  value={pincode}
                  onChange={(e) => {
                    setPincode(e.target.value.replace(/\D/g, "").slice(0, 6));
                    setDelivery(null);
                  }}
                  placeholder="Enter 6-digit pincode"
                  inputMode="numeric"
                  className="h-11 min-w-0 flex-1 rounded-xl border border-slate-200 px-3 text-sm outline-none transition focus:border-rose-400 focus:ring-4 focus:ring-rose-100 sm:max-w-xs"
                />
                <button
                  disabled={checkingDelivery}
                  className="inline-flex h-11 items-center gap-2 rounded-xl bg-rose-600 px-4 text-sm font-bold text-white transition hover:bg-rose-500 disabled:opacity-50"
                >
                  {checkingDelivery ? "Checking…" : "Check availability"}
                  <ChevronRight size={15} />
                </button>
              </div>
              {delivery && (
                <span className="inline-flex items-center gap-1.5 text-xs font-extrabold text-emerald-700">
                  <CheckCircle2 size={15} /> Available · {money(fee)} fee
                </span>
              )}
            </form>
            <div className="flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setCategory("all")}
                  className={`rounded-full px-4 py-2 text-sm font-extrabold transition ${category === "all" ? "bg-rose-500 text-white shadow-sm shadow-rose-500/20" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
                >
                  All products
                </button>
                {categories.map((c) => (
                  <button
                    type="button"
                    key={c._id}
                    onClick={() => setCategory(String(c._id))}
                    className={`rounded-full px-4 py-2 text-sm font-extrabold transition ${category === String(c._id) ? "bg-rose-500 text-white shadow-sm shadow-rose-500/20" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
              <div className="relative w-full sm:max-w-xs">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search product, SKU, category"
                  className="h-11 w-full rounded-xl border border-slate-200 pl-9 pr-3 text-sm outline-none transition focus:border-rose-400 focus:ring-4 focus:ring-rose-100"
                />
              </div>
            </div>
          </section>

          {/* Product catalog */}
          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="animate-pulse rounded-2xl border border-slate-200 bg-white p-4"
                >
                  <div className="h-32 rounded-xl bg-slate-100" />
                  <div className="mt-4 h-3 w-24 rounded bg-slate-100" />
                  <div className="mt-3 h-5 w-3/4 rounded bg-slate-100" />
                  <div className="mt-4 h-9 rounded bg-slate-100" />
                </div>
              ))}
            </div>
          ) : filtered.length ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.map((p) => {
                const q = cart[String(p._id)]?.quantity || 0;
                const stock =
                  p.inventory?.availableQuantity ?? p.availableQuantity;
                return (
                  <article
                    key={p._id}
                    className="group flex min-w-0 flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-rose-200 hover:shadow-lg hover:shadow-rose-950/5"
                  >
                    <div className="relative flex h-36 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-white-50 to-white-100 text-rose-500">
                      <div className="absolute right-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide text-slate-500">
                        {p.category?.name || "Supply"}
                      </div>
                      {p.images?.[0] ? (
                        <img
                          src={p.images[0]}
                          alt={p.name}
                          className="h-full w-full object-contain"
                          loading="lazy"
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                          }}
                        />
                      ) : (
                        <div className="grid h-16 w-16 place-items-center rounded-2xl bg-white shadow-sm">
                          <Package size={30} />
                        </div>
                      )}
                    </div>
                    <div className="mt-4 flex-1">
                      <h3 className="line-clamp-2 text-base font-black leading-5 text-slate-900">
                        {p.name}
                      </h3>
                      <p className="mt-1.5 text-xs font-semibold text-slate-500">
                        {p.sku || "SKU —"}{" "}
                        <span className="mx-1 text-slate-300">·</span>{" "}
                        {p.unit || "Unit"}
                      </p>
                      {/* {p.description && (
                        <p className="mt-2 line-clamp-2 text-sm leading-5 text-slate-500">
                          {p.description}
                        </p>
                      )} */}
                    </div>
                    <div className="mt-4 flex flex-wrap items-end justify-between gap-3 border-t border-slate-100 pt-4">
                      <div>
                        <p className="text-xl font-black tracking-tight text-slate-900">
                          {money(p.price)}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {stock ?? "Stock available"}{" "}
                          {stock !== undefined && stock !== null
                            ? "available"
                            : ""}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => openProductDetail(p)}
                        className="text-xs font-extrabold text-rose-600 transition hover:text-rose-700 hover:underline"
                      >
                        View details
                      </button>
                      {q ? (
                        <QuantityControl
                          quantity={q}
                          onMinus={() => setQty(p, -1)}
                          onPlus={() => setQty(p, 1)}
                        />
                      ) : (
                        <button
                          type="button"
                          onClick={() => setQty(p, 1)}
                          className="inline-flex items-center gap-2 rounded-xl bg-rose-500 px-4 py-2.5 text-sm font-black text-white transition hover:bg-rose-600"
                        >
                          <Plus size={15} /> Add
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-white px-5 py-14 text-center shadow-sm">
              <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-slate-100 text-slate-400">
                <Box size={22} />
              </div>
              <p className="mt-3 font-extrabold text-slate-800">
                No products found
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Try another search or category.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setCategory("all");
                }}
                className="mt-4 text-sm font-extrabold text-rose-600"
              >
                Clear filters
              </button>
            </div>
          )}

          {/* Cart summary bar */}
          <div className="fixed bottom-4 left-[263px] right-6 z-50 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-700 bg-slate-950 p-4 text-white shadow-xl shadow-slate-900/20 sm:px-5">
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-rose-500/15 text-rose-400">
                <ShoppingBasket size={21} />
              </span>
              <div>
                <p className="font-extrabold">
                  {cartCount} item(s){" "}
                  <span className="mx-1 text-slate-500">·</span>{" "}
                  {money(subtotal)}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Minimum order {money(minimum)}
                </p>
              </div>
            </div>
            <button
              type="button"
              disabled={!items.length}
              onClick={() => setView("cart")}
              className="inline-flex items-center gap-2 rounded-xl bg-rose-500 px-5 py-3 text-sm font-black text-white transition hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-40"
            >
              View cart & checkout <ArrowRight size={16} />
            </button>
          </div>
        </>
      )}
    </div>
  );
}
