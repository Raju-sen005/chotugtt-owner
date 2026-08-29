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
  Pencil,
  FolderPlus,
  ChevronDown,
  CheckCircle2,
} from "lucide-react";
import { useState, useRef, useEffect, useCallback, memo, useMemo } from "react";
import { QRCodeCanvas } from "qrcode.react";
import axios from "axios";
import { useSocket } from "../context/SocketContext";
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

        {section !== "General" && !isRenaming && (
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

  const [storeDetails, setStoreDetails] = useState({
    id: "",
    name: "",
    logo: "",
  });
  const [tables, setTables] = useState([]);
  const [sections, setSections] = useState(["General"]);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  // Add Table modal state
  const [showAddTable, setShowAddTable] = useState(false);
  const [newTableName, setNewTableName] = useState("");
  const [newTableSection, setNewTableSection] = useState("General");
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
        const formatted = backendTables.map((t) =>
          typeof t === "string"
            ? { tableNumber: t, isDisabled: false, section: "General" }
            : { ...t, section: t.section || "General" },
        );
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
        const names = backendSections.map((s) => s.name);
        // "General" always in the list, even if not created in the backend
        setSections(names.includes("General") ? names : ["General", ...names]);
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
    user?.restaurantId?._id ||
    user?.restaurantId ||
    user?._id ||
    storeDetails.id;

  const printQRCode = useCallback(
  (tableNo) => {
    const canvas = qrRefs.current[tableNo];
    if (!canvas) return;
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

    const windowContent = `
    <html>
      <head>
        <title>Table ${tableNo} - ${restaurantName} Standee</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');

          * { box-sizing: border-box; }

          body {
            font-family: 'Plus Jakarta Sans', sans-serif;
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100vh;
            margin: 0;
            background: #ffffff;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          .standee-card {
            width: 340px;
            background: #ffffff;
            border: 1px solid #E5E7EB;
            border-radius: 24px;
            padding: 36px 28px 28px;
            text-align: center;
            box-shadow: 0 20px 40px rgba(15, 23, 42, 0.08);
            box-sizing: border-box;
            position: relative;
          }

          .brand-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            margin-bottom: 22px;
          }

          .logo-img {
            width: 56px;
            height: 56px;
            object-fit: cover;
            border-radius: 16px;
            border: 1px solid #E5E7EB;
            background: #fff;
            margin-bottom: 12px;
          }

          .logo-fallback {
            width: 56px;
            height: 56px;
            border-radius: 16px;
            background: #0F172A;
            color: #fff;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 22px;
            font-weight: 800;
            margin-bottom: 12px;
          }

          .brand-name {
            font-size: 17px;
            font-weight: 800;
            letter-spacing: -0.2px;
            color: #0F172A;
            margin: 0;
            line-height: 1.3;
            max-width: 260px;
          }

          .brand-tagline {
            font-size: 10px;
            font-weight: 600;
            letter-spacing: 1.5px;
            text-transform: uppercase;
            color: #94A3B8;
            margin: 4px 0 0 0;
          }

          .qr-box {
            background: #ffffff;
            padding: 18px;
            border-radius: 20px;
            display: inline-block;
            border: 1.5px solid #F1F5F9;
            margin-bottom: 20px;
            box-shadow: inset 0 0 0 1px #fff;
          }

          img.qr-image {
            width: 168px;
            height: 168px;
            display: block;
            border-radius: 6px;
          }

          .scan-subtitle {
            font-size: 10.5px;
            font-weight: 700;
            color: #94A3B8;
            text-transform: uppercase;
            letter-spacing: 2px;
            margin: 0 0 6px 0;
          }

          .menu-title {
            color: #0F172A;
            margin: 0 0 22px 0;
            font-size: 25px;
            font-weight: 800;
            letter-spacing: -0.5px;
          }

          .table-footer {
            background: #0F172A;
            color: #ffffff;
            padding: 9px 22px;
            border-radius: 999px;
            display: inline-block;
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 1.5px;
          }

          .powered-by {
            margin-top: 24px;
            padding-top: 16px;
            border-top: 1px dashed #E2E8F0;
            font-size: 9.5px;
            font-weight: 600;
            color: #CBD5E1;
            letter-spacing: 0.5px;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 5px;
          }

          .powered-by .brand-tag {
            font-weight: 800;
            color: #64748B;
            letter-spacing: 0.2px;
          }
        </style>
      </head>
      <body>
        <div class="standee-card">
          <div class="brand-container">
            ${
              restaurantLogo
                ? `<img id="print-logo" src="${restaurantLogo}" class="logo-img" />`
                : `<div class="logo-fallback">${restaurantName.charAt(0).toUpperCase()}</div>`
            }
            <h2 class="brand-name">${restaurantName}</h2>
            <p class="brand-tagline">Digital Menu</p>
          </div>

          <div class="qr-box">
            <img src="${dataUrl}" class="qr-image" />
          </div>

          <div class="scan-subtitle">Scan to view menu</div>
          <h1 class="menu-title">Order Here</h1>

          <div class="table-footer">Table ${tableNo}</div>

          <div class="powered-by">
            <span>Powered by</span>
            <span class="brand-tag">ChotuGTT</span>
          </div>
        </div>
        <script>
          const logo = document.getElementById('print-logo');
          function triggerPrint() {
            window.focus();
            window.print();
            window.close();
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
    </html>`;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.open();
    printWindow.document.write(windowContent);
    printWindow.document.close();
  },
  [storeDetails, apiBase],
);

  // 🔑 Add Table modal open — defaults reset
  const openAddTableModal = useCallback(() => {
    setNewTableName("");
    setNewTableSection(sections[0] || "General");
    setCreatingNewSection(false);
    setNewSectionInline("");
    setShowAddTable(true);
  }, [sections]);

  // 🔑 Custom name + section ke with table create
  const submitAddTable = useCallback(async () => {
    const cleanName = newTableName.trim();
    if (!cleanName) return alert("Enter the table name (e.g., A1, H5)");

    const finalSection = creatingNewSection
      ? newSectionInline.trim() || "General"
      : newTableSection;

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
          section: t.section || "General",
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

      setTables((prev) =>
        prev.map((t) =>
          t.section === sectionToDelete ? { ...t, section: "General" } : t,
        ),
      );

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
          {
            withCredentials: true,
          },
        );

        if (res.data?.success !== false) {
          setTables((prev) => prev.filter((t) => t.tableNumber !== tableNo));

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

  const handleCopyLink = useCallback(async (url, tableNo) => {
    if (!url) return;
    await navigator.clipboard.writeText(url);
    setCopied(tableNo);
    setTimeout(() => setCopied(null), 2000);
  }, []);

  // 🔑 Sections ke according se tables group  — jo section list mein na hai
  // (edge case) woh bhi "General" ke with see
  const groupedBySections = useMemo(() => {
    const knownSections = sections.length ? sections : ["General"];
    const map = {};
    knownSections.forEach((s) => (map[s] = []));

    tables.forEach((t) => {
      const sec = t.section || "General";
      if (!map[sec]) map[sec] = [];
      map[sec].push(t);
    });

    return knownSections
      .filter((s) => map[s] !== undefined)
      .map((s) => ({ section: s, tables: map[s] }));
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

            <p className="text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-xl p-3 mt-3">
              Tables inside this section will be moved to
              <span className="font-bold"> General</span>.
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

      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-10 space-y-8 font-sans bg-[#F8F9FA] min-h-screen">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-red-50 text-red-600 rounded-2xl border border-red-100">
              <QrCode size={28} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                Table Monitor
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Manage custom table names, sections, and QR standees.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => setShowAddSection(true)}
              className="flex-1 sm:flex-none bg-white border border-slate-200 text-slate-700 px-4 py-3 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 hover:bg-slate-50 transition-all cursor-pointer"
            >
              <FolderPlus size={16} /> Add Section
            </button>
            <button
              onClick={openAddTableModal}
              disabled={!activeRestaurantId}
              className="flex-1 sm:flex-none bg-gradient-to-r from-red-500 to-rose-600 text-white px-5 py-3 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 hover:opacity-95 shadow-sm shadow-red-500/20 transition-all cursor-pointer disabled:opacity-50"
            >
              <Plus size={16} /> Add Table
            </button>
          </div>
        </div>

        {/* Info Stats Bar */}
        <div className="flex items-center justify-between px-2">
          <h3 className="font-black text-slate-800 text-base">All Sections</h3>
          <span className="text-xs font-bold bg-white px-3 py-1 rounded-full border border-slate-200 text-slate-600 shadow-xs">
            {tables.length} Total Tables
          </span>
        </div>

        {/* Section-wise Tables */}
        <div className="space-y-10">
          {groupedBySections.map(({ section, tables: sectionTables }) => (
            <SectionBlock
              key={section}
              section={section}
              tables={sectionTables}
              onRenameSection={renameSection}
              onDeleteSection={deleteSection}
              renderCard={renderCard}
            />
          ))}
        </div>

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
      </div>
    </>
  );
}
