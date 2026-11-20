/**
 * Master commercial catalog presentation for the 11 paid plans + helpers.
 * Amounts displayed in UI MUST come from the backend /payments/plans DTO.
 * Feature lists mirror backend subscriptionFeatures tier matrix.
 */

export const FEATURE_LABELS = Object.freeze({
  POS: "Counter POS",
  QR_TABLE: "Table QR ordering",
  KOT: "KOT",
  BILLING: "Billing",
  PAYMENTS: "Payments",
  MENU: "Menu management",
  OFFERS: "Offers",
  CAPTAIN: "Captain app",
  AI_MENU: "AI menu upload",
  ANALYSIS: "Analysis",
  REPORTS: "Business reports",
  EVENT_MANAGEMENT: "Event management",
  ROOM_MANAGEMENT: "Room management",
  ROOM_BOOKING: "Room booking",
  GUEST_MANAGEMENT: "Guest management",
  ROOM_QR_ORDERING: "Room QR ordering",
  ROOM_FOLIO: "Room folio / room billing",
});

export const RESTAURANT_STARTER_FEATURE_KEYS = Object.freeze([
  "POS",
  "QR_TABLE",
  "KOT",
  "BILLING",
  "PAYMENTS",
  "MENU",
  "OFFERS",
]);

export const RESTAURANT_GROWTH_FEATURE_KEYS = Object.freeze([
  ...RESTAURANT_STARTER_FEATURE_KEYS,
  "CAPTAIN",
  "AI_MENU",
  "ANALYSIS",
  "REPORTS",
]);

export const RESTAURANT_PRO_FEATURE_KEYS = Object.freeze([
  ...RESTAURANT_GROWTH_FEATURE_KEYS,
  "EVENT_MANAGEMENT",
]);

export const HOTEL_STARTER_FEATURE_KEYS = Object.freeze([
  "ROOM_MANAGEMENT",
  "ROOM_BOOKING",
  "GUEST_MANAGEMENT",
  "ROOM_QR_ORDERING",
  "ROOM_FOLIO",
]);

export const HOTEL_GROWTH_FEATURE_KEYS = Object.freeze([
  ...HOTEL_STARTER_FEATURE_KEYS,
]);

export const TIER_FEATURE_KEYS = Object.freeze({
  RESTAURANT_STARTER: RESTAURANT_STARTER_FEATURE_KEYS,
  RESTAURANT_GROWTH: RESTAURANT_GROWTH_FEATURE_KEYS,
  RESTAURANT_PRO: RESTAURANT_PRO_FEATURE_KEYS,
  HOTEL_STARTER: HOTEL_STARTER_FEATURE_KEYS,
  HOTEL_GROWTH: HOTEL_GROWTH_FEATURE_KEYS,
});

export const CHANNEL_MANAGER_COMING_SOON = Object.freeze({
  label: "Channel Manager",
  status: "Coming Soon",
  detail:
    "Included in Hotel Growth commercial scope when a real OTA integration ships. Not available yet — not an active entitlement.",
});

/** Approved annual INR amounts (must match backend subscriptionPlans.js). */
export const APPROVED_ANNUAL_PRICES = Object.freeze({
  RESTAURANT_STARTER: 3000,
  RESTAURANT_GROWTH: 4000,
  RESTAURANT_PRO: 5000,
  HOTEL_STARTER: 4000,
  HOTEL_GROWTH: 10000,
  RESORT_RESTAURANT_STARTER_HOTEL_STARTER: 7000,
  RESORT_RESTAURANT_GROWTH_HOTEL_STARTER: 10000,
  RESORT_RESTAURANT_PRO_HOTEL_STARTER: 16000,
  RESORT_RESTAURANT_STARTER_HOTEL_GROWTH: 10000,
  RESORT_RESTAURANT_GROWTH_HOTEL_GROWTH: 13000,
  RESORT_RESTAURANT_PRO_HOTEL_GROWTH: 19000,
});

const unionKeys = (restaurantTier, hotelTier) =>
  Object.freeze([
    ...new Set([
      ...TIER_FEATURE_KEYS[restaurantTier],
      ...TIER_FEATURE_KEYS[hotelTier],
    ]),
  ]);

const labelsForKeys = (keys) => keys.map((key) => FEATURE_LABELS[key] || key);

const plan = (partial) =>
  Object.freeze({
    purchasable: true,
    channelManagerComingSoon: false,
    ...partial,
    featureKeys: Object.freeze([...(partial.featureKeys || [])]),
    featureLabels: Object.freeze([...(partial.featureLabels || [])]),
    highlightLabels: Object.freeze([...(partial.highlightLabels || [])]),
  });

