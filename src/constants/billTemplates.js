// ============================================================
// BILL TEMPLATES
// Single source of truth for bill template configuration.
//
// IMPORTANT:
// - These values control template selection / metadata.
// - Existing visual CSS/design is NOT changed here.
// - Preview/share should continue using the existing template CSS.
// - Print code should use the selected template's printWidth.
// ============================================================

export const BILL_TEMPLATES = [
  {
    id: "classic",
    name: "Classic Thermal",
    description: "Clean, compact receipt for everyday orders.",
    tier: "FREE",
    format: "300px thermal",
    preview: "classic",

    // Print configuration
    printWidth: "80mm",
    printClass: "template-classic",
  },

  {
    id: "minimal",
    name: "Minimal Black",
    description: "A simple ink-saving layout for fast printing.",
    tier: "FREE",
    format: "300px thermal",
    preview: "minimal",

    // Print configuration
    printWidth: "80mm",
    printClass: "template-minimal",
  },

  {
    id: "elegant",
    name: "Elegant Dine-in",
    description: "Centered branding with a polished restaurant feel.",
    tier: "PRO",
    format: "340px dine-in",
    preview: "elegant",

    // Print configuration
    printWidth: "80mm",
    printClass: "template-elegant",
  },

  {
    id: "bold",
    name: "Bold Invoice",
    description: "Strong totals and sections for a full-size bill.",
    tier: "PRO",
    format: "360px invoice",
    preview: "bold",

    // Print configuration
    printWidth: "80mm",
    printClass: "template-bold",
  },

  {
    id: "terracotta",
    name: "Terracotta Luxe",
    description: "Warm editorial styling for premium dine-in brands.",
    tier: "PRO",
    format: "340px dine-in",
    preview: "terracotta",

    // Print configuration
    printWidth: "80mm",
    printClass: "template-terracotta",
  },

  {
    id: "ledger",
    name: "Modern Ledger",
    description: "Structured business invoice with crisp visual hierarchy.",
    tier: "PRO",
    format: "360px invoice",
    preview: "ledger",

    // Print configuration
    printWidth: "80mm",
    printClass: "template-ledger",
  },

  ...[
    [
      "midnight",
      "Midnight Club",
      "Dark premium receipt with a polished night-service look.",
      "360px invoice",
      "midnight",
    ],

    [
      "saffron",
      "Saffron Table",
      "Warm Indian hospitality style with a refined accent system.",
      "340px dine-in",
      "saffron",
    ],

    [
      "coastal",
      "Coastal Breeze",
      "Fresh blue-green layout for cafes and seafood restaurants.",
      "340px dine-in",
      "coastal",
    ],

    [
      "botanical",
      "Botanical Cafe",
      "Soft natural styling for modern cafes and wellness brands.",
      "340px dine-in",
      "botanical",
    ],

    [
      "monogram",
      "Monogram Prime",
      "Luxury black-and-gold receipt with a strong brand header.",
      "360px invoice",
      "monogram",
    ],

    [
      "studio",
      "Studio Grid",
      "Contemporary editorial grid designed for high-volume counters.",
      "360px invoice",
      "studio",
    ],

    [
      "noir",
      "Noir Compact",
      "High-contrast compact print format for premium quick service.",
      "300px thermal",
      "noir",
    ],

    [
      "heritage",
      "Heritage Paper",
      "Classic paper-led layout with a crafted restaurant identity.",
      "340px dine-in",
      "heritage",
    ],
  ].map(([id, name, description, format, preview]) => ({
    id,
    name,
    description,
    tier: "PRO",
    format,
    preview,

    // All supported thermal printers use the same physical
    // 80mm paper width. Visual template styling remains unchanged.
    printWidth: "80mm",
    printClass: `template-${id}`,
  })),
];

// ============================================================
// DEFAULT
// ============================================================

const DEFAULT_TEMPLATE = "classic";

// ============================================================
// CONSTANTS
// ============================================================

const TEMPLATE_STORAGE_PREFIX = "food-saas-bill-template:";

const PRO_PLANS = new Set([
  "pro",
  "premium",
  "enterprise",
  "business",
]);

// ============================================================
// RESTAURANT STORAGE KEY
// ============================================================

const getRestaurantKey = (restaurantId) => {
  const safeRestaurantId =
    restaurantId !== undefined &&
    restaurantId !== null &&
    String(restaurantId).trim() !== ""
      ? String(restaurantId).trim()
      : "default";

  return `${TEMPLATE_STORAGE_PREFIX}${safeRestaurantId}`;
};

// ============================================================
// TEMPLATE LOOKUP
// ============================================================

export const getBillTemplate = (templateId) => {
  if (!templateId) {
    return BILL_TEMPLATES.find(
      (template) => template.id === DEFAULT_TEMPLATE,
    );
  }

  return (
    BILL_TEMPLATES.find(
      (template) => template.id === String(templateId),
    ) ||
    BILL_TEMPLATES.find(
      (template) => template.id === DEFAULT_TEMPLATE,
    )
  );
};

// ============================================================
// TEMPLATE VALIDATION
// ============================================================

export const isValidBillTemplate = (templateId) => {
  if (!templateId) return false;

  return BILL_TEMPLATES.some(
    (template) => template.id === String(templateId),
  );
};

