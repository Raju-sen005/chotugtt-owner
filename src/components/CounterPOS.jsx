import { useState, useEffect, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import {
  ShoppingBag,
  Plus,
  Minus,
  Trash2,
  Search,
  Package,
  UtensilsCrossed,
  Utensils,
  Loader2,
  Sparkles,
  CheckCircle2,
  X,
  ChevronUp,
  ChevronDown,
  GripVertical,
  ReceiptText,
  ChefHat,
  LayoutGrid,
  Flame,
  Coffee,
  Soup,
  Cake,
  UserRound,
  ArrowRight,
  Salad,
  GlassWater,
  CupSoda,
  Milk,
  Wheat,
  Pizza,
  Sandwich,
  Popcorn,
  Leaf,
  IceCreamCone,
  Drumstick,
  EggFried,
  Candy,
  Martini,
  Croissant,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import { getSelectedBillTemplate } from "../constants/billTemplates";
import { orderCategoryNames, sortMenuEntries } from "../utils/menuOrder";
import { requireApiBase, resolveMediaUrl } from "../utils/mediaUrl";
import {
  SPECIAL_INSTRUCTIONS_MAX,
  createCartLineId,
  normalizeSpecialInstructions,
} from "../features/orders/itemSpecialInstructions";

function categoryIcon(name) {
  const value = String(name || "").toLowerCase();
  if (name === "ALL") return LayoutGrid;
  if (name === "COMBO") return Sparkles;
  if (value.includes("soup") || value.includes("start") || value.includes("appet")) return Soup;
  if (value.includes("shake") || value.includes("smoothie")) return IceCreamCone;
  if (value.includes("mocktail") || value.includes("cocktail") || value.includes("mojito")) return Martini;
  if (value.includes("lassi") || value.includes("raita") || value.includes("curd") || value.includes("buttermilk")) return Milk;
  if (value.includes("coffee") || value.includes("tea") || value.includes("hot beverage") || value.includes("beverage")) return Coffee;
  if (value.includes("drink") || value.includes("juice") || value.includes("cold")) return CupSoda;
  if (value.includes("salad")) return Salad;
  if (value.includes("papad")) return Croissant;
  if (value.includes("roti") || value.includes("paratha") || value.includes("naan") || value.includes("bread")) return Wheat;
  if (value.includes("rice") || value.includes("biryani") || value.includes("pulao")) return Package;
  if (value.includes("paneer")) return EggFried;
  if (value.includes("veg") || value.includes("vegetable") || value.includes("dal")) return Leaf;
  if (value.includes("chinese") || value.includes("noodle") || value.includes("manchurian")) return Flame;
  if (value.includes("pizza")) return Pizza;
  if (value.includes("sandwich") || value.includes("burger") || value.includes("maggie")) return Sandwich;
  if (value.includes("fries") || value.includes("snack") || value.includes("chaat") || value.includes("pakoda")) return Popcorn;
  if (value.includes("sizzler") || value.includes("tikka") || value.includes("grill")) return Drumstick;
  if (value.includes("dessert") || value.includes("sweet") || value.includes("ice") || value.includes("cake")) return Cake;
  if (value.includes("special") || value.includes("signature") || value.includes("chef") || value.includes("treat")) return Sparkles;
  if (value.includes("water") || value.includes("lassi")) return GlassWater;
  if (value.includes("candy") || value.includes("chocolate")) return Candy;
  return Utensils;
}

function categoryLabel(name) {
  if (name === "ALL") return "All Items";
  if (name === "COMBO") return "Combos";
  return name;
}

function indexUnderPointer(attribute, clientX, clientY) {
  const nodes = document.querySelectorAll(`[${attribute}]`);
  let match = -1;
  let best = Infinity;

  nodes.forEach((node) => {
    const rect = node.getBoundingClientRect();
    const inside =
      clientX >= rect.left &&
      clientX <= rect.right &&
      clientY >= rect.top &&
      clientY <= rect.bottom;

    if (!inside) return;

    const dx = clientX - (rect.left + rect.width / 2);
    const dy = clientY - (rect.top + rect.height / 2);
    const distance = dx * dx + dy * dy;

    if (distance < best) {
      best = distance;
      match = Number(node.getAttribute(attribute));
    }
  });

  return Number.isInteger(match) ? match : -1;
}

export default function CounterPOS() {
  const { user } = useAuth();
  const socket = useSocket();

  const restaurantId =
    typeof user?.restaurantId === "object"
      ? user.restaurantId?._id
      : user?.restaurantId || user?._id;
  const [selectedBillTemplate, setSelectedBillTemplate] = useState(() =>
    getSelectedBillTemplate(restaurantId),
  );
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
  const [categoryOrder, setCategoryOrder] = useState([]);
  const [arrangeMode, setArrangeMode] = useState(false);
  const [savingOrder, setSavingOrder] = useState(false);
  const [dragKey, setDragKey] = useState("");
  const dragState = useRef(null);
  const [storeDetails, setStoreDetails] = useState({
    name: "",
    address: "",
    contact: "",
    gstin: "",
    upiId: "",
    upiQrCode: "",
  });
  const [showNewTableModal, setShowNewTableModal] = useState(false);
  const [showParcelModal, setShowParcelModal] = useState(false);
  const [customerNameInput, setCustomerNameInput] = useState("");
  const [openParcels, setOpenParcels] = useState([]);
  const [orderMode, setOrderMode] = useState("DINE_IN");
  const [sortMode, setSortMode] = useState("default");
  const [offersOnly, setOffersOnly] = useState(false);
  const searchRef = useRef(null);
  const [newTableNumber, setNewTableNumber] = useState("");
  const [tableStatusList, setTableStatusList] = useState([]);
  const apiBase = requireApiBase();

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
          if (d.billTemplate) setSelectedBillTemplate(d.billTemplate);
        }
      } catch (err) {
        console.error("Failed to fetch restaurant profile:", err);
      }
    };

    fetchStoreDetails();
  }, [apiBase]);

  useEffect(() => {
    const onKey = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Escape closes POS dialogs; lock body scroll while any modal is open
  useEffect(() => {
    const anyModalOpen = showTableModal || showNewTableModal || showParcelModal;
    if (!anyModalOpen) return undefined;

    const onKey = (event) => {
      if (event.key !== "Escape" || loading) return;
      if (showTableModal) setShowTableModal(false);
      if (showNewTableModal) {
        setShowNewTableModal(false);
        setNewTableNumber("");
      }
      if (showParcelModal) setShowParcelModal(false);
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [showTableModal, showNewTableModal, showParcelModal, loading]);

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
          setCategoryOrder(
            Array.isArray(itemsResult.value?.data?.categoryOrder)
              ? itemsResult.value.data.categoryOrder
              : [],
          );
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
          setOpenParcels(
            safeOrders.filter(
              (order) =>
                order?.tableNumber === "PARCEL" &&
                (order.status === "PENDING" || order.status === "ACCEPTED"),
            ),
          );
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
    let cancelled = false;

    const fetchTableStatus = async () => {
      try {
        const res = await axios.get(`${apiBase}/tables/status`, {
          withCredentials: true,
        });

        if (cancelled) return;

        const data = res.data?.data ?? res.data ?? [];

        setTableStatusList(Array.isArray(data) ? data : []);
      } catch (error) {
        if (!cancelled) {
          console.error(
            "Failed to fetch table status:",
            error?.response?.data?.message || error?.message,
          );
        }
      }
    };

    fetchTableStatus();

    return () => {
      cancelled = true;
    };
  }, [apiBase]);

  const getTableNumber = (table) => {
    if (!table) return "";

    return String(
      table.tableNumber ?? table.number ?? table.name ?? table.table ?? "",
    ).trim();
  };

  const getTableRunningStatus = (table) => {
    const value = String(
      table?.status ?? table?.orderStatus ?? "",
    ).toUpperCase();

    return (
      value === "RUNNING" ||
      value === "OCCUPIED" ||
      value === "BUSY" ||
      value === "PENDING" ||
      value === "ACCEPTED"
    );
  };

  const freeTables = useMemo(() => {
    return tableStatusList.filter((table) => {
      const tableNumber = getTableNumber(table);

      if (!tableNumber) return false;

      // Table API ke status se occupied check
      if (getTableRunningStatus(table)) {
        return false;
      }

      // Live orders se bhi double-check
      // Agar kisi active order mein table hai to free nahi hai
      if (activeTables.includes(tableNumber)) {
        return false;
      }

      return true;
    });
  }, [tableStatusList, activeTables]);

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
        setOpenParcels(
          orders.filter(
            (order) =>
              order?.tableNumber === "PARCEL" &&
              (order.status === "PENDING" || order.status === "ACCEPTED"),
          ),
        );
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
    return sortMenuEntries(
      [...formattedItems, ...formattedCombos],
      categoryOrder,
    );
  }, [items, combos, categoryOrder]);

  const categories = useMemo(() => {
    const names = items.map((item) => item.category).filter(Boolean);
    return [
      "ALL",
      ...orderCategoryNames(names, categoryOrder, combos.length > 0),
    ];
  }, [items, combos.length, categoryOrder]);

  const filteredCatalog = useMemo(() => {
    return catalog.filter((item) => {
      const matchesSearch = item.name
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
      if (activeTab === "ALL") return matchesSearch;
      return matchesSearch && item.category === activeTab;
    });
  }, [catalog, searchQuery, activeTab]);

  const activeOfferCoverage = useMemo(() => {
    const now = Date.now();
    const ids = new Set();
    let allItems = false;

    offers.forEach((offer) => {
      if (offer?.isActive === false) return;
      const startsAt = offer?.startsAt ? new Date(offer.startsAt).getTime() : null;
      const expiresAt = offer?.expiresAt ? new Date(offer.expiresAt).getTime() : null;
      if (startsAt && Number.isFinite(startsAt) && startsAt > now) return;
      if (expiresAt && Number.isFinite(expiresAt) && expiresAt <= now) return;
      if (offer?.targetScope === "ALL_ITEMS") {
        allItems = true;
        return;
      }
      (Array.isArray(offer?.targetItems) ? offer.targetItems : []).forEach((target) => {
        const id = target?._id || target;
        if (id) ids.add(String(id));
      });
    });

    return { ids, allItems };
  }, [offers]);

  const visibleCatalog = useMemo(() => {
    let rows = filteredCatalog;

    if (offersOnly && !arrangeMode) {
      rows = rows.filter((item) => {
        if (item.catalogType === "COMBO") return false;
        if (activeOfferCoverage.allItems) return true;
        return activeOfferCoverage.ids.has(String(item._id));
      });
    }

    if (arrangeMode || sortMode === "default") return rows;

    const copy = [...rows];
    if (sortMode === "name") {
      copy.sort((a, b) => String(a.name).localeCompare(String(b.name)));
    } else if (sortMode === "price") {
      copy.sort((a, b) => Number(a.price || 0) - Number(b.price || 0));
    }
    return copy;
  }, [filteredCatalog, offersOnly, arrangeMode, sortMode, activeOfferCoverage]);

  const canArrangeItems =
    arrangeMode && activeTab !== "ALL" && !searchQuery.trim() && !savingOrder;

  const persistLayout = async (payload, rollback) => {
    setSavingOrder(true);

    try {
      await axios.patch(`${apiBase}/menu/admin/layout`, payload, {
        withCredentials: true,
      });
    } catch (error) {
      rollback();
      const code = error.response?.data?.code;
      alert(
        code === "ROUTE_NOT_FOUND"
          ? "Menu order could not be saved because this API server does not have the layout route. Use the local backend on port 5000."
          : error.response?.data?.message || "Could not save menu order",
      );
    } finally {
      setSavingOrder(false);
    }
  };

  const stopDrag = () => {
    const drag = dragState.current;
    if (drag?.stop) drag.stop();
    dragState.current = null;
    setDragKey("");
  };

  const beginDrag = (event, state) => {
    event.preventDefault();
    stopDrag();
    const drag = { ...state, pointerId: event.pointerId };
    dragState.current = drag;

    const onMove = (moveEvent) => {
      if (moveEvent.pointerId !== drag.pointerId) return;
      moveEvent.preventDefault();

      if (Math.hypot(moveEvent.clientX - drag.startX, moveEvent.clientY - drag.startY) > 8) {
        drag.moved = true;
      }

      if (!drag.moved) return;

      if (drag.kind === "category") {
        const nextIndex = indexUnderPointer(
          "data-category-index",
          moveEvent.clientX,
          moveEvent.clientY,
        );

        if (nextIndex <= 0 || nextIndex === drag.index) return;

        const names = [...drag.order];
        const [moved] = names.splice(drag.index - 1, 1);
        names.splice(nextIndex - 1, 0, moved);
        drag.index = nextIndex;
        drag.order = names;
        setCategoryOrder(names);
        return;
      }

      const nextIndex = indexUnderPointer(
        "data-item-index",
        moveEvent.clientX,
        moveEvent.clientY,
      );

      if (nextIndex < 0 || nextIndex === drag.index) return;

      const ids = [...drag.ids];
      const [moved] = ids.splice(drag.index, 1);
      ids.splice(nextIndex, 0, moved);
      drag.index = nextIndex;
      drag.ids = ids;
      applyItemIds(ids);
    };

    const onUp = (upEvent) => {
      if (upEvent.pointerId !== drag.pointerId) return;
      finishDrag();
    };

    drag.stop = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };

    window.addEventListener("pointermove", onMove, { passive: false });
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  };

  useEffect(() => {
    return () => {
      dragState.current?.stop?.();
    };
  }, []);

  const finishDrag = () => {
    const drag = dragState.current;
    if (!drag) return;
    if (drag.stop) drag.stop();
    dragState.current = null;
    setDragKey("");

    if (drag.kind === "category") {
      if (!drag.moved) {
        setActiveTab(drag.origin[drag.index - 1] || "ALL");
        return;
      }

      if (drag.order.join("\u0000") === drag.origin.join("\u0000")) return;

      const next = drag.order;
      const previous = drag.origin;
      setCategoryOrder(next);
      persistLayout({ categoryOrder: next }, () => setCategoryOrder(previous));
      return;
    }

    if (!drag.moved) return;

    const rows = drag.ids.map((id, sortOrder) => ({ id, sortOrder }));
    const payload =
      drag.category === "COMBO" ? { combos: rows } : { items: rows };

    persistLayout(payload, () => {
      setItems(drag.originItems);
      setCombos(drag.originCombos);
    });
  };

  const onCategoryPointerDown = (event, index) => {
    if (!arrangeMode || savingOrder || index === 0) return;

    beginDrag(event, {
      kind: "category",
      index,
      origin: categories.slice(1),
      order: categories.slice(1),
      startX: event.clientX,
      startY: event.clientY,
      moved: false,
    });
    setDragKey(`category:${categories[index]}`);
  };

  const onItemPointerDown = (event, product, index) => {
    if (!canArrangeItems) return;

    event.stopPropagation();
    beginDrag(event, {
      kind: "item",
      index,
      ids: filteredCatalog.map((entry) => String(entry._id)),
      originItems: items,
      originCombos: combos,
      startX: event.clientX,
      startY: event.clientY,
      moved: false,
      category: activeTab,
    });
    setDragKey(`item:${product._id}`);
  };

  const applyItemIds = (ids) => {
    const rank = new Map(ids.map((id, index) => [id, index]));

    if (activeTab === "COMBO") {
      setCombos((prev) =>
        prev.map((combo) =>
          rank.has(String(combo._id))
            ? { ...combo, sortOrder: rank.get(String(combo._id)) }
            : combo,
        ),
      );
      return;
    }

    setItems((prev) =>
      prev.map((item) =>
        rank.has(String(item._id))
          ? { ...item, sortOrder: rank.get(String(item._id)) }
          : item,
      ),
    );
  };

  // Quick lookup so product cards can show "already in cart" quantity badges
  const cartQtyMap = useMemo(() => {
    const map = {};
    for (const line of cart) {
      const catalogId = String(line._id);
      map[catalogId] = (map[catalogId] || 0) + Number(line.quantity || 0);
    }
    return map;
  }, [cart]);

  const addToCart = (product) => {
    const catalogId = product._id;
    setCart((prev) => {
      const exist = prev.find(
        (i) =>
          i._id === catalogId &&
          !normalizeSpecialInstructions(i.specialInstructions || ""),
      );
      if (exist) {
        return prev.map((i) =>
          i.cartLineId === exist.cartLineId
            ? { ...i, quantity: i.quantity + 1 }
            : i,
        );
      }
      return [
        ...prev,
        {
          ...product,
          cartLineId: createCartLineId(),
          quantity: 1,
          specialInstructions: "",
          itemModel: product.catalogType === "COMBO" ? "Combo" : "MenuItem",
        },
      ];
    });
  };

  const updateQty = (cartLineId, delta) => {
    setCart((prev) =>
      prev
        .map((i) =>
          i.cartLineId === cartLineId
            ? { ...i, quantity: Math.max(1, i.quantity + delta) }
            : i,
        )
        .filter((i) => i.quantity > 0),
    );
  };

  const removeFromCart = (cartLineId) => {
    setCart((prev) => prev.filter((i) => i.cartLineId !== cartLineId));
  };

  const updateCartLineInstructions = (cartLineId, nextRaw) => {
    setCart((prev) =>
      prev.map((i) =>
        i.cartLineId === cartLineId
          ? {
              ...i,
              specialInstructions: String(nextRaw || "").slice(
                0,
                SPECIAL_INSTRUCTIONS_MAX,
              ),
            }
          : i,
      ),
    );
  };

  const commitCartLineInstructions = (cartLineId) => {
    setCart((prev) => {
      const line = prev.find((i) => i.cartLineId === cartLineId);
      if (!line) return prev;
      const nextInstructions = normalizeSpecialInstructions(
        line.specialInstructions,
      );
      const duplicate = prev.find(
        (i) =>
          i.cartLineId !== cartLineId &&
          i._id === line._id &&
          normalizeSpecialInstructions(i.specialInstructions) ===
            nextInstructions,
      );
      if (duplicate) {
        return prev
          .map((i) => {
            if (i.cartLineId === duplicate.cartLineId) {
              return {
                ...i,
                specialInstructions: nextInstructions,
                quantity: i.quantity + line.quantity,
              };
            }
            return i;
          })
          .filter((i) => i.cartLineId !== cartLineId);
      }
      return prev.map((i) =>
        i.cartLineId === cartLineId
          ? { ...i, specialInstructions: nextInstructions }
          : i,
      );
    });
  };
  const subtotal = cart.reduce((sum, i) => sum + i.price * i.quantity, 0);

  // 🔑 FIX: total discount ke sath-sath per-item discount bhi track karo,
  // taaki order place karte waqt har item ke sath uska apna discount save ho
  // (backend cancelOrderItem isi field se sahi recalculation karta hai)
  const { appliedDiscount, itemDiscountMap } = useMemo(() => {
    if (!offers.length || !cart.length) {
      return {
        appliedDiscount: 0,
        itemDiscountMap: {},
      };
    }

    const now = Date.now();

    let totalDiscount = 0;
    const map = {};

    cart.forEach((item) => {
      // Backend offer engine combos par offer apply nahi karta.
      if (item.catalogType === "COMBO") {
        return;
      }

      const itemTotalPrice =
        Number(item.price || 0) * Number(item.quantity || 0);

      if (itemTotalPrice <= 0) {
        return;
      }

      // ---------------------------------------------
      // ONLY CURRENTLY ACTIVE OFFERS
      // ---------------------------------------------
      const activeOffers = offers.filter((offer) => {
        // Manually inactive offer
        if (offer?.isActive === false) {
          return false;
        }

        const startsAt = offer?.startsAt
          ? new Date(offer.startsAt).getTime()
          : null;

        const expiresAt = offer?.expiresAt
          ? new Date(offer.expiresAt).getTime()
          : null;

        // Scheduled -> abhi apply nahi hoga
        if (startsAt !== null && Number.isFinite(startsAt) && startsAt > now) {
          return false;
        }

        // Expired -> apply nahi hoga
        if (
          expiresAt !== null &&
          Number.isFinite(expiresAt) &&
          expiresAt <= now
        ) {
          return false;
        }

        return true;
      });

      if (!activeOffers.length) {
        return;
      }

      // ---------------------------------------------
      // FIND ALL OFFERS APPLICABLE TO THIS ITEM
      // ---------------------------------------------
      const applicableOffers = activeOffers.filter((offer) => {
        const targetItems = Array.isArray(offer?.targetItems)
          ? offer.targetItems
          : [];

        // ALL_ITEMS
        if (offer?.targetScope === "ALL_ITEMS") {
          return true;
        }

        // SPECIFIC_ITEMS
        if (targetItems.length > 0) {
          return targetItems.some(
            (target) => String(target?._id || target) === String(item._id),
          );
        }

        return false;
      });

      if (!applicableOffers.length) {
        return;
      }

      // ---------------------------------------------
      // CALCULATE REAL DISCOUNT VALUE
      // IMPORTANT:
      // PERCENTAGE and FLAT cannot be compared by
      // discountValue directly.
      // ---------------------------------------------
      let bestDiscount = 0;

      applicableOffers.forEach((offer) => {
        const discountType = String(
          offer?.discountType || "PERCENTAGE",
        ).toUpperCase();

        const discountValue = Number(offer?.discountValue || 0);

        if (!Number.isFinite(discountValue) || discountValue <= 0) {
          return;
        }

        let discount = 0;

        if (discountType === "PERCENTAGE") {
          discount = Math.round((itemTotalPrice * discountValue) / 100);
        } else if (discountType === "FLAT") {
          // Flat discount = per eligible order line
          // and cannot exceed that line's subtotal.
          discount = Math.min(
            Math.round(discountValue),
            Math.round(itemTotalPrice),
          );
        }

        // Safety: discount can never exceed item subtotal
        discount = Math.min(Math.max(0, discount), Math.round(itemTotalPrice));

        // Multiple offers do not stack.
        // Use the maximum actual discount.
        if (discount > bestDiscount) {
          bestDiscount = discount;
        }
      });

      if (bestDiscount > 0) {
        map[item.cartLineId || item._id] = bestDiscount;
        totalDiscount += bestDiscount;
      }
    });

    return {
      appliedDiscount: Math.round(totalDiscount),
      itemDiscountMap: map,
    };
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
      return resolveMediaUrl(path, apiBase);
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

          .receipt.template-minimal { padding: 12px 10px; font-family: Arial, sans-serif; }
          .receipt.template-minimal .shop-name { font-size: 15px; text-transform: uppercase; }
          .receipt.template-minimal .divider-solid { border-top-width: 1px; }
          .receipt.template-elegant { width: 340px; padding: 24px 20px 18px; font-family: Georgia, serif; }
          .receipt.template-elegant .shop-name { font-size: 20px; letter-spacing: 1px; }
          .receipt.template-elegant .divider-solid { border-top: 1px solid #a16207; }
          .receipt.template-elegant .grand-total { border-top-color: #a16207; font-size: 18px; }
          .receipt.template-bold { width: 360px; padding: 18px; font-family: Arial, sans-serif; }
          .receipt.template-bold .shop-name { font-size: 18px; text-transform: uppercase; }
          .receipt.template-bold .divider-solid { border-top: 4px solid #111; }
          .receipt.template-bold .grand-total { background: #111; color: #fff; padding: 10px 8px; border-top: 0; }
          .receipt.template-terracotta { width: 340px; padding: 24px 20px 18px; font-family: Georgia, serif; color: #3f2923; }
          .receipt.template-terracotta .shop-name { color: #a3482b; font-size: 20px; letter-spacing: 1px; }
          .receipt.template-terracotta .divider-solid { border-top: 1px solid #a3482b; }
          .receipt.template-terracotta .grand-total { border-top-color: #a3482b; color: #a3482b; font-size: 18px; }
          .receipt.template-ledger { width: 360px; padding: 18px; font-family: Arial, sans-serif; }
          .receipt.template-ledger .shop-name { font-size: 18px; text-transform: uppercase; }
          .receipt.template-ledger .divider-solid { border-top: 4px solid #1e293b; }
          .receipt.template-ledger thead td { background: #1e293b; color: #fff; padding: 6px 4px; }
          .receipt.template-ledger .grand-total { border-top: 2px solid #1e293b; font-size: 17px; }
          .receipt {
            background: #fff;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .receipt.template-classic { background: linear-gradient(180deg, #fff 0%, #fffdf9 100%); border-top: 7px solid #111; }
          .receipt.template-classic .shop-name { letter-spacing: 1px; }
          .receipt.template-minimal { background-color: #fff; background-image: linear-gradient(#f1f5f9 1px, transparent 1px); background-size: 100% 22px; border: 1px solid #cbd5e1; }
          .receipt.template-elegant { background: #fffcf5; border: 1px solid #e7d7b0; box-shadow: inset 0 0 0 5px #fff8e7; }
          .receipt.template-elegant .shop-logo { border: 1px solid #b8892d; border-radius: 50%; padding: 4px; }
          .receipt.template-bold { background: #f8fafc; border-top: 18px solid #111827; border-bottom: 5px solid #111827; }
          .receipt.template-bold .shop-name { color: #111827; letter-spacing: 1.2px; }
          .receipt.template-terracotta { background: #fff7ed; border: 1px solid #e7a98d; box-shadow: inset 0 0 0 5px #fff1e6; }
          .receipt.template-terracotta .divider { border-top-color: #d98968; }
          .receipt.template-terracotta .shop-line { color: #70483c; }
          .receipt.template-ledger { background: #f8fafc; border: 1px solid #94a3b8; border-top: 14px solid #1e293b; }
          .receipt.template-ledger .shop-line { color: #475569; }
          .receipt.template-ledger .divider { border-top-color: #94a3b8; }
          .receipt.template-midnight { width: 360px; background: #111827; color: #f8fafc; border-top: 12px solid #38bdf8; font-family: Arial, sans-serif; }
          .receipt.template-midnight .shop-name, .receipt.template-midnight .grand-total { color: #7dd3fc; }
          .receipt.template-midnight .shop-line, .receipt.template-midnight .payment-row, .receipt.template-midnight .footer-line { color: #cbd5e1; }
          .receipt.template-midnight .divider, .receipt.template-midnight .divider-solid, .receipt.template-midnight .grand-total { border-color: #475569; }
          .receipt.template-saffron { width: 340px; background: #fffaf0; color: #422006; border: 2px solid #f59e0b; font-family: Georgia, serif; }
          .receipt.template-saffron .shop-name { color: #b45309; font-size: 20px; }
          .receipt.template-saffron .divider-solid { border-color: #f59e0b; }
          .receipt.template-coastal { width: 340px; background: #f0fdfa; color: #134e4a; border-top: 10px solid #0f766e; font-family: Arial, sans-serif; }
          .receipt.template-coastal .shop-name { color: #0f766e; }
          .receipt.template-coastal .divider { border-color: #5eead4; }
          .receipt.template-botanical { width: 340px; background: #f3f7f0; color: #263b2a; border: 1px solid #9caf88; font-family: Georgia, serif; }
          .receipt.template-botanical .shop-name { color: #3f6212; font-size: 20px; }
          .receipt.template-botanical .grand-total { border-color: #84a66d; color: #3f6212; }
          .receipt.template-monogram { width: 360px; background: #18181b; color: #fafafa; border: 3px solid #d4af37; font-family: Georgia, serif; }
          .receipt.template-monogram .shop-name, .receipt.template-monogram .grand-total { color: #f5d76e; }
          .receipt.template-monogram .shop-line, .receipt.template-monogram .payment-row, .receipt.template-monogram .footer-line { color: #d4d4d8; }
          .receipt.template-monogram .divider, .receipt.template-monogram .divider-solid, .receipt.template-monogram .grand-total { border-color: #a38427; }
          .receipt.template-studio { width: 360px; background: #f5f5f4; color: #292524; border: 1px solid #78716c; font-family: Arial, sans-serif; }
          .receipt.template-studio thead td { background: #292524; color: #fff; padding: 6px 4px; }
          .receipt.template-studio .grand-total { background: #d6d3d1; padding: 8px; border: 0; }
          .receipt.template-noir { width: 300px; background: #000; color: #fff; border-top: 8px solid #fff; font-family: 'Courier New', monospace; }
          .receipt.template-noir .shop-name, .receipt.template-noir .grand-total { color: #fff; }
          .receipt.template-noir .shop-line, .receipt.template-noir .payment-row, .receipt.template-noir .footer-line { color: #d4d4d4; }
          .receipt.template-noir .divider, .receipt.template-noir .divider-solid, .receipt.template-noir .grand-total { border-color: #737373; }
          .receipt.template-heritage { width: 340px; background: #f5efe3; color: #3f3125; border: 1px solid #b89b72; font-family: Georgia, serif; }
          .receipt.template-heritage .shop-name { color: #6b4423; font-size: 20px; }
          .receipt.template-heritage .divider, .receipt.template-heritage .divider-solid, .receipt.template-heritage .grand-total { border-color: #9a744c; }
        </style>
      </head>

      <body>
        <div class="receipt template-${selectedBillTemplate}">

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
              ${String(billOrder.customerName || "Walk-in Customer")
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")}
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

  const handleParcelOrder = async (targetOrderId) => {
    if (cart.length === 0) {
      return alert("Cart is empty!");
    }

    const customerName = customerNameInput.trim();
    setLoading(true);

    try {
      const orderPayload = {
        orderType: "PARCEL",
        ...(targetOrderId ? { targetOrderId } : {}),
        ...(!targetOrderId && customerName ? { customerName } : {}),

        items: cart.map((i) => ({
          menuItem: i.catalogType === "ITEM" ? i._id : undefined,
          combo: i.catalogType === "COMBO" ? i._id : undefined,
          catalogType: i.catalogType,
          name: i.name,
          price: i.price,
          quantity: i.quantity,
          itemModel: i.itemModel,
          discount: itemDiscountMap[i.cartLineId || i._id] || 0,
          specialInstructions: normalizeSpecialInstructions(
            i.specialInstructions || "",
          ),
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
          headers: {
            "Idempotency-Key": crypto.randomUUID(),
          },
        },
      );

      // Backend se created order lo
      const createdOrder = res.data?.data || res.data?.order;

      setCart([]);
      if (!targetOrderId) setCustomerNameInput("");
      setShowParcelModal(false);

      showSuccess(
        targetOrderId
          ? "Items added to the same parcel"
          : "Parcel order sent to Live Orders!",
      );
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
            discount: itemDiscountMap[i.cartLineId || i._id] || 0, // 🆕 per-item discount
            specialInstructions: normalizeSpecialInstructions(
              i.specialInstructions || "",
            ),
          })),
          subtotal,
          discount: appliedDiscount,
          tax: 0,
          total,
        },
        {
          withCredentials: true,
          headers: {
            "Idempotency-Key": crypto.randomUUID(),
          },
        },
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

  const handleNewTableOrderSubmit = async () => {
    if (!newTableNumber) {
      return alert("Please select a table!");
    }

    if (cart.length === 0) {
      return alert("Cart is empty!");
    }

    setLoading(true);

    try {
      const payload = {
        tableNumber: newTableNumber,
        ...(customerNameInput.trim()
          ? { customerName: customerNameInput.trim() }
          : {}),

        // 🔒 Backend price/name/discount verify karega.
        // Client totals sirf UI ke liye hain.
        items: cart.map((i) => ({
          menuItem: i.catalogType === "ITEM" ? i._id : undefined,

          combo: i.catalogType === "COMBO" ? i._id : undefined,

          catalogType: i.catalogType,

          name: i.name,
          price: i.price,
          quantity: i.quantity,

          itemModel: i.itemModel,

          discount: itemDiscountMap[i.cartLineId || i._id] || 0,
          specialInstructions: normalizeSpecialInstructions(
            i.specialInstructions || "",
          ),
        })),
      };

      const res = await axios.post(
        `${apiBase}/orders/counter-new-table`,
        payload,
        {
          withCredentials: true,
          headers: {
            "Idempotency-Key": crypto.randomUUID(),
          },
          timeout: 15000,
        },
      );

      const createdOrder = res.data?.order ?? res.data?.data;

      if (!createdOrder) {
        throw new Error("Server did not return the created order");
      }

      setCart([]);

      setNewTableNumber("");
      setCustomerNameInput("");

      setShowNewTableModal(false);

      showSuccess(`New order created for Table ${createdOrder.tableNumber}!`);
    } catch (err) {
      console.error("New table order error:", err);

      const status = err?.response?.status;

      if (status === 409) {
        alert(
          err?.response?.data?.message ||
            "This table already has a running order. Use Add to Table.",
        );
      } else {
        alert(
          err?.response?.data?.message ||
            err?.message ||
            "Failed to create new table order",
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const cartItemCount = cart.reduce((acc, i) => acc + i.quantity, 0);

  const submitCurrentOrder = () => {
    if (cart.length === 0) return alert("Cart is empty!");

    if (orderMode === "PARCEL") {
      if (openParcels.length > 0) {
        setShowParcelModal(true);
        return;
      }
      handleParcelOrder();
      return;
    }

    if (orderMode === "NEW_TABLE") {
      if (!newTableNumber) {
        setShowNewTableModal(true);
        return;
      }
      handleNewTableOrderSubmit();
      return;
    }

    if (!selectedTable) {
      setShowTableModal(true);
      return;
    }
    handleAddToTableSubmit();
  };

  const menuImage = (image) => resolveMediaUrl(image, apiBase);

  return (
    <>
      {/* Toast — kept minimal, docket-tinted */}
      {showSuccessPopup && (
        <div className="fixed top-6 right-6 z-[9999] animate-in slide-in-from-right-5 fade-in duration-300">
          <div className="flex items-start gap-3 bg-white border border-slate-200 border-l-4 border-l-emerald-500 shadow-2xl rounded-2xl px-5 py-4 w-[calc(100%-2rem)] max-w-sm">
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

      <div className="-mx-4 -mt-4 mb-24 bg-[var(--background)] px-4 pb-6 pt-4 font-sans md:-mx-6 lg:-mx-8 lg:mb-0 lg:px-5">
        <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="min-w-0 space-y-4">
            <div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.9fr)]">
              <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[var(--primary)] via-[var(--primary)] to-[var(--secondary)] p-5 text-white shadow-sm min-h-[156px]">
                <div className="relative z-10 max-w-md">
                  <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-white/20">
                    <ChefHat className="h-6 w-6" />
                  </div>
                  <h1 className="text-2xl font-black tracking-tight">Create Amazing Orders</h1>
                  <p className="mt-1 text-sm font-semibold text-white/90">Quick • Easy • Professional</p>
                  <p className="mt-2 max-w-sm text-xs leading-relaxed text-white/85">
                    Select items from the menu and create orders for dine-in, parcel or a new table.
                  </p>
                </div>
                <div className="pointer-events-none absolute -right-6 -bottom-8 hidden h-40 w-40 rounded-full bg-white/10 sm:block" />
                <div className="pointer-events-none absolute right-10 top-6 hidden h-16 w-16 rounded-full bg-white/10 sm:block" />
              </div>

              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "DINE_IN", title: "Dine In", hint: "Add to a running table", icon: Utensils, tint: "bg-emerald-50 text-emerald-600" },
                  { id: "PARCEL", title: "Parcel", hint: "Takeaway order", icon: ShoppingBag, tint: "bg-rose-50 text-rose-500" },
                  { id: "NEW_TABLE", title: "New Table", hint: "Start a free table", icon: Plus, tint: "bg-sky-50 text-sky-600" },
                ].map((mode) => {
                  const ModeIcon = mode.icon;
                  const active = orderMode === mode.id;
                  return (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => setOrderMode(mode.id)}
                      className={`flex flex-col items-center justify-center rounded-2xl border bg-white px-2 py-4 text-center shadow-sm transition ${
                        active ? "border-rose-300 ring-2 ring-rose-100" : "border-slate-100 hover:border-rose-200"
                      }`}
                    >
                      <span className={`mb-2 flex h-10 w-10 items-center justify-center rounded-2xl ${mode.tint}`}>
                        <ModeIcon className="h-5 w-5" />
                      </span>
                      <span className="text-sm font-black text-slate-900">{mode.title}</span>
                      <span className="mt-0.5 hidden text-[10px] font-medium text-slate-400 sm:block">{mode.hint}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className={`flex items-stretch gap-2 overflow-x-auto no-scrollbar pb-1 ${arrangeMode ? "touch-none" : ""}`}>
              {categories.map((cat, index) => {
                const Icon = categoryIcon(cat);
                const count = catalog.filter((item) => cat === "ALL" || item.category === cat).length;
                const active = activeTab === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    data-category-index={index}
                    onClick={() => {
                      if (!arrangeMode || cat === "ALL") setActiveTab(cat);
                    }}
                    onPointerDown={(event) => onCategoryPointerDown(event, index)}
                    className={`flex shrink-0 items-center gap-2 rounded-2xl border px-3 py-2 text-left touch-none ${
                      active
                        ? "border-[var(--primary)] bg-[var(--primary-light)] text-[var(--primary-dark)] shadow-sm"
                        : "border-[var(--border)] bg-white text-[var(--text-secondary)] hover:border-[var(--primary)]/40"
                    } ${dragKey === `category:${cat}` ? "opacity-60" : ""} ${
                      arrangeMode && cat !== "ALL" ? "cursor-grab active:cursor-grabbing" : ""
                    }`}
                  >
                    {arrangeMode && cat !== "ALL" ? (
                      <GripVertical className="h-4 w-4 shrink-0" />
                    ) : (
                      <Icon
                        className={`h-4 w-4 shrink-0 ${
                          active ? "text-[var(--primary)]" : "text-[var(--text-muted)]"
                        }`}
                      />
                    )}
                    <span className="min-w-0">
                      <span className="block whitespace-nowrap text-xs font-black leading-tight">
                        {categoryLabel(cat)}
                      </span>
                      <span
                        className={`block whitespace-nowrap text-[10px] font-medium ${
                          active ? "text-[var(--primary)]/70" : "text-[var(--text-muted)]"
                        }`}
                      >
                        {count} item{count === 1 ? "" : "s"}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative min-w-[200px] flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  ref={searchRef}
                  type="text"
                  placeholder="Search dishes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-16 text-sm text-slate-800 outline-none focus:border-rose-300 focus:ring-2 focus:ring-rose-100"
                />
                <span className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded-md border border-slate-200 px-1.5 py-0.5 text-[10px] font-bold text-slate-400 sm:inline">
                  Ctrl K
                </span>
              </div>
              <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold text-slate-600">
                Sort:
                <select
                  value={arrangeMode ? "default" : sortMode}
                  disabled={arrangeMode}
                  onChange={(event) => setSortMode(event.target.value)}
                  className="bg-transparent outline-none"
                >
                  <option value="default">Default</option>
                  <option value="name">Name</option>
                  <option value="price">Price</option>
                </select>
              </label>
              <button
                type="button"
                disabled={arrangeMode}
                onClick={() => setOffersOnly((current) => !current)}
                className={`flex items-center gap-1.5 rounded-xl border px-3 py-2.5 text-xs font-black ${
                  offersOnly
                    ? "border-rose-500 bg-rose-500 text-white"
                    : "border-orange-200 bg-orange-50 text-orange-600"
                }`}
              >
                <Flame className="h-3.5 w-3.5" /> Offers
              </button>
              <button
                type="button"
                onClick={() => setArrangeMode((current) => !current)}
                disabled={savingOrder}
                className={`rounded-xl border px-3 py-2.5 text-xs font-black ${
                  arrangeMode
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-rose-200 bg-white text-rose-500"
                }`}
              >
                {savingOrder ? "Saving..." : arrangeMode ? "Done arranging" : "Arrange"}
              </button>
              <Link
                to="/table-monitor"
                className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-black text-slate-600"
              >
                Table View
              </Link>
            </div>

            {arrangeMode && activeTab === "ALL" && (
              <p className="text-xs font-semibold text-slate-500">
                Category order is ready. Open one category to drag its dishes.
              </p>
            )}
            {arrangeMode && activeTab !== "ALL" && searchQuery.trim() && (
              <p className="text-xs font-semibold text-slate-500">
                Clear search before dragging dishes.
              </p>
            )}

            {fetchingData ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
                {Array.from({ length: 8 }).map((_, idx) => (
                  <div key={idx} className="animate-pulse rounded-2xl border border-slate-100 bg-white p-2.5">
                    <div className="mb-3 h-28 rounded-xl bg-slate-100" />
                    <div className="mb-2 h-3 w-3/4 rounded bg-slate-100" />
                    <div className="h-8 rounded-xl bg-slate-100" />
                  </div>
                ))}
              </div>
            ) : visibleCatalog.length === 0 ? (
              <div className="flex h-72 flex-col items-center justify-center rounded-2xl border border-slate-100 bg-white text-center">
                <UtensilsCrossed className="mb-2 h-10 w-10 text-slate-300" />
                <p className="text-sm font-bold text-slate-800">No menu items found</p>
                <p className="mt-1 text-xs text-slate-400">Try another category or clear the search.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
                {visibleCatalog.map((product, index) => {
                  const isCombo = product.catalogType === "COMBO";
                  const qtyInCart = cartQtyMap[product._id];
                  const image = menuImage(product.image);
                  return (
                    <div
                      key={product._id}
                      data-item-index={index}
                      onClick={() => {
                        if (!arrangeMode) addToCart(product);
                      }}
                      onPointerDown={(event) => onItemPointerDown(event, product, index)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (arrangeMode) return;
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          addToCart(product);
                        }
                      }}
                      className={`rounded-2xl border p-2.5 text-left shadow-sm transition ${
                        canArrangeItems ? "touch-none cursor-grab active:cursor-grabbing" : "cursor-pointer"
                      } ${
                        qtyInCart
                          ? "border-[var(--primary)] bg-[var(--primary-light)] ring-2 ring-[rgba(244,63,94,0.16)]"
                          : "border-[var(--border)] bg-white hover:border-[var(--primary)]/35"
                      } ${
                        dragKey === `item:${product._id}` ? "opacity-60" : ""
                      }`}
                    >
                      <div className="relative mb-2 h-28 overflow-hidden rounded-xl bg-slate-100">
                        {image ? (
                          <img src={image} alt={product.name} className="h-full w-full object-cover" loading="lazy" decoding="async" />
                        ) : (
                          <div className="flex h-full items-center justify-center text-slate-300">
                            <UtensilsCrossed className="h-8 w-8" />
                          </div>
                        )}
                        {isCombo && (
                          <span className="absolute left-2 top-2 rounded-full bg-[var(--secondary)] px-2 py-0.5 text-[10px] font-black text-white">
                            Combo
                          </span>
                        )}
                        {qtyInCart > 0 && (
                          <span className="absolute right-2 top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--primary)] px-1 text-[10px] font-black text-white">
                            {qtyInCart}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 px-0.5">
                        <span className={`h-2 w-2 shrink-0 rounded-full ${product.isVeg === false ? "bg-[var(--nonveg)]" : "bg-[var(--veg)]"}`} />
                        <h4 className="truncate text-sm font-bold text-[var(--text-primary)]">{product.name}</h4>
                      </div>
                      <p className="mt-1 px-0.5 text-sm font-black text-[var(--text-primary)]">₹{product.price}</p>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          if (!arrangeMode) addToCart(product);
                        }}
                        className={`mt-2 w-full rounded-xl border py-1.5 text-sm font-bold transition ${
                          qtyInCart
                            ? "border-[var(--primary)] bg-[var(--primary)] text-white hover:bg-[var(--primary-dark)]"
                            : "border-[var(--primary)]/30 text-[var(--primary)] hover:bg-[var(--primary-light)]"
                        }`}
                      >
                        {qtyInCart ? `Added · ${qtyInCart}` : "+ Add"}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div
            className={`fixed inset-x-0 bottom-0 z-40 flex flex-col overflow-hidden rounded-t-3xl border border-[var(--border)] bg-white shadow-[0_-8px_30px_rgba(15,23,42,0.12)] transition-[max-height] duration-300 lg:sticky lg:top-4 lg:z-20 lg:h-[calc(100vh-7.5rem)] lg:max-h-[calc(100vh-7.5rem)] lg:self-start lg:rounded-3xl lg:shadow-[var(--shadow-card)] ${
              mobileCartOpen ? "max-h-[82vh]" : "max-h-[132px]"
            }`}
          >
            <button
              type="button"
              onClick={() => setMobileCartOpen((open) => !open)}
              className="flex items-center justify-between border-b border-slate-100 px-4 py-3 lg:hidden"
            >
              <span className="text-xs font-bold text-slate-700">
                {cartItemCount} item{cartItemCount === 1 ? "" : "s"} · ₹{Number(total).toLocaleString("en-IN")}
              </span>
              {mobileCartOpen ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronUp className="h-4 w-4 text-slate-400" />}
            </button>

            <div className={`${mobileCartOpen ? "flex" : "hidden"} min-h-0 flex-1 flex-col lg:flex`}>
              <div className="flex items-center justify-between px-4 pb-2 pt-4">
                <h3 className="text-base font-black text-slate-900">Current Order</h3>
                <button
                  type="button"
                  onClick={() => setCart([])}
                  disabled={cart.length === 0}
                  className="text-xs font-bold text-[var(--primary)] disabled:text-slate-300"
                >
                  Clear All
                </button>
              </div>

              <div className="mx-4 grid grid-cols-3 gap-1 rounded-2xl bg-slate-50 p-1">
                {[
                  { id: "DINE_IN", label: "Dine In", icon: UtensilsCrossed },
                  { id: "PARCEL", label: "Parcel", icon: ShoppingBag },
                  { id: "NEW_TABLE", label: "Table", icon: Plus },
                ].map((mode) => {
                  const ModeIcon = mode.icon;
                  const active = orderMode === mode.id;
                  return (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => setOrderMode(mode.id)}
                      className={`flex items-center justify-center gap-1 rounded-xl py-2 text-[11px] font-black ${
                        active
                          ? "bg-[var(--primary)] text-white shadow-sm"
                          : "text-slate-500"
                      }`}
                    >
                      <ModeIcon className="h-3.5 w-3.5" />
                      {mode.label}
                    </button>
                  );
                })}
              </div>

              <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-4 py-3">
                {orderMode === "PARCEL" ? (
                  <p className="mb-3 rounded-xl bg-[var(--primary-light)] px-3 py-2 text-[11px] font-semibold text-[var(--primary-dark)]">
                    {openParcels.length > 0
                      ? "An open parcel is already running. Create Order will let you add these items to it, or start a new parcel."
                      : "This order will be sent as a new parcel."}
                  </p>
                ) : (
                  <div className="mb-3 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[11px] font-bold text-slate-500">
                        {orderMode === "NEW_TABLE" ? "Free table" : "Running table"}
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          if (orderMode === "NEW_TABLE") setShowNewTableModal(true);
                          else setShowTableModal(true);
                        }}
                        className="text-[11px] font-bold text-[var(--primary)]"
                      >
                        View Tables
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        if (orderMode === "NEW_TABLE") setShowNewTableModal(true);
                        else setShowTableModal(true);
                      }}
                      className={`flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-left transition ${
                        (orderMode === "NEW_TABLE" ? newTableNumber : selectedTable)
                          ? "border-[var(--primary)] bg-[var(--primary-light)]"
                          : "border-[var(--border)] bg-white hover:border-[var(--primary)]/35"
                      }`}
                    >
                      <span>
                        <span className="block text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                          {orderMode === "NEW_TABLE" ? "Selected free table" : "Selected running table"}
                        </span>
                        <span className="mt-0.5 block text-sm font-black text-slate-900">
                          {orderMode === "NEW_TABLE"
                            ? newTableNumber
                              ? `Table ${newTableNumber}`
                              : "Tap to choose a free table"
                            : selectedTable
                              ? `Table ${selectedTable}`
                              : "Tap to choose a running table"}
                        </span>
                      </span>
                      <span className="rounded-lg bg-white px-2 py-1 text-[10px] font-black text-[var(--primary)] shadow-sm">
                        {orderMode === "NEW_TABLE"
                          ? `${freeTables.length} free`
                          : `${activeTables.length} active`}
                      </span>
                    </button>
                  </div>
                )}

                {cart.length === 0 ? (
                  <div className="py-8 text-center">
                    <ShoppingBag className="mx-auto mb-2 h-8 w-8 text-slate-200" />
                    <p className="text-xs font-bold text-slate-400">Cart is empty</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {cart.map((item) => {
                      const image = menuImage(item.image);
                      const lineId = item.cartLineId || item._id;
                      const draft = String(item.specialInstructions || "");
                      const lineDiscount =
                        itemDiscountMap[lineId] || itemDiscountMap[item._id] || 0;
                      return (
                        <div key={lineId} className="space-y-1.5">
                          <div className="flex items-center gap-2">
                            <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-slate-100">
                              {image ? (
                                <img src={image} alt="" className="h-full w-full object-cover" loading="lazy" decoding="async" />
                              ) : (
                                <div className="flex h-full items-center justify-center text-slate-300">
                                  <UtensilsCrossed className="h-4 w-4" />
                                </div>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-xs font-bold text-slate-900">{item.name}</p>
                              <p className="text-[11px] font-semibold text-slate-400">₹{item.price}</p>
                              {lineDiscount > 0 && (
                                <p className="text-[10px] font-bold text-emerald-600">-₹{lineDiscount} offer</p>
                              )}
                            </div>
                            <div className="flex items-center gap-1 rounded-full border border-slate-200 px-1 py-0.5">
                              <button type="button" onClick={() => updateQty(lineId, -1)} className="p-1 text-slate-500">
                                <Minus className="h-3 w-3" />
                              </button>
                              <span className="w-4 text-center text-xs font-black">{item.quantity}</span>
                              <button type="button" onClick={() => updateQty(lineId, 1)} className="p-1 text-slate-500">
                                <Plus className="h-3 w-3" />
                              </button>
                            </div>
                            <p className="w-12 text-right text-xs font-black text-slate-800">
                              ₹{(item.price * item.quantity).toFixed(0)}
                            </p>
                            <button type="button" onClick={() => removeFromCart(lineId)} className="text-slate-300 hover:text-rose-500">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          <div className="pl-14">
                            <div className="mb-0.5 flex items-center justify-between gap-2">
                              <label className="text-[10px] font-bold text-slate-400">
                                Special instructions
                              </label>
                              <span className="text-[10px] text-slate-400">
                                {draft.length}/{SPECIAL_INSTRUCTIONS_MAX}
                              </span>
                            </div>
                            <textarea
                              rows={2}
                              maxLength={SPECIAL_INSTRUCTIONS_MAX}
                              value={draft}
                              onChange={(e) =>
                                updateCartLineInstructions(lineId, e.target.value)
                              }
                              onBlur={() => commitCartLineInstructions(lineId)}
                              placeholder="e.g. less spicy, no onions..."
                              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-[11px] text-slate-700 outline-none focus:border-slate-400 resize-none"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="shrink-0 space-y-3 border-t border-slate-100 px-4 py-3">
              <div className={`${mobileCartOpen ? "space-y-3" : "hidden"} lg:block lg:space-y-3`}>
                <div>
                  <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold text-slate-500">
                    <UserRound className="h-3.5 w-3.5" /> Customer Details (Optional)
                  </p>
                  <input
                    type="text"
                    value={customerNameInput}
                    maxLength={60}
                    onChange={(event) => setCustomerNameInput(event.target.value)}
                    placeholder="Customer Name"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:border-rose-300 focus:bg-white"
                  />
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between text-slate-500">
                    <span>Item Total ({cartItemCount} item{cartItemCount === 1 ? "" : "s"})</span>
                    <span className="font-semibold text-slate-700">₹{Number(subtotal).toLocaleString("en-IN")}</span>
                  </div>
                  {appliedDiscount > 0 && (
                    <div className="flex justify-between font-semibold text-emerald-600">
                      <span>Discount</span>
                      <span>-₹{Number(appliedDiscount).toLocaleString("en-IN")}</span>
                    </div>
                  )}
                  <div className="flex items-end justify-between pt-1">
                    <span className="font-black text-slate-900">Grand Total</span>
                    <span className="text-xl font-black text-slate-900">₹{Number(total).toLocaleString("en-IN")}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={submitCurrentOrder}
                  disabled={loading || cart.length === 0}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-rose-500 py-3.5 text-sm font-black text-white shadow-sm shadow-rose-200 hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ReceiptText className="h-4 w-4" />}
                  {loading ? "Sending..." : "Create Order"}
                  {!loading && <ArrowRight className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {showParcelModal && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-[2px] flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-sm space-y-4 shadow-2xl border border-slate-100">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-black text-slate-900 text-base tracking-tight">
                    Parcel
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Start a new parcel, or add these items to an open one.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (!loading) setShowParcelModal(false);
                  }}
                  className="text-slate-400 hover:text-slate-700 transition-colors p-1"
                >
                  <X size={18} />
                </button>
              </div>
              <input
                type="text"
                value={customerNameInput}
                maxLength={60}
                onChange={(event) => setCustomerNameInput(event.target.value)}
                placeholder="Customer name for a new parcel (optional)"
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:border-rose-400"
              />
              <div className="space-y-2 max-h-52 overflow-y-auto">
                {openParcels.map((parcel) => {
                  const activeCount = (parcel.items || []).filter(
                    (item) => item?.status !== "REJECTED",
                  ).length;
                  return (
                    <button
                      key={parcel._id}
                      type="button"
                      disabled={loading}
                      onClick={() => handleParcelOrder(parcel._id)}
                      className="w-full text-left px-3 py-2.5 rounded-xl border border-slate-200 hover:border-rose-300 hover:bg-rose-50 disabled:opacity-50"
                    >
                      <span className="block text-xs font-black text-slate-900">
                        {parcel.orderId} · {parcel.customerName || "Counter Parcel"}
                      </span>
                      <span className="block text-[11px] text-slate-500 mt-0.5">
                        Add to this parcel · {activeCount} item
                        {activeCount === 1 ? "" : "s"}
                      </span>
                    </button>
                  );
                })}
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowParcelModal(false)}
                  disabled={loading}
                  className="flex-1 py-3 border border-slate-200 rounded-xl font-bold text-xs text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleParcelOrder()}
                  disabled={loading || cart.length === 0}
                  className="flex-1 py-3 bg-rose-600 text-white rounded-xl font-bold text-xs hover:bg-rose-700 disabled:opacity-50"
                >
                  {loading ? "Sending..." : "New parcel"}
                </button>
              </div>
            </div>
          </div>
        )}
        {/* Table Selection Modal — running tables */}
        {showTableModal && (
          <div
            className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-[2px]"
            onClick={() => !loading && setShowTableModal(false)}
            role="presentation"
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="running-table-modal-title"
              onClick={(event) => event.stopPropagation()}
              className="flex max-h-[min(88vh,640px)] w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-[var(--border)] bg-white shadow-2xl"
            >
              <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
                <div>
                  <h3
                    id="running-table-modal-title"
                    className="text-base font-black tracking-tight text-slate-900"
                  >
                    Select Running Table
                  </h3>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Choose an active table, then confirm to push cart items.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => !loading && setShowTableModal(false)}
                  className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                  aria-label="Close"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-6">
                {activeTables.length === 0 ? (
                  <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold leading-relaxed text-rose-700">
                    No active running tables right now. Open a table order first, then add items here.
                  </p>
                ) : (
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
                    {activeTables.map((tbl) => {
                      const isSelected = String(selectedTable) === String(tbl);
                      return (
                        <button
                          key={tbl}
                          type="button"
                          onClick={() => setSelectedTable(tbl)}
                          className={`flex aspect-square flex-col items-center justify-center gap-0.5 rounded-2xl border text-xs font-black transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(244,63,94,0.35)] ${
                            isSelected
                              ? "border-[var(--primary)] bg-[var(--primary)] text-white shadow-sm"
                              : "border-[var(--border)] bg-[var(--surface-muted)] text-slate-700 hover:border-[var(--primary)]/40 hover:bg-[var(--primary-light)]"
                          }`}
                        >
                          <span className="text-[9px] font-bold uppercase opacity-70">Table</span>
                          <span className="font-mono text-base">{tbl}</span>
                          <span className={`text-[8px] font-black uppercase ${isSelected ? "text-white/80" : "text-[var(--primary)]"}`}>
                            Active
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {selectedTable ? (
                  <div className="mt-4 flex items-center justify-between rounded-2xl border border-[var(--border)] bg-[var(--primary-light)] px-4 py-3">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Selected</p>
                      <p className="mt-0.5 font-mono text-sm font-black text-slate-900">
                        Table {selectedTable}
                      </p>
                    </div>
                    <span className="rounded-lg bg-white px-2 py-1 text-[10px] font-black text-[var(--primary)]">
                      READY
                    </span>
                  </div>
                ) : null}
              </div>

              <div className="flex gap-2 border-t border-slate-100 px-5 py-4 sm:px-6">
                <button
                  type="button"
                  onClick={() => setShowTableModal(false)}
                  disabled={loading}
                  className="flex-1 rounded-xl border border-slate-200 py-3 text-xs font-bold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAddToTableSubmit}
                  disabled={loading || !selectedTable || cart.length === 0}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--primary)] py-3 text-xs font-bold text-white transition hover:bg-[var(--primary-dark)] disabled:opacity-50"
                >
                  {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {loading ? "Pushing..." : "Confirm & Push"}
                </button>
              </div>
            </div>
          </div>
        )}

        {showNewTableModal && (
          <div
            className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-[2px]"
            onClick={() => {
              if (!loading) {
                setShowNewTableModal(false);
              }
            }}
            role="presentation"
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="new-table-modal-title"
              onClick={(event) => event.stopPropagation()}
              className="flex max-h-[min(88vh,680px)] w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-[var(--border)] bg-white shadow-2xl"
            >
              <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                      <UtensilsCrossed className="h-4 w-4" />
                    </div>
                    <h3
                      id="new-table-modal-title"
                      className="text-base font-black tracking-tight text-slate-900"
                    >
                      New Table Order
                    </h3>
                  </div>
                  <p className="mt-2 text-xs text-slate-500">
                    Pick a free table to start a fresh order.
                  </p>
                  <input
                    type="text"
                    value={customerNameInput}
                    maxLength={60}
                    onChange={(event) => setCustomerNameInput(event.target.value)}
                    placeholder="Customer name (optional)"
                    className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-800 outline-none focus:border-[var(--primary)] focus:ring-4 focus:ring-[rgba(244,63,94,0.12)]"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (!loading) {
                      setShowNewTableModal(false);
                    }
                  }}
                  disabled={loading}
                  className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-40"
                  aria-label="Close"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-6">
                <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                  <p className="text-[11px] font-semibold leading-relaxed text-emerald-800">
                    Only free tables can start a new order. Running tables use Dine In → View Tables.
                  </p>
                </div>

                {freeTables.length === 0 ? (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-5 text-center">
                    <p className="text-xs font-bold text-slate-600">No free tables available</p>
                    <p className="mt-1 text-[11px] text-slate-400">
                      Check table monitor or wait for a table to clear.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
                    {freeTables.map((table, index) => {
                      const tableNumber = getTableNumber(table);
                      if (!tableNumber) return null;
                      const running = getTableRunningStatus(table);
                      const isSelected = String(newTableNumber) === String(tableNumber);
                      return (
                        <button
                          key={table._id || table.id || tableNumber || index}
                          type="button"
                          disabled={loading || running}
                          onClick={() => {
                            if (!running) setNewTableNumber(tableNumber);
                          }}
                          className={`relative flex aspect-square flex-col items-center justify-center gap-1 rounded-2xl border text-xs font-black transition focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 ${
                            running
                              ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400"
                              : isSelected
                                ? "border-emerald-600 bg-emerald-600 text-white shadow-md shadow-emerald-200"
                                : "cursor-pointer border-[var(--border)] bg-white text-slate-700 hover:border-emerald-300 hover:bg-emerald-50"
                          }`}
                        >
                          <span className="text-[9px] uppercase tracking-wide opacity-70">Table</span>
                          <span className="font-mono text-sm">{tableNumber}</span>
                          <span
                            className={`text-[8px] font-black uppercase ${
                              running
                                ? "text-slate-400"
                                : isSelected
                                  ? "text-emerald-100"
                                  : "text-emerald-600"
                            }`}
                          >
                            {running ? "RUNNING" : "FREE"}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {newTableNumber ? (
                  <div className="mt-4 flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <div>
                      <p className="text-[10px] font-bold uppercase text-slate-400">Selected Table</p>
                      <p className="mt-0.5 font-mono text-sm font-black text-slate-900">
                        Table {newTableNumber}
                      </p>
                    </div>
                    <span className="rounded-lg border border-emerald-200 bg-emerald-100 px-2 py-1 text-[10px] font-black text-emerald-700">
                      NEW ORDER
                    </span>
                  </div>
                ) : null}
              </div>

              <div className="flex gap-2 border-t border-slate-100 px-5 py-4 sm:px-6">
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => {
                    setShowNewTableModal(false);
                    setNewTableNumber("");
                  }}
                  className="flex-1 rounded-xl border border-slate-200 py-3 text-xs font-bold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={loading || !newTableNumber || cart.length === 0}
                  onClick={handleNewTableOrderSubmit}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-xs font-bold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                >
                  {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {loading ? "Creating..." : "Create Table Order"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
