import { useAuth } from "../context/AuthContext";
import {
  Printer,
  Copy,
  CheckCircle,
  Plus,
  Trash2,
  QrCode,
  Power,
  X,
  Palette,
  Pencil,
  FolderPlus,
  ChevronDown,
  CheckCircle2,
} from "lucide-react";
import { useState, useRef, useEffect, useCallback, memo, useMemo } from "react";
import { QRCodeCanvas } from "qrcode.react";
import axios from "axios";
import { useSocket } from "../context/SocketContext";
import QRStandeeThemeSelector from "./QRStandeeThemeSelector";
import { QR_STANDEE_THEMES, DEFAULT_QR_STANDEE_THEME } from "./qrStandeeThemes";

// 🔑 Extracted + memoized TableCard component
const TableCard = memo(function TableCard({
  table,
  url,
  isCopied,
  onCopy,
  onPrint,
  onRemove,
  onToggle,
  canRemove,
  qrRef,
}) {
  const tableNo = table.tableNumber;
  const isDisabled = table.isDisabled;

  return (
    <div
      className={`bg-white p-6 rounded-3xl border transition-all space-y-5 group flex flex-col justify-between ${
        isDisabled
          ? "border-amber-300 bg-amber-50/20 opacity-75"
          : "border-slate-200/80 shadow-xs hover:border-slate-300"
      }`}
    >
      <div>
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-[11px] px-1 ${
                isDisabled
                  ? "bg-amber-100 text-amber-700"
                  : "bg-slate-100 text-slate-700"
              }`}
              title={tableNo}
            >
              {String(tableNo).slice(0, 4)}
            </div>
            <div>
              <span className="font-black text-slate-900 text-base block">
                {tableNo}
              </span>
              {isDisabled && (
                <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">
                  Disabled / Locked
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => onToggle(tableNo, !isDisabled)}
              className={`p-2 rounded-xl transition-all cursor-pointer ${
                isDisabled
                  ? "text-amber-600 bg-amber-50 hover:bg-amber-100"
                  : "text-slate-400 hover:text-amber-600 hover:bg-amber-50"
              }`}
              title={isDisabled ? "Enable Table QR" : "Disable Table QR"}
            >
              <Power size={16} />
            </button>

            <button
              onClick={() => onRemove(tableNo)}
              disabled={!canRemove}
              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl disabled:opacity-30 disabled:hover:text-slate-400 disabled:hover:bg-transparent transition-all cursor-pointer"
              title="Remove Table"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>

        <div
          className={`flex justify-center p-6 rounded-2xl border transition-colors ${
            isDisabled
              ? "bg-amber-50/50 border-amber-100 grayscale-[30%]"
              : "bg-slate-50/80 border-slate-100 group-hover:bg-slate-50"
          }`}
        >
          {url ? (
            <QRCodeCanvas
              ref={qrRef}
              value={url}
              size={150}
              level={"H"}
              className="w-full max-w-[140px] h-auto shadow-xs rounded-lg"
            />
          ) : (
            <div className="text-xs text-slate-400 py-10">Loading QR...</div>
          )}
        </div>
      </div>

      <div className="space-y-2.5">
        <button
          onClick={() => onCopy(url, tableNo)}
          disabled={!url}
          className={`w-full py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border transition-all cursor-pointer ${
            isCopied
              ? "bg-emerald-50 text-emerald-600 border-emerald-200"
              : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
          }`}
        >
          {isCopied ? <CheckCircle size={14} /> : <Copy size={14} />}
          {isCopied ? "Link Copied!" : "Copy Table Link"}
        </button>

        <div className="grid">
          <button
            onClick={() => onPrint(tableNo)}
            disabled={!url}
            className="py-2.5 text-xs font-bold bg-slate-50 text-slate-700 border border-slate-200 rounded-xl hover:bg-slate-100 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
          >
            <Printer size={14} className="text-slate-500" /> Print Standee
          </button>
        </div>
      </div>
    </div>
  );
});

// 🔑 Ek section ka all block — header (name, count, rename/delete) + the tables ka grid
const SectionBlock = memo(function SectionBlock({
  section,
  tables,
  onRenameSection,
  onDeleteSection,
  renderCard,
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(section);

  const submitRename = () => {
    const clean = renameValue.trim();
    if (clean && clean !== section) onRenameSection(section, clean);
    setIsRenaming(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
          >
            <ChevronDown
              size={18}
              className={`transition-transform ${collapsed ? "-rotate-90" : ""}`}
            />
          </button>

          {isRenaming ? (
            <input
              autoFocus
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onBlur={submitRename}
              onKeyDown={(e) => e.key === "Enter" && submitRename()}
              className="font-black text-slate-800 text-base bg-slate-50 border border-slate-300 rounded-lg px-2 py-1 outline-none"
            />
          ) : (
            <h3 className="font-black text-slate-800 text-base">{section}</h3>
          )}

          <span className="text-xs font-bold bg-white px-2.5 py-1 rounded-full border border-slate-200 text-slate-600 shadow-xs">
            {tables.length} {tables.length === 1 ? "Table" : "Tables"}
          </span>
        </div>

        {!isRenaming && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsRenaming(true)}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer"
              title="Rename Section"
            >
              <Pencil size={14} />
            </button>
            <button
              onClick={() => onDeleteSection(section)}
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
              title="Delete Section"
            >
              <Trash2 size={14} />
            </button>
          </div>
        )}
      </div>

      {!collapsed && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {tables.length === 0 ? (
            <div className="col-span-full text-xs text-slate-400 bg-white border border-dashed border-slate-200 rounded-2xl py-8 text-center">
              There are no tables in this section yet — add one using "Add
              Table".
            </div>
          ) : (
            tables.map((table) => renderCard(table))
          )}
        </div>
      )}
    </div>
  );
});

export default function TableMonitor() {
  const { user } = useAuth();
  const socket = useSocket();
  const [copied, setCopied] = useState(null);
  const qrRefs = useRef({});
  const [selectedStandeeTheme, setSelectedStandeeTheme] = useState(() => {
    try {
      return localStorage.getItem("qrStandeeTheme") || DEFAULT_QR_STANDEE_THEME;
    } catch {
      return DEFAULT_QR_STANDEE_THEME;
    }
  });

  const [showThemeSelector, setShowThemeSelector] = useState(false);

  const [storeDetails, setStoreDetails] = useState({
    id: "",
    name: "",
    logo: "",
  });
  const [tables, setTables] = useState([]);
  const [sections, setSections] = useState([]);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  // Add Table modal state
  const [showAddTable, setShowAddTable] = useState(false);
  const [newTableName, setNewTableName] = useState("");
  const [newTableSection, setNewTableSection] = useState("");
  const [creatingNewSection, setCreatingNewSection] = useState(false);
  const [newSectionInline, setNewSectionInline] = useState("");
  const [isSavingTable, setIsSavingTable] = useState(false);

  // Add Section modal state
  const [showAddSection, setShowAddSection] = useState(false);
  const [newSectionName, setNewSectionName] = useState("");
  const [isSavingSection, setIsSavingSection] = useState(false);
  const [showDeleteSectionModal, setShowDeleteSectionModal] = useState(false);
  const [sectionToDelete, setSectionToDelete] = useState(null);

  const apiBase = import.meta.env.VITE_APP_API_BASE;

  const showSuccess = useCallback((message) => {
    setSuccessMessage(message);
    setShowSuccessPopup(true);

    setTimeout(() => {
      setShowSuccessPopup(false);
    }, 3000);
  }, []);

  const handleStandeeThemeChange = useCallback(
    (themeId) => {
      const exists = QR_STANDEE_THEMES.some((theme) => theme.id === themeId);

      if (!exists) {
        return;
      }

      setSelectedStandeeTheme(themeId);

      try {
        localStorage.setItem("qrStandeeTheme", themeId);
      } catch {
        // localStorage unavailable hone par app break nahi hoga
      }

      const selectedTheme = QR_STANDEE_THEMES.find(
        (theme) => theme.id === themeId,
      );

      showSuccess(`${selectedTheme?.name || "Theme"} theme selected`);
    },
    [showSuccess],
  );

  // Restaurant Profile Fetch
  useEffect(() => {
    axios
      .get(`${apiBase}/restaurant/profile`, { withCredentials: true })
      .then((res) => {
        if (res.data?.data) {
          setStoreDetails({
            id: res.data.data._id || res.data.data.id || "",
            name: res.data.data.name || "",
            logo: res.data.data.logo || "",
          });
        }
      })
      .catch((err) =>
        console.warn(
          "Could not fetch restaurant profile for print:",
          err?.message,
        ),
      );
  }, [apiBase]);

  const fetchTables = useCallback(async () => {
    try {
      const res = await axios.get(`${apiBase}/tables/admin`, {
        withCredentials: true,
      });
      const backendTables = res.data?.data;
      if (Array.isArray(backendTables)) {
        const formatted = backendTables
          .map((t) =>
            typeof t === "string"
              ? {
                  tableNumber: t,
                  isDisabled: false,
                  section: "",
                }
              : {
                  ...t,
                  section: String(t.section || "").trim(),
                },
          )
          .filter((t) => t.section);
        setTables(formatted);
      }
    } catch (err) {
      console.warn("Could not sync table list from backend:", err?.message);
    }
  }, [apiBase]);

  const fetchSections = useCallback(async () => {
    try {
      const res = await axios.get(`${apiBase}/sections/admin`, {
        withCredentials: true,
      });
      const backendSections = res.data?.data;
      if (Array.isArray(backendSections)) {
        const names = backendSections
          .map((section) => String(section.name || "").trim())
          .filter(Boolean);

        setSections(names);

        setNewTableSection((current) => {
          if (current && names.includes(current)) {
            return current;
          }

          return names[0] || "";
        });
      }
    } catch (err) {
      console.warn("Could not fetch sections from backend:", err?.message);
    }
  }, [apiBase]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      void fetchTables();
      void fetchSections();
    }, 0);

    return () => clearTimeout(timeoutId);
  }, [fetchTables, fetchSections]);

  useEffect(() => {
    if (!socket) return;

    const handleTablesUpdated = () => {
      fetchTables();
      fetchSections();
    };

    const handleTableStatusUpdated = (payload) => {
      setTables((prev) =>
        prev.map((table) =>
          String(table.tableNumber) === String(payload.tableNumber)
            ? {
                ...table,
                isDisabled: payload.isDisabled,
              }
            : table,
        ),
      );
    };

    socket.on("TABLES_UPDATED", handleTablesUpdated);

    socket.on("TABLE_STATUS_UPDATED", handleTableStatusUpdated);

    return () => {
      socket.off("TABLES_UPDATED", handleTablesUpdated);

      socket.off("TABLE_STATUS_UPDATED", handleTableStatusUpdated);
    };
  }, [socket, fetchTables, fetchSections]);

  const activeRestaurantId =
    user?.restaurantId?._id || user?.restaurantId || storeDetails.id || "";

  const printQRCode = useCallback(
    (tableNo) => {
      const canvas = qrRefs.current[tableNo];

      if (!canvas) {
        alert("QR code is not ready. Please try again.");
        return;
      }

      const dataUrl = canvas.toDataURL("image/png");

      const restaurantName = storeDetails.name || "OUR RESTAURANT";

      let restaurantLogo = storeDetails.logo || "";

      if (restaurantLogo && restaurantLogo.startsWith("/")) {
        try {
          const urlObj = new URL(apiBase);
          restaurantLogo = `${urlObj.origin}${restaurantLogo}`;
        } catch {
          restaurantLogo = `${window.location.origin}${restaurantLogo}`;
        }
      }

      const theme =
        QR_STANDEE_THEMES.find((item) => item.id === selectedStandeeTheme) ||
        QR_STANDEE_THEMES[0];

      // ---------------------------------------------------------
      // SAFE HTML HELPERS
      // ---------------------------------------------------------

      const escapeHtml = (value) =>
        String(value ?? "")
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;")
          .replace(/'/g, "&#039;");

      const safeRestaurantName = escapeHtml(restaurantName);
      const safeTableNo = escapeHtml(tableNo);

      // ---------------------------------------------------------
      // THEME CONFIG — restaurant-grade color palettes + typography.
      // Each theme now also carries its own font stack (display + body)
      // and letter-spacing/weight tuned to match the mood — e.g. serif
      // for Royal/Elegant/Traditional (premium dining), clean grotesk
      // for Modern/Minimal, warm rounded feel for Cafe.
      // ---------------------------------------------------------

      const themes = {
        // =======================================================
        // CLASSIC — neutral, works for any restaurant type
        // =======================================================
        classic: {
          bodyBackground: "#F1F5F9",
          cardBackground: "#ffffff",
          cardBorder: "#E2E8F0",
          cardRadius: "26px",
          cardShadow: "0 24px 48px -12px rgba(15,23,42,.16)",
          primary: "#0F172A",
          secondary: "#64748B",
          qrBackground: "#ffffff",
          qrBorder: "#E2E8F0",
          footerBackground: "#0F172A",
          footerColor: "#ffffff",
          accent: "#0F172A",
          accentSoft: "#E2E8F0",
          displayFont: "'Plus Jakarta Sans', sans-serif",
          bodyFont: "'Plus Jakarta Sans', sans-serif",
          nameWeight: 800,
          nameSpacing: "-0.3px",
        },

        // =======================================================
        // MINIMAL — quiet, whitespace-forward
        // =======================================================
        minimal: {
          bodyBackground: "#FAFAFA",
          cardBackground: "#ffffff",
          cardBorder: "#EBEBEB",
          cardRadius: "8px",
          cardShadow: "0 12px 32px -8px rgba(0,0,0,.08)",
          primary: "#171717",
          secondary: "#8A8A8A",
          qrBackground: "#ffffff",
          qrBorder: "#EBEBEB",
          footerBackground: "#ffffff",
          footerColor: "#171717",
          accent: "#171717",
          accentSoft: "#EBEBEB",
          displayFont: "'Plus Jakarta Sans', sans-serif",
          bodyFont: "'Plus Jakarta Sans', sans-serif",
          nameWeight: 600,
          nameSpacing: "0px",
          footerBordered: true,
        },

        // =======================================================
        // ROYAL — gold on deep maroon, fine-dining feel
        // =======================================================
        royal: {
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
          displayFont: "'Playfair Display', 'Cormorant Garamond', serif",
          bodyFont: "'Plus Jakarta Sans', sans-serif",
          nameWeight: 700,
          nameSpacing: "0.5px",
          ornate: true,
        },

        // =======================================================
        // DARK — modern bistro / lounge
        // =======================================================
        dark: {
          bodyBackground: "#020617",
          cardBackground: "#0F172A",
          cardBorder: "#1E293B",
          cardRadius: "24px",
          cardShadow: "0 30px 60px -12px rgba(0,0,0,.6)",
          primary: "#F8FAFC",
          secondary: "#94A3B8",
          qrBackground: "#ffffff",
          qrBorder: "#1E293B",
          footerBackground: "#F8FAFC",
          footerColor: "#0F172A",
          accent: "#38BDF8",
          accentSoft: "#1E293B",
          displayFont: "'Plus Jakarta Sans', sans-serif",
          bodyFont: "'Plus Jakarta Sans', sans-serif",
          nameWeight: 800,
          nameSpacing: "-0.3px",
        },

        // =======================================================
        // ELEGANT — soft ivory, fine-dining serif
        // =======================================================
        elegant: {
          bodyBackground: "#F5F0E8",
          cardBackground: "#FFFDF9",
          cardBorder: "#C9B79C",
          cardRadius: "18px",
          cardShadow: "0 28px 55px -14px rgba(63,48,36,.20)",
          primary: "#2E2418",
          secondary: "#8B7355",
          qrBackground: "#ffffff",
          qrBorder: "#C9B79C",
          footerBackground: "#2E2418",
          footerColor: "#F5F0E8",
          accent: "#8B7355",
          accentSoft: "#E4D9C4",
          displayFont: "'Cormorant Garamond', 'Playfair Display', serif",
          bodyFont: "'Plus Jakarta Sans', sans-serif",
          nameWeight: 600,
          nameSpacing: "0.3px",
          ornate: true,
        },

        // =======================================================
        // MODERN — teal, clean grid, health/fusion cafes
        // =======================================================
        modern: {
          bodyBackground: "#F0FDFA",
          cardBackground: "#ffffff",
          cardBorder: "#CCFBF1",
          cardRadius: "16px",
          cardShadow: "0 20px 45px -12px rgba(13,148,136,.18)",
          primary: "#134E4A",
          secondary: "#0D9488",
          qrBackground: "#ffffff",
          qrBorder: "#CCFBF1",
          footerBackground: "#0D9488",
          footerColor: "#ffffff",
          accent: "#14B8A6",
          accentSoft: "#CCFBF1",
          displayFont: "'Plus Jakarta Sans', sans-serif",
          bodyFont: "'Plus Jakarta Sans', sans-serif",
          nameWeight: 800,
          nameSpacing: "-0.4px",
        },

        // =======================================================
        // CAFE — warm terracotta, cozy roastery feel
        // =======================================================
        cafe: {
          bodyBackground: "#FBF3EC",
          cardBackground: "#FFFAF5",
          cardBorder: "#E7C7A3",
          cardRadius: "22px",
          cardShadow: "0 24px 48px -12px rgba(124,58,21,.18)",
          primary: "#5C3A21",
          secondary: "#A9702E",
          qrBackground: "#ffffff",
          qrBorder: "#E7C7A3",
          footerBackground: "#5C3A21",
          footerColor: "#FFF7EE",
          accent: "#C2703D",
          accentSoft: "#E7C7A3",
          displayFont: "'Fraunces', 'Playfair Display', serif",
          bodyFont: "'Plus Jakarta Sans', sans-serif",
          nameWeight: 600,
          nameSpacing: "0.2px",
        },

        // =======================================================
        // TRADITIONAL — deep maroon + gold, classic Indian dining
        // =======================================================
        traditional: {
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
          displayFont: "'Cormorant Garamond', 'Playfair Display', serif",
          bodyFont: "'Plus Jakarta Sans', sans-serif",
          nameWeight: 700,
          nameSpacing: "0.4px",
          ornate: true,
        },
      };

      const config = themes[selectedStandeeTheme] || themes.classic;

      // ---------------------------------------------------------
      // LOGO
      // ---------------------------------------------------------

      const logoHtml = restaurantLogo
        ? `
        <img
          id="print-logo"
          src="${restaurantLogo}"
          class="logo-img"
          alt="Restaurant Logo"
        />
      `
        : `
        <div class="logo-fallback">
          ${safeRestaurantName.charAt(0).toUpperCase()}
        </div>
      `;

      // ---------------------------------------------------------
      // ORNAMENTAL DIVIDER — only for premium/serif themes
      // ---------------------------------------------------------

      const ornamentHtml = config.ornate
        ? `<div class="ornament"><span></span><svg width="14" height="14" viewBox="0 0 24 24" fill="${config.accent}"><path d="M12 2l2.5 7.5H22l-6 4.5 2.5 7.5L12 17l-6.5 4.5L8 14 2 9.5h7.5z"/></svg><span></span></div>`
        : "";

      // ---------------------------------------------------------
      // PRINT HTML
      // ---------------------------------------------------------

      const windowContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8" />

          <title>
            Table ${safeTableNo} - ${safeRestaurantName} Standee
          </title>

          <style>

            @import url(
              'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&family=Playfair+Display:wght@600;700;800&family=Cormorant+Garamond:wght@600;700&family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&display=swap'
            );

            * {
              box-sizing: border-box;
            }

            @page {
              size: auto;
              margin: 0;
            }

            html,
            body {
              width: 100%;
              height: 100%;
              margin: 0;
              padding: 0;
            }

            body {
              font-family: ${config.bodyFont};

              display: flex;
              align-items: center;
              justify-content: center;

              min-height: 100vh;

              background: ${config.bodyBackground};

              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }

            .standee-card {
              width: 340px;

              background: ${config.cardBackground};

              border: 1.5px solid ${config.cardBorder};

              border-radius: ${config.cardRadius};

              padding: 36px 30px 28px;

              text-align: center;

              box-shadow: ${config.cardShadow};

              position: relative;

              overflow: hidden;
            }

            .top-accent {
              position: absolute;

              top: 0;
              left: 0;
              right: 0;

              height: 4px;

              background: ${config.accent};
            }

            .brand-container {
              display: flex;
              flex-direction: column;
              align-items: center;

              margin-bottom: 20px;
            }

            .logo-img,
            .logo-fallback {
              width: 60px;
              height: 60px;

              margin-bottom: 14px;

              border-radius: 16px;

              object-fit: cover;
            }

            .logo-img {
              border: 1px solid ${config.cardBorder};
              background: #ffffff;
            }

            .logo-fallback {
              display: flex;
              align-items: center;
              justify-content: center;

              background: ${config.accent};

              color: ${config.footerColor === config.primary ? "#ffffff" : config.cardBackground};

              font-family: ${config.displayFont};
              font-size: 24px;
              font-weight: 700;
            }

            .brand-name {
              margin: 0;

              max-width: 270px;

              color: ${config.primary};

              font-family: ${config.displayFont};

              font-size: 20px;

              line-height: 1.3;

              font-weight: ${config.nameWeight};

              letter-spacing: ${config.nameSpacing};
            }

            .brand-tagline {
              margin: 6px 0 0;

              color: ${config.secondary};

              font-family: ${config.bodyFont};

              font-size: 9px;

              font-weight: 700;

              text-transform: uppercase;

              letter-spacing: 2.5px;
            }

            .ornament {
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 8px;

              margin: 14px 0 18px;
            }

            .ornament span {
              width: 28px;
              height: 1px;
              background: ${config.accentSoft};
            }

            .qr-box {
              display: inline-block;

              padding: 16px;

              margin-bottom: 18px;

              background: ${config.qrBackground};

              border: 1.5px solid ${config.qrBorder};

              border-radius: 16px;

              box-shadow:
                0 8px 24px rgba(0, 0, 0, 0.08);
            }

            .qr-image {
              display: block;

              width: 166px;
              height: 166px;

              border-radius: 4px;
            }

            .scan-subtitle {
              margin: 0 0 6px;

              color: ${config.secondary};

              font-family: ${config.bodyFont};

              font-size: 10px;

              font-weight: 700;

              text-transform: uppercase;

              letter-spacing: 2.5px;
            }

            .menu-title {
              margin: 0 0 20px;

              color: ${config.primary};

              font-family: ${config.displayFont};

              font-size: 25px;

              line-height: 1.2;

              font-weight: ${config.nameWeight >= 700 ? 800 : 700};

              letter-spacing: -0.4px;
            }

            .table-footer {
              display: inline-block;

              padding: 10px 24px;

              background: ${config.footerBackground};

              color: ${config.footerColor};

              border: ${config.footerBordered ? `1px solid ${config.cardBorder}` : "none"};

              border-radius: 999px;

              font-family: ${config.bodyFont};

              font-size: 11px;

              font-weight: 800;

              text-transform: uppercase;

              letter-spacing: 1.8px;
            }

            .powered-by {
              display: flex;

              align-items: center;
              justify-content: center;

              gap: 5px;

              margin-top: 22px;

              padding-top: 14px;

              border-top: 1px dashed ${config.accentSoft};

              color: ${config.secondary};

              font-family: ${config.bodyFont};

              font-size: 9px;

              font-weight: 600;
            }

            .powered-brand {
              font-weight: 900;

              color: ${config.primary};
            }

            @media print {
              body {
                min-height: 100vh;
              }

              .standee-card {
                box-shadow: none;
              }
            }

          </style>
        </head>

        <body>

          <div class="standee-card">

            <div class="top-accent"></div>

            <div class="brand-container">

              ${logoHtml}

              <h2 class="brand-name">
                ${safeRestaurantName}
              </h2>

              <p class="brand-tagline">
                Digital Menu
              </p>

            </div>

            ${ornamentHtml}

            <div class="qr-box">

              <img
                src="${dataUrl}"
                class="qr-image"
                alt="Table QR Code"
              />

            </div>

            <div class="scan-subtitle">
              Scan to view menu
            </div>

            <h1 class="menu-title">
              Order Here
            </h1>

            <div class="table-footer">
              Table ${safeTableNo}
            </div>

            <div class="powered-by">

              <span>
                Powered by
              </span>

              <span class="powered-brand">
                ChotuGTT
              </span>

            </div>

          </div>

          <script>

            const logo =
              document.getElementById("print-logo");

            function triggerPrint() {
              window.focus();

              setTimeout(() => {
                window.print();

                setTimeout(() => {
                  window.close();
                }, 300);
              }, 100);
            }

            if (logo) {

              if (logo.complete) {
                triggerPrint();
              } else {

                logo.onload = triggerPrint;

                logo.onerror = triggerPrint;

              }

            } else {

              triggerPrint();

            }

          </script>

        </body>
      </html>
    `;

      const printWindow = window.open("", "_blank", "width=500,height=700");

      if (!printWindow) {
        alert("Popup blocked. Please allow popups for this site.");
        return;
      }

      printWindow.document.open();

      printWindow.document.write(windowContent);

      printWindow.document.close();
    },
    [storeDetails, apiBase, selectedStandeeTheme],
  );

  // 🔑 Add Table modal open — defaults reset
  const openAddTableModal = useCallback(() => {
    setNewTableName("");
    setNewTableSection(sections[0] || "");
    setCreatingNewSection(false);
    setNewSectionInline("");
    setShowAddTable(true);
  }, [sections]);

  // 🔑 Custom name + section ke with table create
  const submitAddTable = useCallback(async () => {
    const cleanName = newTableName.trim();
    if (!cleanName) return alert("Enter the table name (e.g., A1, H5)");

    const finalSection = creatingNewSection
      ? newSectionInline.trim()
      : newTableSection.trim();

    if (!finalSection) {
      return alert("Please select or create a section first");
    }

    if (
      tables.some(
        (t) => t.tableNumber.toLowerCase() === cleanName.toLowerCase(),
      )
    ) {
      return alert("A table with this name already exists");
    }

    setIsSavingTable(true);
    try {
      const res = await axios.post(
        `${apiBase}/tables/admin`,
        { tableNumber: cleanName, section: finalSection },
        { withCredentials: true },
      );
      if (res.data?.success && Array.isArray(res.data.data)) {
        const formatted = res.data.data.map((t) => ({
          ...t,
          section: String(t.section || "").trim(),
        }));
        setTables(formatted);
        setShowAddTable(false);
        fetchSections();

        showSuccess(`Table ${cleanName} added successfully!`);
      }
    } catch (err) {
      alert(err?.response?.data?.message || err?.message);
    } finally {
      setIsSavingTable(false);
    }
  }, [
    newTableName,
    newTableSection,
    creatingNewSection,
    newSectionInline,
    tables,
    apiBase,
    fetchSections,
    showSuccess,
  ]);

  // 🔑 Standalone empty section banana
  const submitAddSection = useCallback(async () => {
    const clean = newSectionName.trim();
    if (!clean) return alert("Enter the section name (e.g., AC, Rooftop)");

    setIsSavingSection(true);
    try {
      await axios.post(
        `${apiBase}/sections/admin`,
        { name: clean },
        { withCredentials: true },
      );
      await fetchSections();
      setShowAddSection(false);
      setNewSectionName("");

      showSuccess(`Section "${clean}" created successfully!`);
    } catch (err) {
      alert(err?.response?.data?.message || err?.message);
    } finally {
      setIsSavingSection(false);
    }
  }, [newSectionName, apiBase, fetchSections, showSuccess]);

  const renameSection = useCallback(
    async (oldName, newName) => {
      try {
        await axios.patch(
          `${apiBase}/sections/admin/${encodeURIComponent(oldName)}`,
          { newName },
          { withCredentials: true },
        );

        setSections((prev) => prev.map((s) => (s === oldName ? newName : s)));

        setTables((prev) =>
          prev.map((t) =>
            t.section === oldName ? { ...t, section: newName } : t,
          ),
        );

        showSuccess(`Section renamed to "${newName}" successfully!`);
      } catch (err) {
        alert(
          err?.response?.data?.message ||
            err?.message ||
            "Failed to rename section",
        );
      }
    },
    [apiBase, showSuccess],
  );

  const deleteSection = useCallback((name) => {
    setSectionToDelete(name);
    setShowDeleteSectionModal(true);
  }, []);

  const confirmDeleteSection = useCallback(async () => {
    if (!sectionToDelete) return;

    try {
      await axios.delete(
        `${apiBase}/sections/admin/${encodeURIComponent(sectionToDelete)}`,
        {
          withCredentials: true,
        },
      );

      setSections((prev) => prev.filter((s) => s !== sectionToDelete));

      setTables((prev) => prev.filter((t) => t.section !== sectionToDelete));

      setShowDeleteSectionModal(false);

      showSuccess(`Section "${sectionToDelete}" deleted successfully!`);

      setSectionToDelete(null);
    } catch (err) {
      alert(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to delete section",
      );
    }
  }, [sectionToDelete, apiBase, showSuccess]);

  const removeTable = useCallback(
    async (tableNo) => {
      if (tables.length <= 1) return;

      try {
        const res = await axios.delete(
          `${apiBase}/tables/admin/${encodeURIComponent(tableNo)}`,
          { withCredentials: true },
        );

        if (res.data?.success) {
          setTables((prev) =>
            prev.filter(
              (table) => String(table.tableNumber) !== String(tableNo),
            ),
          );

          showSuccess(`Table ${tableNo} deleted successfully!`);
        }
      } catch (err) {
        alert(
          err?.response?.data?.message ||
            err?.message ||
            "Failed to delete table",
        );
      }
    },
    [tables.length, apiBase, showSuccess],
  );

  const toggleTableStatus = useCallback(
    async (tableNo, newDisabledState) => {
      try {
        const res = await axios.patch(
          `${apiBase}/tables/admin/${encodeURIComponent(tableNo)}/toggle`,
          {
            isDisabled: newDisabledState,
          },
          {
            withCredentials: true,
          },
        );

        if (res.data?.success !== false) {
          setTables((prev) =>
            prev.map((t) =>
              t.tableNumber === tableNo
                ? { ...t, isDisabled: newDisabledState }
                : t,
            ),
          );

          showSuccess(
            newDisabledState
              ? `Table ${tableNo} disabled successfully!`
              : `Table ${tableNo} enabled successfully!`,
          );
        }
      } catch (err) {
        alert(
          err?.response?.data?.message ||
            err?.message ||
            "Failed to update table status",
        );
      }
    },
    [apiBase, showSuccess],
  );

  // const generateTableUrl = useCallback(
  //   (tableNo) => {
  //     if (!activeRestaurantId) return "";
  //     const token = btoa(`${activeRestaurantId}-TABLE-${tableNo}`);
  //     return `${window.location.origin}/catalog/${activeRestaurantId}?t=${token}`;
  //   },
  //   [activeRestaurantId],
  // );

  const tableUrls = useMemo(() => {
    const map = {};
    tables.forEach((t) => {
      if (t.token) {
        map[t.tableNumber] =
          `${window.location.origin}/catalog/${activeRestaurantId}?t=${t.token}`;
      }
    });
    return map;
  }, [tables, activeRestaurantId]);

  const previewTable = useMemo(() => {
    return tables.find((table) => tableUrls[table.tableNumber]);
  }, [tables, tableUrls]);

  const handleCopyLink = useCallback(async (url, tableNo) => {
    if (!url) return;
    await navigator.clipboard.writeText(url);
    setCopied(tableNo);
    setTimeout(() => setCopied(null), 2000);
  }, []);

  // 🔑 Group tables by the server-provided sections.
  // Tables without a valid section are intentionally not rendered.
  const groupedBySections = useMemo(() => {
    const knownSections = Array.isArray(sections) ? sections : [];

    const map = {};

    knownSections.forEach((section) => {
      map[section] = [];
    });

    tables.forEach((table) => {
      const section = String(table.section || "").trim();

      if (!section) {
        return;
      }

      if (!map[section]) {
        map[section] = [];
      }

      map[section].push(table);
    });

    return knownSections.map((section) => ({
      section,
      tables: map[section] || [],
    }));
  }, [sections, tables]);

  const renderCard = (table) => (
    <TableCard
      key={table.tableNumber}
      table={table}
      url={tableUrls[table.tableNumber]}
      isCopied={copied === table.tableNumber}
      onCopy={handleCopyLink}
      onPrint={printQRCode}
      onRemove={removeTable}
      onToggle={toggleTableStatus}
      canRemove={tables.length > 1}
      qrRef={(el) => (qrRefs.current[table.tableNumber] = el)}
    />
  );

  if (showThemeSelector) {
    return (
      <QRStandeeThemeSelector
        selectedTheme={selectedStandeeTheme}
        restaurantName={storeDetails.name}
        restaurantLogo={storeDetails.logo}
        previewQrValue={previewTable ? tableUrls[previewTable.tableNumber] : ""}
        previewTableNumber={previewTable?.tableNumber || ""}
        onSelect={(themeId) => {
          handleStandeeThemeChange(themeId);
          setShowThemeSelector(false);
        }}
        onBack={() => setShowThemeSelector(false)}
      />
    );
  }

  return (
    <>
      {showSuccessPopup && (
        <div className="fixed top-6 right-6 z-[9999] animate-in slide-in-from-right-5 fade-in duration-300">
          <div className="flex items-start gap-3 bg-white border border-emerald-200 shadow-2xl rounded-2xl px-5 py-4 min-w-[320px] max-w-[400px]">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
              <CheckCircle2 size={22} strokeWidth={2.5} />
            </div>

            <div className="flex-1">
              <p className="text-sm font-black text-slate-900">Success</p>

              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                {successMessage}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowSuccessPopup(false)}
              className="text-slate-400 hover:text-slate-700 transition-colors text-lg leading-none"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {showDeleteSectionModal && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl p-6 animate-in zoom-in-95 fade-in duration-200">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mb-4">
              <Trash2 size={22} strokeWidth={2.5} />
            </div>

            <h3 className="text-lg font-black text-slate-900">
              Delete Section?
            </h3>

            <p className="text-sm text-slate-500 mt-2 leading-relaxed">
              Are you sure you want to delete{" "}
              <span className="font-bold text-slate-700">
                "{sectionToDelete}"
              </span>
              ?
            </p>

            <p className="text-xs text-rose-600 bg-rose-50 border border-rose-100 rounded-xl p-3 mt-3">
              All tables inside this section will also be permanently deleted.
              This action cannot be undone.
            </p>

            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteSectionModal(false);
                  setSectionToDelete(null);
                }}
                className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-700 text-sm font-bold hover:bg-slate-50 transition-all"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={confirmDeleteSection}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-rose-500 to-red-600 text-white text-sm font-bold hover:opacity-95 transition-all"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="min-h-screen bg-[#F6F7FB] font-sans text-slate-900">
        {/* Header Section */}
        <div className="mx-auto max-w-7xl px-4 pb-4 pt-5 sm:px-6 lg:px-8 lg:pb-5 lg:pt-8">
          <div className="flex flex-col gap-5 rounded-[28px] border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-50 text-red-600 ring-1 ring-red-100">
                <QrCode size={25} />
              </div>
              <div className="min-w-0">
                <h1 className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
                  Table Monitor
                </h1>
                <p className="mt-1 text-xs text-slate-500 sm:text-sm">
                  Manage tables, sections, QR links and standee printing.
                </p>
              </div>
            </div>

            <div className="flex w-full flex-col gap-2 sm:flex-row lg:w-auto">
              <button
                onClick={() => setShowAddSection(true)}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs font-black text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 sm:flex-none"
              >
                <FolderPlus size={16} />
                Add Section
              </button>

              <button
                onClick={openAddTableModal}
                disabled={!activeRestaurantId}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-red-500 to-rose-600 px-5 py-3 text-xs font-black text-white shadow-lg shadow-red-500/20 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none"
              >
                <Plus size={16} />
                Add Table
              </button>
            </div>
          </div>
        </div>

        {/* Info Stats Bar */}
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
                Total Tables
              </p>
              <p className="mt-1 text-2xl font-black tracking-tight text-slate-900">
                {tables.length}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
                Sections
              </p>
              <p className="mt-1 text-2xl font-black tracking-tight text-slate-900">
                {sections.length}
              </p>
            </div>

            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-emerald-600">
                Active QR
              </p>
              <p className="mt-1 text-2xl font-black tracking-tight text-emerald-800">
                {tables.filter((table) => !table.isDisabled).length}
              </p>
            </div>

            <div className="rounded-2xl border border-amber-100 bg-amber-50/70 p-4 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-amber-600">
                Disabled
              </p>
              <p className="mt-1 text-2xl font-black tracking-tight text-amber-800">
                {tables.filter((table) => table.isDisabled).length}
              </p>
            </div>
          </div>
        </div>

        {/* Section-wise Tables */}
        <div className="mx-auto max-w-7xl px-4 pb-2 pt-7 sm:px-6 lg:px-8">
          <div className="mb-5 flex items-end justify-between">
            <div>
              <h3 className="text-base font-black text-slate-900 sm:text-lg">
                Sections & Tables
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                Organize your dining area and manage each table QR.
              </p>
            </div>
          </div>

          <div className="space-y-9">
            {groupedBySections.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center shadow-sm">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
                  <FolderPlus size={24} />
                </div>
                <h3 className="mt-4 text-base font-black text-slate-900">
                  No sections yet
                </h3>
                <p className="mx-auto mt-1 max-w-md text-xs leading-5 text-slate-500">
                  Create your first section such as AC, Non-AC, Rooftop or VIP,
                  then add tables inside it.
                </p>
                <button
                  type="button"
                  onClick={() => setShowAddSection(true)}
                  className="mt-5 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-black text-white transition hover:bg-slate-800"
                >
                  <FolderPlus size={15} />
                  Create Section
                </button>
              </div>
            ) : (
              groupedBySections.map(({ section, tables: sectionTables }) => (
                <SectionBlock
                  key={section}
                  section={section}
                  tables={sectionTables}
                  onRenameSection={renameSection}
                  onDeleteSection={deleteSection}
                  renderCard={renderCard}
                />
              ))
            )}
          </div>
        </div>
      </div>

      {/* QR STANDEE THEME — secondary setting, kept at the bottom */}
      <section className="mt-10 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-50 text-violet-600">
              <QrCode size={20} />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900 sm:text-base">
                QR Standee Design
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                Current theme:{" "}
                <span className="font-bold text-slate-700">
                  {QR_STANDEE_THEMES.find(
                    (theme) => theme.id === selectedStandeeTheme,
                  )?.name || "Classic"}
                </span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowThemeSelector(true)}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-3 text-xs font-black text-slate-800 transition hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700 sm:w-auto"
          >
            <Palette size={16} />
            Choose QR Theme
          </button>
        </div>
      </section>

      {/* Add Table Modal */}
      {showAddTable && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm space-y-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-slate-900 text-lg">
                Add New Table
              </h3>
              <button
                onClick={() => setShowAddTable(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">
                Table Name
              </label>
              <input
                autoFocus
                value={newTableName}
                onChange={(e) => setNewTableName(e.target.value)}
                placeholder="e.g. AC1, T5, VIP-2"
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-red-400"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">
                Section
              </label>

              {!creatingNewSection ? (
                <select
                  value={newTableSection}
                  onChange={(e) => {
                    if (e.target.value === "__new__") {
                      setCreatingNewSection(true);
                    } else {
                      setNewTableSection(e.target.value);
                    }
                  }}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-red-400 bg-white"
                >
                  {sections.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                  <option value="__new__">+ Create New Section</option>
                </select>
              ) : (
                <div className="flex gap-2">
                  <input
                    autoFocus
                    value={newSectionInline}
                    onChange={(e) => setNewSectionInline(e.target.value)}
                    placeholder="e.g. AC, Rooftop"
                    className="flex-1 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-red-400"
                  />
                  <button
                    onClick={() => {
                      setCreatingNewSection(false);
                      setNewSectionInline("");
                    }}
                    className="px-3 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 cursor-pointer"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}
            </div>

            <button
              onClick={submitAddTable}
              disabled={isSavingTable}
              className="w-full bg-gradient-to-r from-red-500 to-rose-600 text-white py-3 rounded-xl font-bold text-sm hover:opacity-95 transition-all cursor-pointer disabled:opacity-50"
            >
              {isSavingTable ? "Adding..." : "Add Table"}
            </button>
          </div>
        </div>
      )}

      {/* Add Section Modal */}
      {showAddSection && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm space-y-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-slate-900 text-lg">
                Add New Section
              </h3>
              <button
                onClick={() => setShowAddSection(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">
                Section Name
              </label>
              <input
                autoFocus
                value={newSectionName}
                onChange={(e) => setNewSectionName(e.target.value)}
                placeholder="e.g. AC, Non-AC, Rooftop"
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-red-400"
              />
            </div>

            <button
              onClick={submitAddSection}
              disabled={isSavingSection}
              className="w-full bg-gradient-to-r from-red-500 to-rose-600 text-white py-3 rounded-xl font-bold text-sm hover:opacity-95 transition-all cursor-pointer disabled:opacity-50"
            >
              {isSavingSection ? "Creating..." : "Create Section"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