// ============================================================
// PRO TEMPLATE CHECK
// ============================================================

export const isProBillTemplate = (templateId) => {
  const template = BILL_TEMPLATES.find(
    (item) => item.id === String(templateId),
  );

  return template?.tier === "PRO";
};

// ============================================================
// PLAN CHECK
// ============================================================

export const hasProBilling = (user) => {
  const plan = String(
    user?.plan ??
      user?.subscription?.plan ??
      user?.subscriptionPlan ??
      "",
  )
    .trim()
    .toLowerCase();

  return PRO_PLANS.has(plan);
};

// ============================================================
// CAN USE TEMPLATE
// ============================================================

export const canUseBillTemplate = (templateId, user) => {
  const template = getBillTemplate(templateId);

  if (!template) {
    return false;
  }

  // FREE templates are always available.
  if (template.tier === "FREE") {
    return true;
  }

  // PRO templates require a valid PRO-level plan.
  return hasProBilling(user);
};

// ============================================================
// GET SELECTED TEMPLATE
// ============================================================

export const getSelectedBillTemplate = (restaurantId, user) => {
  if (typeof window === "undefined") {
    return DEFAULT_TEMPLATE;
  }

  try {
    const saved = window.localStorage.getItem(
      getRestaurantKey(restaurantId),
    );

    // No saved template.
    if (!saved) {
      return DEFAULT_TEMPLATE;
    }

    // Template no longer exists.
    if (!isValidBillTemplate(saved)) {
      return DEFAULT_TEMPLATE;
    }

    // If user object is available, prevent PRO template
    // from being used by a non-PRO account.
    if (user && !canUseBillTemplate(saved, user)) {
      return DEFAULT_TEMPLATE;
    }

    return saved;
  } catch (error) {
    console.warn(
      "[BillTemplate] Failed to read selected template:",
      error,
    );

    return DEFAULT_TEMPLATE;
  }
};

// ============================================================
// SAVE SELECTED TEMPLATE
// ============================================================

export const saveSelectedBillTemplate = (
  restaurantId,
  templateId,
  user,
) => {
  if (typeof window === "undefined") {
    return DEFAULT_TEMPLATE;
  }

  const normalizedTemplateId = String(templateId || "").trim();

  // Never save an invalid template.
  if (!isValidBillTemplate(normalizedTemplateId)) {
    console.warn(
      `[BillTemplate] Invalid template "${normalizedTemplateId}".`,
    );

    return DEFAULT_TEMPLATE;
  }

  // Prevent manual/localStorage based PRO bypass.
  if (!canUseBillTemplate(normalizedTemplateId, user)) {
    console.warn(
      `[BillTemplate] Template "${normalizedTemplateId}" is not available for this plan.`,
    );

    return DEFAULT_TEMPLATE;
  }

  try {
    window.localStorage.setItem(
      getRestaurantKey(restaurantId),
      normalizedTemplateId,
    );

    return normalizedTemplateId;
  } catch (error) {
    console.warn(
      "[BillTemplate] Failed to save selected template:",
      error,
    );

    return DEFAULT_TEMPLATE;
  }
};

// ============================================================
// GET TEMPLATE CONFIG
// ============================================================

export const getSelectedBillTemplateConfig = (
  restaurantId,
  user,
) => {
  const templateId = getSelectedBillTemplate(
    restaurantId,
    user,
  );

  return getBillTemplate(templateId);
};

// ============================================================
// PRINT CONFIG
// ============================================================
//
// IMPORTANT:
// The physical thermal paper is 80mm.
// Template visual CSS can remain different for preview/share,
// but the print container must be constrained to the printer width.
//
// This does NOT change the template's existing visual design.
// It only provides safe print metadata to the print renderer.
//

export const getBillPrintConfig = (
  templateId,
) => {
  const template = getBillTemplate(templateId);

  return {
    templateId: template.id,

    // Physical thermal paper width.
    width: template.printWidth || "80mm",

    // Existing visual template class.
    className:
      template.printClass ||
      `template-${template.id}`,

    // Browser print page configuration.
    pageSize: "80mm auto",

    // No browser margins.
    margin: "0",

    // Keep backgrounds/borders where supported.
    colorAdjust: "exact",
  };
};

// ============================================================
// TEMPLATE LIST HELPERS
// ============================================================

export const getFreeBillTemplates = () => {
  return BILL_TEMPLATES.filter(
    (template) => template.tier === "FREE",
  );
};

export const getProBillTemplates = () => {
  return BILL_TEMPLATES.filter(
    (template) => template.tier === "PRO",
  );
};

// ============================================================
// TEMPLATE CLASS
// ============================================================

export const getBillTemplateClass = (templateId) => {
  const template = getBillTemplate(templateId);

  return (
    template.printClass ||
    `template-${template.id}`
  );
};

// ============================================================
// SAFE TEMPLATE ID
// ============================================================

export const normalizeBillTemplateId = (templateId) => {
  return isValidBillTemplate(templateId)
    ? String(templateId)
    : DEFAULT_TEMPLATE;
};

// ============================================================
// EXPORT DEFAULT
// ============================================================

export default BILL_TEMPLATES;