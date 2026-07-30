import { useAuth } from "../../context/AuthContext";
import {
  // Download,
  Printer,
  Copy,
  CheckCircle,
  Plus,
  Trash2,
  QrCode,
  // Store,
  Power,
} from "lucide-react";
import { useState, useRef, useEffect, useCallback, memo, useMemo } from "react";
import { QRCodeCanvas } from "qrcode.react";
import axios from "axios";

// 🔑 Extracted + memoized TableCard component
const TableCard = memo(function TableCard({
  table,
  url,
  isCopied,
  onCopy,
  // onDownload,
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
              className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs ${
                isDisabled
                  ? "bg-amber-100 text-amber-700"
                  : "bg-slate-100 text-slate-700"
              }`}
            >
              T{tableNo}
            </div>
            <div>
              <span className="font-black text-slate-900 text-base block">
                Table {tableNo}
              </span>
              {isDisabled && (
                <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">
                  Disabled / Locked
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1">
            {/* Toggle Enable/Disable Button */}
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

export default function StoreSettings() {
  const { user } = useAuth();
  const [copied, setCopied] = useState(null);
  const [isAdding, setIsAdding] = useState(false); // 🔑 Double click / race condition rokne ke liye
  const qrRefs = useRef({});

  const [storeDetails, setStoreDetails] = useState({ name: "", logo: "" });
  const [tables, setTables] = useState([]);

  // Restaurant Profile Fetch
  useEffect(() => {
    axios
      .get(`${import.meta.env.VITE_APP_API_BASE}/restaurant/profile`, {
        withCredentials: true,
      })
      .then((res) => {
        if (res.data?.data) {
          setStoreDetails({
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
  }, []);

  // Backend se tables sync karein (localStorage fallback hata diya hai taaki stale data conflict na kare)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await axios.get(
          `${import.meta.env.VITE_APP_API_BASE}/tables/admin`,
          { withCredentials: true },
        );
        const backendTables = res.data?.data;
        if (!cancelled && Array.isArray(backendTables)) {
          const formatted = backendTables.map((t) =>
            typeof t === "string" ? { tableNumber: t, isDisabled: false } : t,
          );
          setTables(formatted);
        }
      } catch (err) {
        console.warn("Could not sync table list from backend:", err?.message);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // 🔑 Safe Restaurant ID extraction (default-store ka jhanjhat khatam)
  const activeRestaurantId = user?.restaurantId || user?._id;

  const downloadQRCode = useCallback((tableNo) => {
    const canvas = qrRefs.current[tableNo];
    if (!canvas) return;
    const pngUrl = canvas
      .toDataURL("image/png")
      .replace("image/png", "image/octet-stream");
    const downloadLink = document.createElement("a");
    downloadLink.href = pngUrl;
    downloadLink.download = `Table_${tableNo}_QR.png`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
  }, []);

  const printQRCode = useCallback(
    (tableNo) => {
      const canvas = qrRefs.current[tableNo];
      if (!canvas) return;
      const dataUrl = canvas.toDataURL("image/png");

      const restaurantName = storeDetails.name || "OUR RESTAURANT";

      // 🔑 Yahan relative logo path ko absolute URL mein convert kiya gaya hai
      let restaurantLogo = storeDetails.logo || "";
      if (restaurantLogo && restaurantLogo.startsWith("/")) {
        // Agar API base URL mein '/api' jaisa kuch hai, toh hum sirf origin (domain) nikal lenge
        try {
          const apiBase = import.meta.env.VITE_APP_API_BASE || "";
          const urlObj = new URL(apiBase);
          restaurantLogo = `${urlObj.origin}${restaurantLogo}`;
        } catch {
          // Fallback agar URL parse na ho
          restaurantLogo = `${window.location.origin}${restaurantLogo}`;
        }
      }

      const windowContent = `
      <html>
        <head>
          <title>Table ${tableNo} - ${restaurantName} Standee</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');
            body { 
              font-family: 'Plus Jakarta Sans', sans-serif; 
              display: flex; align-items: center; justify-content: center; 
              height: 100vh; margin: 0; background: #ffffff; 
              -webkit-print-color-adjust: exact; print-color-adjust: exact;
            }
            .standee-card { 
              width: 340px; background: linear-gradient(135deg, #FAF8F5 0%, #F3EFEA 100%);
              border: 1.5px solid #D4AF37; border-radius: 16px; padding: 32px 24px; 
              text-align: center; box-shadow: 0 12px 30px rgba(0,0,0,0.08); box-sizing: border-box;
            }
            .brand-container { display: flex; flex-direction: column; align-items: center; margin-bottom: 20px; }
            .logo-img { width: 52px; height: 52px; object-fit: contain; border-radius: 50%; border: 1px solid #D4AF37; padding: 2px; background: #fff; margin-bottom: 8px; }
            .brand-name { font-family: 'Cinzel', serif; font-size: 13px; font-weight: 700; letter-spacing: 2px; color: #2C2C2C; text-transform: uppercase; margin: 0; }
            .divider-gold { width: 40px; height: 1.5px; background-color: #D4AF37; margin: 10px auto 16px auto; }
            .qr-box { background: #ffffff; padding: 14px; border-radius: 12px; display: inline-block; border: 1px solid #E6E0D5; margin-bottom: 18px; }
            img.qr-image { width: 170px; height: 170px; display: block; }
            .scan-subtitle { font-size: 11px; font-weight: 600; color: #7A756D; text-transform: uppercase; letter-spacing: 2px; margin: 0 0 4px 0; }
            .menu-title { font-family: 'Cinzel', serif; color: #1A1A1A; margin: 0; font-size: 28px; font-weight: 800; letter-spacing: 1.5px; }
            .table-footer { margin-top: 20px; background: #1A1A1A; color: #F3EFEA; padding: 8px 16px; border-radius: 30px; display: inline-block; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; }
          </style>
        </head>
        <body>
          <div class="standee-card">
            <div class="brand-container">
              ${restaurantLogo ? `<img id="print-logo" src="${restaurantLogo}" class="logo-img" crossorigin="anonymous" />` : ""}
              <h2 class="brand-name">${restaurantName}</h2>
              <div class="divider-gold"></div>
            </div>
            <div class="qr-box">
              <img src="${dataUrl}" class="qr-image" />
            </div>
            <div class="scan-subtitle">Please Scan To View</div>
            <h1 class="menu-title">DIGITAL MENU</h1>
            <div class="table-footer">Table ${tableNo}</div>
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
    [storeDetails],
  );

  // 🔑 Fixed Add Table Handler (Prevents disabling all tables)
  const addTable = useCallback(() => {
    if (isAdding) return;
    setIsAdding(true);

    const maxNum = tables.reduce((max, t) => {
      const n = parseInt(t.tableNumber, 10);
      return Number.isNaN(n) ? max : Math.max(max, n);
    }, 0);
    const newTableNo = (maxNum + 1).toString();

    axios
      .post(
        `${import.meta.env.VITE_APP_API_BASE}/tables/admin`,
        { tableNumber: newTableNo },
        { withCredentials: true },
      )
      .then((res) => {
        if (res.data?.success && Array.isArray(res.data.data)) {
          const formatted = res.data.data.map((t) => {
            // Agar backend object bhej raha hai
            if (typeof t === "object" && t !== null) {
              const tableNum = t.tableNumber || t.number;
              // Check karein ki purani state mein ye table disabled thi kya, warna backend ke hisab se set karein
              const existingTable = tables.find(
                (item) => item.tableNumber === String(tableNum),
              );

              return {
                tableNumber: String(tableNum),
                // Agar backend explicitly isActive bhej raha hai toh use ulta karein (isActive false matlab disabled true)
                // Warna agar pehle se state thi toh wahi rakhein, nahi toh default false (enabled) rakhein
                isDisabled:
                  t.isActive !== undefined
                    ? !t.isActive
                    : existingTable
                      ? existingTable.isDisabled
                      : false,
              };
            }
            // Agar sirf string array aa rahi hai
            const existingTable = tables.find(
              (item) => item.tableNumber === String(t),
            );
            return {
              tableNumber: String(t),
              isDisabled: existingTable ? existingTable.isDisabled : false,
            };
          });
          setTables(formatted);
        }
      })
      .catch((err) => {
        const errorMsg = err?.response?.data?.message || err?.message;
        console.warn("Could not sync new table to backend:", errorMsg);
        alert(errorMsg);
      })
      .finally(() => {
        setIsAdding(false);
      });
  }, [tables, isAdding]);

  const removeTable = useCallback((tableNo) => {
    setTables((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((t) => t.tableNumber !== tableNo);
    });

    axios
      .delete(`${import.meta.env.VITE_APP_API_BASE}/tables/admin/${tableNo}`, {
        withCredentials: true,
      })
      .catch((err) =>
        console.warn("Could not sync table removal to backend:", err?.message),
      );
  }, []);

  const toggleTableStatus = useCallback((tableNo, newDisabledState) => {
    setTables((prev) =>
      prev.map((t) =>
        t.tableNumber === tableNo ? { ...t, isDisabled: newDisabledState } : t,
      ),
    );

    axios
      .patch(
        `${import.meta.env.VITE_APP_API_BASE}/tables/admin/${tableNo}/toggle`,
        { isDisabled: newDisabledState },
        { withCredentials: true },
      )
      .catch((err) => {
        console.warn(
          "Could not sync table toggle state to backend:",
          err?.message,
        );
      });
  }, []);

  // 🔑 Secured URL generator using valid activeRestaurantId
  const generateTableUrl = useCallback(
    (tableNo) => {
      if (!activeRestaurantId) return "";
      const token = btoa(`${activeRestaurantId}-TABLE-${tableNo}`);
      return `${window.location.origin}/catalog/${activeRestaurantId}?t=${token}`;
    },
    [activeRestaurantId],
  );

  const tableUrls = useMemo(() => {
    const map = {};
    tables.forEach((t) => {
      map[t.tableNumber] = generateTableUrl(t.tableNumber);
    });
    return map;
  }, [tables, generateTableUrl]);

  const handleCopyLink = useCallback(async (url, tableNo) => {
    if (!url) return;
    await navigator.clipboard.writeText(url);
    setCopied(tableNo);
    setTimeout(() => setCopied(null), 2000);
  }, []);

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-10 space-y-8 font-sans bg-[#F8F9FA] min-h-screen">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-red-50 text-red-600 rounded-2xl border border-red-100">
            <QrCode size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Store Settings & QR Engine
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Manage table-specific QR codes, download standees, and links.
            </p>
          </div>
        </div>

        <button
          onClick={addTable}
          disabled={isAdding || !activeRestaurantId}
          className="w-full sm:w-auto bg-gradient-to-r from-red-500 to-rose-600 text-white px-5 py-3 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 hover:opacity-95 shadow-sm shadow-red-500/20 transition-all cursor-pointer shrink-0 disabled:opacity-50"
        >
          <Plus size={16} /> {isAdding ? "Adding..." : "Add New Table"}
        </button>
      </div>

      {/* Info Stats Bar */}
      <div className="flex items-center justify-between px-2">
        <h3 className="font-black text-slate-800 text-base">Active Tables</h3>
        <span className="text-xs font-bold bg-white px-3 py-1 rounded-full border border-slate-200 text-slate-600 shadow-xs">
          {tables.length} Total Tables
        </span>
      </div>

      {/* Tables Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {tables.map((table) => (
          <TableCard
            key={table.tableNumber}
            table={table}
            url={tableUrls[table.tableNumber]}
            isCopied={copied === table.tableNumber}
            onCopy={handleCopyLink}
            onDownload={downloadQRCode}
            onPrint={printQRCode}
            onRemove={removeTable}
            onToggle={toggleTableStatus}
            canRemove={tables.length > 0}
            qrRef={(el) => (qrRefs.current[table.tableNumber] = el)}
          />
        ))}
      </div>
    </div>
  );
}
