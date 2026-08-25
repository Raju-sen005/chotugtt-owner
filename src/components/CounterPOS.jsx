import { useState, useEffect, useMemo } from "react";
import axios from "axios";
import {
  ShoppingBag,
  Plus,
  Minus,
  Trash2,
  Search,
  Package,
  UtensilsCrossed,
  Loader2,
  Sparkles,
  ReceiptText,
  CheckCircle2,
  Circle,
  X,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
export default function CounterPOS() {
  const { user } = useAuth();
  const socket = useSocket();

  const restaurantId =
    typeof user?.restaurantId === "object"
      ? user.restaurantId?._id
      : user?.restaurantId;
  const [items, setItems] = useState([]);
  const [combos, setCombos] = useState([]);
  const [cart, setCart] = useState([]);
  const [activeTables, setActiveTables] = useState([]);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [activeTab, setActiveTab] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [offers, setOffers] = useState([]);
  const [showTableModal, setShowTableModal] = useState(false);
  const [selectedTable, setSelectedTable] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetchingData, setFetchingData] = useState(true);
  const [mobileCartOpen, setMobileCartOpen] = useState(false);
  const [storeDetails, setStoreDetails] = useState({
    name: "",
    address: "",
    contact: "",
    gstin: "",
    upiId: "",
    upiQrCode: "",
  });
  const apiBase =
    import.meta.env.VITE_APP_API_BASE || "http://localhost:5000/api/v1";

  useEffect(() => {
    const fetchStoreDetails = async () => {
      try {
        const res = await axios.get(`${apiBase}/restaurant/profile`, {
          withCredentials: true,
        });

        const d = res.data?.data;

        if (d) {
          const formattedAddress = d.address
            ? [d.address.street, d.address.city, d.address.state, d.address.zip]
                .filter(Boolean)
                .join(", ")
            : "";

          setStoreDetails({
            name: d.name || "",
            address: formattedAddress,
            contact: d.phone || d.contactNumber || d.contact || "",
            gstin: d.gstin || d.gstNumber || "",
            upiId: d.upiId || "",
            upiQrCode: d.upiQrCode || d.qrCodeUrl || "",
          });
        }
      } catch (err) {
        console.error("Failed to fetch restaurant profile:", err);
      }
    };

    fetchStoreDetails();
  }, [apiBase]);

  // 1. Fetch Menu Items, Combos, and Active Tables
  useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      setFetchingData(true);

      try {
        const requests = await Promise.allSettled([
          axios.get(`${apiBase}/menu/admin/items`, {
            withCredentials: true,
          }),

          axios.get(`${apiBase}/menu/admin/combos`, {
            withCredentials: true,
          }),

          axios.get(`${apiBase}/offers`, {
            withCredentials: true,
          }),

          axios.get(`${apiBase}/orders/live`, {
            withCredentials: true,
          }),
        ]);

        if (cancelled) return;

        const [itemsResult, combosResult, offersResult, ordersResult] =
          requests;

        // -----------------------------
        // MENU ITEMS
        // -----------------------------
        if (itemsResult.status === "fulfilled") {
          const data =
            itemsResult.value?.data?.data ?? itemsResult.value?.data ?? [];

          setItems(Array.isArray(data) ? data : []);
        } else {
          console.warn("Menu items fetch failed:", itemsResult.reason?.message);
        }

        // -----------------------------
        // COMBOS
        // -----------------------------
        if (combosResult.status === "fulfilled") {
          const data =
            combosResult.value?.data?.data ?? combosResult.value?.data ?? [];

          setCombos(Array.isArray(data) ? data : []);
        } else {
          console.warn("Combos fetch failed:", combosResult.reason?.message);
        }

        // -----------------------------
        // OFFERS
        // -----------------------------
        if (offersResult.status === "fulfilled") {
          const data =
            offersResult.value?.data?.data ?? offersResult.value?.data ?? [];

          setOffers(Array.isArray(data) ? data : []);
        } else {
          console.warn("Offers fetch failed:", offersResult.reason?.message);
        }

        // -----------------------------
        // LIVE TABLES
        // -----------------------------
        if (ordersResult.status === "fulfilled") {
          const orders =
            ordersResult.value?.data?.data ?? ordersResult.value?.data ?? [];

          const safeOrders = Array.isArray(orders) ? orders : [];

          const tables = [
            ...new Set(
              safeOrders
                .map((order) => order?.tableNumber)
                .filter(
                  (table) => table && table !== "N/A" && table !== "PARCEL",
                ),
            ),
          ];

          setActiveTables(tables);
        } else {
          console.warn(
            "Live orders fetch failed:",
            ordersResult.reason?.message,
          );
        }
      } catch (error) {
        if (!cancelled) {
          console.error("Counter POS data load error:", error);
        }
      } finally {
        if (!cancelled) {
          setFetchingData(false);
        }
      }
    };

    fetchData();

    return () => {
      cancelled = true;
    };
  }, [apiBase]);

  useEffect(() => {
    if (!socket || !restaurantId) {
      return;
    }

    let refreshTimer = null;
    let refreshInProgress = false;

    const getLiveTables = async () => {
      if (refreshInProgress) return;

      refreshInProgress = true;

      try {
        const response = await axios.get(`${apiBase}/orders/live`, {
          withCredentials: true,
        });

        const orders = response.data?.data ?? response.data ?? [];

        if (!Array.isArray(orders)) return;

        const tables = [
          ...new Set(
            orders
              .map((order) => order?.tableNumber)
              .filter(
                (table) => table && table !== "N/A" && table !== "PARCEL",
              ),
          ),
        ];

        setActiveTables(tables);
      } catch (error) {
        console.error(
          "Live table sync failed:",
          error?.response?.data?.message || error?.message,
        );
      } finally {
        refreshInProgress = false;
      }
    };

    const scheduleRefresh = () => {
      if (refreshTimer) {
        clearTimeout(refreshTimer);
      }

      refreshTimer = setTimeout(() => {
        getLiveTables();
      }, 150);
    };

    // ---------------------------------------
    // NEW ORDER
    // ---------------------------------------
    const handleNewOrder = (order) => {
      console.log("⚡ Counter POS realtime order:", order);

      /*
       * Agar backend event mein restaurantId hai,
       * tenant isolation double-check karenge.
       */
      const eventRestaurantId =
        typeof order?.restaurantId === "object"
          ? order?.restaurantId?._id
          : order?.restaurantId;

      if (
        eventRestaurantId &&
        String(eventRestaurantId) !== String(restaurantId)
      ) {
        return;
      }

      /*
       * Immediate UI update.
       * API ka wait nahi karna.
       */
      const tableNumber = order?.tableNumber;

      if (tableNumber && tableNumber !== "N/A" && tableNumber !== "PARCEL") {
        setActiveTables((prev) => {
          if (prev.includes(tableNumber)) {
            return prev;
          }

          return [...prev, tableNumber];
        });
      }

      /*
       * Backend final state ko sync karne ke liye
       * lightweight debounced request.
       */
      scheduleRefresh();
    };

    // ---------------------------------------
    // ORDER UPDATE / STATUS CHANGE
    // ---------------------------------------
    const handleOrderUpdate = (order) => {
      console.log("🔄 Counter POS order updated:", order);

      const eventRestaurantId =
        typeof order?.restaurantId === "object"
          ? order?.restaurantId?._id
          : order?.restaurantId;

      if (
        eventRestaurantId &&
        String(eventRestaurantId) !== String(restaurantId)
      ) {
        return;
      }

      scheduleRefresh();
    };

    // ---------------------------------------
    // CONNECTION RESTORE
    // ---------------------------------------
    const handleConnect = () => {
      console.log("🟢 Counter POS socket connected:", socket.id);

      /*
       * Reconnect ke baad missed orders ka final
       * state backend se sync.
       */
      scheduleRefresh();
    };

    socket.on("NEW_ORDER_RECEIVED", handleNewOrder);

    socket.on("ORDER_UPDATED", handleOrderUpdate);

    socket.on("ORDER_STATUS_UPDATED", handleOrderUpdate);

    socket.on("ORDER_CANCELLED", handleOrderUpdate);

    socket.on("ORDER_REJECTED", handleOrderUpdate);

    socket.on("ORDER_COMPLETED", handleOrderUpdate);

    socket.on("connect", handleConnect);

    return () => {
      socket.off("NEW_ORDER_RECEIVED", handleNewOrder);

      socket.off("ORDER_UPDATED", handleOrderUpdate);

      socket.off("ORDER_STATUS_UPDATED", handleOrderUpdate);

      socket.off("ORDER_CANCELLED", handleOrderUpdate);

      socket.off("ORDER_REJECTED", handleOrderUpdate);

      socket.off("ORDER_COMPLETED", handleOrderUpdate);

      socket.off("connect", handleConnect);

      if (refreshTimer) {
        clearTimeout(refreshTimer);
      }
    };
  }, [socket, restaurantId, apiBase]);

  const catalog = useMemo(() => {
    const formattedItems = items.map((i) => ({ ...i, catalogType: "ITEM" }));
    const formattedCombos = combos.map((c) => ({
      ...c,
      catalogType: "COMBO",
      category: "COMBO",
    }));
    return [...formattedItems, ...formattedCombos];
  }, [items, combos]);

  const categories = useMemo(() => {
    const cats = new Set(items.map((i) => i.category).filter(Boolean));
    if (combos.length > 0) cats.add("COMBO");
    return ["ALL", ...Array.from(cats)];
  }, [items, combos]);

  const filteredCatalog = useMemo(() => {
    return catalog.filter((item) => {
      const matchesSearch = item.name
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
      if (activeTab === "ALL") return matchesSearch;
      return matchesSearch && item.category === activeTab;
    });
  }, [catalog, searchQuery, activeTab]);

  // Quick lookup so product cards can show "already in cart" quantity badges
  const cartQtyMap = useMemo(() => {
    return Object.fromEntries(cart.map((i) => [i._id, i.quantity]));
  }, [cart]);

  const addToCart = (product) => {
    const cartId = product._id;
    setCart((prev) => {
      const exist = prev.find((i) => i._id === cartId);
      if (exist) {
        return prev.map((i) =>
          i._id === cartId ? { ...i, quantity: i.quantity + 1 } : i,
        );
      }
      return [
        ...prev,
        {
          ...product,
          quantity: 1,
          itemModel: product.catalogType === "COMBO" ? "Combo" : "MenuItem",
        },
      ];
    });
  };

  const updateQty = (id, delta) => {
    setCart((prev) =>
      prev
        .map((i) =>
          i._id === id
            ? { ...i, quantity: Math.max(1, i.quantity + delta) }
            : i,
        )
        .filter((i) => i.quantity > 0),
    );
  };

  const removeFromCart = (id) => {
    setCart((prev) => prev.filter((i) => i._id !== id));
  };
  const subtotal = cart.reduce((sum, i) => sum + i.price * i.quantity, 0);

  // 🔑 FIX: total discount ke sath-sath per-item discount bhi track karo,
  // taaki order place karte waqt har item ke sath uska apna discount save ho
  // (backend cancelOrderItem isi field se sahi recalculation karta hai)
  const { appliedDiscount, itemDiscountMap } = useMemo(() => {
    if (!offers.length) return { appliedDiscount: 0, itemDiscountMap: {} };

    let totalDiscount = 0;
    const map = {};

    cart.forEach((item) => {
      const itemTotalPrice = Number(item.price) * Number(item.quantity);

      const applicableOffers = offers.filter((offer) => {
        const hasTargetItems =
          offer.targetItems && offer.targetItems.length > 0;

        if (hasTargetItems) {
          // 🔑 FIX: targetItems populate() ki wajah se objects ({_id, name})
          // ban jaate hain, plain string ObjectId nahi — dono handle karo
          return offer.targetItems.some(
            (t) => String(t._id || t) === String(item._id),
          );
        }

        return true;
      });

      if (!applicableOffers.length) return;

      const targetedOffers = applicableOffers.filter(
        (o) => o.targetItems && o.targetItems.length > 0,
      );

      const relevantOffers =
        targetedOffers.length > 0 ? targetedOffers : applicableOffers;

      const bestOffer = relevantOffers.reduce((best, current) =>
        Number(current.discountValue) > Number(best.discountValue)
          ? current
          : best,
      );

      const itemDiscount = Math.round(
        (itemTotalPrice * Number(bestOffer.discountValue)) / 100,
      );

      map[item._id] = itemDiscount;
      totalDiscount += itemDiscount;
    });

    return { appliedDiscount: Math.round(totalDiscount), itemDiscountMap: map };
  }, [cart, offers]);

  const total = Math.max(0, subtotal - appliedDiscount);
  const showSuccess = (message) => {
    setSuccessMessage(message);
    setShowSuccessPopup(true);

    setTimeout(() => {
      setShowSuccessPopup(false);
    }, 3000);
  };
  const printParcelBill = (order) => {
    const billOrder = order || {
      orderId: `PARCEL-${Date.now()}`,
      customerName: "Walk-in Customer",
      tableNumber: "PARCEL",
      items: cart,
      subtotal,
      discount: appliedDiscount,
      tax: 0,
      total,
    };

    // Rejected items bill mein nahi aayenge
    const items = (billOrder.items || []).filter(
      (item) => item.status !== "REJECTED",
    );

    const billSubtotal =
      billOrder.subtotal ??
      items.reduce(
        (sum, item) =>
          sum + Number(item.price || 0) * Number(item.quantity || 0),
        0,
      );

    const billDiscount = Number(billOrder.discount || 0);
    const billTax = Number(billOrder.tax || 0);

    const grandTotal = billOrder.total ?? billSubtotal - billDiscount + billTax;

    const totalQty = items.reduce(
      (sum, item) => sum + Number(item.quantity || 0),
      0,
    );

    const now = new Date();

    const dateStr = `${String(now.getDate()).padStart(2, "0")}/${String(
      now.getMonth() + 1,
    ).padStart(2, "0")}/${String(now.getFullYear()).slice(-2)}`;

    const timeStr = now.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

    // Cashier
    const cashierName =
      user?.name || user?.username || user?.email || "Counter Staff";

    // Resolve QR URL
    const resolveUrl = (path) => {
      if (!path) return "";

      // Base64
      if (path.startsWith("data:image/")) {
        return path;
      }

      // Already absolute URL
      if (path.startsWith("http://") || path.startsWith("https://")) {
        return path;
      }

      // Relative backend path
      return `${apiBase.replace("/api", "")}${path}`;
    };

    const upiQrUrl = resolveUrl(storeDetails.upiQrCode);

    // Items
    const itemRows = items
      .map(
        (item) => `
        <tr>
          <td class="col-item">${item.name}</td>
          <td class="col-qty">${item.quantity}</td>
          <td class="col-price">
            ${Number(item.price || 0).toFixed(2)}
          </td>
          <td class="col-amount">
            ${(Number(item.price || 0) * Number(item.quantity || 0)).toFixed(2)}
          </td>
        </tr>
      `,
      )
      .join("");

    const windowContent = `
    <html>
      <head>
        <title>Parcel Bill - ${billOrder.orderId}</title>

        <style>
          @media print {
            @page {
              margin: 0;
            }
          }

          * {
            box-sizing: border-box;
          }

          body {
            font-family: 'Courier New', ui-monospace, monospace;
            margin: 0;
            padding: 0;
            display: flex;
            justify-content: center;
            background: #fff;
          }

          .receipt {
            width: 300px;
            padding: 18px 14px;
            color: #111;
          }

          .center {
            text-align: center;
          }

          .shop-name {
            font-size: 17px;
            font-weight: 700;
            letter-spacing: 0.5px;
            margin: 0 0 3px 0;
          }

          .shop-line {
            font-size: 11px;
            line-height: 1.4;
            margin: 0;
            color: #333;
          }

          .divider {
            border-top: 1px dashed #444;
            margin: 10px 0;
          }

          .divider-solid {
            border-top: 2px solid #111;
            margin: 10px 0;
          }

          .row {
            display: flex;
            justify-content: space-between;
            font-size: 12px;
            margin: 3px 0;
            gap: 10px;
          }

          .row b {
            font-weight: 700;
          }

          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 12px;
            margin-top: 4px;
          }

          thead td {
            font-weight: 700;
            font-size: 11px;
            padding-bottom: 5px;
            border-bottom: 1px solid #333;
          }

          td {
            padding: 4px 0;
            vertical-align: top;
          }

          .col-item {
            width: 46%;
          }

          .col-qty {
            width: 14%;
            text-align: center;
          }

          .col-price {
            width: 20%;
            text-align: right;
          }

          .col-amount {
            width: 20%;
            text-align: right;
          }

          .totals-row {
            display: flex;
            justify-content: space-between;
            font-size: 12px;
            margin: 3px 0;
          }

          .grand-total {
            font-size: 16px;
            font-weight: 700;
            border-top: 1px dashed #444;
            padding-top: 7px;
            margin-top: 7px;
          }

          .upi-block {
            text-align: center;
            margin-top: 14px;
          }

          .upi-block img {
            width: 120px;
            height: 120px;
            object-fit: contain;
          }

          .upi-id {
            font-size: 11px;
            font-weight: 700;
            margin-top: 6px;
          }

          .scan-label {
            font-size: 10px;
            font-weight: 700;
            letter-spacing: 0.5px;
            margin-bottom: 6px;
            color: #333;
          }

          .footer-line {
            font-size: 10px;
            text-align: center;
            margin-top: 14px;
            line-height: 1.5;
            color: #555;
          }
        </style>
      </head>

      <body>
        <div class="receipt">

          <!-- RESTAURANT HEADER -->
          <div class="center">
            <p class="shop-name">
              ${storeDetails.name || "RESTAURANT"}
            </p>

            ${
              storeDetails.address
                ? `<p class="shop-line">${storeDetails.address}</p>`
                : ""
            }

            ${
              storeDetails.contact
                ? `<p class="shop-line">
                    Contact: ${storeDetails.contact}
                  </p>`
                : ""
            }

            ${
              storeDetails.gstin
                ? `<p class="shop-line">
                    GSTIN: ${storeDetails.gstin}
                  </p>`
                : ""
            }

            <p class="shop-line">PARCEL BILL</p>
          </div>

          <div class="divider-solid"></div>

          <!-- BILL INFO -->
          <div class="row">
            <span>
              Date: ${dateStr}<br/>
              Time: ${timeStr}
            </span>

            <span>
              Type:<br/>
              PARCEL
            </span>
          </div>

          <div class="row">
            <span>
              Cashier:<br/>
              ${cashierName}
            </span>

            <span>
              Bill No.:<br/>
              ${billOrder.orderId || "N/A"}
            </span>
          </div>

          <p class="row">
            <span>Name:</span>
            <span>
              ${billOrder.customerName || "Walk-in Customer"}
            </span>
          </p>

          <div class="divider"></div>

          <!-- ITEMS -->
          <table>
            <thead>
              <tr>
                <td class="col-item">Item</td>
                <td class="col-qty">Qty.</td>
                <td class="col-price">Price</td>
                <td class="col-amount">Amount</td>
              </tr>
            </thead>

            <tbody>
              ${itemRows}
            </tbody>
          </table>

          <div class="divider"></div>

          <!-- TOTALS -->
          <div class="totals-row">
            <span>Total Qty</span>
            <span>${totalQty}</span>
          </div>

          <div class="totals-row">
            <span>Sub Total</span>
            <span>₹${billSubtotal.toFixed(2)}</span>
          </div>

          ${
            billDiscount > 0
              ? `
                <div class="totals-row">
                  <span>Discount</span>
                  <span>-₹${billDiscount.toFixed(2)}</span>
                </div>
              `
              : ""
          }

          ${
            billTax > 0
              ? `
                <div class="totals-row">
                  <span>Tax</span>
                  <span>₹${billTax.toFixed(2)}</span>
                </div>
              `
              : ""
          }

          <div class="row grand-total">
            <span>Grand Total</span>
            <span>₹${Number(grandTotal).toFixed(2)}</span>
          </div>

          <!-- UPI QR -->
          ${
            upiQrUrl
              ? `
                <div class="upi-block">
                  <div class="divider"></div>

                  <p class="scan-label">
                    SCAN &amp; PAY
                  </p>

                  <img
                    src="${upiQrUrl}"
                    alt="UPI QR"
                  />

                  ${
                    storeDetails.upiId
                      ? `<p class="upi-id">
                          ${storeDetails.upiId}
                        </p>`
                      : ""
                  }
                </div>
              `
              : ""
          }

          <!-- FOOTER -->
          <div class="footer-line">
            Thank you for visiting!<br/>
            Visit again 🙏
          </div>

        </div>

        <script>
          window.focus();

          const printWhenReady = async () => {
            const images = Array.from(document.images);

            await Promise.all(
              images.map((img) => {
                if (img.complete) {
                  return Promise.resolve();
                }

                return new Promise((resolve) => {
                  img.onload = resolve;
                  img.onerror = resolve;
                });
              })
            );

            window.print();
          };

          window.addEventListener(
            "load",
            printWhenReady
          );

          window.onafterprint = () => {
            window.close();
          };
        </script>

      </body>
    </html>
  `;

    const printWindow = window.open("", "_blank", "width=380,height=680");

    if (!printWindow) {
      alert("Print window blocked. Please allow popups for this website.");
      return;
    }

    printWindow.document.open();
    printWindow.document.write(windowContent);
    printWindow.document.close();
  };

  const handleParcelOrder = async () => {
    if (cart.length === 0) {
      return alert("Cart is empty!");
    }

    setLoading(true);

    try {
      const orderPayload = {
        orderType: "PARCEL",

        items: cart.map((i) => ({
          menuItem: i.catalogType === "ITEM" ? i._id : undefined,
          combo: i.catalogType === "COMBO" ? i._id : undefined,
          catalogType: i.catalogType,
          name: i.name,
          price: i.price,
          quantity: i.quantity,
          itemModel: i.itemModel,
          discount: itemDiscountMap[i._id] || 0,
        })),

        subtotal,
        discount: appliedDiscount,
        tax: 0,
        total,
      };

      const res = await axios.post(
        `${apiBase}/orders/counter-place`,
        orderPayload,
        {
          withCredentials: true,
        },
      );

      // Backend se created order lo
      const createdOrder = res.data?.data || res.data?.order;

      setCart([]);

      showSuccess("Parcel order sent to Live Orders!");
    } catch (err) {
      console.error("Parcel order error:", err);

      alert(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to generate parcel order",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleAddToTableSubmit = async () => {
    if (!selectedTable) return alert("Please select a table!");
    if (cart.length === 0) return alert("Cart is empty!");

    setLoading(true);
    try {
      await axios.post(
        `${apiBase}/orders/counter-place`,
        {
          orderType: "DINE_IN_COUNTER",
          targetTableNumber: selectedTable,
          items: cart.map((i) => ({
            menuItem: i.catalogType === "ITEM" ? i._id : undefined,
            combo: i.catalogType === "COMBO" ? i._id : undefined,
            catalogType: i.catalogType, // 🆕 backend itemType isi se decide karta hai
            name: i.name,
            price: i.price,
            quantity: i.quantity,
            itemModel: i.itemModel,
            discount: itemDiscountMap[i._id] || 0, // 🆕 per-item discount
          })),
          subtotal,
          discount: appliedDiscount,
          tax: 0,
          total,
        },
        { withCredentials: true },
      );

      showSuccess(`Items successfully added to Table ${selectedTable}!`);
      setCart([]);
      setShowTableModal(false);
      setSelectedTable("");
    } catch (err) {
      alert(err?.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  const cartItemCount = cart.reduce((acc, i) => acc + i.quantity, 0);

  return (
    <>
      {/* Toast — kept minimal, docket-tinted */}
      {showSuccessPopup && (
        <div className="fixed top-6 right-6 z-[9999] animate-in slide-in-from-right-5 fade-in duration-300">
          <div className="flex items-start gap-3 bg-white border border-slate-200 border-l-4 border-l-emerald-500 shadow-2xl rounded-2xl px-5 py-4 min-w-[320px] max-w-[400px]">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <CheckCircle2 size={22} strokeWidth={2.5} />
            </div>

            <div className="flex-1">
              <p className="text-sm font-black text-slate-900">Done</p>

              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                {successMessage}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowSuccessPopup(false)}
              className="text-slate-400 hover:text-slate-700 transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto p-4 sm:p-6 pb-24 lg:pb-6 grid grid-cols-1 lg:grid-cols-12 gap-6 font-sans min-h-[92vh] bg-[#FAF7F2]">
        {/* Left 8 Cols: Catalog & Menu Grid */}
        <div className="lg:col-span-8 flex flex-col space-y-5 min-w-0">
          {/* Header & Search Bar */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm shadow-slate-200/40">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-rose-600 to-rose-700 text-white flex items-center justify-center shadow-sm shadow-rose-200 shrink-0">
                <ReceiptText className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-black text-slate-900 tracking-tight">
                    Counter POS
                  </h1>
                  <span className="hidden sm:flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                    <Circle className="w-1.5 h-1.5 fill-emerald-500 text-emerald-500 animate-pulse" />
                    LIVE
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  {activeTables.length > 0
                    ? `${activeTables.length} table${activeTables.length > 1 ? "s" : ""} running · billing counter`
                    : "Streamlined counter billing, parcels & table order mapping"}
                </p>
              </div>
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search dishes or combos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100 focus:bg-white transition-all"
              />
            </div>
          </div>

          {/* Category Filters Horizontal Scroll */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveTab(cat)}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-300 ${
                  activeTab === cat
                    ? "bg-rose-600 text-white shadow-sm shadow-rose-200"
                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:border-slate-300"
                }`}
              >
                {cat === "COMBO" ? (
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" /> Combos & Deals
                  </span>
                ) : (
                  cat
                )}
              </button>
            ))}
          </div>

          {/* Product Cards Grid */}
          <div className="flex-1">
            {fetchingData ? (
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {Array.from({ length: 10 }).map((_, idx) => (
                  <div
                    key={idx}
                    className="bg-white p-4 rounded-2xl border border-slate-200 animate-pulse"
                  >
                    <div className="w-full h-32 rounded-xl bg-slate-100 mb-3" />
                    <div className="h-3 w-3/4 bg-slate-100 rounded mb-2" />
                    <div className="h-2.5 w-1/2 bg-slate-100 rounded" />
                    <div className="flex justify-between items-center mt-3 pt-2.5 border-t border-slate-100">
                      <div className="h-3 w-10 bg-slate-100 rounded" />
                      <div className="w-7 h-7 rounded-lg bg-slate-100" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredCatalog.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-80 bg-white rounded-2xl border border-slate-200 p-6 text-center">
                <UtensilsCrossed className="w-12 h-12 text-slate-300 mb-2" />
                <p className="text-sm font-bold text-slate-800">
                  No menu items found
                </p>
                <p className="text-xs text-slate-400 mt-1 max-w-xs">
                  Try switching categories or clear out the search keyword.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {filteredCatalog.map((product) => {
                  const isCombo = product.catalogType === "COMBO";
                  const qtyInCart = cartQtyMap[product._id];

                  return (
                    <div
                      key={product._id}
                      onClick={() => addToCart(product)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          addToCart(product);
                        }
                      }}
                      className={`group bg-white p-4 rounded-2xl border hover:shadow-lg hover:shadow-slate-200/60 hover:-translate-y-0.5 transition-all duration-300 cursor-pointer flex flex-col justify-between relative overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-300 ${
                        qtyInCart
                          ? "border-rose-300 ring-1 ring-rose-100"
                          : "border-slate-200 hover:border-rose-200"
                      }`}
                    >
                      {isCombo && (
                        <span className="absolute top-3 right-3 bg-gradient-to-r from-amber-500 to-amber-600 text-white text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider z-10">
                          Combo
                        </span>
                      )}

                      {qtyInCart > 0 && (
                        <span className="absolute top-3 left-3 bg-rose-600 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center z-10 shadow-sm">
                          {qtyInCart}
                        </span>
                      )}

                      <div>
                        {product.image ? (
                          <div className="w-full h-32 rounded-xl overflow-hidden mb-3 bg-slate-100">
                            <img
                              src={
                                product.image
                                  ? product.image.startsWith("http")
                                    ? product.image
                                    : `${import.meta.env.VITE_APP_API_BASE.replace("/api", "")}${product.image}`
                                  : null
                              }
                              alt={product.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            />
                          </div>
                        ) : (
                          <div className="w-full h-32 rounded-xl bg-slate-50 flex items-center justify-center mb-3 border border-dashed border-slate-200 text-slate-300">
                            <UtensilsCrossed className="w-8 h-8" />
                          </div>
                        )}
                        <h4 className="font-bold text-slate-900 text-xs line-clamp-1 group-hover:text-rose-700">
                          {product.name}
                        </h4>
                        <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5 font-medium">
                          {product.description || product.category}
                        </p>
                      </div>
                      <div className="flex justify-between items-center mt-3 pt-2.5 border-t border-slate-100">
                        <span className="font-black text-slate-900 text-sm font-mono">
                          ₹{product.price}
                        </span>
                        <div className="w-7 h-7 bg-slate-100 text-slate-600 rounded-lg flex items-center justify-center group-hover:bg-rose-600 group-hover:text-white transition-all">
                          <Plus className="w-3.5 h-3.5" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right 4 Cols: Docket-style Cart & Billing Sidebar.
            Mobile: fixed bottom sheet, so totals + action buttons are
            ALWAYS reachable without scrolling the product grid.
            Desktop (lg+): sticky full-height sidebar, unchanged. */}
        <div
          className={`fixed bottom-0 inset-x-0 z-40 bg-white border-t border-slate-200 rounded-t-3xl shadow-[0_-8px_30px_rgba(15,23,42,0.12)]
          lg:col-span-4 lg:sticky lg:top-0 lg:z-auto lg:inset-x-auto lg:h-[calc(100vh)] lg:rounded-2xl lg:border lg:shadow-sm lg:shadow-slate-200/40
          flex flex-col overflow-hidden transition-[max-height] duration-300 ease-out
          ${mobileCartOpen ? "max-h-[82vh]" : "max-h-[64px]"} lg:max-h-none`}
        >
          {/* Collapsible header + item list — always shown on desktop, toggled on mobile */}
          <div
            className={`${mobileCartOpen ? "flex" : "hidden"} lg:flex flex-col flex-1 min-h-0 overflow-y-auto no-scrollbar px-6 pt-5 lg:pt-6`}
          >
            <div className="flex justify-between items-center mb-4 pb-3.5 border-b border-dashed border-slate-200 shrink-0">
              <h3 className="font-black text-slate-900 text-sm uppercase tracking-wider flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-rose-600" /> Current Bill
              </h3>
              <span className="text-[11px] font-extrabold bg-rose-600 text-white px-2.5 py-1 rounded-lg font-mono">
                {cartItemCount} item{cartItemCount === 1 ? "" : "s"}
              </span>
            </div>

            {/* Cart Item List */}
            <div className="space-y-2.5 pb-2">
              {cart.length === 0 ? (
                <div className="py-16 lg:py-20 text-center flex flex-col items-center justify-center">
                  <ShoppingBag className="w-10 h-10 text-slate-200 mb-2" />
                  <p className="text-xs font-bold text-slate-400">
                    Cart is empty
                  </p>
                  <p className="text-[11px] text-slate-300 mt-0.5">
                    Tap catalog items to build order
                  </p>
                </div>
              ) : (
                cart.map((item, idx) => (
                  <div
                    key={item._id}
                    className={`flex justify-between items-center py-2.5 ${
                      idx !== cart.length - 1
                        ? "border-b border-dashed border-slate-150"
                        : ""
                    }`}
                  >
                    <div className="flex-1 pr-2 min-w-0">
                      <span className="font-bold text-slate-900 text-xs block line-clamp-1">
                        {item.name}
                      </span>
                      <span className="text-[11px] text-slate-500 font-medium font-mono">
                        ₹{item.price} × {item.quantity} = ₹
                        {(item.price * item.quantity).toFixed(0)}
                      </span>
                      {itemDiscountMap[item._id] > 0 && (
                        <span className="inline-block mt-1 text-[10px] text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-md">
                          -₹{itemDiscountMap[item._id]} offer
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg overflow-hidden">
                        <button
                          onClick={() => updateQty(item._id, -1)}
                          className="p-1.5 hover:bg-rose-50 hover:text-rose-600 text-slate-600 cursor-pointer transition-colors"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="px-2 text-xs font-black text-slate-900 font-mono">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQty(item._id, 1)}
                          className="p-1.5 hover:bg-rose-50 hover:text-rose-600 text-slate-600 cursor-pointer transition-colors"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                      <button
                        onClick={() => removeFromCart(item._id)}
                        className="text-slate-400 p-1.5 hover:bg-rose-600 hover:text-white rounded-lg cursor-pointer transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Perforated tear-line — signature ticket motif, shown whenever the list is visible */}
          <div
            aria-hidden="true"
            className={`${mobileCartOpen ? "block" : "hidden"} lg:block h-3 shrink-0`}
            style={{
              backgroundImage:
                "radial-gradient(circle at 6px 6px, #FAF7F2 4px, transparent 4.5px)",
              backgroundSize: "12px 12px",
              backgroundRepeat: "repeat-x",
              backgroundPosition: "center",
            }}
          />

          {/* Mobile-only compact bar — tap to expand/collapse the item list.
              Always visible so the total is never more than a glance away. */}
          <button
            type="button"
            onClick={() => setMobileCartOpen((o) => !o)}
            className="lg:hidden flex items-center justify-between px-5 py-3 border-b border-slate-100 shrink-0"
          >
            <span className="flex items-center gap-2 text-xs font-bold text-slate-700">
              <ShoppingBag className="w-4 h-4 text-rose-600" />
              {cartItemCount} item{cartItemCount === 1 ? "" : "s"}
              <span className="text-slate-300">·</span>
              <span className="font-mono font-black text-slate-900">
                ₹{total.toFixed(0)}
              </span>
            </span>
            {mobileCartOpen ? (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronUp className="w-4 h-4 text-slate-400" />
            )}
          </button>

          {/* Bill Calculation & Action Buttons — ALWAYS visible, mobile and desktop,
              so Parcel / Add to Table never require scrolling. */}
          <div className="p-4 sm:p-6 lg:pt-3 space-y-3 lg:space-y-4 shrink-0">
            <div
              className={`${mobileCartOpen ? "block" : "hidden"} lg:block space-y-1.5 text-xs`}
            >
              <div className="flex justify-between text-slate-500 font-medium">
                <span>Subtotal</span>
                <span className="font-mono">₹{subtotal.toFixed(2)}</span>
              </div>
              {appliedDiscount > 0 && (
                <div className="flex justify-between text-emerald-600 font-bold">
                  <span>Discount</span>
                  <span className="font-mono">
                    - ₹{appliedDiscount.toFixed(2)}
                  </span>
                </div>
              )}
              <div className="flex justify-between items-center text-slate-900 font-black text-base pt-2.5 mt-1 border-t border-dashed border-slate-200">
                <span>Grand Total</span>
                <span className="font-mono">₹{total.toFixed(2)}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
              <button
                onClick={handleParcelOrder}
                disabled={loading || cart.length === 0}
                className="py-3 lg:py-3.5 bg-rose-600 text-white rounded-xl font-bold text-xs hover:bg-rose-700 transition-all cursor-pointer shadow-sm shadow-rose-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-300"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Package className="w-4 h-4" />
                )}
                Parcel
              </button>
              <button
                onClick={() => {
                  if (cart.length === 0) return alert("Cart is empty!");
                  setShowTableModal(true);
                }}
                disabled={loading || cart.length === 0}
                className="py-3 lg:py-3.5 bg-slate-900 text-white rounded-xl font-bold text-xs hover:bg-slate-800 transition-all cursor-pointer shadow-sm shadow-slate-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
              >
                <UtensilsCrossed className="w-4 h-4" /> Add to Table
              </button>
            </div>
          </div>
        </div>

        {/* Table Selection Modal */}
        {showTableModal && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-[2px] flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl p-6 w-full max-w-sm space-y-4 shadow-2xl border border-slate-100">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-black text-slate-900 text-base tracking-tight">
                    Select Running Table
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Tap an active table to append these items.
                  </p>
                </div>
                <button
                  onClick={() => setShowTableModal(false)}
                  className="text-slate-400 hover:text-slate-700 transition-colors p-1"
                >
                  <X size={18} />
                </button>
              </div>

              {activeTables.length === 0 ? (
                <p className="text-[11px] text-rose-700 font-semibold bg-rose-50 border border-rose-200 p-3 rounded-xl leading-relaxed">
                  ⚠️ No active running tables found right now. Open a table
                  order from regular orders first.
                </p>
              ) : (
                <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto pr-1">
                  {activeTables.map((tbl) => {
                    const isSelected = selectedTable === tbl;
                    return (
                      <button
                        key={tbl}
                        onClick={() => setSelectedTable(tbl)}
                        className={`aspect-square rounded-xl text-xs font-black flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-300 ${
                          isSelected
                            ? "bg-rose-600 text-white shadow-sm shadow-rose-200"
                            : "bg-slate-50 text-slate-700 border border-slate-200 hover:border-rose-300 hover:bg-rose-50"
                        }`}
                      >
                        <span className="text-[9px] font-bold uppercase opacity-70">
                          Table
                        </span>
                        <span className="text-sm font-mono">{tbl}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setShowTableModal(false)}
                  className="flex-1 py-3 border border-slate-200 rounded-xl font-bold text-xs text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddToTableSubmit}
                  disabled={loading || !selectedTable}
                  className="flex-1 py-3 bg-rose-600 text-white rounded-xl font-bold text-xs hover:bg-rose-700 transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {loading ? "Pushing..." : "Confirm & Push"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}