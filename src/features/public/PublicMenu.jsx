import { useState, useCallback, useMemo, memo, useEffect } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import {
  ShoppingBag,
  Star,
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
  // Bell,
  RefreshCw,
  Share2,
  Globe,
  Clock,
  MessageSquare,
  RotateCcw,
} from "lucide-react";

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
    // addNotes: "Add cooking notes (optional)",
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
    // addNotes: "पकाने के निर्देश जोड़ें (वैकल्पिक)",
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
}) {
  const isSm = size === "sm";
  if (quantity === 0) {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onAdd(id, name, price, type);
        }}
        aria-label={`Add ${name}`}
        className={`bg-white hover:bg-rose-50 text-rose-600 font-black rounded-xl shadow-sm border border-rose-200 active:scale-95 transition-all cursor-pointer tracking-wider focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-300 ${isSm ? "text-[10px] px-3 py-1.5" : "text-xs px-5 py-2"}`}
      >
        ADD
      </button>
    );
  }
  return (
    <div
      className={`flex items-center bg-rose-600 text-white rounded-xl overflow-hidden shadow-sm ${isSm ? "h-[28px]" : "h-[34px]"}`}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onRemove(id);
        }}
        aria-label={`Remove one ${name}`}
        className="px-2.5 hover:bg-rose-700 h-full flex items-center justify-center cursor-pointer focus:outline-none"
      >
        <Minus size={isSm ? 10 : 12} strokeWidth={3} />
      </button>
      <span className="px-2 text-xs font-black min-w-[18px] text-center select-none">
        {quantity}
      </span>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onAdd(id, name, price, type);
        }}
        aria-label={`Add one more ${name}`}
        className="px-2.5 hover:bg-rose-700 h-full flex items-center justify-center cursor-pointer focus:outline-none"
      >
        <Plus size={isSm ? 10 : 12} strokeWidth={3} />
      </button>
    </div>
  );
});

const MenuSkeleton = memo(function MenuSkeleton() {
  return (
    <div className="min-h-screen bg-slate-50 animate-pulse">
      <div className="bg-white border-b border-slate-100 p-4 sm:p-6 space-y-4 max-w-md sm:max-w-2xl lg:max-w-5xl mx-auto">
        <div className="flex gap-4 items-center">
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-slate-100 shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-1/2 bg-slate-100 rounded" />
            <div className="h-3 w-1/3 bg-slate-100 rounded" />
          </div>
        </div>
        <div className="h-11 w-full bg-slate-100 rounded-xl" />
        <div className="flex gap-2">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-7 w-20 bg-slate-100 rounded-xl shrink-0"
            />
          ))}
        </div>
      </div>
      <div className="p-4 sm:p-6 max-w-md sm:max-w-2xl lg:max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="bg-white p-4 rounded-2xl border border-slate-100 flex gap-4"
          >
            <div className="w-16 h-16 bg-slate-100 rounded-xl shrink-0" />
            <div className="flex-1 space-y-2 py-1">
              <div className="h-3.5 w-3/4 bg-slate-100 rounded" />
              <div className="h-3 w-full bg-slate-100 rounded" />
              <div className="h-3 w-1/4 bg-slate-100 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});

