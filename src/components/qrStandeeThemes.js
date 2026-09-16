// ============================================================
// QR STANDEE THEMES
// ============================================================
// Central theme configuration for Table Monitor QR Standees.
//
// Usage:
//   import {
//     QR_STANDEE_THEMES,
//     DEFAULT_QR_STANDEE_THEME,
//     getQrStandeeTheme,
//   } from "./qrStandeeThemes";
//
// All themes are currently FREE.
//
// Future mein isi structure mein PRO / locked themes add
// kiye ja sakte hain.
// ============================================================

export const QR_STANDEE_THEMES = [
  // ==========================================================
  // 1. CLASSIC
  // ==========================================================
  {
    id: "classic",
    name: "Classic",
    description: "Clean and professional",
    category: "Professional",

    preview: {
      background: "#F1F5F9",
      card: "#FFFFFF",
      primary: "#0F172A",
      secondary: "#64748B",
      accent: "#0F172A",
      qrBackground: "#FFFFFF",

      border: "#E2E8F0",
      radius: "26px",

      footer: "#0F172A",
      footerText: "#FFFFFF",
    },

    config: {
      bodyBackground: "#F1F5F9",
      cardBackground: "#FFFFFF",
      cardBorder: "#E2E8F0",
      cardRadius: "26px",
      cardShadow: "0 24px 48px -12px rgba(15,23,42,.16)",

      primary: "#0F172A",
      secondary: "#64748B",

      qrBackground: "#FFFFFF",
      qrBorder: "#E2E8F0",

      footerBackground: "#0F172A",
      footerColor: "#FFFFFF",

      accent: "#0F172A",
      accentSoft: "#E2E8F0",

      displayFont: "'Plus Jakarta Sans', sans-serif",
      bodyFont: "'Plus Jakarta Sans', sans-serif",

      nameWeight: 800,
      nameSpacing: "-0.3px",

      ornate: false,
      footerBordered: false,
    },
  },

  // ==========================================================
  // 2. MINIMAL
  // ==========================================================
  {
    id: "minimal",
    name: "Minimal",
    description: "Simple modern design",
    category: "Minimal",

    preview: {
      background: "#FAFAFA",
      card: "#FFFFFF",
      primary: "#171717",
      secondary: "#8A8A8A",
      accent: "#171717",
      qrBackground: "#FFFFFF",

      border: "#EBEBEB",
      radius: "8px",

      footer: "#FFFFFF",
      footerText: "#171717",
    },

    config: {
      bodyBackground: "#FAFAFA",
      cardBackground: "#FFFFFF",
      cardBorder: "#EBEBEB",
      cardRadius: "8px",
      cardShadow: "0 12px 32px -8px rgba(0,0,0,.08)",

      primary: "#171717",
      secondary: "#8A8A8A",

      qrBackground: "#FFFFFF",
      qrBorder: "#EBEBEB",

      footerBackground: "#FFFFFF",
      footerColor: "#171717",

      accent: "#171717",
      accentSoft: "#EBEBEB",

      displayFont: "'Plus Jakarta Sans', sans-serif",
      bodyFont: "'Plus Jakarta Sans', sans-serif",

      nameWeight: 600,
      nameSpacing: "0px",

      ornate: false,
      footerBordered: true,
    },
  },

  // ==========================================================
  // 3. ROYAL
  // ==========================================================
  {
    id: "royal",
    name: "Royal",
    description: "Premium royal style",
    category: "Premium",

    preview: {
      background: "#1C1006",
      card: "#2A1810",
      primary: "#F5DEB3",
      secondary: "#D4AF37",
      accent: "#D4AF37",
      qrBackground: "#FFFCF5",

      border: "#B8860B",
      radius: "20px",

      footer: "#B8860B",
      footerText: "#1C1006",
    },

    config: {
      bodyBackground: "#1C1006",
      cardBackground: "#2A1810",
      cardBorder: "#B8860B",
      cardRadius: "20px",
      cardShadow: "0 30px 60px -15px rgba(0,0,0,.5)",

      primary: "#F5DEB3",
      secondary: "#D4AF37",

      qrBackground: "#FFFCF5",
      qrBorder: "#B8860B",

      footerBackground: "#B8860B",
      footerColor: "#1C1006",

      accent: "#D4AF37",
      accentSoft: "#8B6914",

      displayFont:
        "'Playfair Display', 'Cormorant Garamond', serif",

      bodyFont: "'Plus Jakarta Sans', sans-serif",

      nameWeight: 700,
      nameSpacing: "0.5px",

      ornate: true,
      footerBordered: false,
    },
  },

  // ==========================================================
  // 4. DARK
  // ==========================================================
  {
    id: "dark",
    name: "Dark",
    description: "Elegant dark restaurant style",
    category: "Modern",

    preview: {
      background: "#020617",
      card: "#0F172A",
      primary: "#F8FAFC",
      secondary: "#94A3B8",
      accent: "#38BDF8",
      qrBackground: "#FFFFFF",

      border: "#1E293B",
      radius: "24px",

      footer: "#F8FAFC",
      footerText: "#0F172A",
    },

    config: {
      bodyBackground: "#020617",
      cardBackground: "#0F172A",
      cardBorder: "#1E293B",
      cardRadius: "24px",
      cardShadow: "0 30px 60px -12px rgba(0,0,0,.6)",

      primary: "#F8FAFC",
      secondary: "#94A3B8",

      qrBackground: "#FFFFFF",
      qrBorder: "#1E293B",

      footerBackground: "#F8FAFC",
      footerColor: "#0F172A",

      accent: "#38BDF8",
      accentSoft: "#1E293B",

      displayFont: "'Plus Jakarta Sans', sans-serif",
      bodyFont: "'Plus Jakarta Sans', sans-serif",

      nameWeight: 800,
      nameSpacing: "-0.3px",

      ornate: false,
      footerBordered: false,
    },
  },

  // ==========================================================
  // 5. ELEGANT
  // ==========================================================
  {
    id: "elegant",
    name: "Elegant",
    description: "Luxury fine-dining style",
    category: "Luxury",

    preview: {
      background: "#F5F0E8",
      card: "#FFFDF9",
      primary: "#2E2418",
      secondary: "#8B7355",
      accent: "#8B7355",
      qrBackground: "#FFFFFF",

      border: "#C9B79C",
      radius: "18px",

      footer: "#2E2418",
      footerText: "#F5F0E8",
    },

    config: {
      bodyBackground: "#F5F0E8",
      cardBackground: "#FFFDF9",
      cardBorder: "#C9B79C",
      cardRadius: "18px",
      cardShadow: "0 28px 55px -14px rgba(63,48,36,.20)",

      primary: "#2E2418",
      secondary: "#8B7355",

      qrBackground: "#FFFFFF",
      qrBorder: "#C9B79C",

      footerBackground: "#2E2418",
      footerColor: "#F5F0E8",

      accent: "#8B7355",
      accentSoft: "#E4D9C4",

      displayFont:
        "'Cormorant Garamond', 'Playfair Display', serif",

      bodyFont: "'Plus Jakarta Sans', sans-serif",

      nameWeight: 600,
      nameSpacing: "0.3px",

      ornate: true,
      footerBordered: false,
    },
  },

  // ==========================================================
  // 6. MODERN
  // ==========================================================
  {
    id: "modern",
    name: "Modern",
    description: "Fresh and contemporary look",
    category: "Modern",

    preview: {
      background: "#F0FDFA",
      card: "#FFFFFF",
      primary: "#134E4A",
      secondary: "#0D9488",
      accent: "#14B8A6",
      qrBackground: "#FFFFFF",

      border: "#CCFBF1",
      radius: "16px",

      footer: "#0D9488",
      footerText: "#FFFFFF",
    },

    config: {
      bodyBackground: "#F0FDFA",
      cardBackground: "#FFFFFF",
      cardBorder: "#CCFBF1",
      cardRadius: "16px",
      cardShadow: "0 20px 45px -12px rgba(13,148,136,.18)",

      primary: "#134E4A",
      secondary: "#0D9488",

      qrBackground: "#FFFFFF",
      qrBorder: "#CCFBF1",

      footerBackground: "#0D9488",
      footerColor: "#FFFFFF",

      accent: "#14B8A6",
      accentSoft: "#CCFBF1",

      displayFont: "'Plus Jakarta Sans', sans-serif",
      bodyFont: "'Plus Jakarta Sans', sans-serif",

      nameWeight: 800,
      nameSpacing: "-0.4px",

      ornate: false,
      footerBordered: false,
    },
  },

  // ==========================================================
  // 7. CAFE
  // ==========================================================
  {
    id: "cafe",
    name: "Cafe",
    description: "Warm and cozy cafe style",
    category: "Cafe",

    preview: {
      background: "#FBF3EC",
      card: "#FFFAF5",
      primary: "#5C3A21",
      secondary: "#A9702E",
      accent: "#C2703D",
      qrBackground: "#FFFFFF",

      border: "#E7C7A3",
      radius: "22px",

      footer: "#5C3A21",
      footerText: "#FFF7EE",
    },

    config: {
      bodyBackground: "#FBF3EC",
      cardBackground: "#FFFAF5",
      cardBorder: "#E7C7A3",
      cardRadius: "22px",
      cardShadow: "0 24px 48px -12px rgba(124,58,21,.18)",

      primary: "#5C3A21",
      secondary: "#A9702E",

      qrBackground: "#FFFFFF",
      qrBorder: "#E7C7A3",

      footerBackground: "#5C3A21",
      footerColor: "#FFF7EE",

      accent: "#C2703D",
      accentSoft: "#E7C7A3",

      displayFont:
        "'Fraunces', 'Playfair Display', serif",

      bodyFont: "'Plus Jakarta Sans', sans-serif",

      nameWeight: 600,
      nameSpacing: "0.2px",

      ornate: false,
      footerBordered: false,
    },
  },

  // ==========================================================
  // 8. TRADITIONAL
  // ==========================================================
  {
    id: "traditional",
    name: "Traditional",
    description: "Classic Indian restaurant style",
    category: "Indian",

    preview: {
      background: "#3D0C0C",
      card: "#4A1414",
      primary: "#FDF2E9",
      secondary: "#E8C468",
      accent: "#D4A017",
      qrBackground: "#FFFBF2",

      border: "#D4A017",
      radius: "16px",

      footer: "#D4A017",
      footerText: "#3D0C0C",
    },

    config: {
      bodyBackground: "#3D0C0C",
      cardBackground: "#4A1414",
      cardBorder: "#D4A017",
      cardRadius: "16px",
      cardShadow: "0 28px 55px -14px rgba(0,0,0,.45)",

      primary: "#FDF2E9",
      secondary: "#E8C468",

      qrBackground: "#FFFBF2",
      qrBorder: "#D4A017",

      footerBackground: "#D4A017",
      footerColor: "#3D0C0C",

      accent: "#D4A017",
      accentSoft: "#7A2727",

      displayFont:
        "'Cormorant Garamond', 'Playfair Display', serif",

      bodyFont: "'Plus Jakarta Sans', sans-serif",

      nameWeight: 700,
      nameSpacing: "0.4px",

      ornate: true,
      footerBordered: false,
    },
  },
];

// ============================================================
// DEFAULT THEME
// ============================================================

export const DEFAULT_QR_STANDEE_THEME = "classic";

// ============================================================
// HELPER
// ============================================================

export const getQrStandeeTheme = (themeId) => {
  return (
    QR_STANDEE_THEMES.find(
      (theme) => theme.id === themeId,
    ) ||
    QR_STANDEE_THEMES.find(
      (theme) => theme.id === DEFAULT_QR_STANDEE_THEME,
    )
  );
};

// ============================================================
// VALIDATOR
// ============================================================

export const isValidQrStandeeTheme = (themeId) => {
  return QR_STANDEE_THEMES.some(
    (theme) => theme.id === themeId,
  );
};

// ============================================================
// THEME IDS
// ============================================================

export const QR_STANDEE_THEME_IDS = QR_STANDEE_THEMES.map(
  (theme) => theme.id,
);