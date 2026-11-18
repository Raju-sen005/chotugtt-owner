import { useState, useCallback, useMemo, memo, useEffect, useRef } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { io } from "socket.io-client";
import { orderCategoryNames, sortMenuEntries } from "../../utils/menuOrder";
import {
  ShoppingBag,
  Tag,
  Plus,
  Minus,
  X,
  CheckCircle2,
  Utensils,
  AlertCircle,
  User,
  Phone,
  Search,
  LinkIcon,
  SearchX,
  Leaf,
  Flame,
  Users,
  Clock,
} from "lucide-react";
import {
  formatOrderingAsLabel,
  identityFromSessionPayload,
  isItemAvailable,
  tableWelcomeMessage,
  validateGuestName,
  validateGuestPhone,
} from "./publicMenuUx";
import {
  SPECIAL_INSTRUCTIONS_MAX,
  createCartLineId,
  findCartLineId,
  normalizeSpecialInstructions,
} from "../orders/itemSpecialInstructions";

/* ------------------------------------------------------------------ */
/*  i18n — sirf app-chrome ke labels translate hote hain; backend se   */
/*  aane wale item/category naam translate nahi hote (wo data hai).    */
/* ------------------------------------------------------------------ */

const translations = {
  EN: {
    searchPlaceholder: "Search for your favorite dishes...",
    allMenu: "All Menu",
    vegOnly: "Veg Only",
    specialOffers: "Special Offers",
    combos: "Best Value Combos",
    reviewOrder: "Review Order",
    contactDetails: "Contact Details",
    fullName: "Full Name",
    phoneNumber: "Phone Number",
    yourOrder: "Your Order",
    subtotal: "Subtotal",
    discount: "Special Offer Discount",
    grandTotal: "Grand Total",
    paymentSelection: "Payment Selection",
    upi: "Instant UPI App",
    payAtDesk: "Pay at Desk",
    placingOrder: "Placing Order...",
    confirmOrder: "Confirm Order",
    noDishes: "No dishes found",
    dineIn: "Dine-in order — served directly to your table",
    mergeTable: "Merge with another table",
    mergeTableDesc:
      "Sitting with friends on another table? Combine both orders into one bill.",
    mergeTableInput: "Enter table number",
    mergeTableApply: "Apply",
    mergeTableActive: "Merging with Table",
    // callWaiter: "Call Waiter",
    waiterNotified: "Waiter has been notified!",
    suggestions: "You might also like",
    reorderTitle: "Order this again?",
    reorderDesc: "Add all items from your last order in one tap.",
    reorderCta: "Reorder",
    addNotes: "Special instructions (optional)",
    notesPlaceholder: "e.g. less spicy, no onions...",
    orderConfirmedTitle: "Order Confirmed!",
    // shareWhatsapp: "Share via WhatsApp",
    // rateExperience: "How was your ordering experience?",
    thanksFeedback: "Thanks for your feedback!",
    orderMore: "Order More",
    prepTime: "Est. preparation time",
    refresh: "Refresh Menu",
  },
  HI: {
    searchPlaceholder: "अपनी पसंदीदा डिश खोजें...",
    allMenu: "पूरा मेन्यू",
    vegOnly: "सिर्फ वेज",
    specialOffers: "खास ऑफर",
    combos: "बेस्ट वैल्यू कॉम्बो",
    reviewOrder: "ऑर्डर देखें",
    contactDetails: "संपर्क विवरण",
    fullName: "पूरा नाम",
    phoneNumber: "फ़ोन नंबर",
    yourOrder: "आपका ऑर्डर",
    subtotal: "सबटोटल",
    discount: "विशेष ऑफर छूट",
    grandTotal: "कुल राशि",
    paymentSelection: "भुगतान चुनें",
    upi: "तुरंत UPI ऐप",
    payAtDesk: "डेस्क पर भुगतान करें",
    placingOrder: "ऑर्डर दिया जा रहा है...",
    confirmOrder: "ऑर्डर कन्फर्म करें",
    noDishes: "कोई डिश नहीं मिली",
    dineIn: "डाइन-इन ऑर्डर — सीधे आपकी टेबल पर परोसा जाएगा",
    mergeTable: "दूसरी टेबल के साथ जोड़ें",
    mergeTableDesc:
      "दोस्तों के साथ दूसरी टेबल पर बैठे हैं? दोनों ऑर्डर एक बिल में जोड़ें।",
    mergeTableInput: "टेबल नंबर डालें",
    mergeTableApply: "लागू करें",
    mergeTableActive: "टेबल के साथ जोड़ा जा रहा है",
    callWaiter: "वेटर बुलाएं",
    waiterNotified: "वेटर को सूचित कर दिया गया है!",
    suggestions: "आपको यह भी पसंद आ सकता है",
    reorderTitle: "फिर से वही ऑर्डर करें?",
    reorderDesc: "पिछले ऑर्डर की सभी चीज़ें एक टैप में जोड़ें।",
    reorderCta: "दोबारा ऑर्डर करें",
    addNotes: "विशेष निर्देश (वैकल्पिक)",
    notesPlaceholder: "जैसे कम तीखा, बिना प्याज़...",
    orderConfirmedTitle: "ऑर्डर कन्फर्म हो गया!",
    // shareWhatsapp: "WhatsApp पर शेयर करें",
    // rateExperience: "आपका ऑर्डर अनुभव कैसा रहा?",
    thanksFeedback: "आपकी प्रतिक्रिया के लिए धन्यवाद!",
    orderMore: "और ऑर्डर करें",
    prepTime: "अनुमानित तैयारी समय",
    refresh: "मेन्यू रीफ़्रेश करें",
  },
};

/* ------------------------------------------------------------------ */
/*  Small presentational pieces — memoized so cart/search/category      */
/*  state changes never force a re-render of unrelated cards.           */
/* ------------------------------------------------------------------ */

const QuantityController = memo(function QuantityController({
  id,
  name,
  price,
  type,
  quantity,
  onAdd,
  onRemove,
  size = "md",
  disabled = false,
}) {
  const isSm = size === "sm";
  if (disabled) {
    return (
      <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--pm-muted)]">
        Unavailable
      </span>
    );
  }
  if (quantity === 0) {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onAdd(id, name, price, type);
        }}
        aria-label={`Add ${name}`}
        className={`rounded-lg bg-[var(--pm-accent)] font-semibold text-white shadow-sm transition hover:bg-[var(--pm-accent-dark)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pm-accent)] focus-visible:ring-offset-2 ${isSm ? "px-3 py-1.5 text-[11px]" : "px-4 py-2 text-xs"}`}
      >
        Add
      </button>
    );
  }
  return (
    <div
      className={`inline-flex items-center overflow-hidden rounded-full border border-[var(--pm-line)] bg-white text-[var(--pm-ink)] ${isSm ? "h-7" : "h-9"}`}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onRemove(id);
        }}
        aria-label={`Remove one ${name}`}
        className="flex h-full items-center justify-center px-2.5 focus:outline-none focus-visible:bg-[var(--pm-bg)]"
      >
        <Minus size={isSm ? 12 : 14} strokeWidth={2.5} />
      </button>
      <span className="min-w-[1.25rem] select-none text-center text-xs font-semibold">
        {quantity}
      </span>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onAdd(id, name, price, type);
        }}
        aria-label={`Add one more ${name}`}
        className="flex h-full items-center justify-center px-2.5 focus:outline-none focus-visible:bg-[var(--pm-bg)]"
      >
        <Plus size={isSm ? 12 : 14} strokeWidth={2.5} />
      </button>
    </div>
  );
});