export const FOUNDATION_COMMERCIAL_PLANS = Object.freeze([
  plan({
    code: "RESTAURANT_STARTER",
    name: "Restaurant Starter",
    category: "RESTAURANT",
    restaurantTier: "RESTAURANT_STARTER",
    description:
      "Core restaurant operations: POS, table QR, menu, offers, KOT, and live order workflows.",
    featureKeys: [...RESTAURANT_STARTER_FEATURE_KEYS],
    featureLabels: [
      ...labelsForKeys(RESTAURANT_STARTER_FEATURE_KEYS),
      "Live order management",
    ],
    highlightLabels: ["Counter POS", "Table QR ordering", "Live order management"],
  }),
  plan({
    code: "RESTAURANT_GROWTH",
    name: "Restaurant Growth",
    category: "RESTAURANT",
    restaurantTier: "RESTAURANT_GROWTH",
    description:
      "Everything in Restaurant Starter, plus Captain app, AI menu upload, and analysis & reports.",
    featureKeys: [...RESTAURANT_GROWTH_FEATURE_KEYS],
    featureLabels: [
      ...labelsForKeys(RESTAURANT_GROWTH_FEATURE_KEYS),
      "Live order management",
    ],
    highlightLabels: ["Captain app", "AI menu upload", "Analysis"],
  }),
  plan({
    code: "RESTAURANT_PRO",
    name: "Restaurant Pro",
    category: "RESTAURANT",
    restaurantTier: "RESTAURANT_PRO",
    description:
      "Everything in Restaurant Growth, plus Event Management.",
    featureKeys: [...RESTAURANT_PRO_FEATURE_KEYS],
    featureLabels: [
      ...labelsForKeys(RESTAURANT_PRO_FEATURE_KEYS),
      "Live order management",
    ],
    highlightLabels: ["Event management"],
  }),
  plan({
    code: "HOTEL_STARTER",
    name: "Hotel Starter",
    category: "HOTEL",
    hotelTier: "HOTEL_STARTER",
    description:
      "Rooms, bookings, guests, room QR ordering, and room folio billing.",
    featureKeys: [...HOTEL_STARTER_FEATURE_KEYS],
    featureLabels: labelsForKeys(HOTEL_STARTER_FEATURE_KEYS),
    highlightLabels: ["Room management", "Room folio / room billing"],
  }),
  plan({
    code: "HOTEL_GROWTH",
    name: "Hotel Growth",
    category: "HOTEL",
    hotelTier: "HOTEL_GROWTH",
    description:
      "Everything in Hotel Starter. Channel Manager is Coming Soon — not a working OTA integration yet.",
    featureKeys: [...HOTEL_GROWTH_FEATURE_KEYS],
    featureLabels: labelsForKeys(HOTEL_GROWTH_FEATURE_KEYS),
    highlightLabels: ["Channel Manager (Coming Soon)"],
    channelManagerComingSoon: true,
  }),
  plan({
    code: "RESORT_RESTAURANT_STARTER_HOTEL_STARTER",
    name: "Resort — Restaurant Starter + Hotel Starter",
    category: "RESORT",
    restaurantTier: "RESTAURANT_STARTER",
    hotelTier: "HOTEL_STARTER",
    description:
      "One tenant with Restaurant Starter and Hotel Starter combined.",
    featureKeys: [...unionKeys("RESTAURANT_STARTER", "HOTEL_STARTER")],
    featureLabels: [
      ...labelsForKeys(unionKeys("RESTAURANT_STARTER", "HOTEL_STARTER")),
      "Live order management",
    ],
    highlightLabels: ["Restaurant + hotel in one account"],
  }),
  plan({
    code: "RESORT_RESTAURANT_GROWTH_HOTEL_STARTER",
    name: "Resort — Restaurant Growth + Hotel Starter",
    category: "RESORT",
    restaurantTier: "RESTAURANT_GROWTH",
    hotelTier: "HOTEL_STARTER",
    description:
      "One tenant with Restaurant Growth and Hotel Starter combined.",
    featureKeys: [...unionKeys("RESTAURANT_GROWTH", "HOTEL_STARTER")],
    featureLabels: [
      ...labelsForKeys(unionKeys("RESTAURANT_GROWTH", "HOTEL_STARTER")),
      "Live order management",
    ],
    highlightLabels: ["Captain app", "Hotel suite"],
  }),
  plan({
    code: "RESORT_RESTAURANT_PRO_HOTEL_STARTER",
    name: "Resort — Restaurant Pro + Hotel Starter",
    category: "RESORT",
    restaurantTier: "RESTAURANT_PRO",
    hotelTier: "HOTEL_STARTER",
    description:
      "One tenant with Restaurant Pro and Hotel Starter combined.",
    featureKeys: [...unionKeys("RESTAURANT_PRO", "HOTEL_STARTER")],
    featureLabels: [
      ...labelsForKeys(unionKeys("RESTAURANT_PRO", "HOTEL_STARTER")),
      "Live order management",
    ],
    highlightLabels: ["Event management", "Hotel suite"],
  }),
  plan({
    code: "RESORT_RESTAURANT_STARTER_HOTEL_GROWTH",
    name: "Resort — Restaurant Starter + Hotel Growth",
    category: "RESORT",
    restaurantTier: "RESTAURANT_STARTER",
    hotelTier: "HOTEL_GROWTH",
    description:
      "Restaurant Starter plus Hotel Growth. Channel Manager Coming Soon.",
    featureKeys: [...unionKeys("RESTAURANT_STARTER", "HOTEL_GROWTH")],
    featureLabels: [
      ...labelsForKeys(unionKeys("RESTAURANT_STARTER", "HOTEL_GROWTH")),
      "Live order management",
    ],
    highlightLabels: ["Channel Manager (Coming Soon)"],
    channelManagerComingSoon: true,
  }),
  plan({
    code: "RESORT_RESTAURANT_GROWTH_HOTEL_GROWTH",
    name: "Resort — Restaurant Growth + Hotel Growth",
    category: "RESORT",
    restaurantTier: "RESTAURANT_GROWTH",
    hotelTier: "HOTEL_GROWTH",
    description:
      "Restaurant Growth plus Hotel Growth. Channel Manager Coming Soon.",
    featureKeys: [...unionKeys("RESTAURANT_GROWTH", "HOTEL_GROWTH")],
    featureLabels: [
      ...labelsForKeys(unionKeys("RESTAURANT_GROWTH", "HOTEL_GROWTH")),
      "Live order management",
    ],
    highlightLabels: ["Captain app", "Channel Manager (Coming Soon)"],
    channelManagerComingSoon: true,
  }),
  plan({
    code: "RESORT_RESTAURANT_PRO_HOTEL_GROWTH",
    name: "Resort — Restaurant Pro + Hotel Growth",
    category: "RESORT",
    restaurantTier: "RESTAURANT_PRO",
    hotelTier: "HOTEL_GROWTH",
    description:
      "Restaurant Pro plus Hotel Growth. Channel Manager Coming Soon.",
    featureKeys: [...unionKeys("RESTAURANT_PRO", "HOTEL_GROWTH")],
    featureLabels: [
      ...labelsForKeys(unionKeys("RESTAURANT_PRO", "HOTEL_GROWTH")),
      "Live order management",
    ],
    highlightLabels: ["Event management", "Channel Manager (Coming Soon)"],
    channelManagerComingSoon: true,
  }),
]);

