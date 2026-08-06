import { X, Printer, Phone, User, MapPin, AlertCircle } from "lucide-react";

export default function OrderDetailsModal({ order, onClose }) {
  if (!order) return null;

  const handlePrint = () => {
    window.print(); // Yeh browser ka print dialog khol dega
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 transition-all">
      {/* Printable Area */}
      <div
        id="printable-section"
        className="bg-white rounded-3xl w-full max-w-md p-6 space-y-5 shadow-2xl border border-slate-100 transform transition-all"
      >
        {/* Header Section */}
        <div className="flex justify-between items-start border-b border-slate-100 pb-4">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Kitchen Order Ticket
            </span>
            <h2 className="text-xl font-black text-slate-900 tracking-tight">
              {order.orderId}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {/* {getStatusBadge(order.status)} */}
            <button
              onClick={onClose}
              className="no-print p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Customer & Table Info Card */}
        <div className="bg-slate-50 rounded-2xl p-3.5 space-y-2.5 text-xs text-slate-600 border border-slate-100/80">
          {/* <div className="flex justify-between items-center">
            <span className="font-semibold text-slate-500">Order Type:</span>
            <span className="font-bold text-slate-800 px-2 py-0.5 bg-white rounded-md border border-slate-200">
              {order.orderType || "DINE_IN"}
            </span>
          </div> */}
          <div className="flex justify-between items-center">
            <span className="font-semibold text-slate-500">Table Number:</span>
            <span className="font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md">
              {order.tableNumber}
            </span>
          </div>
          <div className="flex items-center gap-2 pt-1 border-t border-slate-200/60 font-medium text-slate-800">
            <User size={14} className="text-slate-400 shrink-0" />
            <span className="truncate">{order.customerName}</span>
          </div>
          <div className="flex items-center gap-2 font-medium text-slate-800">
            <Phone size={14} className="text-slate-400 shrink-0" />
            <span>{order.customerPhone}</span>
          </div>
          {order.deliveryAddress && (
            <div className="flex items-start gap-2 font-medium text-slate-800 pt-1">
              <MapPin size={14} className="text-slate-400 shrink-0 mt-0.5" />
              <span className="leading-tight">{order.deliveryAddress}</span>
            </div>
          )}
        </div>

        {/* Rejection Reason Alert (agar order reject hua ho) */}
        {order.status === "REJECTED" && order.rejectReason && (
          <div className="bg-rose-50 border border-rose-100 rounded-xl p-3 flex items-start gap-2.5 text-rose-700 text-xs">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block">Rejection Reason:</span>
              <p>{order.rejectReason}</p>
            </div>
          </div>
        )}

        {/* Items Table */}
        <div className="space-y-3">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Ordered Items
          </p>
          <div className="max-h-48 overflow-y-auto space-y-2 pr-1 divide-y divide-slate-50">
            {order.items
              .filter((item) => item.status !== "REJECTED")
              .map((item, idx) => (
                <div
                  key={idx}
                  className="flex justify-between items-center pt-2 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-bold bg-slate-100 text-slate-800 w-6 h-6 rounded-lg flex items-center justify-center text-[11px]">
                      {item.quantity}
                    </span>
                    <span className="font-semibold text-slate-700">
                      {item.name}
                    </span>
                  </div>
                  <span className="font-bold text-slate-900">
                    ₹{item.price * item.quantity}
                  </span>
                </div>
              ))}
          </div>
        </div>

        {/* Bill Summary */}
        <div className="border-t border-dashed border-slate-200 pt-3 space-y-1.5 text-xs">
          {/* {order.subtotal && (
            <div className="flex justify-between text-slate-500">
              <span>Subtotal</span>
              <span>₹{order.subtotal}</span>
            </div>
          )}
          {order.tax > 0 && (
            <div className="flex justify-between text-slate-500">
              <span>Tax / Charges</span>
              <span>₹{order.tax}</span>
            </div>
          )} */}
          {order.discount > 0 && (
            <div className="flex justify-between text-emerald-600 font-semibold">
              <span>Offer Discount</span>
              <span>-₹{order.discount.toFixed(2)}</span>
            </div>
          )}

          {order.tax > 0 && (
            <div className="flex justify-between text-slate-500">
              <span>Tax</span>
              <span>₹{order.tax.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between text-sm font-black text-slate-900 pt-2 border-t border-slate-100">
            <span>Total Amount</span>
            <span className="text-rose-600 text-base">₹{order.total}</span>
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={handlePrint}
          className="no-print w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-slate-900/10 transition-all active:scale-[0.98]"
        >
          <Printer size={16} /> Print Kitchen Ticket (KOT)
        </button>
      </div>
    </div>
  );
}
