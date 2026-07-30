import { useAuth } from "../../context/AuthContext";
import {
  Download,
  Printer,
  Copy,
  CheckCircle,
  Plus,
  Trash2,
  QrCode,
  Store,
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
  onDownload,
  onPrint,
  onRemove,
  onToggle,
  canRemove,
  qrRef,
}) {
  const tableNo = table.tableNumber;
  const isDisabled = table.isDisabled;

  return (
    <div className={`bg-white p-6 rounded-3xl border transition-all space-y-5 group flex flex-col justify-between ${
      isDisabled ? "border-amber-300 bg-amber-50/20 opacity-75" : "border-slate-200/80 shadow-xs hover:border-slate-300"
    }`}>
      <div>
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs ${
              isDisabled ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-700"
            }`}>
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

        <div className={`flex justify-center p-6 rounded-2xl border transition-colors ${
          isDisabled ? "bg-amber-50/50 border-amber-100 grayscale-[30%]" : "bg-slate-50/80 border-slate-100 group-hover:bg-slate-50"
        }`}>
          <QRCodeCanvas
            ref={qrRef}
            value={url}
            size={150}
            level={"H"}
            className="w-full max-w-[140px] h-auto shadow-xs rounded-lg"
          />
        </div>
      </div>

      <div className="space-y-2.5">
        <button
          onClick={() => onCopy(url, tableNo)}
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
  const qrRefs = useRef({});

  const [tables, setTables] = useState(() => {
    const saved = localStorage.getItem(`tables_${user?.restaurantId}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Ensure backward compatibility if old localStorage had plain strings
        return parsed.map(t => typeof t === 'string' ? { tableNumber: t, isDisabled: false } : t);
      } catch (e) {
        return [{ tableNumber: "1", isDisabled: false }];
      }
    }
    return [{ tableNumber: "1", isDisabled: false }];
  });

  const targetRestaurantId = user?.restaurantId || user?._id || "default-store";

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await axios.get(
          `${import.meta.env.VITE_APP_API_BASE}/tables/admin`,
          { withCredentials: true },
        );
        const backendTables = res.data?.data;
        if (!cancelled && Array.isArray(backendTables) && backendTables.length > 0) {
          // Format ensure karna ki objects hi hon
          const formatted = backendTables.map(t => 
            typeof t === 'string' ? { tableNumber: t, isDisabled: false } : t
          );
          setTables(formatted);
        }
      } catch (err) {
        console.warn("Could not sync table list from backend, using local cache:", err?.message);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    localStorage.setItem(
      `tables_${user?.restaurantId}`,
      JSON.stringify(tables),
    );
  }, [tables, user?.restaurantId]);

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

  const printQRCode = useCallback((tableNo) => {
    const canvas = qrRefs.current[tableNo];
    if (!canvas) return;
    const dataUrl = canvas.toDataURL("image/png");

    const windowContent = `
      <html>
        <head>
          <title>Table ${tableNo} Standee</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@700&family=Playfair+Display:ital,wght@1,600&family=Inter:wght@400;600&display=swap');
            
            body { 
              font-family: 'Inter', sans-serif; 
              display: flex; 
              align-items: center; 
              justify-content: center; 
              height: 100vh; 
              margin: 0; 
              background: #fff; 
              -webkit-print-color-adjust: exact;
            }
            .standee { 
              width: 320px; 
              background-color: #F4E4BC; 
              border: 1px solid #d4c39c;
              border-radius: 8px; 
              padding: 30px 20px; 
              text-align: center; 
              box-shadow: 0 10px 25px rgba(0,0,0,0.1);
              box-sizing: border-box;
            }
            .ornament-top {
              margin-bottom: 20px;
              color: #111;
            }
            .ornament-top svg {
              width: 140px;
              height: auto;
              display: inline-block;
            }
            .qr-box { 
              background: #ffffff; 
              padding: 16px; 
              border-radius: 4px; 
              display: inline-block; 
              margin-bottom: 20px; 
              box-shadow: 0 2px 8px rgba(0,0,0,0.05);
            }
            img { 
              width: 180px; 
              height: 180px; 
              display: block; 
            }
            .scan-text {
              font-size: 14px;
              font-family: 'Inter', sans-serif;
              font-weight: 600;
              color: #222;
              margin: 0 0 4px 0;
              letter-spacing: 0.5px;
            }
            .menu-title { 
              font-family: 'Cinzel', serif;
              color: #111; 
              margin: 0; 
              font-size: 32px; 
              font-weight: 700; 
              letter-spacing: 1px;
              line-height: 1.1;
            }
            .divider {
              width: 80%;
              height: 2px;
              background-color: #111;
              margin: 16px auto 0 auto;
            }
            .table-badge {
              margin-top: 15px;
              font-size: 11px;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 1.5px;
              color: #555;
            }
          </style>
        </head>
        <body>
          <div class="standee">
            <div class="ornament-top">
              <svg viewBox="0 0 200 30" fill="currentColor">
                <path d="M100,0 C80,15 60,5 40,15 C20,25 10,15 0,20 L0,22 C15,18 25,28 45,18 C65,8 85,18 100,5 C115,18 135,8 155,18 C175,28 185,18 200,22 L200,20 C190,15 180,25 160,15 C140,5 120,15 100,0 Z"></path>
                <circle cx="100" cy="12" r="3"></circle>
              </svg>
            </div>
            <div class="qr-box">
              <img src="${dataUrl}" />
            </div>
            <div class="scan-text">Scan to view our</div>
            <h1 class="menu-title">MENU</h1>
            <div class="divider"></div>
            <div class="table-badge">Table ${tableNo}</div>
          </div>
        </body>
      </html>`;

    const printWindow = window.open("", "_blank");
    printWindow.document.open();
    printWindow.document.write(windowContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  }, []);

  const addTable = useCallback(() => {
    setTables((prev) => {
      const maxNum = prev.reduce((max, t) => {
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
        .catch((err) =>
          console.warn("Could not sync new table to backend:", err?.message),
        );

      return [...prev, { tableNumber: newTableNo, isDisabled: false }];
    });
  }, []);

  const removeTable = useCallback((tableNo) => {
    setTables((prev) => {
      if (prev.length <= 1) return prev;

      axios
        .delete(
          `${import.meta.env.VITE_APP_API_BASE}/tables/admin/${tableNo}`,
          { withCredentials: true },
        )
        .catch((err) =>
          console.warn("Could not sync table removal to backend:", err?.message),
        );

      return prev.filter((t) => t.tableNumber !== tableNo);
    });
  }, []);

  // 🚀 Toggle Table Enable/Disable Handler
  const toggleTableStatus = useCallback((tableNo, newDisabledState) => {
    setTables((prev) =>
      prev.map((t) =>
        t.tableNumber === tableNo ? { ...t, isDisabled: newDisabledState } : t
      )
    );

    axios
      .patch(
        `${import.meta.env.VITE_APP_API_BASE}/tables/admin/${tableNo}/toggle`,
        { isDisabled: newDisabledState },
        { withCredentials: true },
      )
      .catch((err) => {
        console.warn("Could not sync table toggle state to backend:", err?.message);
        // Rollback on failure agar zaroorat ho
      });
  }, []);

  const generateTableUrl = useCallback(
    (tableNo) => {
      const token = btoa(`${user?.restaurantId}-TABLE-${tableNo}`);
      return `${window.location.origin}/catalog/${targetRestaurantId}?t=${token}`;
    },
    [user?.restaurantId, targetRestaurantId],
  );

  const tableUrls = useMemo(() => {
    const map = {};
    tables.forEach((t) => {
      map[t.tableNumber] = generateTableUrl(t.tableNumber);
    });
    return map;
  }, [tables, generateTableUrl]);

  const handleCopyLink = useCallback(async (url, tableNo) => {
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
          className="w-full sm:w-auto bg-gradient-to-r from-red-500 to-rose-600 text-white px-5 py-3 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 hover:opacity-95 shadow-sm shadow-red-500/20 transition-all cursor-pointer shrink-0"
        >
          <Plus size={16} /> Add New Table
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
            canRemove={tables.length > 1}
            qrRef={(el) => (qrRefs.current[table.tableNumber] = el)}
          />
        ))}
      </div>
    </div>
  );
}