export const FOUNDATION_COMMERCIAL_PLAN_CODES = Object.freeze(
  FOUNDATION_COMMERCIAL_PLANS.map((p) => p.code),
);

export const COMMERCIAL_CATEGORIES = Object.freeze([
  {
    id: "RESTAURANT",
    title: "Restaurant",
    subtitle: "POS, QR, menu, Captain, AI, analysis, and events.",
  },
  {
    id: "HOTEL",
    title: "Hotel",
    subtitle: "Rooms, guests, bookings, room QR, and folio.",
  },
  {
    id: "RESORT",
    title: "Resort",
    subtitle: "One account combining restaurant and hotel tiers.",
  },
]);

export function getFoundationPlansByCategory(category) {
  return FOUNDATION_COMMERCIAL_PLANS.filter((p) => p.category === category);
}

export function getFoundationCommercialPlan(code) {
  return FOUNDATION_COMMERCIAL_PLANS.find((p) => p.code === code) || null;
}

export function getChannelManagerComingSoonPlans() {
  return FOUNDATION_COMMERCIAL_PLANS.filter((p) => p.channelManagerComingSoon);
}

export function mergeServerPlanWithCopy(serverPlan) {
  const copy = getFoundationCommercialPlan(serverPlan.code);
  if (!copy) return null;
  return {
    ...copy,
    ...serverPlan,
    amount: serverPlan.amount,
    name: serverPlan.name || copy.name,
    trial: serverPlan.trial === true,
    planFamily: serverPlan.planFamily || copy.category,
  };
}

/** Registration: TRIAL or commercial acquisition codes (with category on form). */
export const REGISTRATION_ALLOWED_PLAN_CODES = Object.freeze([
  "TRIAL",
  ...FOUNDATION_COMMERCIAL_PLAN_CODES,
]);

export function resolveRegistrationPlanCode(rawPlan) {
  const normalized = String(rawPlan || "")
    .trim()
    .toUpperCase();
  if (!normalized) return "TRIAL";
  if (REGISTRATION_ALLOWED_PLAN_CODES.includes(normalized)) {
    return normalized;
  }
  return "TRIAL";
}

export function resolveBusinessCategoryForPlan(planCode) {
  const plan = getFoundationCommercialPlan(planCode);
  return plan?.category || null;
}
