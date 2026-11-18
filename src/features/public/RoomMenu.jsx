import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import {
  AlertCircle,
  CheckCircle2,
  DoorOpen,
  Loader2,
  Minus,
  Plus,
  RefreshCw,
  Search,
  ShoppingBag,
  Utensils,
  X,
} from "lucide-react";
import {
  guestBannerFromRoomOrdering,
  isRoomOrderingUiEnabled,
} from "../roomQr/roomQrPublicUrl";
import {
  buildCategoryTabs,
  cartTotals,
  filterCatalogSections,
  formatOrderingAsLabel,
  identityFromSessionPayload,
  isItemAvailable,
  itemKey,
  roomOrderingStatusMeta,
  validateGuestName,
  validateGuestPhone,
} from "./roomMenuUx";
import {
  SPECIAL_INSTRUCTIONS_MAX,
  createCartLineId,
  findCartLineId,
  normalizeSpecialInstructions,
} from "../orders/itemSpecialInstructions";

const apiBase = () =>
  String(import.meta.env.VITE_APP_API_BASE || "").replace(/\/+$/, "");

const menuImageSrc = (src) => {
  if (!src) return "";
  const value = String(src);
  if (value.startsWith("http") || value.startsWith("blob:")) return value;
  return `${apiBase().replace(/\/api(?:\/v1)?\/?$/, "")}${value}`;
};

const ROOM_MENU_FONT_ID = "room-menu-fonts";

/**
 * Guest Room QR menu — public route /room-menu/:token
 * Authorization is always enforced by the backend on placeOrder.
 */