const MenuSkeleton = memo(function MenuSkeleton() {
  return (
    <div className="public-menu-shell min-h-dvh bg-[var(--pm-bg)]" aria-busy="true">
      <p className="sr-only">Loading menu…</p>
      <div className="mx-auto max-w-md animate-pulse space-y-4 px-4 py-5 lg:max-w-6xl">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-[var(--pm-line)]" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-40 rounded bg-[var(--pm-line)]" />
            <div className="h-3 w-24 rounded bg-[var(--pm-line)]" />
          </div>
        </div>
        <div className="h-14 rounded-2xl bg-[var(--pm-line)]/70" />
        <div className="h-11 rounded-xl bg-[var(--pm-line)]/70" />
        <div className="flex gap-2 overflow-hidden">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-8 w-20 shrink-0 rounded-full bg-[var(--pm-line)]" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="flex overflow-hidden rounded-2xl border border-[var(--pm-line)] bg-white"
            >
              <div className="h-28 w-28 bg-[var(--pm-line)]" />
              <div className="flex flex-1 flex-col gap-2 p-3">
                <div className="h-3 w-3/4 rounded bg-[var(--pm-line)]" />
                <div className="h-3 w-1/2 rounded bg-[var(--pm-line)]" />
                <div className="mt-auto h-3 w-16 rounded bg-[var(--pm-line)]" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});

const menuImageSrc = (src) => {
  if (!src) return "";
  const value = String(src);
  if (value.startsWith("http") || value.startsWith("blob:")) return value;
  return `${String(import.meta.env.VITE_APP_API_BASE || "").replace(/\/api(?:\/v1)?\/?$/, "")}${value}`;
};

const offerBadge = (offer) => {
  if (!offer) return "";
  if (offer.discountType === "FLAT")
    return `₹${Number(offer.discountValue || 0)} OFF`;
  return `${Number(offer.discountValue || 0)}% OFF`;
};

const ItemCard = memo(function ItemCard({
  item,
  quantity,
  onAdd,
  onRemove,
  onOpenDetail,
  offerLabel,
}) {
  const image = menuImageSrc(item.image);
  const available = isItemAvailable(item);
  const showDiet = true;
  const isVeg = item.isVeg !== false;

  return (
    <article
      onClick={() => onOpenDetail(item)}
      className={`flex cursor-pointer overflow-hidden rounded-2xl border border-[var(--pm-line)] bg-[var(--pm-surface)] shadow-[0_4px_18px_rgba(15,23,42,0.04)] transition hover:border-[var(--pm-accent-line)] ${
        available ? "" : "opacity-70"
      }`}
    >
      <div className="relative aspect-square w-[7.25rem] shrink-0 bg-[var(--pm-bg)] sm:w-32">
        {image ? (
          <img
            src={image}
            alt=""
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-[var(--pm-line)]">
            <Utensils size={22} />
          </div>
        )}
        {showDiet ? (
          <span
            className={`absolute left-2 top-2 inline-flex h-4 w-4 items-center justify-center rounded-[3px] border bg-white/95 ${
              isVeg
                ? "border-emerald-600 text-emerald-700"
                : "border-rose-600 text-rose-700"
            }`}
            title={isVeg ? "Vegetarian" : "Non-vegetarian"}
            aria-label={isVeg ? "Vegetarian" : "Non-vegetarian"}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                isVeg ? "bg-emerald-600" : "bg-rose-600"
              }`}
            />
          </span>
        ) : null}
        {offerLabel ? (
          <span className="absolute right-2 top-2 rounded-md bg-[var(--pm-accent)] px-1.5 py-0.5 text-[10px] font-semibold text-white">
            {offerLabel}
          </span>
        ) : item.isBestseller ? (
          <span className="absolute right-2 top-2 inline-flex items-center gap-0.5 rounded-md bg-amber-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">
            <Flame size={9} /> Hot
          </span>
        ) : null}
        {!available ? (
          <span className="absolute inset-x-0 bottom-0 bg-[rgba(15,23,42,0.72)] px-2 py-1 text-center text-[10px] font-semibold uppercase tracking-wide text-white">
            Unavailable
          </span>
        ) : null}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5 p-3">
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-[var(--pm-ink)]">
          {item.name}
        </h3>
        {item.description ? (
          <p className="line-clamp-2 text-[11px] leading-relaxed text-[var(--pm-muted)]">
            {item.description}
          </p>
        ) : null}
        <div className="mt-auto flex items-center justify-between gap-2 pt-1">
          <p className="text-sm font-semibold text-[var(--pm-ink)]">
            ₹{Number(item.price || 0).toLocaleString("en-IN")}
          </p>
          <div onClick={(e) => e.stopPropagation()}>
            <QuantityController
              id={item._id}
              name={item.name}
              price={item.price}
              type="item"
              quantity={quantity}
              onAdd={onAdd}
              onRemove={onRemove}
              size="sm"
              disabled={!available}
            />
          </div>
        </div>
      </div>
    </article>
  );
});

/* ------------------------------------------------------------------ */
/*  Guard against a bad/non-string restaurantId reaching the API —      */
/*  prevents "[object Object]" being sent and crashing the backend.     */
/* ------------------------------------------------------------------ */

function useSafeRestaurantId() {
  const { restaurantId } = useParams();
  return useMemo(() => {
    if (typeof restaurantId === "string" && restaurantId.trim().length > 0) {
      return restaurantId.trim();
    }
    return null;
  }, [restaurantId]);
}

export default function PublicMenu() {
  const restaurantId = useSafeRestaurantId();
  const [searchParams] = useSearchParams();
  const tableToken = searchParams.get("t");

  const [language, setLanguage] = useState("EN");
  const t = useCallback(
    (key) => translations[language]?.[key] || translations.EN[key] || key,
    [language],
  );

  const [cart, setCart] = useState({});
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [vegOnly, setVegOnly] = useState(false);
  const [orderType, setOrderType] = useState("PICKUP");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  // const [paymentMethod, setPaymentMethod] = useState("UPI");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [touched, setTouched] = useState({ name: false, phone: false });

  // 🔑 naye features ke liye state
  const [detailItem, setDetailItem] = useState(null); // item detail modal
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [mergeTableNumber, setMergeTableNumber] = useState("");
  const [appliedMergeTable, setAppliedMergeTable] = useState(null);
  const [waiterToast, setWaiterToast] = useState(false);
  // const [isCallingWaiter, setIsCallingWaiter] = useState(false);
  const [confirmedOrder, setConfirmedOrder] = useState(null); // { orderId, total }
  // const [feedbackRating, setFeedbackRating] = useState(0);
  // const [feedbackSent, setFeedbackSent] = useState(false);
  const [lastOrderSnapshot, setLastOrderSnapshot] = useState(null);
  const [isCustomerSessionReady, setIsCustomerSessionReady] = useState(false);
  const [customerSessionError, setCustomerSessionError] = useState(false);
  const [customerOrderHistory, setCustomerOrderHistory] = useState([]);
  const [customerOrderHistoryLoading, setCustomerOrderHistoryLoading] =
    useState(false);
  const [showOrderHistory, setShowOrderHistory] = useState(false);
  const [selectedCustomerOrder, setSelectedCustomerOrder] = useState(null);
  const [customerOrderDetailLoading, setCustomerOrderDetailLoading] =
    useState(false);
  const [customerOrderHistoryCursor, setCustomerOrderHistoryCursor] =
    useState(null);
  const [customerOrderHistoryLoadingMore, setCustomerOrderHistoryLoadingMore] =
    useState(false);
  const submittingRef = useRef(false);
  const [identityKnown, setIdentityKnown] = useState(false);
  const [editingDetails, setEditingDetails] = useState(false);
  const [customerPhoneMasked, setCustomerPhoneMasked] = useState("");

  // Token / restaurant change: clear local form; backend may restore visit identity.
  useEffect(() => {
    setCustomerName("");
    setCustomerPhone("");
    setCustomerPhoneMasked("");
    setIdentityKnown(false);
    setEditingDetails(false);
    setTouched({ name: false, phone: false });
    setConfirmedOrder(null);
    setCustomerOrderHistory([]);
    setSelectedCustomerOrder(null);
    setShowOrderHistory(false);
  }, [tableToken, restaurantId]);
  const nameCheck = validateGuestName(customerName);
  const phoneCheck = validateGuestPhone(customerPhone);
  const isValidName = identityKnown && !editingDetails ? true : nameCheck.ok;
  const isValidPhone = identityKnown && !editingDetails ? true : phoneCheck.ok;
  const showGuestForm = !identityKnown || editingDetails;
  const orderingAsLabel = formatOrderingAsLabel(
    customerName,
    customerPhoneMasked,
  );

  const isValidAddress =
    orderType !== "DELIVERY" || deliveryAddress.trim().length > 4;

  const totalItemsInCart = useMemo(
    () => Object.values(cart).reduce((acc, item) => acc + item.quantity, 0),
    [cart],
  );

  const isFormValid = isValidName && isValidAddress && totalItemsInCart > 0;

  useEffect(() => {
    const id = "public-menu-fonts";
    if (document.getElementById(id)) return undefined;
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=Libre+Baskerville:wght@400;700&display=swap";
    document.head.appendChild(link);
    return undefined;
  }, []);

  const {
    data: catalog,
    isLoading,
    error,
    // refetch,
    // isFetching,
  } = useQuery({
    queryKey: ["public-catalog", restaurantId],
    queryFn: async () => {
      const res = await axios.get(
        `${import.meta.env.VITE_APP_API_BASE}/menu/public/catalog/${restaurantId}`,
        {
          params: {
            t: tableToken,
          },
        },
      );
      return res.data.data;
    },
    staleTime: 5 * 60_000,
    enabled: !!restaurantId,
  });

  const { categories, combos, restaurant, categoryOrder } = catalog || {};
  const categoryNames = useMemo(
    () => (categories ? Object.keys(categories) : []),
    [categories],
  );
  const menuOrder = useMemo(
    () =>
      orderCategoryNames(
        categoryNames,
        categoryOrder,
        (combos || []).length > 0,
      ),
    [categoryNames, categoryOrder, combos],
  );

  // 🔑 tableToken mein table number encoded hai (StoreSettings jaisa btoa
  // `${restaurantId}-TABLE-${tableNo}` format) — isse current table number
  // nikaal lete hain taaki merge list mein khud ka table na dikhe.
  function decodeBase64Url(str) {
    const base64 = str.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(
      base64.length + ((4 - (base64.length % 4)) % 4),
      "=",
    );
    return atob(padded);
  }

  const currentTableNumber = useMemo(() => {
    if (!tableToken) return null;
    try {
      const [payloadB64] = tableToken.split(".");
      const decoded = decodeBase64Url(payloadB64);
      const [, tableNumber] = decoded.split(":");
      return tableNumber || null;
    } catch {
      return null;
    }
  }, [tableToken]);

  // 🔑 Available tables list — backend endpoint chahiye:
  // GET /tables/public/:restaurantId → [{ tableNumber }] ya [string, ...]
  // Sirf tab fetch hota hai jab merge modal khula ho (lazy).
  const {
    data: availableTablesRaw,
    isLoading: isLoadingTables,
    isError: tablesLoadError,
  } = useQuery({
    queryKey: ["available-tables", restaurantId],
    queryFn: async () => {
      const res = await axios.get(
        `${import.meta.env.VITE_APP_API_BASE}/tables/public/${restaurantId}`,
      );
      return res.data.data || [];
    },
    enabled: showMergeModal && !!restaurantId,
    staleTime: 60_000,
    retry: false,
  });

  const selectableTables = useMemo(() => {
    if (!availableTablesRaw) return [];
    return availableTablesRaw
      .map((tbl) =>
        typeof tbl === "string" || typeof tbl === "number"
          ? tbl
          : tbl.tableNumber,
      )
      .filter((num) => String(num) !== String(currentTableNumber));
  }, [availableTablesRaw, currentTableNumber]);

  // 🔑 reorder banner ke liye last order localStorage se uthao
  useEffect(() => {
    if (!restaurantId) return;
    try {
      const raw = localStorage.getItem(`lastOrder_${restaurantId}`);
      if (raw) setLastOrderSnapshot(JSON.parse(raw));
    } catch {
      // ignore corrupt data
    }
  }, [restaurantId]);

  useEffect(() => {
    if (!restaurantId) {
      setIsCustomerSessionReady(false);
      return;
    }

    let cancelled = false;

    const createSession = async () => {
      try {
        setCustomerSessionError(false);
        setIsCustomerSessionReady(false);

        const sessionRes = await axios.post(
          `${import.meta.env.VITE_APP_API_BASE}/customer/session`,
          {
            restaurantId,
            ...(tableToken ? { tableToken } : {}),
          },
          {
            withCredentials: true,
          },
        );

        if (!cancelled) {
          const restored = identityFromSessionPayload(sessionRes.data?.data);
          if (restored) {
            setCustomerName(restored.customerName);
            setCustomerPhone("");
            setCustomerPhoneMasked(restored.customerPhoneMasked);
            setIdentityKnown(true);
            setEditingDetails(false);
          } else {
            setIdentityKnown(false);
            setEditingDetails(false);
            setCustomerPhoneMasked("");
          }
          setIsCustomerSessionReady(true);
        }
      } catch (error) {
        console.error("Customer session creation failed:", error);

        if (!cancelled) {
          setIsCustomerSessionReady(false);
          setCustomerSessionError(true);
          setIdentityKnown(false);
        }
      }
    };

    createSession();

    return () => {
      cancelled = true;
    };
  }, [restaurantId, tableToken]);

  const cartQtyForCatalog = useCallback(
    (catalogId) =>
      Object.values(cart).reduce((sum, details) => {
        if (String(details?.catalogId) !== String(catalogId)) return sum;
        return sum + Number(details?.quantity || 0);
      }, 0),
    [cart],
  );

  const addToCart = useCallback((id, name, price, type = "item", itemMeta) => {
    if (itemMeta && !isItemAvailable(itemMeta)) return;
    setCart((prevCart) => {
      const existingId = findCartLineId(prevCart, id, "");
      if (existingId) {
        const existing = prevCart[existingId];
        return {
          ...prevCart,
          [existingId]: { ...existing, quantity: existing.quantity + 1 },
        };
      }
      const lineId = createCartLineId();
      return {
        ...prevCart,
        [lineId]: {
          catalogId: String(id),
          name,
          price: Number(price),
          quantity: 1,
          type,
          specialInstructions: "",
        },
      };
    });
  }, []);

  const removeFromCart = useCallback((id) => {
    // Menu +/- targets an empty-instructions line for this catalog item.
    setCart((prevCart) => {
      const lineId = findCartLineId(prevCart, id, "");
      if (!lineId) return prevCart;
      const existing = prevCart[lineId];
      if (existing.quantity === 1) {
        const newCart = { ...prevCart };
        delete newCart[lineId];
        return newCart;
      }
      return {
        ...prevCart,
        [lineId]: { ...existing, quantity: existing.quantity - 1 },
      };
    });
  }, []);

  const updateLineSpecialInstructions = useCallback((lineId, nextRaw) => {
    // Update draft text in place (stable React key). Merge duplicates on blur via commit.
    setCart((prevCart) => {
      const existing = prevCart[lineId];
      if (!existing) return prevCart;
      return {
        ...prevCart,
        [lineId]: {
          ...existing,
          specialInstructions: String(nextRaw || "").slice(
            0,
            SPECIAL_INSTRUCTIONS_MAX,
          ),
        },
      };
    });
  }, []);

  const commitLineSpecialInstructions = useCallback((lineId) => {
    setCart((prevCart) => {
      const existing = prevCart[lineId];
      if (!existing) return prevCart;

      const nextInstructions = normalizeSpecialInstructions(
        existing.specialInstructions,
      );
      const catalogId = String(existing.catalogId || "");
      const duplicateId = findCartLineId(prevCart, catalogId, nextInstructions);

      if (duplicateId && duplicateId !== lineId) {
        const nextCart = { ...prevCart };
        const target = nextCart[duplicateId];
        nextCart[duplicateId] = {
          ...target,
          specialInstructions: nextInstructions,
          quantity:
            Number(target.quantity || 0) + Number(existing.quantity || 0),
        };
        delete nextCart[lineId];
        return nextCart;
      }

      return {
        ...prevCart,
        [lineId]: { ...existing, specialInstructions: nextInstructions },
      };
    });
  }, []);

  const totalCartAmount = useMemo(
    () =>
      Object.values(cart).reduce(
        (acc, item) => acc + item.price * item.quantity,
        0,
      ),
    [cart],
  );

  const { appliedDiscount, itemDiscountMap } = useMemo(() => {
    if (!catalog?.offers || catalog.offers.length === 0)
      return { appliedDiscount: 0, itemDiscountMap: {} };

    let totalDiscount = 0;
    const map = {};

    Object.entries(cart).forEach(([lineId, details]) => {
      const catalogId = String(details.catalogId || "");
      const itemTotalPrice = Number(details.price) * Number(details.quantity);

      const applicableOffers = catalog.offers.filter((offer) => {
        const hasTargetItems =
          offer.targetItems && offer.targetItems.length > 0;
        if (hasTargetItems) return offer.targetItems.includes(catalogId);
        return true;
      });

      if (applicableOffers.length === 0) return;

      const targetedOffers = applicableOffers.filter(
        (o) => o.targetItems && o.targetItems.length > 0,
      );
      const relevantOffers =
        targetedOffers.length > 0 ? targetedOffers : applicableOffers;

      const bestOffer = relevantOffers.reduce((best, o) =>
        Number(o.discountValue) > Number(best.discountValue) ? o : best,
      );

      // 🔑 is item ka apna discount alag se store karo — cancel ke waqt
      // isi value ko use karenge, ratio-guess nahi
      const itemDiscount = Math.round(
        (itemTotalPrice * Number(bestOffer.discountValue)) / 100,
      );
      map[lineId] = itemDiscount;
      totalDiscount += itemDiscount;
    });

    return { appliedDiscount: Math.round(totalDiscount), itemDiscountMap: map };
  }, [catalog, cart]);

  const finalPayableAmount = Math.max(0, totalCartAmount - appliedDiscount);

  // 🔑 sabhi items ek flat list mein — veg-filter aur suggestions ke liye reuse hota hai
  const allItemsFlat = useMemo(() => {
    if (!categories) return [];
    return Object.values(categories).flat();
  }, [categories]);

  const offerLabelByItem = useMemo(() => {
    const offers = catalog?.offers || [];
    const labels = {};
    if (!offers.length) return labels;
    allItemsFlat.forEach((item) => {
      const applicable = offers.filter((offer) => {
        const targets = offer.targetItems || [];
        if (targets.length > 0) return targets.includes(item._id);
        return true;
      });
      if (!applicable.length) return;
      const best = applicable.reduce((winner, offer) =>
        Number(offer.discountValue) > Number(winner.discountValue)
          ? offer
          : winner,
      );
      labels[item._id] = offerBadge(best);
    });
    return labels;
  }, [catalog, allItemsFlat]);

  const restaurantAddress = [
    restaurant?.address?.street,
    restaurant?.address?.city,
    restaurant?.address?.state,
  ]
    .filter(Boolean)
    .join(", ");

  const filteredCombos = useMemo(() => {
    const rows =
      combos?.filter((c) => {
        const matchesSearch = c.name
          ?.toLowerCase()
          .includes(searchQuery.toLowerCase());

        const matchesVeg = !vegOnly || c.isVeg !== false;

        return matchesSearch && matchesVeg;
      }) || [];

    return sortMenuEntries(
      rows.map((combo) => ({ ...combo, isCombo: true })),
      categoryOrder,
    );
  }, [combos, searchQuery, vegOnly, categoryOrder]);

  const filteredCategoryItems = useMemo(() => {
    if (!categories) return {};
    const result = {};
    for (const catName of Object.keys(categories)) {
      const rows = categories[catName].filter((i) => {
        const matchesSearch = i.name
          .toLowerCase()
          .includes(searchQuery.toLowerCase());
        const matchesVeg = !vegOnly || i.isVeg !== false;
        return matchesSearch && matchesVeg;
      });
      result[catName] = sortMenuEntries(rows, categoryOrder);
    }
    return result;
  }, [categories, searchQuery, vegOnly, categoryOrder]);

  const hasVisibleResults = useMemo(() => {
    const comboVisible =
      filteredCombos.length > 0 &&
      (activeCategory === "ALL" || activeCategory === "COMBOS");
    const categoryVisible = Object.keys(filteredCategoryItems).some(
      (catName) => {
        if (activeCategory !== "ALL" && activeCategory !== catName)
          return false;
        return (filteredCategoryItems[catName]?.length || 0) > 0;
      },
    );
    return comboVisible || categoryVisible;
  }, [filteredCombos, filteredCategoryItems, activeCategory]);

  // 🔑 "You might also like" — cart mein na ho, top 4 items
  const suggestions = useMemo(() => {
    return allItemsFlat
      .filter((i) => cartQtyForCatalog(i._id) === 0)
      .slice(0, 4);
  }, [allItemsFlat, cartQtyForCatalog]);

  const handleReorder = useCallback(() => {
    if (!lastOrderSnapshot) return;
    setCart((prev) => {
      const next = { ...prev };
      lastOrderSnapshot.items.forEach((it) => {
        // Reorder stays backward compatible: merge onto empty-instructions lines.
        const existingId = findCartLineId(next, it.id, "");
        if (existingId) {
          next[existingId] = {
            ...next[existingId],
            quantity: (next[existingId].quantity || 0) + it.quantity,
          };
          return;
        }
        const lineId = createCartLineId();
        next[lineId] = {
          catalogId: String(it.id),
          name: it.name,
          price: it.price,
          type: it.type,
          specialInstructions: "",
          quantity: it.quantity,
        };
      });
      return next;
    });
  }, [lastOrderSnapshot]);

  const fetchCustomerOrderHistory = useCallback(
    async (cursor = null) => {
      if (!restaurantId || !isCustomerSessionReady) return null;

      try {
        const params = new URLSearchParams();
        params.set("restaurantId", restaurantId);

        if (cursor) {
          params.set("cursor", cursor);
        }

        if (tableToken) {
          params.set("t", tableToken);
        }

        const query = params.toString();

        const res = await axios.get(
          `${import.meta.env.VITE_APP_API_BASE}/customer/orders/history${
            query ? `?${query}` : ""
          }`,
          {
            withCredentials: true,
          },
        );

        return {
          ...res.data,
          data: {
            orders: res.data?.data || [],
            nextCursor: res.data?.pagination?.nextCursor || null,
          },
        };
      } catch (error) {
        console.error("Customer order history fetch failed:", error);
        return null;
      }
    },
    [restaurantId, isCustomerSessionReady, tableToken],
  );

  const handleLoadMoreCustomerOrders = useCallback(async () => {
    if (
      !customerOrderHistoryCursor ||
      !isCustomerSessionReady ||
      customerOrderHistoryLoadingMore
    ) {
      return;
    }

    setCustomerOrderHistoryLoadingMore(true);

    try {
      const data = await fetchCustomerOrderHistory(customerOrderHistoryCursor);

      if (data?.success) {
        setCustomerOrderHistory((prev) => [
          ...prev,
          ...(data.data?.orders || []),
        ]);

        setCustomerOrderHistoryCursor(data.data?.nextCursor || null);
      }
    } catch (error) {
      console.error("Customer order history pagination failed:", error);
    } finally {
      setCustomerOrderHistoryLoadingMore(false);
    }
  }, [
    customerOrderHistoryCursor,
    isCustomerSessionReady,
    customerOrderHistoryLoadingMore,
    fetchCustomerOrderHistory,
  ]);

  const fetchCustomerOrderDetail = useCallback(
    async (orderId) => {
      if (!restaurantId || !isCustomerSessionReady || !orderId) return null;

      setCustomerOrderDetailLoading(true);

      try {
        const res = await axios.get(
          `${import.meta.env.VITE_APP_API_BASE}/customer/orders/history/${orderId}`,
          {
            params: {
              restaurantId,
              ...(tableToken ? { t: tableToken } : {}),
            },
            withCredentials: true,
          },
        );

        return res.data;
      } catch (error) {
        console.error("Customer order detail fetch failed:", error);
        return null;
      } finally {
        setCustomerOrderDetailLoading(false);
      }
    },
    [restaurantId, isCustomerSessionReady, tableToken],
  );

  useEffect(() => {
    if (!restaurantId || !isCustomerSessionReady) return;

    let cancelled = false;

    const loadCustomerOrderHistory = async () => {
      setCustomerOrderHistoryLoading(true);

      try {
        const data = await fetchCustomerOrderHistory();

        if (!cancelled && data?.success) {
          setCustomerOrderHistory(data.data?.orders || []);
          setCustomerOrderHistoryCursor(data.data?.nextCursor || null);
        }
      } catch (error) {
        console.error("Customer order history load failed:", error);
      } finally {
        if (!cancelled) {
          setCustomerOrderHistoryLoading(false);
        }
      }
    };

    loadCustomerOrderHistory();

    return () => {
      cancelled = true;
    };
  }, [restaurantId, isCustomerSessionReady, fetchCustomerOrderHistory]);

  useEffect(() => {
    if (!restaurantId || !isCustomerSessionReady) return undefined;

    let cancelled = false;
    let refetchTimer = null;

    const socket = io(import.meta.env.VITE_APP_API_BASE, {
      withCredentials: true,
      transports: ["websocket", "polling"],
      reconnection: true,
    });

    const sameOrder = (row, payload) =>
      String(row?.orderId || "") === String(payload.orderId || "") ||
      String(row?._id || "") === String(payload._id || "") ||
      String(row?.orderRef || "") === String(payload._id || "");

    const applyLiveOrder = (payload) => {
      if (!payload?.orderId) return;

      if (
        payload.restaurantId &&
        String(payload.restaurantId) !== String(restaurantId)
      ) {
        return;
      }

      setCustomerOrderHistory((prev) => {
        const index = prev.findIndex((row) => sameOrder(row, payload));

        if (payload.status === "COMPLETED") {
          return index === -1
            ? prev
            : prev.filter((_, itemIndex) => itemIndex !== index);
        }

        if (index === -1) {
          return [payload, ...prev];
        }

        const next = [...prev];
        next[index] = {
          ...next[index],
          ...payload,
          _id: next[index]._id,
          orderRef: next[index].orderRef || payload.orderRef,
        };
        return next;
      });

      setSelectedCustomerOrder((current) => {
        if (!current || !sameOrder(current, payload)) return current;
        if (payload.status === "COMPLETED") return null;
        return {
          ...current,
          ...payload,
          _id: current._id,
          orderRef: current.orderRef || payload.orderRef,
        };
      });
    };

    socket.on("connect", () => {
      if (tableToken) {
        socket.emit("join_table_orders", tableToken);
      }
    });

    socket.on("CUSTOMER_TABLE_ORDER", (payload) => {
      if (cancelled) return;

      applyLiveOrder(payload);
      window.clearTimeout(refetchTimer);
      refetchTimer = window.setTimeout(async () => {
        const data = await fetchCustomerOrderHistory();

        if (cancelled || !data?.success) return;

        setCustomerOrderHistory(data.data?.orders || []);
        setCustomerOrderHistoryCursor(data.data?.nextCursor || null);
      }, 400);
    });

    return () => {
      cancelled = true;
      window.clearTimeout(refetchTimer);
      socket.disconnect();
    };
  }, [
    restaurantId,
    isCustomerSessionReady,
    tableToken,
    fetchCustomerOrderHistory,
  ]);

  const handleApplyMergeTable = useCallback(() => {
    if (!mergeTableNumber.trim()) return;
    setAppliedMergeTable(mergeTableNumber.trim());
    setShowMergeModal(false);
  }, [mergeTableNumber]);

  const handleFinalOrderSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      if (submittingRef.current || isSubmitting) return;
      setTouched({ name: true, phone: true });

      if (!isValidName || !isValidPhone || !isValidAddress || !restaurantId)
        return;

      const usingSavedIdentity = identityKnown && !editingDetails;

      try {
        submittingRef.current = true;
        setIsSubmitting(true);

        if (tableToken && (!usingSavedIdentity || editingDetails)) {
          await axios.put(
            `${import.meta.env.VITE_APP_API_BASE}/customer/identity`,
            {
              restaurantId,
              tableToken,
              customerName: customerName.trim(),
              customerPhone: customerPhone.trim(),
            },
            { withCredentials: true },
          );
        }

        const orderPayload = {
          restaurantId,
          tableToken,

          mergeWithTable: appliedMergeTable || null,
          customerName: usingSavedIdentity ? "" : customerName.trim(),
          customerPhone: usingSavedIdentity ? "" : customerPhone.trim(),
          orderType: orderType === "PICKUP" ? "DINE_IN" : "DELIVERY",
          deliveryAddress: orderType === "DELIVERY" ? deliveryAddress.trim() : "",
          items: Object.entries(cart).map(([lineId, details]) => ({
            itemId: details.catalogId,
            name: details.name,
            quantity: Number(details.quantity),
            price: Number(details.price),
            itemType: details.type === "combo" ? "COMBO" : "SINGLE",
            specialInstructions: normalizeSpecialInstructions(
              details.specialInstructions || details.notes || "",
            ),
            discount: itemDiscountMap[lineId] || 0,
          })),
          subtotal: Number(totalCartAmount),
          discount: Number(appliedDiscount),
          tax: 0,
          total: Number(finalPayableAmount),
        };

        const res = await axios.post(
          `${import.meta.env.VITE_APP_API_BASE}/orders/place`,
          orderPayload,
          {
            withCredentials: true,
            headers: {
              "Idempotency-Key": crypto.randomUUID(),
            },
          },
        );
        if (res.data.success) {
          try {
            localStorage.setItem(
              `lastOrder_${restaurantId}`,
              JSON.stringify({
                items: Object.values(cart).map((d) => ({
                  id: d.catalogId,
                  name: d.name,
                  price: d.price,
                  quantity: d.quantity,
                  type: d.type,
                })),
              }),
            );
          } catch {
            // browser storage unavailable — skip silently
          }

          setConfirmedOrder({
            orderId: res.data.order.orderId,
            total: Number(res.data.order?.total ?? finalPayableAmount),
            status: res.data.order?.status || null,
          });
          setCart({});
          if (!usingSavedIdentity) {
            setIdentityKnown(true);
            setEditingDetails(false);
            setCustomerPhoneMasked(
              customerPhone.trim()
                ? `${"*".repeat(Math.max(0, customerPhone.trim().length - 4))}${customerPhone.trim().slice(-4)}`
                : "",
            );
          }
          setDeliveryAddress("");
          setTouched({ name: false, phone: false });
          setIsCartOpen(false);
          setAppliedMergeTable(null);
        }
      } catch (err) {
        alert(
          err.response?.data?.message ||
            "Unable to place order. Please try again.",
        );
      } finally {
        setIsSubmitting(false);
        submittingRef.current = false;
      }
    },
    [
      restaurantId,
      tableToken,
      appliedMergeTable,
      customerName,
      customerPhone,
      identityKnown,
      editingDetails,
      orderType,
      deliveryAddress,
      cart,
      totalCartAmount,
      itemDiscountMap,
      appliedDiscount,
      finalPayableAmount,
      isValidName,
      isValidPhone,
      isValidAddress,
      isSubmitting,
    ],
  );

  // 🔑 Feedback — backend endpoint chahiye: POST /orders/:orderId/feedback
  // body: { rating }. Abhi ke liye sirf local state confirm karta hai.
  // const submitFeedback = useCallback(
  //   async (stars) => {
  //     setFeedbackRating(stars);
  //     setFeedbackSent(true);
  //     try {
  //       if (confirmedOrder?.orderId) {
  //         await axios.post(
  //           `${import.meta.env.VITE_APP_API_BASE}/orders/${confirmedOrder.orderId}/feedback`,
  //           { rating: stars },
  //         );
  //       }
  //     } catch (err) {
  //       console.warn("Feedback endpoint not available yet:", err?.message);
  //     }
  //   },
  //   [confirmedOrder],
  // );

  // const whatsappShareUrl = useMemo(() => {
  //   if (!confirmedOrder) return "#";
  //   const text = encodeURIComponent(
  //     `My order at ${restaurant?.name || "the restaurant"} is confirmed!\nOrder ID: ${confirmedOrder.orderId}\nTotal: ₹${confirmedOrder.total.toLocaleString("en-IN")}`,
  //   );
  //   return `https://wa.me/?text=${text}`;
  // }, [confirmedOrder, restaurant]);

  /* ---------------- guarded / loading / error states ---------------- */

  if (!restaurantId) {
    return (
      <div className="public-menu-shell flex min-h-dvh flex-col items-center justify-center bg-[var(--pm-bg)] p-6 text-center">
        <div className="mb-3 rounded-full bg-[var(--pm-accent-soft)] p-4 text-[var(--pm-accent)]">
          <LinkIcon size={28} />
        </div>
        <h3 className="pm-display text-lg text-[var(--pm-ink)]">
          Invalid Menu Link
        </h3>
        <p className="mt-1 max-w-xs text-sm text-[var(--pm-muted)]">
          This QR code or link doesn't point to a valid restaurant. Please
          rescan the table QR code.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return <MenuSkeleton />;
  }

  if (error) {
    return (
      <div className="public-menu-shell flex min-h-dvh flex-col items-center justify-center bg-[var(--pm-bg)] p-6 text-center">
        <div className="mb-3 rounded-full bg-[var(--pm-accent-soft)] p-4 text-[var(--pm-accent)]">
          <X size={28} />
        </div>
        <h3 className="pm-display text-lg text-[var(--pm-ink)]">
          Menu Not Available
        </h3>
        <p className="mt-1 max-w-xs text-sm text-[var(--pm-muted)]">
          We couldn't load this menu right now. Please ask at the restaurant
          counter for assistance.
        </p>
      </div>
    );
  }

  const nameHasError = touched.name && !isValidName;
  const phoneHasError =
    touched.phone && customerPhone.trim() !== "" && !isValidPhone;
  const welcomeMessage = tableWelcomeMessage({
    tableNumber: currentTableNumber,
    restaurantName: restaurant?.name,
  });

  return (
    <div className="public-menu-shell min-h-dvh bg-[var(--pm-bg)] pb-28 text-[var(--pm-ink)]">
      <div className="relative mx-auto min-h-dvh w-full max-w-md lg:max-w-6xl">
        <div className="sticky top-0 z-40 border-b border-[var(--pm-line)] bg-[color-mix(in_srgb,var(--pm-bg)_92%,white)] backdrop-blur-md">
          {restaurant?.logo ? (
            <div className="relative h-28 overflow-hidden sm:h-36">
              <img
                src={
                  restaurant.logo.startsWith("http")
                    ? restaurant.logo
                    : menuImageSrc(restaurant.logo)
                }
                alt=""
                className="h-full w-full scale-110 object-cover blur-[2px] brightness-[0.55]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[var(--pm-ink)]/70 via-[var(--pm-ink)]/35 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 flex items-end gap-3 px-4 pb-3">
                <img
                  src={
                    restaurant.logo.startsWith("http")
                      ? restaurant.logo
                      : menuImageSrc(restaurant.logo)
                  }
                  alt={restaurant.name || "Restaurant"}
                  className="h-12 w-12 rounded-xl border border-white/30 bg-white object-cover shadow-md"
                />
                <div className="min-w-0 flex-1 text-white">
                  <h1 className="pm-display truncate text-xl leading-tight">
                    {restaurant?.name || "Our Restaurant"}
                  </h1>
                  <p className="truncate text-xs text-white/80">
                    {currentTableNumber
                      ? `Table ${currentTableNumber}`
                      : "Dine-in menu"}
                    {restaurantAddress ? ` · ${restaurantAddress}` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setShowOrderHistory(true)}
                    disabled={!isCustomerSessionReady}
                    aria-label="Order history"
                    title="Order History"
                    className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/25 bg-white/10 text-white disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
                  >
                    <ShoppingBag size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setLanguage((current) => (current === "EN" ? "HI" : "EN"))
                    }
                    aria-label="Toggle language"
                    className="rounded-xl border border-white/25 bg-white/10 px-2.5 py-1.5 text-[11px] font-semibold text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
                  >
                    {language}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 px-4 py-3.5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--pm-accent)] text-sm font-semibold text-white">
                {restaurant?.name?.charAt(0) || "M"}
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="pm-display truncate text-lg text-[var(--pm-ink)]">
                  {restaurant?.name || "Our Restaurant"}
                </h1>
                <p className="truncate text-xs text-[var(--pm-muted)]">
                  {currentTableNumber
                    ? `Table ${currentTableNumber}`
                    : "Dine-in menu"}
                  {restaurantAddress ? ` · ${restaurantAddress}` : ""}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setShowOrderHistory(true)}
                  disabled={!isCustomerSessionReady}
                  aria-label="Order history"
                  title="Order History"
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--pm-line)] bg-white text-[var(--pm-ink)] disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pm-accent)]"
                >
                  <ShoppingBag size={15} />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setLanguage((current) => (current === "EN" ? "HI" : "EN"))
                  }
                  aria-label="Toggle language"
                  className="rounded-xl border border-[var(--pm-line)] bg-white px-2.5 py-1.5 text-[11px] font-semibold text-[var(--pm-ink)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pm-accent)]"
                >
                  {language}
                </button>
              </div>
            </div>
          )}

          <div className="space-y-3 px-4 pb-3 pt-3 sm:px-6">
            <p className="text-sm leading-relaxed text-[var(--pm-muted)]">
              {welcomeMessage}
            </p>
            <div className="relative sm:max-w-md">
              <Search
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--pm-muted)]"
              />
              <input
                type="search"
                placeholder={t("searchPlaceholder")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Search menu"
                className="pm-input w-full pl-10 pr-9"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  aria-label="Clear search"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--pm-muted)] hover:text-[var(--pm-ink)]"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          <div
            className="border-t border-[var(--pm-line)] px-4 py-2.5 sm:px-6"
            role="tablist"
            aria-label="Menu categories"
          >
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
              <button
                type="button"
                role="tab"
                aria-selected={activeCategory === "ALL"}
                onClick={() => setActiveCategory("ALL")}
                className={`pm-chip shrink-0 ${
                  activeCategory === "ALL" ? "pm-chip-active" : ""
                }`}
              >
                {t("allMenu")}
              </button>
              {menuOrder.map((catName) =>
                catName === "COMBO" ? (
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeCategory === "COMBOS"}
                    key="COMBO"
                    onClick={() => setActiveCategory("COMBOS")}
                    className={`pm-chip shrink-0 ${
                      activeCategory === "COMBOS" ? "pm-chip-active" : ""
                    }`}
                  >
                    Combos
                  </button>
                ) : (
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeCategory === catName}
                    key={catName}
                    onClick={() => setActiveCategory(catName)}
                    className={`pm-chip shrink-0 ${
                      activeCategory === catName ? "pm-chip-active" : ""
                    }`}
                  >
                    {catName}
                  </button>
                ),
              )}
              <button
                type="button"
                onClick={() => setVegOnly((v) => !v)}
                aria-pressed={vegOnly}
                className={`pm-chip shrink-0 inline-flex items-center gap-1 ${
                  vegOnly ? "pm-chip-veg" : ""
                }`}
              >
                <Leaf size={12} /> {t("vegOnly")}
              </button>
            </div>
          </div>
        </div>

        {/* ---------------- Reorder banner ---------------- */}
        {lastOrderSnapshot && totalItemsInCart === 0 && !confirmedOrder && (
          <div className="mx-4 sm:mx-6 mt-4 bg-transparent rounded-2xl p-0 flex items-center gap-0">
            {/* <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center shrink-0">
              <RotateCcw size={16} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-black text-slate-800">
                {t("reorderTitle")}
              </p>
              <p className="text-[11px] text-slate-400 font-medium truncate">
                {t("reorderDesc")}
              </p>
            </div>
            <button
              onClick={handleReorder}
              className="shrink-0 bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-black px-3 py-2 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-300"
            >
              {t("reorderCta")}
            </button> */}
          </div>
        )}

        {/* ---------------- Offers ---------------- */}
        {catalog?.offers?.length > 0 && (
          <div className="px-4 sm:px-6 py-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-black text-xs text-slate-800 uppercase tracking-widest flex items-center gap-1.5">
                <span className="bg-rose-500 w-1.5 h-1.5 rounded-full"></span>
                {t("specialOffers")}
              </h3>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2 -mr-4 pr-4 sm:mr-0 sm:pr-0 no-scrollbar snap-x snap-mandatory">
              {catalog.offers.map((o) => (
                <div
                  key={o._id}
                  className="min-w-[210px] sm:min-w-[230px] snap-start bg-gradient-to-br from-slate-900 to-slate-800 p-4 rounded-2xl text-white shadow-md border border-slate-700"
                >
                  <div className="flex justify-between items-start">
                    <div className="bg-white/10 w-8 h-8 rounded-lg flex items-center justify-center text-rose-400">
                      <Tag size={16} />
                    </div>
                    <span className="text-[10px] font-black bg-rose-500 px-2 py-0.5 rounded-full">
                      {o.discountValue}% OFF
                    </span>
                  </div>
                  <div className="mt-3">
                    <h4 className="font-black text-sm truncate">{o.title}</h4>
                    <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">
                      {o.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ---------------- Menu ---------------- */}
        <div className="p-4 sm:p-6 flex flex-col gap-6">
          {combos?.length > 0 &&
            (activeCategory === "ALL" || activeCategory === "COMBOS") &&
            filteredCombos.length > 0 && (
              <div
                className="space-y-3"
                style={{ order: Math.max(0, menuOrder.indexOf("COMBO")) }}
              >
                <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1 flex items-center gap-1">
                  ✨ {t("combos")}
                </h2>
                <div className="flex gap-3 overflow-x-auto pb-2 -mr-4 pr-4 sm:mr-0 sm:pr-0 no-scrollbar">
                  {filteredCombos.map((combo) => (
                    <div
                      key={combo._id}
                      className="bg-white p-4 rounded-2xl border border-slate-200/70 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between gap-3 shrink-0 w-[240px]"
                    >
                      <div className="space-y-1">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-black border ${
                            combo.isVeg === false
                              ? "bg-red-50 text-red-600 border-red-200"
                              : "bg-emerald-50 text-emerald-600 border-emerald-200"
                          }`}
                        >
                          {combo.isVeg === false ? "Non-Veg" : "Veg"}
                        </span>
                        <h3 className="font-black text-sm text-slate-900 tracking-tight truncate">
                          {combo.name}
                        </h3>
                        <p className="text-[11px] text-slate-400 font-medium line-clamp-2 leading-relaxed h-[28px]">
                          {combo.description}
                        </p>
                      </div>
                      <div className="flex justify-between items-center mt-2">
                        <p className="text-sm font-black text-slate-900">
                          ₹{combo.price}
                        </p>
                        <QuantityController
                          id={combo._id}
                          name={combo.name}
                          price={combo.price}
                          type="combo"
                          quantity={cartQtyForCatalog(combo._id)}
                          onAdd={addToCart}
                          onRemove={removeFromCart}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          {categories &&
            Object.keys(categories)
              .filter(
                (catName) =>
                  activeCategory === "ALL" || activeCategory === catName,
              )
              .map((categoryName) => {
                const items = filteredCategoryItems[categoryName];
                if (!items || items.length === 0) return null;
                return (
                  <div
                    key={categoryName}
                    className="space-y-3"
                    style={{
                      order: Math.max(0, menuOrder.indexOf(categoryName)),
                    }}
                  >
                    {activeCategory === "ALL" && (
                      <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">
                        {categoryName}
                      </h2>
                    )}
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {items.map((item) => (
                        <ItemCard
                          key={item._id}
                          item={item}
                          offerLabel={offerLabelByItem[item._id]}
                          quantity={cartQtyForCatalog(item._id)}
                          onAdd={addToCart}
                          onRemove={removeFromCart}
                          onOpenDetail={setDetailItem}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}

          {!hasVisibleResults && (
            <div className="flex flex-col items-center rounded-2xl border border-dashed border-[var(--pm-line)] bg-white px-6 py-16 text-center">
              <div className="mb-3 rounded-full bg-[var(--pm-bg)] p-4 text-[var(--pm-muted)]">
                <SearchX size={24} />
              </div>
              <h3 className="pm-display text-lg text-[var(--pm-ink)]">
                {t("noDishes")}
              </h3>
              <p className="mt-1 max-w-xs text-sm text-[var(--pm-muted)]">
                {searchQuery
                  ? `Nothing matches "${searchQuery}". Try a different search.`
                  : "This category doesn't have any items yet."}
              </p>
            </div>
          )}
        </div>

        {/* ---------------- Call Waiter floating button ---------------- */}
        {/* <button
          onClick={handleCallWaiter}
          disabled={isCallingWaiter}
          aria-label={t("callWaiter")}
          className="fixed top-1/2 -translate-y-1/2 right-3 z-30 bg-slate-900 text-white rounded-full shadow-lg p-3 flex items-center justify-center hover:bg-slate-800 active:scale-95 transition-all disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
        >
          <Bell size={18} />
        </button> */}

        {waiterToast && (
          <div className="fixed top-4 inset-x-4 max-w-xs mx-auto z-50 bg-slate-900 text-white text-xs font-bold px-4 py-3 rounded-xl shadow-xl text-center animate-[fadeIn_0.15s_ease-out]">
            {t("waiterNotified")}
          </div>
        )}

        {/* ---------------- Sticky cart bar ---------------- */}
        {totalItemsInCart > 0 && !isCartOpen && (
          <div className="fixed inset-x-0 bottom-0 z-40 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2">
            <div className="mx-auto max-w-md">
              <button
                type="button"
                onClick={() => setIsCartOpen(true)}
                className="flex w-full items-center justify-between gap-3 rounded-2xl bg-[var(--pm-ink)] px-4 py-3.5 text-white shadow-[0_10px_30px_rgba(15,23,42,0.28)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pm-accent)] focus-visible:ring-offset-2"
              >
                <span className="flex items-center gap-3">
                  <span className="rounded-xl bg-[var(--pm-accent)] p-2.5">
                    <ShoppingBag size={16} strokeWidth={2.5} aria-hidden />
                  </span>
                  <span className="text-left">
                    <span className="block text-[11px] font-medium text-white/70">
                      {totalItemsInCart} item
                      {totalItemsInCart === 1 ? "" : "s"}
                    </span>
                    <span className="text-base font-semibold tracking-tight">
                      ₹{finalPayableAmount.toLocaleString("en-IN")}
                    </span>
                  </span>
                </span>
                <span className="text-sm font-semibold">View cart</span>
              </button>
            </div>
          </div>
        )}

        {/* ---------------- Item detail modal ---------------- */}
        {detailItem && (
          <div
            className="fixed inset-0 bg-slate-950/60 z-50 flex items-end sm:items-center justify-center backdrop-blur-sm p-0 sm:p-4 animate-[fadeIn_0.15s_ease-out]"
            role="dialog"
            aria-modal="true"
          >
            <div className="bg-white w-full max-w-md sm:rounded-3xl rounded-t-3xl max-h-[85vh] overflow-y-auto shadow-2xl animate-[slideUp_0.2s_ease-out]">
              <div className="relative">
                {detailItem.image ? (
                  <img
                    src={
                      detailItem.image
                        ? detailItem.image.startsWith("http")
                          ? detailItem.image
                          : menuImageSrc(detailItem.image)
                        : null
                    }
                    alt={detailItem.name}
                    className="w-full h-48 object-cover"
                  />
                ) : (
                  <div className="w-full h-40 bg-slate-100 flex items-center justify-center text-slate-300">
                    <Utensils size={40} />
                  </div>
                )}
                <button
                  onClick={() => setDetailItem(null)}
                  aria-label="Close"
                  className="absolute top-3 right-3 bg-white/90 hover:bg-white p-2 rounded-full shadow-md text-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
                >
                  <X size={16} strokeWidth={2.5} />
                </button>
                {detailItem.isBestseller && (
                  <span className="absolute top-3 left-3 bg-amber-500 text-white text-[10px] font-black px-2.5 py-1 rounded-full flex items-center gap-1 shadow-sm">
                    <Flame size={10} /> Bestseller
                  </span>
                )}
              </div>

              <div className="p-5 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <span
                      className={`w-2.5 h-2.5 rounded-full inline-block border border-white shadow-xs mb-1 ${detailItem.isVeg === false ? "bg-red-500" : "bg-emerald-500"}`}
                    />
                    <h2 className="text-lg font-black text-slate-900 tracking-tight">
                      {detailItem.name}
                    </h2>
                    <p className="text-sm text-slate-500 mt-1 leading-relaxed">
                      {detailItem.description}
                    </p>
                  </div>
                  <p className="text-lg font-black text-slate-900 shrink-0">
                    ₹{detailItem.price}
                  </p>
                </div>

                {detailItem.prepTime && (
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 font-semibold">
                    <Clock size={13} /> {t("prepTime")}: {detailItem.prepTime}
                  </div>
                )}

                <div className="pt-2">
                  <QuantityController
                    id={detailItem._id}
                    name={detailItem.name}
                    price={detailItem.price}
                    type="item"
                    quantity={cartQtyForCatalog(detailItem._id)}
                    onAdd={addToCart}
                    onRemove={removeFromCart}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ---------------- Customer Order History modal ---------------- */}
        {showOrderHistory && (
          <>
            <div
              className="fixed inset-0 bg-slate-950/70 z-[80] flex items-end sm:items-center justify-center backdrop-blur-sm p-0 sm:p-4 animate-[fadeIn_0.15s_ease-out]"
              role="dialog"
              aria-modal="true"
              aria-labelledby="order-history-title"
            >
              <div className="bg-white w-full sm:max-w-md sm:rounded-3xl rounded-t-3xl shadow-2xl border border-slate-200 max-h-[85vh] overflow-hidden animate-[slideUp_0.2s_ease-out] flex flex-col">
                {/* Header */}
                <div className="p-5 border-b border-slate-100 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center">
                      <ShoppingBag size={18} />
                    </div>

                    <div>
                      <h3
                        id="order-history-title"
                        className="text-base font-black text-slate-900"
                      >
                        Order History
                      </h3>

                      <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                        {tableToken
                          ? "Your orders and this table's captain or counter orders"
                          : "Your previous orders"}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowOrderHistory(false)}
                    aria-label="Close order history"
                    className="p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-600 rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
                  >
                    <X size={18} strokeWidth={2.5} />
                  </button>
                </div>

                {/* Body */}
                <div className="p-4 overflow-y-auto flex-1">
                  {customerOrderHistoryLoading ? (
                    <div className="space-y-3 animate-pulse">
                      {[0, 1, 2].map((i) => (
                        <div
                          key={i}
                          className="h-28 bg-slate-100 rounded-2xl"
                        />
                      ))}
                    </div>
                  ) : customerOrderHistory.length === 0 ? (
                    <div className="flex flex-col items-center justify-center text-center py-14 px-6">
                      <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mb-4">
                        <ShoppingBag size={24} />
                      </div>

                      <h4 className="text-sm font-black text-slate-700">
                        No orders yet
                      </h4>

                      <p className="text-xs text-slate-400 font-medium mt-1 max-w-xs">
                        Your previous orders will appear here.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {customerOrderHistory.map((order) => (
                        <button
                          type="button"
                          key={order._id}
                          onClick={async () => {
                            const data = await fetchCustomerOrderDetail(
                              order._id,
                            );

                            if (data?.success) {
                              const order = data.data?.orderId
                                ? data.data
                                : data.data?.order;

                              if (order?.orderId) {
                                setSelectedCustomerOrder(order);
                              }
                            }
                          }}
                          className="w-full text-left bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:border-rose-200 hover:shadow-md transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-300"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-xs font-black text-slate-900">
                                #{order.orderId}
                              </p>

                              <p className="text-[10px] text-slate-400 font-medium mt-1">
                                {order.createdAt
                                  ? new Date(order.createdAt).toLocaleString(
                                      "en-IN",
                                    )
                                  : ""}
                              </p>
                            </div>

                            <span className="text-[10px] font-black px-2 py-1 rounded-lg bg-slate-100 text-slate-600">
                              {order.status}
                            </span>
                          </div>

                          <div className="mt-3 space-y-1.5">
                            {(order.items || []).slice(0, 3).map((item) => (
                              <div
                                key={item._id}
                                className="flex items-center justify-between gap-3 text-xs"
                              >
                                <span className="text-slate-600 font-medium truncate">
                                  {item.name} × {item.quantity}
                                </span>

                                <span className="text-slate-900 font-bold shrink-0">
                                  ₹
                                  {Number(item.price || 0).toLocaleString(
                                    "en-IN",
                                  )}
                                </span>
                              </div>
                            ))}

                            {order.items?.length > 3 && (
                              <p className="text-[10px] text-slate-400 font-semibold pt-1">
                                +{order.items.length - 3} more item
                                {order.items.length - 3 > 1 ? "s" : ""}
                              </p>
                            )}
                          </div>

                          <div className="border-t border-slate-100 mt-3 pt-3 flex items-center justify-between">
                            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-black">
                              Total
                            </span>

                            <span className="text-sm font-black text-slate-900">
                              ₹
                              {Number(order.total || 0).toLocaleString("en-IN")}
                            </span>
                          </div>
                        </button>
                      ))}

                      {customerOrderHistoryCursor && (
                        <button
                          type="button"
                          onClick={handleLoadMoreCustomerOrders}
                          disabled={customerOrderHistoryLoadingMore}
                          className="w-full py-3 rounded-xl border border-slate-200 text-xs font-black text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {customerOrderHistoryLoadingMore
                            ? "Loading..."
                            : "Load More Orders"}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        {/* ---------------- Customer Order Details modal ---------------- */}
        {selectedCustomerOrder && (
          <div
            className="fixed inset-0 bg-slate-950/70 z-[90] flex items-end sm:items-center justify-center backdrop-blur-sm p-0 sm:p-4 animate-[fadeIn_0.15s_ease-out]"
            role="dialog"
            aria-modal="true"
            aria-labelledby="customer-order-details-title"
          >
            <div className="bg-white w-full sm:max-w-md sm:rounded-3xl rounded-t-3xl shadow-2xl border border-slate-200 max-h-[88vh] overflow-hidden animate-[slideUp_0.2s_ease-out] flex flex-col">
              {/* Header */}
              <div className="p-5 border-b border-slate-100 flex items-center justify-between shrink-0">
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-slate-400 font-black">
                    Order Details
                  </p>

                  <h3
                    id="customer-order-details-title"
                    className="text-lg font-black text-slate-900 mt-0.5"
                  >
                    #{selectedCustomerOrder.orderId}
                  </h3>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedCustomerOrder(null)}
                  aria-label="Close order details"
                  className="p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-600 rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
                >
                  <X size={18} strokeWidth={2.5} />
                </button>
              </div>

              {/* Body */}
              <div className="p-5 overflow-y-auto flex-1 space-y-5">
                {/* Status + order meta */}
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                      Status
                    </p>

                    <span className="inline-flex mt-1 text-xs font-black px-2.5 py-1.5 rounded-lg bg-slate-100 text-slate-700">
                      {selectedCustomerOrder.status}
                    </span>
                  </div>

                  <div className="text-right">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                      Date
                    </p>

                    <p className="text-xs font-bold text-slate-700 mt-1">
                      {selectedCustomerOrder.createdAt
                        ? new Date(
                            selectedCustomerOrder.createdAt,
                          ).toLocaleString("en-IN")
                        : "—"}
                    </p>
                  </div>
                </div>

                {/* Order type / table */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-50 rounded-2xl p-3">
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider">
                      Order Type
                    </p>

                    <p className="text-xs font-black text-slate-800 mt-1">
                      {selectedCustomerOrder.orderType || "—"}
                    </p>
                  </div>

                  <div className="bg-slate-50 rounded-2xl p-3">
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider">
                      Table
                    </p>

                    <p className="text-xs font-black text-slate-800 mt-1">
                      {selectedCustomerOrder.tableNumber || "—"}
                    </p>
                  </div>
                </div>

                {/* Items */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                      Items
                    </h4>

                    <span className="text-[10px] text-slate-400 font-bold">
                      {selectedCustomerOrder.items?.length || 0} item
                      {(selectedCustomerOrder.items?.length || 0) !== 1
                        ? "s"
                        : ""}
                    </span>
                  </div>

                  <div className="space-y-2">
                    {(selectedCustomerOrder.items || []).map((item) => (
                      <div
                        key={item._id}
                        className="flex items-start justify-between gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100"
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-black text-slate-800 truncate">
                            {item.name}
                          </p>

                          <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                            ₹{Number(item.price || 0).toLocaleString("en-IN")}
                            {" × "}
                            {item.quantity}
                          </p>

                          {Number(item.discount || 0) > 0 && (
                            <p className="text-[10px] text-emerald-600 font-bold mt-0.5">
                              Discount: ₹
                              {Number(item.discount).toLocaleString("en-IN")}
                            </p>
                          )}
                        </div>

                        <p className="text-xs font-black text-slate-900 shrink-0">
                          ₹
                          {(
                            Number(item.price || 0) *
                              Number(item.quantity || 0) -
                            Number(item.discount || 0) +
                            Number(item.taxAmount || 0)
                          ).toLocaleString("en-IN")}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Rejection reason */}
                {selectedCustomerOrder.status === "REJECTED" &&
                  selectedCustomerOrder.rejectReason && (
                    <div className="p-3 rounded-xl bg-red-50 border border-red-100">
                      <p className="text-[10px] uppercase tracking-wider text-red-500 font-black">
                        Rejection Reason
                      </p>

                      <p className="text-xs text-red-700 font-semibold mt-1">
                        {selectedCustomerOrder.rejectReason}
                      </p>
                    </div>
                  )}

                {/* Financial summary */}
                <div className="border-t border-slate-100 pt-4 space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500 font-medium">Subtotal</span>

                    <span className="text-slate-800 font-bold">
                      ₹
                      {Number(
                        selectedCustomerOrder.subtotal || 0,
                      ).toLocaleString("en-IN")}
                    </span>
                  </div>

                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500 font-medium">Discount</span>

                    <span className="text-emerald-600 font-bold">
                      - ₹
                      {Number(
                        selectedCustomerOrder.discount || 0,
                      ).toLocaleString("en-IN")}
                    </span>
                  </div>

                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500 font-medium">Tax</span>

                    <span className="text-slate-800 font-bold">
                      ₹
                      {Number(selectedCustomerOrder.tax || 0).toLocaleString(
                        "en-IN",
                      )}
                    </span>
                  </div>

                  <div className="border-t border-slate-100 pt-3 mt-2 flex items-center justify-between">
                    <span className="text-xs uppercase tracking-wider text-slate-400 font-black">
                      Your Total
                    </span>

                    <span className="text-lg font-black text-slate-900">
                      ₹
                      {Number(selectedCustomerOrder.total || 0).toLocaleString(
                        "en-IN",
                      )}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ---------------- Merge table modal ---------------- */}
        {/* 🔑 z-[70] taaki cart drawer (z-50) ke upar hi khule — cart ke
            andar se hi trigger hota hai, isliye stacking order jaruri hai */}
        {showMergeModal && (
          <div
            className="fixed inset-0 bg-slate-950/70 z-[70] flex items-end sm:items-center justify-center backdrop-blur-sm p-0 sm:p-4 animate-[fadeIn_0.15s_ease-out]"
            role="dialog"
            aria-modal="true"
            aria-labelledby="merge-modal-title"
          >
            <div className="bg-white w-full sm:max-w-sm sm:rounded-2xl rounded-t-3xl shadow-2xl border border-slate-200 p-6 space-y-4 animate-[slideUp_0.2s_ease-out] max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between">
                <div className="w-11 h-11 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center">
                  <Users size={20} />
                </div>
                <button
                  onClick={() => setShowMergeModal(false)}
                  aria-label="Close"
                  className="p-2 -mr-2 text-slate-400 hover:bg-slate-50 rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
                >
                  <X size={18} strokeWidth={2.5} />
                </button>
              </div>
              <div>
                <h3
                  id="merge-modal-title"
                  className="text-base font-black text-slate-900"
                >
                  {t("mergeTable")}
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  {t("mergeTableDesc")}
                </p>
              </div>

              {/* Loading state */}
              {isLoadingTables && (
                <div className="grid grid-cols-4 gap-2 animate-pulse">
                  {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
                    <div key={i} className="h-11 bg-slate-100 rounded-xl" />
                  ))}
                </div>
              )}

              {/* Table chips */}
              {!isLoadingTables &&
                !tablesLoadError &&
                selectableTables.length > 0 && (
                  <div className="grid grid-cols-4 gap-2">
                    {selectableTables.map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setMergeTableNumber(String(num))}
                        className={`h-11 rounded-xl text-sm font-black border transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-300 ${
                          mergeTableNumber === String(num)
                            ? "bg-rose-600 text-white border-rose-600 shadow-sm"
                            : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                )}

              {/* Empty list */}
              {!isLoadingTables &&
                !tablesLoadError &&
                selectableTables.length === 0 && (
                  <p className="text-xs text-slate-400 font-medium bg-slate-50 rounded-xl p-3 text-center">
                    No other active tables right now.
                  </p>
                )}

              {/* Fallback: manual entry if list fails to load */}
              {!isLoadingTables && tablesLoadError && (
                <div className="space-y-1.5">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={mergeTableNumber}
                    onChange={(e) => setMergeTableNumber(e.target.value)}
                    placeholder={t("mergeTableInput")}
                    className="w-full px-4 py-3 text-sm rounded-xl border border-slate-200 focus:outline-none focus:border-rose-400 focus:ring-4 focus:ring-rose-500/10"
                  />
                  <p className="text-[10px] text-slate-400">
                    Couldn't load the table list — enter the table number
                    manually.
                  </p>
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => setShowMergeModal(false)}
                  className="flex-1 py-2.5 rounded-lg text-sm font-bold border border-slate-200 text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleApplyMergeTable}
                  disabled={!mergeTableNumber.trim()}
                  className="flex-1 py-2.5 rounded-lg text-sm font-bold bg-rose-600 hover:bg-rose-700 text-white disabled:opacity-40"
                >
                  {t("mergeTableApply")}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ---------------- Cart drawer ---------------- */}
        {isCartOpen && (
          <div
            className="fixed inset-0 bg-slate-950/60 z-50 flex items-end sm:items-center justify-center backdrop-blur-sm p-0 sm:p-4 animate-[fadeIn_0.15s_ease-out]"
            role="dialog"
            aria-modal="true"
            aria-labelledby="cart-drawer-title"
          >
            <div className="bg-white w-full max-w-md sm:rounded-3xl rounded-t-3xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col animate-[slideUp_0.2s_ease-out]">
              <div className="p-4 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-white z-10">
                <h2
                  id="cart-drawer-title"
                  className="text-base font-black text-slate-900 tracking-tight"
                >
                  {t("reviewOrder")}
                </h2>
                <button
                  onClick={() => setIsCartOpen(false)}
                  aria-label="Close cart"
                  className="p-2 hover:bg-slate-50 rounded-xl text-slate-400 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
                >
                  <X size={18} strokeWidth={2.5} />
                </button>
              </div>

              <form
                onSubmit={handleFinalOrderSubmit}
                className="p-4 space-y-5 flex-1 text-slate-700"
                noValidate
              >
                <div className="flex items-center gap-2.5 bg-rose-50 border border-rose-100 rounded-xl px-3.5 py-3">
                  <Utensils
                    size={15}
                    strokeWidth={2.5}
                    className="text-rose-500 shrink-0"
                  />
                  <p className="text-xs font-bold text-rose-700">
                    {t("dineIn")}
                  </p>
                </div>

                {/* Merge table */}
                <div>
                  {appliedMergeTable ? (
                    <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-xl px-3.5 py-3">
                      <span className="text-xs font-bold text-emerald-700 flex items-center gap-1.5">
                        <Users size={14} /> {t("mergeTableActive")}{" "}
                        {appliedMergeTable}
                      </span>
                      <button
                        type="button"
                        onClick={() => setAppliedMergeTable(null)}
                        className="text-emerald-600 hover:text-emerald-800"
                        aria-label="Remove merged table"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowMergeModal(true)}
                      className="w-full flex items-center justify-center gap-2 border border-dashed border-slate-300 text-slate-500 hover:bg-slate-50 rounded-xl px-3.5 py-2.5 text-xs font-bold"
                    >
                      <Users size={14} /> {t("mergeTable")}
                    </button>
                  )}
                </div>

                <div className="space-y-2.5 rounded-2xl border border-[var(--pm-line)] bg-[var(--pm-bg)] p-3.5">
                  <span className="block text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--pm-muted)]">
                    {t("contactDetails")}
                  </span>
                  {!showGuestForm && orderingAsLabel ? (
                    <div className="flex items-start justify-between gap-3 rounded-xl border border-[var(--pm-line)] bg-white/70 px-3.5 py-3">
                      <div>
                        <p className="text-sm font-semibold text-[var(--pm-ink)]">
                          {orderingAsLabel}
                        </p>
                        <p className="mt-0.5 text-[11px] text-[var(--pm-muted)]">
                          Saved for this table visit
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingDetails(true);
                          setCustomerPhone("");
                          setTouched({ name: false, phone: false });
                        }}
                        className="shrink-0 text-xs font-bold text-[var(--pm-accent)] underline-offset-2 hover:underline"
                      >
                        Change Details
                      </button>
                    </div>
                  ) : (
                    <p className="text-xs text-[var(--pm-muted)]">
                      Enter your details once for this table visit.
                    </p>
                  )}
                  {showGuestForm ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <div className="relative">
                        <User
                          size={14}
                          strokeWidth={2.5}
                          className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${
                            nameHasError
                              ? "text-rose-400"
                              : isValidName
                                ? "text-emerald-500"
                                : "text-slate-300"
                          }`}
                        />
                        <input
                          type="text"
                          required
                          placeholder={t("fullName")}
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                          onBlur={() =>
                            setTouched((tt) => ({ ...tt, name: true }))
                          }
                          className={`w-full pl-10 pr-9 py-3 text-xs rounded-xl border bg-slate-50/50 focus:outline-none focus:ring-4 transition-colors ${
                            nameHasError
                              ? "border-rose-400 focus:border-rose-500 focus:ring-rose-500/10"
                              : isValidName
                                ? "border-emerald-400 focus:border-emerald-500 focus:ring-emerald-500/10"
                                : "border-slate-200 focus:border-rose-500 focus:ring-rose-500/10"
                          }`}
                        />
                        {isValidName && (
                          <CheckCircle2
                            size={14}
                            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-emerald-500 fill-emerald-100"
                          />
                        )}
                      </div>
                      {nameHasError && (
                        <p className="flex items-center gap-1 text-[10px] font-bold text-rose-500 mt-1 pl-1">
                          <AlertCircle size={11} strokeWidth={2.5} />
                          Enter a valid name (3-50 letters)
                        </p>
                      )}
                    </div>

                    <div>
                      <div className="relative">
                        <Phone
                          size={14}
                          strokeWidth={2.5}
                          className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${
                            phoneHasError
                              ? "text-rose-400"
                              : isValidPhone
                                ? "text-emerald-500"
                                : "text-slate-300"
                          }`}
                        />
                        <input
                          type="tel"
                          inputMode="numeric"
                          maxLength={10}
                          placeholder={`${t("phoneNumber")} (optional)`}
                          value={customerPhone}
                          onChange={(e) =>
                            setCustomerPhone(
                              e.target.value.replace(/\D/g, "").slice(0, 10),
                            )
                          }
                          onBlur={() =>
                            setTouched((tt) => ({ ...tt, phone: true }))
                          }
                          className={`w-full pl-10 pr-9 py-3 text-xs rounded-xl border bg-slate-50/50 focus:outline-none focus:ring-4 transition-colors ${
                            phoneHasError
                              ? "border-rose-400 focus:border-rose-500 focus:ring-rose-500/10"
                              : isValidPhone
                                ? "border-emerald-400 focus:border-emerald-500 focus:ring-emerald-500/10"
                                : "border-slate-200 focus:border-rose-500 focus:ring-rose-500/10"
                          }`}
                        />
                        {isValidPhone && (
                          <CheckCircle2
                            size={14}
                            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-emerald-500 fill-emerald-100"
                          />
                        )}
                      </div>
                      {phoneHasError && (
                        <p className="flex items-center gap-1 text-[10px] font-bold text-rose-500 mt-1 pl-1">
                          <AlertCircle size={11} strokeWidth={2.5} />
                          Valid 10-digit number starting with 6-9
                        </p>
                      )}
                    </div>
                  </div>
                  ) : null}

                  {orderType === "DELIVERY" && (
                    <textarea
                      required
                      rows={2}
                      placeholder="Complete Drop-off Address Instructions..."
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      className="w-full px-4 py-3 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 bg-slate-50/50 resize-none leading-relaxed"
                    />
                  )}
                </div>

                <div className="space-y-2">
                  <span className="block text-[10px] font-black uppercase tracking-wider text-slate-400">
                    {t("yourOrder")}
                  </span>
                  <div className="bg-slate-50/80 rounded-xl p-3 divide-y divide-slate-100 text-xs border border-slate-100 max-h-40 overflow-y-auto">
                    {Object.entries(cart).map(([lineId, details]) => {
                      const draft = String(
                        details.specialInstructions || details.notes || "",
                      );
                      return (
                        <div
                          key={lineId}
                          className="py-2.5 text-slate-700 font-medium space-y-1.5"
                        >
                          <div className="flex justify-between items-center">
                            <span>
                              {details.name}{" "}
                              <b className="text-rose-600 ml-1">
                                x{details.quantity}
                              </b>
                            </span>
                            <span className="font-black text-slate-900">
                              ₹
                              {(
                                details.price * details.quantity
                              ).toLocaleString("en-IN")}
                            </span>
                          </div>
                          <div>
                            <div className="flex items-center justify-between gap-2 mb-0.5">
                              <label className="text-[10px] font-bold text-slate-400">
                                {t("addNotes")}
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
                                updateLineSpecialInstructions(
                                  lineId,
                                  e.target.value,
                                )
                              }
                              onBlur={() =>
                                commitLineSpecialInstructions(lineId)
                              }
                              placeholder={t("notesPlaceholder")}
                              className="w-full px-2.5 py-2 text-[11px] rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-rose-400 resize-none"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Suggestions */}
                {suggestions.length > 0 && (
                  <div className="space-y-2">
                    <span className="block text-[10px] font-black uppercase tracking-wider text-slate-400">
                      {t("suggestions")}
                    </span>
                    <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                      {suggestions.map((s) => (
                        <div
                          key={s._id}
                          className="shrink-0 w-[140px] bg-white border border-slate-200 rounded-xl p-2.5 space-y-1.5"
                        >
                          <p className="text-[11px] font-bold text-slate-800 truncate">
                            {s.name}
                          </p>
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-black text-slate-900">
                              ₹{s.price}
                            </span>
                            <QuantityController
                              id={s._id}
                              name={s.name}
                              price={s.price}
                              type="item"
                              quantity={cartQtyForCatalog(s._id)}
                              onAdd={addToCart}
                              onRemove={removeFromCart}
                              size="sm"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-1.5 pt-2 border-t border-slate-100 text-xs">
                  <div className="flex justify-between text-slate-500">
                    <span>{t("subtotal")}</span>
                    <span>₹{totalCartAmount.toLocaleString("en-IN")}</span>
                  </div>
                  {appliedDiscount > 0 && (
                    <div className="flex justify-between text-emerald-600 font-bold">
                      <span>{t("discount")}</span>
                      <span>- ₹{appliedDiscount.toLocaleString("en-IN")}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-black text-slate-900 pt-1.5 border-t border-dashed border-slate-200 mt-1.5">
                    <span>{t("grandTotal")}</span>
                    <span>₹{finalPayableAmount.toLocaleString("en-IN")}</span>
                  </div>
                </div>

                {/* <div className="space-y-2">
                  <span className="block text-[10px] font-black uppercase tracking-wider text-slate-400">
                    {t("paymentSelection")}
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod("UPI")}
                      className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-300 ${paymentMethod === "UPI" ? "border-emerald-500 bg-emerald-50/40" : "border-slate-200 bg-white hover:bg-slate-50"}`}
                    >
                      <span className="text-xs font-bold text-slate-800">
                        {t("upi")}
                      </span>
                      {paymentMethod === "UPI" && (
                        <CheckCircle2
                          size={14}
                          className="text-emerald-600 fill-emerald-100 shrink-0"
                        />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod("CASH")}
                      className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-300 ${paymentMethod === "CASH" ? "border-emerald-500 bg-emerald-50/40" : "border-slate-200 bg-white hover:bg-slate-50"}`}
                    >
                      <span className="text-xs font-bold text-slate-800">
                        {orderType === "DELIVERY" ? "COD Pay" : t("payAtDesk")}
                      </span>
                      {paymentMethod === "CASH" && (
                        <CheckCircle2
                          size={14}
                          className="text-emerald-600 fill-emerald-100 shrink-0"
                        />
                      )}
                    </button>
                  </div>
                </div> */}

                <div className="sticky bottom-0 bg-white pt-2 pb-1">
                  <button
                    type="submit"
                    disabled={
                      !isFormValid || isSubmitting || !isCustomerSessionReady
                    }
                    className={`w-full rounded-xl py-3.5 text-xs font-semibold tracking-wide transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pm-accent)] focus-visible:ring-offset-2 ${
                      !isFormValid || isSubmitting || !isCustomerSessionReady
                        ? "cursor-not-allowed bg-slate-200 text-slate-400 shadow-none"
                        : "cursor-pointer bg-[var(--pm-accent)] text-white shadow-md hover:bg-[var(--pm-accent-dark)]"
                    }`}
                  >
                    {isSubmitting
                      ? t("placingOrder")
                      : `${t("confirmOrder")} · ₹${finalPayableAmount.toLocaleString("en-IN")}`}
                  </button>
                  {!isFormValid && (
                    <p className="mt-2 text-center text-[10px] font-medium text-[var(--pm-muted)]">
                      Enter your name to continue. Mobile is optional.
                    </p>
                  )}
                  {!isCustomerSessionReady && !customerSessionError && (
                    <p className="mt-2 text-center text-[10px] font-medium text-[var(--pm-muted)]">
                      Preparing secure ordering session…
                    </p>
                  )}
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ---------------- Order confirmation screen ---------------- */}
        {confirmedOrder && (
          <div
            className="fixed inset-0 z-[80] flex flex-col items-center justify-center bg-[var(--pm-bg)] p-6 text-center animate-[fadeIn_0.2s_ease-out]"
            role="dialog"
            aria-modal="true"
          >
            <div className="w-full max-w-md rounded-2xl border border-[var(--pm-line)] bg-[var(--pm-surface)] p-7 shadow-[0_12px_40px_rgba(15,23,42,0.08)]">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                <CheckCircle2 size={28} aria-hidden />
              </div>
              <h2 className="pm-display text-2xl text-[var(--pm-ink)]">
                {t("orderConfirmedTitle")}
              </h2>
              <p className="mt-2 text-sm text-[var(--pm-muted)]">
                Your order has been sent to the kitchen.
              </p>
              <dl className="mt-6 space-y-2 rounded-xl bg-[var(--pm-bg)] px-4 py-3 text-left text-sm">
                {confirmedOrder.orderId ? (
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-[var(--pm-muted)]">Reference</dt>
                    <dd className="font-semibold text-[var(--pm-ink)]">
                      {confirmedOrder.orderId}
                    </dd>
                  </div>
                ) : null}
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-[var(--pm-muted)]">Amount</dt>
                  <dd className="font-semibold text-[var(--pm-ink)]">
                    ₹{confirmedOrder.total.toLocaleString("en-IN")}
                  </dd>
                </div>
                {confirmedOrder.status ? (
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-[var(--pm-muted)]">Status</dt>
                    <dd className="font-semibold text-[var(--pm-ink)]">
                      {confirmedOrder.status}
                    </dd>
                  </div>
                ) : null}
                {currentTableNumber ? (
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-[var(--pm-muted)]">Table</dt>
                    <dd className="font-semibold text-[var(--pm-ink)]">
                      {currentTableNumber}
                    </dd>
                  </div>
                ) : null}
              </dl>
              <button
                type="button"
                onClick={() => setConfirmedOrder(null)}
                className="mt-6 w-full rounded-xl bg-[var(--pm-accent)] px-4 py-3 text-sm font-semibold text-white hover:bg-[var(--pm-accent-dark)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pm-accent)] focus-visible:ring-offset-2"
              >
                {t("orderMore")}
              </button>
            </div>
          </div>
        )}
      </div>

      <style>{`
        .public-menu-shell {
          --pm-bg: #f3f1ee;
          --pm-surface: #ffffff;
          --pm-ink: #1c1917;
          --pm-muted: #78716c;
          --pm-line: #e7e5e4;
          --pm-accent: #e11d48;
          --pm-accent-dark: #be123c;
          --pm-accent-soft: #fff1f2;
          --pm-accent-line: #fecdd3;
          font-family: "DM Sans", system-ui, sans-serif;
          -webkit-font-smoothing: antialiased;
        }
        .public-menu-shell .pm-display {
          font-family: "Libre Baskerville", Georgia, serif;
          font-weight: 400;
          letter-spacing: -0.01em;
        }
        .public-menu-shell .pm-input {
          border-radius: 0.85rem;
          border: 1px solid var(--pm-line);
          background: #fff;
          padding: 0.75rem 0.9rem;
          font-size: 0.875rem;
          color: var(--pm-ink);
          outline: none;
        }
        .public-menu-shell .pm-input:focus {
          border-color: var(--pm-accent);
          box-shadow: 0 0 0 3px color-mix(in srgb, var(--pm-accent) 16%, transparent);
        }
        .public-menu-shell .pm-chip {
          border-radius: 999px;
          border: 1px solid var(--pm-line);
          background: #fff;
          padding: 0.45rem 0.9rem;
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--pm-muted);
          white-space: nowrap;
        }
        .public-menu-shell .pm-chip:focus-visible {
          outline: 2px solid var(--pm-accent);
          outline-offset: 2px;
        }
        .public-menu-shell .pm-chip-active {
          border-color: var(--pm-accent);
          background: var(--pm-accent);
          color: #fff;
        }
        .public-menu-shell .pm-chip-veg {
          border-color: #16a34a;
          background: #16a34a;
          color: #fff;
        }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}
