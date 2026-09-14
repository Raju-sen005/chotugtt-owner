export const BILL_TEMPLATES = [
  {
    id: "classic",
    name: "Classic Thermal",
    description: "Clean, compact receipt for everyday orders.",
    tier: "FREE",
    format: "300px thermal",
    preview: "classic",
  },
  {
    id: "minimal",
    name: "Minimal Black",
    description: "A simple ink-saving layout for fast printing.",
    tier: "FREE",
    format: "300px thermal",
    preview: "minimal",
  },
  {
    id: "elegant",
    name: "Elegant Dine-in",
    description: "Centered branding with a polished restaurant feel.",
    tier: "PRO",
    format: "340px dine-in",
    preview: "elegant",
  },
  {
    id: "bold",
    name: "Bold Invoice",
    description: "Strong totals and sections for a full-size bill.",
    tier: "PRO",
    format: "360px invoice",
    preview: "bold",
  },
  {
    id: "terracotta",
    name: "Terracotta Luxe",
    description: "Warm editorial styling for premium dine-in brands.",
    tier: "PRO",
    format: "340px dine-in",
    preview: "terracotta",
  },
  {
    id: "ledger",
    name: "Modern Ledger",
    description: "Structured business invoice with crisp visual hierarchy.",
    tier: "PRO",
    format: "360px invoice",
    preview: "ledger",
  },
  ...[
    ["midnight", "Midnight Club", "Dark premium receipt with a polished night-service look.", "360px invoice", "midnight"],
    ["saffron", "Saffron Table", "Warm Indian hospitality style with a refined accent system.", "340px dine-in", "saffron"],
    ["coastal", "Coastal Breeze", "Fresh blue-green layout for cafes and seafood restaurants.", "340px dine-in", "coastal"],
    ["botanical", "Botanical Cafe", "Soft natural styling for modern cafes and wellness brands.", "340px dine-in", "botanical"],
    ["monogram", "Monogram Prime", "Luxury black-and-gold receipt with a strong brand header.", "360px invoice", "monogram"],
    ["studio", "Studio Grid", "Contemporary editorial grid designed for high-volume counters.", "360px invoice", "studio"],
    ["noir", "Noir Compact", "High-contrast compact print format for premium quick service.", "300px thermal", "noir"],
    ["heritage", "Heritage Paper", "Classic paper-led layout with a crafted restaurant identity.", "340px dine-in", "heritage"],
  ].map(([id, name, description, format, preview]) => ({
    id,
    name,
    description,
    tier: "PRO",
    format,
    preview,
  })),
];

const DEFAULT_TEMPLATE = "classic";

const getRestaurantKey = (restaurantId) =>
  `food-saas-bill-template:${restaurantId || "default"}`;

export const getSelectedBillTemplate = (restaurantId) => {
  if (typeof window === "undefined") return DEFAULT_TEMPLATE;

  const saved = window.localStorage.getItem(getRestaurantKey(restaurantId));
  return BILL_TEMPLATES.some((template) => template.id === saved)
    ? saved
    : DEFAULT_TEMPLATE;
};

export const saveSelectedBillTemplate = (restaurantId, templateId) => {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(getRestaurantKey(restaurantId), templateId);
  }
};

export const hasProBilling = (user) => {
  const plan = String(
    user?.plan || user?.subscription?.plan || user?.subscriptionPlan || "",
  ).toLowerCase();
  return ["pro", "premium", "enterprise", "business"].includes(plan);
};

export const isProBillTemplate = (templateId) =>
  BILL_TEMPLATES.find((template) => template.id === templateId)?.tier === "PRO";