export default function RoomMenu() {
  const { token: rawToken } = useParams();
  // Keep token only in memory from the route — never browser storage.
  const roomQrToken = useMemo(
    () => (typeof rawToken === "string" ? decodeURIComponent(rawToken) : ""),
    [rawToken],
  );

  const [cart, setCart] = useState({});
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerPhoneMasked, setCustomerPhoneMasked] = useState("");
  const [identityKnown, setIdentityKnown] = useState(false);
  const [editingDetails, setEditingDetails] = useState(false);
  const [formTouched, setFormTouched] = useState({ name: false, phone: false });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [confirmedOrder, setConfirmedOrder] = useState(null);
  const [orderingSoftLocked, setOrderingSoftLocked] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const submittingRef = useRef(false);
  const categoryRailRef = useRef(null);

  // Token change: clear local form; backend restores only same roomBookingId identity.
  useEffect(() => {
    setCustomerName("");
    setCustomerPhone("");
    setCustomerPhoneMasked("");
    setIdentityKnown(false);
    setEditingDetails(false);
    setFormTouched({ name: false, phone: false });
    setConfirmedOrder(null);
    setCart({});
    setIsCartOpen(false);
    setSubmitError("");
    setOrderingSoftLocked(false);
  }, [roomQrToken]);

  useEffect(() => {
    if (!roomQrToken) return undefined;
    let cancelled = false;
    const bootstrap = async () => {
      try {
        const res = await axios.post(
          `${apiBase()}/customer/room-session`,
          { roomQrToken },
          { withCredentials: true },
        );
        if (cancelled) return;
        const restored = identityFromSessionPayload(res.data?.data);
        if (restored) {
          setCustomerName(restored.customerName);
          setCustomerPhone("");
          setCustomerPhoneMasked(restored.customerPhoneMasked);
          setIdentityKnown(true);
          setEditingDetails(false);
        } else {
          setIdentityKnown(false);
          setCustomerPhoneMasked("");
        }
      } catch {
        if (!cancelled) {
          setIdentityKnown(false);
        }
      }
    };
    bootstrap();
    return () => {
      cancelled = true;
    };
  }, [roomQrToken]);

  useEffect(() => {
    if (document.getElementById(ROOM_MENU_FONT_ID)) return undefined;
    const link = document.createElement("link");
    link.id = ROOM_MENU_FONT_ID;
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=Libre+Baskerville:wght@400;700&display=swap";
    document.head.appendChild(link);
    return undefined;
  }, []);

  const menuQuery = useQuery({
    queryKey: ["room-public-menu", roomQrToken],
    queryFn: async () => {
      const res = await axios.get(
        `${apiBase()}/public/room-menu/${encodeURIComponent(roomQrToken)}`,
        { withCredentials: true },
      );
      return res.data;
    },
    enabled: Boolean(roomQrToken),
    retry: false,
    staleTime: 15_000,
  });

  const payload = menuQuery.data?.data || null;
  const roomOrdering = payload?.roomOrdering || null;
  const restaurant = payload?.restaurant || null;
  const categories = payload?.categories || {};
  const categoryOrder = Array.isArray(payload?.categoryOrder)
    ? payload.categoryOrder
    : Object.keys(categories);
  const combos = Array.isArray(payload?.combos) ? payload.combos : [];

  const backendOrderingEnabled = isRoomOrderingUiEnabled(roomOrdering);
  const orderingEnabled = backendOrderingEnabled && !orderingSoftLocked;
  const guestMessage = guestBannerFromRoomOrdering(roomOrdering);
  const statusMeta = roomOrderingStatusMeta({
    orderingEnabled,
    guestMessage,
  });

  const categoryTabs = useMemo(
    () => buildCategoryTabs({ categoryOrder, categories, combos }),
    [categoryOrder, categories, combos],
  );

  const sections = useMemo(
    () =>
      filterCatalogSections({
        categoryOrder,
        categories,
        combos,
        selectedCategory: searchQuery.trim() ? "" : selectedCategory,
        searchQuery,
      }),
    [categoryOrder, categories, combos, selectedCategory, searchQuery],
  );

  const { entries: cartEntries, totalItems, subtotal } = useMemo(
    () => cartTotals(cart),
    [cart],
  );

  const showGuestForm = !identityKnown || editingDetails;
  const nameValidation = validateGuestName(customerName);
  const phoneValidation = validateGuestPhone(customerPhone);
  const nameHasError =
    showGuestForm && formTouched.name && !nameValidation.ok;
  const phoneHasError =
    showGuestForm && formTouched.phone && !phoneValidation.ok;
  const orderingAsLabel = formatOrderingAsLabel(
    customerName,
    customerPhoneMasked,
  );

  const cartQtyForCatalog = useCallback(
    (catalogId) =>
      Object.values(cart).reduce((sum, details) => {
        if (String(details?.catalogId) !== String(catalogId)) return sum;
        return sum + Number(details?.quantity || 0);
      }, 0),
    [cart],
  );

  const addToCart = useCallback(
    (item, type = "item", specialInstructions = "") => {
      if (!orderingEnabled) return;
      if (!isItemAvailable(item)) return;
      const catalogId = item.catalogId || itemKey(item);
      if (!catalogId) return;
      const instructions = normalizeSpecialInstructions(specialInstructions);
      setCart((prev) => {
        const existingId = findCartLineId(prev, catalogId, instructions);
        if (existingId) {
          const existing = prev[existingId];
          return {
            ...prev,
            [existingId]: {
              ...existing,
              quantity: (existing.quantity || 0) + 1,
            },
          };
        }
        const lineId = createCartLineId();
        return {
          ...prev,
          [lineId]: {
            catalogId: String(catalogId),
            name: item.name,
            price: Number(item.price) || 0,
            quantity: 1,
            type,
            image: item.image || "",
            specialInstructions: instructions,
          },
        };
      });
    },
    [orderingEnabled],
  );

  const removeFromCart = useCallback((lineId) => {
    setCart((prev) => {
      const existing = prev[lineId];
      if (!existing) return prev;
      if (existing.quantity <= 1) {
        const next = { ...prev };
        delete next[lineId];
        return next;
      }
      return {
        ...prev,
        [lineId]: { ...existing, quantity: existing.quantity - 1 },
      };
    });
  }, []);

  const removeCatalogFromCart = useCallback((catalogId) => {
    setCart((prev) => {
      const lineId = findCartLineId(prev, catalogId, "");
      if (!lineId) return prev;
      const existing = prev[lineId];
      if (existing.quantity <= 1) {
        const next = { ...prev };
        delete next[lineId];
        return next;
      }
      return {
        ...prev,
        [lineId]: { ...existing, quantity: existing.quantity - 1 },
      };
    });
  }, []);

  const updateLineSpecialInstructions = useCallback((lineId, nextRaw) => {
    setCart((prev) => {
      const existing = prev[lineId];
      if (!existing) return prev;
      return {
        ...prev,
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
    setCart((prev) => {
      const existing = prev[lineId];
      if (!existing) return prev;
      const nextInstructions = normalizeSpecialInstructions(
        existing.specialInstructions,
      );
      const catalogId = String(existing.catalogId || "");
      const duplicateId = findCartLineId(prev, catalogId, nextInstructions);
      if (duplicateId && duplicateId !== lineId) {
        const next = { ...prev };
        const target = next[duplicateId];
        next[duplicateId] = {
          ...target,
          specialInstructions: nextInstructions,
          quantity:
            Number(target.quantity || 0) + Number(existing.quantity || 0),
        };
        delete next[lineId];
        return next;
      }
      return {
        ...prev,
        [lineId]: { ...existing, specialInstructions: nextInstructions },
      };
    });
  }, []);

  const refreshMenu = useCallback(async () => {
    setSubmitError("");
    setOrderingSoftLocked(false);
    await menuQuery.refetch();
  }, [menuQuery]);

  const placeOrder = useCallback(async () => {
    if (submittingRef.current || isSubmitting) return;
    if (!orderingEnabled) {
      setSubmitError(
        guestMessage ||
          "Ordering is not available yet. Please contact reception.",
      );
      return;
    }
    if (!roomOrdering?.restaurantId || !roomQrToken) {
      setSubmitError("Unable to place order. Please rescan the room QR.");
      return;
    }
    if (totalItems < 1) {
      setSubmitError("Add at least one item to your order.");
      return;
    }

    const usingSavedIdentity = identityKnown && !editingDetails;
    if (!usingSavedIdentity) {
      setFormTouched({ name: true, phone: true });
      const nameOk = validateGuestName(customerName);
      const phoneOk = validateGuestPhone(customerPhone);
      if (!nameOk.ok) {
        setSubmitError(nameOk.message);
        return;
      }
      if (!phoneOk.ok) {
        setSubmitError(phoneOk.message);
        return;
      }
    }

    submittingRef.current = true;
    setIsSubmitting(true);
    setSubmitError("");

    const idempotencyKey =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `room-order-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    try {
      await axios.post(
        `${apiBase()}/customer/room-session`,
        { roomQrToken },
        { withCredentials: true },
      );

      if (!usingSavedIdentity) {
        await axios.put(
          `${apiBase()}/customer/identity`,
          {
            restaurantId: roomOrdering.restaurantId,
            roomQrToken,
            customerName: customerName.trim(),
            customerPhone: customerPhone.trim(),
          },
          { withCredentials: true },
        );
      }

      const fresh = await axios.get(
        `${apiBase()}/public/room-menu/${encodeURIComponent(roomQrToken)}`,
        { withCredentials: true },
      );
      const freshOrdering = fresh.data?.data?.roomOrdering;
      if (!isRoomOrderingUiEnabled(freshOrdering)) {
        setOrderingSoftLocked(true);
        setCart({});
        setIsCartOpen(false);
        setSubmitError(
          freshOrdering?.guestMessage ||
            "Ordering is no longer available for this room.",
        );
        return;
      }
      setOrderingSoftLocked(false);

      const orderPayload = {
        restaurantId: freshOrdering.restaurantId || roomOrdering.restaurantId,
        roomQrToken,
        customerName: usingSavedIdentity ? "" : customerName.trim(),
        customerPhone: usingSavedIdentity ? "" : customerPhone.trim(),
        orderType: "DINE_IN",
        items: cartEntries.map(([, details]) => ({
          itemId: details.catalogId,
          name: details.name,
          quantity: Number(details.quantity),
          price: Number(details.price),
          itemType: details.type === "combo" ? "COMBO" : "SINGLE",
          specialInstructions: normalizeSpecialInstructions(
            details.specialInstructions || "",
          ),
        })),
      };

      const res = await axios.post(`${apiBase()}/orders/place`, orderPayload, {
        withCredentials: true,
        headers: { "Idempotency-Key": idempotencyKey },
      });

      if (res.data?.success) {
        setConfirmedOrder({
          orderId: res.data.order?.orderId,
          total: Number(res.data.order?.total ?? subtotal),
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
        setFormTouched({ name: false, phone: false });
        setIsCartOpen(false);
      } else {
        setSubmitError(res.data?.message || "Unable to place order.");
      }
    } catch (err) {
      const code = err?.response?.data?.code;
      const message =
        err?.response?.data?.message ||
        "Unable to place order. Please try again.";

      if (
        code === "ROOM_ORDERING_NOT_AVAILABLE" ||
        code === "ROOM_QR_CHECKED_OUT" ||
        code === "ROOM_QR_REVOKED" ||
        code === "ROOM_QR_ROTATED" ||
        code === "ROOM_NOT_OCCUPIED"
      ) {
        setOrderingSoftLocked(true);
        setCart({});
        setIsCartOpen(false);
        try {
          await menuQuery.refetch();
        } catch {
          /* ignore */
        }
      }

      setSubmitError(message);
    } finally {
      setIsSubmitting(false);
      submittingRef.current = false;
    }
  }, [
    isSubmitting,
    orderingEnabled,
    guestMessage,
    roomOrdering,
    roomQrToken,
    totalItems,
    customerName,
    customerPhone,
    identityKnown,
    editingDetails,
    cartEntries,
    subtotal,
    menuQuery,
  ]);

  if (!roomQrToken) {
    return (
      <Shell>
        <DeniedScreen
          title="Invalid room QR"
          message="This link is missing a room code. Please scan the QR in your room."
        />
      </Shell>
    );
  }

  if (menuQuery.isLoading) {
    return (
      <Shell>
        <LoadingSkeleton />
      </Shell>
    );
  }

  if (menuQuery.isError) {
    const code = menuQuery.error?.response?.data?.code;
    const message =
      menuQuery.error?.response?.data?.message ||
      "This room QR is not valid. Please ask reception for help.";
    return (
      <Shell>
        <DeniedScreen
          title={
            code === "ROOM_QR_REVOKED" || code === "ROOM_QR_ROTATED"
              ? "Room QR unavailable"
              : "Unable to open room menu"
          }
          message={message}
        />
      </Shell>
    );
  }

  if (confirmedOrder) {
    return (
      <Shell>
        <div className="flex min-h-dvh flex-col items-center justify-center px-4 py-10">
          <div className="rm-surface w-full max-w-md rounded-2xl border border-[var(--rm-line)] p-7 text-center shadow-[0_12px_40px_rgba(26,31,28,0.08)]">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[var(--rm-accent-soft)] text-[var(--rm-accent)]">
              <CheckCircle2 className="h-7 w-7" aria-hidden />
            </div>
            <h1 className="rm-display mt-5 text-2xl text-[var(--rm-ink)]">
              Order sent
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-[var(--rm-muted)]">
              Your request has been sent to the kitchen. Charges are added to
              your room folio.
            </p>
            <dl className="mt-6 space-y-2 rounded-xl bg-[var(--rm-bg)] px-4 py-3 text-left text-sm">
              {confirmedOrder.orderId ? (
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-[var(--rm-muted)]">Reference</dt>
                  <dd className="font-semibold text-[var(--rm-ink)]">
                    {confirmedOrder.orderId}
                  </dd>
                </div>
              ) : null}
              <div className="flex items-center justify-between gap-3">
                <dt className="text-[var(--rm-muted)]">Amount</dt>
                <dd className="font-semibold text-[var(--rm-ink)]">
                  ₹{Number(confirmedOrder.total).toLocaleString("en-IN")}
                </dd>
              </div>
              {confirmedOrder.status ? (
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-[var(--rm-muted)]">Status</dt>
                  <dd className="font-semibold text-[var(--rm-ink)]">
                    {confirmedOrder.status}
                  </dd>
                </div>
              ) : null}
              {roomOrdering?.roomNumber ? (
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-[var(--rm-muted)]">Room</dt>
                  <dd className="font-semibold text-[var(--rm-ink)]">
                    {roomOrdering.roomNumber}
                  </dd>
                </div>
              ) : null}
            </dl>
            <button
              type="button"
              className="rm-btn-primary mt-6 w-full"
              onClick={() => setConfirmedOrder(null)}
            >
              Order more
            </button>
          </div>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div
        className={`min-h-dvh ${
          orderingEnabled && totalItems > 0 ? "pb-28" : "pb-8"
        }`}
      >
        <header className="sticky top-0 z-30 border-b border-[var(--rm-line)] bg-[color-mix(in_srgb,var(--rm-bg)_92%,white)] backdrop-blur-md">
          <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3.5">
            {restaurant?.logo ? (
              <img
                src={menuImageSrc(restaurant.logo)}
                alt=""
                className="h-11 w-11 rounded-xl object-cover ring-1 ring-[var(--rm-line)]"
              />
            ) : (
              <div
                className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--rm-accent)] text-sm font-semibold text-white"
                aria-hidden
              >
                {(restaurant?.name || "H").charAt(0)}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="rm-display truncate text-lg leading-tight text-[var(--rm-ink)]">
                {restaurant?.name || "Room dining"}
              </p>
              <p className="mt-0.5 flex items-center gap-1.5 text-xs text-[var(--rm-muted)]">
                <DoorOpen size={13} aria-hidden />
                <span>
                  Room{" "}
                  <span className="font-semibold text-[var(--rm-ink)]">
                    {roomOrdering?.roomNumber || "—"}
                  </span>
                </span>
              </p>
            </div>
            <button
              type="button"
              onClick={refreshMenu}
              className="rm-icon-btn"
              aria-label="Refresh menu"
            >
              <RefreshCw size={16} />
            </button>
          </div>
        </header>

        <main className="mx-auto max-w-3xl space-y-5 px-4 py-5">
          <section
            className={`rounded-2xl border px-4 py-3.5 ${
              statusMeta.tone === "ready"
                ? "border-[var(--rm-accent-line)] bg-[var(--rm-accent-soft)]"
                : "border-[var(--rm-warn-line)] bg-[var(--rm-warn-soft)]"
            }`}
            role="status"
            aria-live="polite"
          >
            <p
              className={`text-[11px] font-semibold uppercase tracking-[0.14em] ${
                statusMeta.tone === "ready"
                  ? "text-[var(--rm-accent)]"
                  : "text-[var(--rm-warn)]"
              }`}
            >
              {statusMeta.label}
            </p>
            <p className="mt-1 text-sm leading-relaxed text-[var(--rm-ink)]">
              {statusMeta.detail}
            </p>
            {!orderingEnabled && (
              <p className="mt-1.5 text-xs text-[var(--rm-muted)]">
                Browse freely. Add to cart unlocks when ordering is available
                for this stay.
              </p>
            )}
          </section>

          <section className="space-y-3" aria-label="Find dishes">
            <label className="relative block">
              <span className="sr-only">Search menu</span>
              <Search
                size={16}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--rm-muted)]"
                aria-hidden
              />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search the menu"
                className="rm-input pl-10"
                autoComplete="off"
              />
            </label>

            {categoryTabs.length > 0 && !searchQuery.trim() ? (
              <div
                ref={categoryRailRef}
                className="rm-category-rail -mx-4 flex gap-2 overflow-x-auto px-4 pb-1"
                role="tablist"
                aria-label="Menu categories"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={!selectedCategory}
                  className={`rm-chip ${!selectedCategory ? "rm-chip-active" : ""}`}
                  onClick={() => setSelectedCategory("")}
                >
                  All
                </button>
                {categoryTabs.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={selectedCategory === tab.id}
                    className={`rm-chip ${
                      selectedCategory === tab.id ? "rm-chip-active" : ""
                    }`}
                    onClick={() => setSelectedCategory(tab.id)}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            ) : null}
          </section>

          {sections.length === 0 ? (
            <EmptyState
              title={
                searchQuery.trim()
                  ? "No matching dishes"
                  : "Menu not available yet"
              }
              message={
                searchQuery.trim()
                  ? "Try another search or browse a different category."
                  : "Please check back shortly or ask reception for assistance."
              }
            />
          ) : (
            sections.map((section) => (
              <section key={section.id} className="space-y-3" id={section.id}>
                <div className="flex items-end justify-between gap-3">
                  <h2 className="rm-display text-xl text-[var(--rm-ink)]">
                    {section.title}
                  </h2>
                  <span className="text-xs text-[var(--rm-muted)]">
                    {section.items.length}{" "}
                    {section.items.length === 1 ? "item" : "items"}
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {section.items.map((item) => (
                    <MenuCard
                      key={itemKey(item)}
                      item={item}
                      quantity={cartQtyForCatalog(itemKey(item))}
                      orderingEnabled={orderingEnabled}
                      onAdd={() =>
                        addToCart(
                          item,
                          section.type === "combo" ? "combo" : "item",
                        )
                      }
                      onRemove={() => removeCatalogFromCart(itemKey(item))}
                    />
                  ))}
                </div>
              </section>
            ))
          )}
        </main>

        {orderingEnabled && totalItems > 0 && !isCartOpen ? (
          <div className="fixed inset-x-0 bottom-0 z-40 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2">
            <div className="mx-auto max-w-md">
              <button
                type="button"
                onClick={() => setIsCartOpen(true)}
                className="flex w-full items-center justify-between gap-3 rounded-2xl bg-[var(--rm-ink)] px-4 py-3.5 text-white shadow-[0_10px_30px_rgba(26,31,28,0.28)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--rm-accent)]"
              >
                <span className="flex items-center gap-3">
                  <span className="rounded-xl bg-[var(--rm-accent)] p-2.5">
                    <ShoppingBag size={16} aria-hidden />
                  </span>
                  <span className="text-left">
                    <span className="block text-[11px] font-medium text-white/70">
                      {totalItems} item{totalItems === 1 ? "" : "s"}
                    </span>
                    <span className="text-base font-semibold tracking-tight">
                      ₹{subtotal.toLocaleString("en-IN")}
                    </span>
                  </span>
                </span>
                <span className="text-sm font-semibold">View cart</span>
              </button>
            </div>
          </div>
        ) : null}

        {isCartOpen ? (
          <div
            className="fixed inset-0 z-50 flex items-end justify-center bg-[rgba(26,31,28,0.45)] p-0 sm:items-center sm:p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="room-cart-title"
            onClick={(e) => {
              if (e.target === e.currentTarget && !isSubmitting) {
                setIsCartOpen(false);
              }
            }}
          >
            <div className="rm-surface max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-3xl p-5 shadow-2xl sm:rounded-3xl">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2
                  id="room-cart-title"
                  className="rm-display text-xl text-[var(--rm-ink)]"
                >
                  Your order
                </h2>
                <button
                  type="button"
                  aria-label="Close cart"
                  onClick={() => !isSubmitting && setIsCartOpen(false)}
                  className="rm-icon-btn"
                  disabled={isSubmitting}
                >
                  <X size={18} />
                </button>
              </div>

              {!orderingEnabled ? (
                <p className="rounded-xl border border-[var(--rm-warn-line)] bg-[var(--rm-warn-soft)] px-3 py-3 text-sm text-[var(--rm-ink)]">
                  {guestMessage}
                </p>
              ) : (
                <>
                  <ul className="space-y-3">
                    {cartEntries.map(([lineId, details]) => {
                      const draft = String(details.specialInstructions || "");
                      return (
                        <li
                          key={lineId}
                          className="space-y-2 border-b border-[var(--rm-line)] pb-3"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-[var(--rm-ink)]">
                                {details.name}
                              </p>
                              <p className="text-xs text-[var(--rm-muted)]">
                                ₹{Number(details.price).toLocaleString("en-IN")}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                className="rm-qty-btn"
                                onClick={() => removeFromCart(lineId)}
                                aria-label={`Decrease ${details.name}`}
                                disabled={isSubmitting}
                              >
                                <Minus size={14} />
                              </button>
                              <span className="w-6 text-center text-sm font-semibold">
                                {details.quantity}
                              </span>
                              <button
                                type="button"
                                className="rm-qty-btn"
                                onClick={() =>
                                  addToCart(
                                    {
                                      catalogId: details.catalogId,
                                      id: details.catalogId,
                                      name: details.name,
                                      price: details.price,
                                      isAvailable: true,
                                    },
                                    details.type,
                                    details.specialInstructions || "",
                                  )
                                }
                                aria-label={`Increase ${details.name}`}
                                disabled={isSubmitting}
                              >
                                <Plus size={14} />
                              </button>
                            </div>
                          </div>
                          <div>
                            <div className="mb-1 flex items-center justify-between gap-2">
                              <label className="text-[10px] font-semibold uppercase tracking-wide text-[var(--rm-muted)]">
                                Special instructions
                              </label>
                              <span className="text-[10px] text-[var(--rm-muted)]">
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
                              placeholder="e.g. less spicy, no onions..."
                              disabled={isSubmitting}
                              className="rm-input w-full resize-none text-xs"
                            />
                          </div>
                        </li>
                      );
                    })}
                  </ul>

                  <div className="mt-5 space-y-3 rounded-2xl border border-[var(--rm-line)] bg-[var(--rm-bg)] p-3.5">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--rm-muted)]">
                      Guest details
                    </p>
                    {!showGuestForm && orderingAsLabel ? (
                      <div className="flex items-start justify-between gap-3 rounded-xl border border-[var(--rm-line)] bg-white/70 px-3.5 py-3">
                        <div>
                          <p className="text-sm font-semibold text-[var(--rm-ink)]">
                            {orderingAsLabel}
                          </p>
                          <p className="mt-0.5 text-[11px] text-[var(--rm-muted)]">
                            Saved for this room stay
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingDetails(true);
                            setCustomerPhone("");
                            setFormTouched({ name: false, phone: false });
                          }}
                          className="shrink-0 text-xs font-bold text-[var(--rm-accent,#b45309)] underline-offset-2 hover:underline"
                          disabled={isSubmitting}
                        >
                          Change Details
                        </button>
                      </div>
                    ) : (
                      <p className="text-xs text-[var(--rm-muted)]">
                        Enter your details once for this room stay.
                      </p>
                    )}
                    {showGuestForm ? (
                      <>
                    <label className="block text-xs font-semibold text-[var(--rm-ink)]">
                      Name
                      <input
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        onBlur={() =>
                          setFormTouched((t) => ({ ...t, name: true }))
                        }
                        className={`rm-input mt-1.5 ${
                          nameHasError ? "rm-input-error" : ""
                        }`}
                        placeholder="Your name"
                        autoComplete="name"
                        disabled={isSubmitting}
                        aria-invalid={nameHasError}
                      />
                      {nameHasError ? (
                        <span className="mt-1 block text-[11px] font-medium text-[var(--rm-danger)]">
                          {nameValidation.message}
                        </span>
                      ) : null}
                    </label>
                    <label className="block text-xs font-semibold text-[var(--rm-ink)]">
                      Mobile{" "}
                      <span className="font-normal text-[var(--rm-muted)]">
                        (optional)
                      </span>
                      <input
                        value={customerPhone}
                        onChange={(e) =>
                          setCustomerPhone(
                            e.target.value.replace(/\D/g, "").slice(0, 10),
                          )
                        }
                        onBlur={() =>
                          setFormTouched((t) => ({ ...t, phone: true }))
                        }
                        className={`rm-input mt-1.5 ${
                          phoneHasError ? "rm-input-error" : ""
                        }`}
                        placeholder="10-digit mobile"
                        inputMode="numeric"
                        autoComplete="tel"
                        disabled={isSubmitting}
                        aria-invalid={phoneHasError}
                      />
                      {phoneHasError ? (
                        <span className="mt-1 block text-[11px] font-medium text-[var(--rm-danger)]">
                          {phoneValidation.message}
                        </span>
                      ) : null}
                    </label>
                      </>
                    ) : null}
                  </div>

                  <div className="mt-4 flex items-center justify-between text-sm">
                    <span className="text-[var(--rm-muted)]">Total</span>
                    <span className="text-base font-semibold text-[var(--rm-ink)]">
                      ₹{subtotal.toLocaleString("en-IN")}
                    </span>
                  </div>

                  {submitError ? (
                    <p
                      className="mt-3 rounded-xl border border-[var(--rm-danger-line)] bg-[var(--rm-danger-soft)] px-3 py-2 text-xs font-medium text-[var(--rm-danger)]"
                      role="alert"
                    >
                      {submitError}
                    </p>
                  ) : null}

                  <button
                    type="button"
                    disabled={isSubmitting || !orderingEnabled}
                    onClick={placeOrder}
                    className="rm-btn-primary mt-4 w-full disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        Placing order…
                      </>
                    ) : (
                      "Confirm order"
                    )}
                  </button>
                </>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </Shell>
  );
}

function Shell({ children }) {
  return (
    <div className="room-menu-shell min-h-dvh bg-[var(--rm-bg)] text-[var(--rm-ink)]">
      <style>{`
        .room-menu-shell {
          --rm-bg: #eef1ef;
          --rm-surface: #ffffff;
          --rm-ink: #1a1f1c;
          --rm-muted: #66706a;
          --rm-line: #d8ddd9;
          --rm-accent: #1f4d45;
          --rm-accent-soft: #e4efec;
          --rm-accent-line: #c5d9d3;
          --rm-warn: #7a5b1e;
          --rm-warn-soft: #f4ecdc;
          --rm-warn-line: #e4d5b0;
          --rm-danger: #8f3a3a;
          --rm-danger-soft: #f7e8e8;
          --rm-danger-line: #e6c4c4;
          font-family: "DM Sans", system-ui, sans-serif;
          -webkit-font-smoothing: antialiased;
        }
        .room-menu-shell .rm-display {
          font-family: "Libre Baskerville", Georgia, serif;
          font-weight: 400;
          letter-spacing: -0.01em;
        }
        .room-menu-shell .rm-surface { background: var(--rm-surface); }
        .room-menu-shell .rm-input {
          width: 100%;
          border-radius: 0.85rem;
          border: 1px solid var(--rm-line);
          background: #fff;
          padding: 0.7rem 0.9rem;
          font-size: 0.875rem;
          color: var(--rm-ink);
          outline: none;
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
        }
        .room-menu-shell .rm-input:focus {
          border-color: var(--rm-accent);
          box-shadow: 0 0 0 3px color-mix(in srgb, var(--rm-accent) 18%, transparent);
        }
        .room-menu-shell .rm-input-error {
          border-color: var(--rm-danger);
        }
        .room-menu-shell .rm-btn-primary {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          border-radius: 0.9rem;
          background: var(--rm-accent);
          color: #fff;
          padding: 0.85rem 1rem;
          font-size: 0.875rem;
          font-weight: 600;
          transition: background 0.15s ease, transform 0.15s ease;
        }
        .room-menu-shell .rm-btn-primary:hover:not(:disabled) {
          background: #173b35;
        }
        .room-menu-shell .rm-btn-primary:focus-visible,
        .room-menu-shell .rm-icon-btn:focus-visible,
        .room-menu-shell .rm-chip:focus-visible,
        .room-menu-shell .rm-qty-btn:focus-visible {
          outline: 2px solid var(--rm-accent);
          outline-offset: 2px;
        }
        .room-menu-shell .rm-icon-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 0.75rem;
          border: 1px solid var(--rm-line);
          background: #fff;
          padding: 0.55rem;
          color: var(--rm-ink);
        }
        .room-menu-shell .rm-chip {
          flex: 0 0 auto;
          border-radius: 999px;
          border: 1px solid var(--rm-line);
          background: #fff;
          padding: 0.45rem 0.9rem;
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--rm-muted);
          white-space: nowrap;
        }
        .room-menu-shell .rm-chip-active {
          border-color: var(--rm-accent);
          background: var(--rm-accent);
          color: #fff;
        }
        .room-menu-shell .rm-qty-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 2rem;
          height: 2rem;
          border-radius: 999px;
          border: 1px solid var(--rm-line);
          background: #fff;
          color: var(--rm-ink);
        }
        .room-menu-shell .rm-category-rail {
          scrollbar-width: none;
        }
        .room-menu-shell .rm-category-rail::-webkit-scrollbar {
          display: none;
        }
      `}</style>
      {children}
    </div>
  );
}

function MenuCard({ item, quantity, orderingEnabled, onAdd, onRemove }) {
  const image = menuImageSrc(item.image);
  const available = isItemAvailable(item);
  const showDiet = typeof item.isVeg === "boolean";
  const isVeg = item.isVeg === true;

  return (
    <article
      className={`flex overflow-hidden rounded-2xl border border-[var(--rm-line)] bg-[var(--rm-surface)] shadow-[0_4px_18px_rgba(26,31,28,0.04)] ${
        available ? "" : "opacity-70"
      }`}
    >
      <div className="relative aspect-square w-[7.25rem] shrink-0 bg-[var(--rm-bg)] sm:w-32">
        {image ? (
          <img
            src={image}
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-[var(--rm-line)]">
            <Utensils size={26} aria-hidden />
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
        {!available ? (
          <span className="absolute inset-x-0 bottom-0 bg-[rgba(26,31,28,0.72)] px-2 py-1 text-center text-[10px] font-semibold uppercase tracking-wide text-white">
            Unavailable
          </span>
        ) : null}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-1.5 p-3">
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-[var(--rm-ink)]">
          {item.name}
        </h3>
        {item.description ? (
          <p className="line-clamp-2 text-[11px] leading-relaxed text-[var(--rm-muted)]">
            {item.description}
          </p>
        ) : null}
        <div className="mt-auto flex items-center justify-between gap-2 pt-1">
          <p className="text-sm font-semibold text-[var(--rm-ink)]">
            ₹{Number(item.price || 0).toLocaleString("en-IN")}
          </p>
          {!available ? (
            <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--rm-muted)]">
              Not available
            </span>
          ) : orderingEnabled ? (
            quantity > 0 ? (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  className="rm-qty-btn"
                  onClick={onRemove}
                  aria-label={`Decrease ${item.name}`}
                >
                  <Minus size={14} />
                </button>
                <span className="w-5 text-center text-xs font-semibold">
                  {quantity}
                </span>
                <button
                  type="button"
                  className="rm-qty-btn"
                  onClick={onAdd}
                  aria-label={`Increase ${item.name}`}
                >
                  <Plus size={14} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={onAdd}
                className="rounded-lg bg-[var(--rm-accent)] px-3 py-1.5 text-[11px] font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--rm-accent)]"
              >
                Add
              </button>
            )
          ) : (
            <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--rm-muted)]">
              Browse only
            </span>
          )}
        </div>
      </div>
    </article>
  );
}

function LoadingSkeleton() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-5" aria-busy="true" aria-live="polite">
      <p className="sr-only">Loading menu…</p>
      <div className="mb-5 flex items-center gap-3">
        <div className="h-11 w-11 animate-pulse rounded-xl bg-[var(--rm-line)]" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-40 animate-pulse rounded bg-[var(--rm-line)]" />
          <div className="h-3 w-24 animate-pulse rounded bg-[var(--rm-line)]" />
        </div>
      </div>
      <div className="mb-4 h-16 animate-pulse rounded-2xl bg-[var(--rm-line)]/70" />
      <div className="mb-4 h-11 animate-pulse rounded-xl bg-[var(--rm-line)]/70" />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="flex h-28 animate-pulse overflow-hidden rounded-2xl border border-[var(--rm-line)] bg-white"
          >
            <div className="w-28 bg-[var(--rm-line)]" />
            <div className="flex flex-1 flex-col gap-2 p-3">
              <div className="h-3 w-3/4 rounded bg-[var(--rm-line)]" />
              <div className="h-3 w-1/2 rounded bg-[var(--rm-line)]" />
              <div className="mt-auto h-3 w-16 rounded bg-[var(--rm-line)]" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function EmptyState({ title, message }) {
  return (
    <div className="rounded-2xl border border-dashed border-[var(--rm-line)] bg-white px-5 py-10 text-center">
      <Utensils className="mx-auto h-8 w-8 text-[var(--rm-line)]" aria-hidden />
      <h2 className="rm-display mt-3 text-lg text-[var(--rm-ink)]">{title}</h2>
      <p className="mt-1.5 text-sm text-[var(--rm-muted)]">{message}</p>
    </div>
  );
}

function DeniedScreen({ title, message }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 py-10">
      <div className="rm-surface w-full max-w-md rounded-2xl border border-[var(--rm-danger-line)] p-7 text-center shadow-[0_12px_40px_rgba(26,31,28,0.08)]">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[var(--rm-danger-soft)] text-[var(--rm-danger)]">
          <AlertCircle className="h-7 w-7" aria-hidden />
        </div>
        <h1 className="rm-display mt-5 text-2xl text-[var(--rm-ink)]">{title}</h1>
        <p className="mt-2 text-sm leading-relaxed text-[var(--rm-muted)]">
          {message}
        </p>
        <p className="mt-4 text-xs text-[var(--rm-muted)]">
          Please contact reception if you need assistance.
        </p>
      </div>
    </div>
  );
}