const ItemCard = memo(function ItemCard({
  item,
  quantity,
  onAdd,
  onRemove,
  onOpenDetail,
}) {
  return (
    <div
      onClick={() => onOpenDetail(item)}
      className="bg-white p-4 rounded-2xl border border-slate-200/70 shadow-sm hover:shadow-md transition-shadow flex gap-4 items-center justify-between cursor-pointer relative"
    >
      {item.isBestseller && (
        <span className="absolute -top-2 left-3 bg-amber-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full flex items-center gap-0.5 shadow-sm">
          <Flame size={9} /> Bestseller
        </span>
      )}
      <div className="flex gap-3 items-center flex-1 min-w-0">
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
            className="w-16 h-16 object-cover rounded-xl border border-slate-100 bg-slate-50 shrink-0"
          />
        ) : (
          <div className="w-16 h-16 rounded-xl border border-slate-100 bg-slate-50 shrink-0 flex items-center justify-center text-slate-300">
            <Utensils size={20} />
          </div>
        )}
        <div className="space-y-0.5 min-w-0">
          <span
            className={`w-2.5 h-2.5 rounded-full inline-block border border-white shadow-xs ${item.isVeg === false ? "bg-red-500" : "bg-emerald-500"}`}
          />
          <h3 className="font-black text-sm text-slate-900 tracking-tight truncate">
            {item.name}
          </h3>
          <p className="text-xs text-slate-400 font-medium line-clamp-2 leading-relaxed pr-2">
            {item.description}
          </p>
          <p className="text-sm font-black text-slate-900 pt-0.5">
            ₹{item.price}
          </p>
        </div>
      </div>
      <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
        <QuantityController
          id={item._id}
          name={item.name}
          price={item.price}
          type="item"
          quantity={quantity}
          onAdd={onAdd}
          onRemove={onRemove}
        />
      </div>
    </div>
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

  const isValidName = /^[A-Za-z ]{3,50}$/.test(customerName.trim());
  const isValidPhone =
    customerPhone.trim() === "" || /^[6-9]\d{9}$/.test(customerPhone.trim());

  const isValidAddress =
    orderType !== "DELIVERY" || deliveryAddress.trim().length > 4;

  const totalItemsInCart = useMemo(
    () => Object.values(cart).reduce((acc, item) => acc + item.quantity, 0),
    [cart],
  );

  const isFormValid = isValidName && isValidAddress && totalItemsInCart > 0;

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

  const { categories, combos, restaurant } = catalog || {};
  const categoryNames = useMemo(
    () => (categories ? Object.keys(categories) : []),
    [categories],
  );

  // 🔑 tableToken mein table number encoded hai (StoreSettings jaisa btoa
  // `${restaurantId}-TABLE-${tableNo}` format) — isse current table number
  // nikaal lete hain taaki merge list mein khud ka table na dikhe.
  const currentTableNumber = useMemo(() => {
    if (!tableToken) return null;
    try {
      const decoded = atob(tableToken);
      const match = decoded.match(/-TABLE-(.+)$/);
      return match ? match[1] : null;
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

  const addToCart = useCallback((id, name, price, type = "item") => {
    setCart((prevCart) => {
      const existing = prevCart[id];
      if (existing) {
        return {
          ...prevCart,
          [id]: { ...existing, quantity: existing.quantity + 1 },
        };
      }
      return {
        ...prevCart,
        [id]: { name, price: Number(price), quantity: 1, type, notes: "" },
      };
    });
  }, []);

  const removeFromCart = useCallback((id) => {
    setCart((prevCart) => {
      const existing = prevCart[id];
      if (!existing) return prevCart;
      if (existing.quantity === 1) {
        const newCart = { ...prevCart };
        delete newCart[id];
        return newCart;
      }
      return {
        ...prevCart,
        [id]: { ...existing, quantity: existing.quantity - 1 },
      };
    });
  }, []);

  // const updateItemNotes = useCallback((id, notes) => {
  //   setCart((prevCart) => {
  //     const existing = prevCart[id];
  //     if (!existing) return prevCart;
  //     return { ...prevCart, [id]: { ...existing, notes } };
  //   });
  // }, []);

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

    Object.entries(cart).forEach(([itemId, details]) => {
      const itemTotalPrice = Number(details.price) * Number(details.quantity);

      const applicableOffers = catalog.offers.filter((offer) => {
        const hasTargetItems =
          offer.targetItems && offer.targetItems.length > 0;
        if (hasTargetItems) return offer.targetItems.includes(itemId);
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
      map[itemId] = itemDiscount;
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

  const filteredCombos = useMemo(
    () =>
      combos?.filter((c) =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()),
      ) || [],
    [combos, searchQuery],
  );

  const filteredCategoryItems = useMemo(() => {
    if (!categories) return {};
    const result = {};
    for (const catName of Object.keys(categories)) {
      result[catName] = categories[catName].filter((i) => {
        const matchesSearch = i.name
          .toLowerCase()
          .includes(searchQuery.toLowerCase());
        const matchesVeg = !vegOnly || i.isVeg !== false;
        return matchesSearch && matchesVeg;
      });
    }
    return result;
  }, [categories, searchQuery, vegOnly]);

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
    return allItemsFlat.filter((i) => !cart[i._id]).slice(0, 4);
  }, [allItemsFlat, cart]);

  const handleReorder = useCallback(() => {
    if (!lastOrderSnapshot) return;
    setCart((prev) => {
      const next = { ...prev };
      lastOrderSnapshot.items.forEach((it) => {
        const existing = next[it.id];
        next[it.id] = {
          name: it.name,
          price: it.price,
          type: it.type,
          notes: "",
          quantity: (existing?.quantity || 0) + it.quantity,
        };
      });
      return next;
    });
  }, [lastOrderSnapshot]);

  const handleApplyMergeTable = useCallback(() => {
    if (!mergeTableNumber.trim()) return;
    setAppliedMergeTable(mergeTableNumber.trim());
    setShowMergeModal(false);
  }, [mergeTableNumber]);

  const handleFinalOrderSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      setTouched({ name: true, phone: true });

      if (!isValidName || !isValidPhone || !isValidAddress || !restaurantId)
        return;

      const orderPayload = {
        restaurantId,
        tableToken,

        mergeWithTable: appliedMergeTable || null,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        orderType: orderType === "PICKUP" ? "DINE_IN" : "DELIVERY",
        deliveryAddress: orderType === "DELIVERY" ? deliveryAddress.trim() : "",
        items: Object.entries(cart).map(([id, details]) => ({
          itemId: id,
          name: details.name,
          quantity: Number(details.quantity),
          price: Number(details.price),
          itemType: details.type === "combo" ? "COMBO" : "SINGLE",
          notes: details.notes || "",
          discount: itemDiscountMap[id] || 0, // 🆕 add this
        })),
        subtotal: Number(totalCartAmount),
        discount: Number(appliedDiscount),
        tax: 0,
        total: Number(finalPayableAmount),
      };

      try {
        setIsSubmitting(true);
        const res = await axios.post(
          `${import.meta.env.VITE_APP_API_BASE}/orders/place`,
          orderPayload,
        );
        if (res.data.success) {
          // reorder ke liye snapshot save karo
          try {
            localStorage.setItem(
              `lastOrder_${restaurantId}`,
              JSON.stringify({
                items: Object.entries(cart).map(([id, d]) => ({
                  id,
                  name: d.name,
                  price: d.price,
                  quantity: d.quantity,
                  type: d.type,
                })),
              }),
            );
          } catch {
            // localStorage unavailable — skip silently
          }

          setConfirmedOrder({
            orderId: res.data.order.orderId,
            total: finalPayableAmount,
          });
          setCart({});
          setCustomerName("");
          setCustomerPhone("");
          setDeliveryAddress("");
          setTouched({ name: false, phone: false });
          setIsCartOpen(false);
          setAppliedMergeTable(null);
          // setFeedbackRating(0);
          // setFeedbackSent(false);
        }
      } catch (err) {
        alert(
          err.response?.data?.message ||
            "Internal validation check mismatch error.",
        );
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      restaurantId,
      tableToken,
      appliedMergeTable,
      customerName,
      customerPhone,
      orderType,
      deliveryAddress,
      cart,
      totalCartAmount,
      appliedDiscount,
      finalPayableAmount,
      isValidName,
      isValidPhone,
      isValidAddress,
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
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="p-4 bg-rose-50 text-rose-500 rounded-full mb-3">
          <LinkIcon size={28} />
        </div>
        <h3 className="font-black text-slate-800 text-base">
          Invalid Menu Link
        </h3>
        <p className="text-xs text-slate-400 font-medium max-w-xs mt-1">
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
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="p-4 bg-rose-50 text-rose-500 rounded-full mb-3">
          <X size={28} />
        </div>
        <h3 className="font-black text-slate-800 text-base">
          Menu Not Available
        </h3>
        <p className="text-xs text-slate-400 font-medium max-w-xs mt-1">
          We couldn't load this menu right now. 
          Please ask at the restaurant counter for assistance.
        </p>
      </div>
    );
  }

  const nameHasError = touched.name && !isValidName;
  const phoneHasError =
    touched.phone && customerPhone.trim() !== "" && !isValidPhone;
  return (
    <div className="min-h-screen bg-slate-200/60">
      <div className="min-h-screen bg-slate-50 text-slate-900 pb-28 antialiased font-sans max-w-md sm:max-w-2xl lg:max-w-5xl mx-auto shadow-sm relative sm:border-x border-slate-200/60">
        {/* ---------------- Header ---------------- */}
        <div className="bg-white sticky top-0 z-40 border-b border-slate-100">
          <div className="p-4 sm:p-6 flex gap-4 items-center">
            {restaurant?.logo ? (
              <img
                src={
                  restaurant.logo.startsWith("http")
                    ? restaurant.logo
                    : `${import.meta.env.VITE_APP_API_BASE.replace("/api", "")}${restaurant.logo}`
                }
                alt={restaurant.name}
                className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl object-cover bg-slate-50 border border-slate-100 shrink-0"
              />
            ) : (
              <div className="w-14 h-14 sm:w-16 sm:h-16 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center font-black text-xl border border-rose-100 shrink-0">
                {restaurant?.name?.charAt(0) || "🍴"}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-black tracking-tight text-slate-900 truncate">
                  {restaurant?.name || "Our Restaurant"}
                </h1>
                {/* <span className="flex items-center text-[10px] bg-amber-50 text-amber-700 font-extrabold px-1.5 py-0.5 rounded-md border border-amber-200/50 shrink-0">
                  <Star size={10} className="fill-amber-600 mr-0.5" /> 4.2
                </span> */}
              </div>
              <p className="text-[11px] sm:text-xs text-slate-400 font-semibold mt-0.5">
                Digital Menu · Scan &amp; Order
              </p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => setLanguage((l) => (l === "EN" ? "HI" : "EN"))}
                aria-label="Toggle language"
                className="w-9 h-9 rounded-xl border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-300"
              >
                <Globe size={15} />
              </button>
              {/* <button
                onClick={() => refetch()}
                aria-label="Refresh menu"
                title={t("refresh")}
                className="w-9 h-9 rounded-xl border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-300"
              >
                <RefreshCw
                  size={15}
                  className={isFetching ? "animate-spin" : ""}
                />
              </button> */}
            </div>
          </div>

          <div className="px-4 sm:px-6 pb-4 bg-white">
            <div className="relative sm:max-w-md">
              <Search
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                placeholder={t("searchPlaceholder")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Search menu"
                className="w-full bg-slate-100 border border-transparent text-xs sm:text-sm font-medium py-3 pl-10 pr-9 rounded-xl focus:outline-none focus:bg-white focus:border-rose-200 focus:ring-4 focus:ring-rose-500/10 transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  aria-label="Clear search"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          <div className="relative border-t border-slate-100 bg-white">
            <div className="px-4 sm:px-6 py-2.5 flex gap-1.5 overflow-x-auto no-scrollbar">
              <button
                onClick={() => setActiveCategory("ALL")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-black tracking-tight whitespace-nowrap transition-all cursor-pointer border shrink-0 ${
                  activeCategory === "ALL"
                    ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                    : "bg-slate-50 text-slate-600 border-slate-200/60 hover:bg-slate-100"
                }`}
              >
                {t("allMenu")}
              </button>
              {combos?.length > 0 && (
                <button
                  onClick={() => setActiveCategory("COMBOS")}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-black tracking-tight whitespace-nowrap transition-all cursor-pointer border shrink-0 ${
                    activeCategory === "COMBOS"
                      ? "bg-rose-500 text-white border-rose-500 shadow-sm"
                      : "bg-rose-50 text-rose-600 border-rose-100 hover:bg-rose-100"
                  }`}
                >
                  🔥 Combos
                </button>
              )}
              {categoryNames.map((catName) => (
                <button
                  key={catName}
                  onClick={() => setActiveCategory(catName)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold tracking-tight whitespace-nowrap transition-all cursor-pointer border shrink-0 ${
                    activeCategory === catName
                      ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                      : "bg-slate-50 text-slate-600 border-slate-200/60 hover:bg-slate-100"
                  }`}
                >
                  {catName}
                </button>
              ))}
              <button
                onClick={() => setVegOnly((v) => !v)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-black tracking-tight whitespace-nowrap transition-all cursor-pointer border shrink-0 flex items-center gap-1 ${
                  vegOnly
                    ? "bg-emerald-500 text-white border-emerald-500 shadow-sm"
                    : "bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100"
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
        <div className="p-4 sm:p-6 space-y-6">
          {combos?.length > 0 &&
            (activeCategory === "ALL" || activeCategory === "COMBOS") &&
            filteredCombos.length > 0 && (
              <div className="space-y-3">
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
                          quantity={cart[combo._id]?.quantity || 0}
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
                  <div key={categoryName} className="space-y-3">
                    {activeCategory === "ALL" && (
                      <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">
                        {categoryName}
                      </h2>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {items.map((item) => (
                        <ItemCard
                          key={item._id}
                          item={item}
                          quantity={cart[item._id]?.quantity || 0}
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
            <div className="flex flex-col items-center text-center py-16 px-6">
              <div className="p-4 bg-slate-100 text-slate-400 rounded-full mb-3">
                <SearchX size={24} />
              </div>
              <h3 className="font-black text-slate-700 text-sm">
                {t("noDishes")}
              </h3>
              <p className="text-xs text-slate-400 font-medium max-w-xs mt-1">
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
          <div className="fixed bottom-4 inset-x-4 max-w-sm sm:max-w-md mx-auto z-40 px-2 lg:left-1/2 lg:-translate-x-1/2 lg:right-auto">
            <div className="bg-slate-950 text-white p-3.5 rounded-2xl shadow-xl flex justify-between items-center border border-slate-800">
              <div className="flex items-center gap-3 pl-1">
                <div className="p-2 bg-rose-500 rounded-xl text-white">
                  <ShoppingBag size={16} strokeWidth={2.5} />
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                    {totalItemsInCart} Item{totalItemsInCart > 1 ? "s" : ""}
                  </p>
                  {/* <p className="text-base font-black text-white tracking-tight">
                    ₹{totalCartAmount.toLocaleString("en-IN")}
                  </p> */}
                </div>
              </div>
              <button
                onClick={() => setIsCartOpen(true)}
                className="bg-gradient-to-r from-rose-500 to-pink-600 text-white font-black text-xs px-5 py-3 rounded-xl cursor-pointer shadow-md transition-all active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-300"
              >
                Next Step
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
                          : `${import.meta.env.VITE_APP_API_BASE.replace("/api", "")}${detailItem.image}`
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

                {/* {cart[detailItem._id] && (
                  <div className="space-y-1.5">
                    <label className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400">
                      <MessageSquare size={12} /> {t("addNotes")}
                    </label>
                    <textarea
                      rows={2}
                      value={cart[detailItem._id]?.notes || ""}
                      onChange={(e) =>
                        updateItemNotes(detailItem._id, e.target.value)
                      }
                      placeholder={t("notesPlaceholder")}
                      className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-rose-400 focus:ring-4 focus:ring-rose-500/10 bg-slate-50/50 resize-none"
                    />
                  </div>
                )} */}

                <div className="pt-2">
                  <QuantityController
                    id={detailItem._id}
                    name={detailItem.name}
                    price={detailItem.price}
                    type="item"
                    quantity={cart[detailItem._id]?.quantity || 0}
                    onAdd={addToCart}
                    onRemove={removeFromCart}
                  />
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

                <div className="space-y-2.5">
                  <span className="block text-[10px] font-black uppercase tracking-wider text-slate-400">
                    {t("contactDetails")}
                  </span>
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
                          placeholder={t("phoneNumber(Optional)")}
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
                    {Object.entries(cart).map(([id, details]) => (
                      <div
                        key={id}
                        className="py-2.5 text-slate-700 font-medium"
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
                            {(details.price * details.quantity).toLocaleString(
                              "en-IN",
                            )}
                          </span>
                        </div>
                        {details.notes && (
                          <p className="text-[10px] text-slate-400 italic mt-0.5">
                            "{details.notes}"
                          </p>
                        )}
                      </div>
                    ))}
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
                              quantity={cart[s._id]?.quantity || 0}
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

                <div className="pt-2 pb-1 sticky bottom-0 bg-white">
                  <button
                    type="submit"
                    disabled={!isFormValid || isSubmitting}
                    className={`w-full font-black text-xs py-3.5 rounded-xl shadow-md transition-all tracking-wider uppercase focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-300 ${
                      !isFormValid || isSubmitting
                        ? "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none"
                        : "bg-gradient-to-r from-rose-500 to-pink-600 text-white cursor-pointer active:scale-[0.99]"
                    }`}
                  >
                    {isSubmitting
                      ? t("placingOrder")
                      : `${t("confirmOrder")} • ₹${finalPayableAmount.toLocaleString("en-IN")}`}
                  </button>
                  {!isFormValid && (
                    <p className="text-center text-[10px] font-bold text-slate-400 mt-2">
                      Enter your name and mobile number to continue
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
            className="fixed inset-0 bg-white z-[80] flex flex-col items-center justify-center p-6 text-center animate-[fadeIn_0.2s_ease-out]"
            role="dialog"
            aria-modal="true"
          >
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-500 flex items-center justify-center mb-4">
              <CheckCircle2 size={32} />
            </div>
            <h2 className="text-xl font-black text-slate-900">
              {t("orderConfirmedTitle")}
            </h2>
            <p className="text-xs text-slate-400 font-semibold mt-1">
              Order ID:{" "}
              <span className="text-slate-700 font-black">
                {confirmedOrder.orderId}
              </span>
            </p>
            <p className="text-2xl font-black text-slate-900 mt-3">
              ₹{confirmedOrder.total.toLocaleString("en-IN")}
            </p>
            <div className="flex items-center gap-1.5 text-xs text-slate-400 font-semibold mt-2">
              <Clock size={13} /> {t("prepTime")}: ~20-25 mins
            </div>

            {/* <a
              href={whatsappShareUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs px-5 py-3 rounded-xl shadow-md transition-all active:scale-[0.98]"
            >
              <Share2 size={15} /> {t("shareWhatsapp")}
            </a> */}

            {/* <div className="mt-8 w-full max-w-xs">
              {!feedbackSent ? (
                <>
                  <p className="text-xs font-bold text-slate-500 mb-2">
                    {t("rateExperience")}
                  </p>
                  <div className="flex justify-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={() => submitFeedback(star)}
                        aria-label={`Rate ${star} stars`}
                        className="p-1"
                      >
                        <Star
                          size={26}
                          className={
                            star <= feedbackRating
                              ? "fill-amber-400 text-amber-400"
                              : "text-slate-200"
                          }
                        />
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-xs font-bold text-emerald-600">
                  {t("thanksFeedback")}
                </p>
              )}
            </div> */}

            <button
              onClick={() => setConfirmedOrder(null)}
              className="mt-8 text-xs font-bold text-slate-500 underline underline-offset-2"
            >
              {t("orderMore")}
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}
