import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import Card from '../../components/ui/Card';
import { Utensils, CheckCircle2, XCircle, Clock } from 'lucide-react';

export default function OrderTracker({ order }) {
  const [liveStatus, setLiveStatus] = useState(order.status);
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => {
    const socket = io(import.meta.env.VITE_APP_API_BASE, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
      reconnection: true,
    });

    const matchesOrder = (data) => {
      const incoming = String(data?._id || data?.id || '');
      return incoming && incoming === String(order._id);
    };

    socket.on('connect', () => {
      socket.emit('join_order_tracker', order._id);
    });

    socket.on('ORDER_STATUS_UPDATED', (data) => {
      if (!matchesOrder(data)) return;
      if (data?.status) setLiveStatus(data.status);
      if (data?.rejectReason) setRejectReason(data.rejectReason);
    });

    return () => {
      socket.disconnect();
    };
  }, [order._id]);

  const statusConfigs = {
    PENDING: { label: 'Sent to Kitchen', desc: 'Waiting for restaurant confirmation', color: 'text-amber-500', bg: 'bg-amber-50', icon: <Clock className="animate-spin" size={32} /> },
    ACCEPTED: { label: 'Preparing Food', desc: 'Chef is preparing your order now', color: 'text-indigo-600', bg: 'bg-indigo-50', icon: <Utensils className="animate-bounce" size={32} /> },
    COMPLETED: { label: 'Ready / Served', desc: 'Enjoy your fresh meal!', color: 'text-emerald-600', bg: 'bg-emerald-50', icon: <CheckCircle2 size={32} /> },
    REJECTED: { label: 'Order Cancelled', desc: rejectReason || 'Kitchen overloaded or item out of stock', color: 'text-rose-600', bg: 'bg-rose-50', icon: <XCircle size={32} /> }
  };

  const config = statusConfigs[liveStatus] || statusConfigs.PENDING;

  return (
    <div className="max-w-md mx-auto bg-slate-50 min-h-screen p-4 flex flex-col justify-center">
      <Card className="text-center space-y-6 p-8">
        <div className="space-y-1">
          <span className="font-mono text-xs text-slate-400 font-bold uppercase tracking-wider">Tracking Reference</span>
          <h2 className="text-xl font-black text-slate-800">{order.orderId}</h2>
        </div>

        <div className={`p-8 rounded-2xl ${config.bg} ${config.color} flex flex-col items-center gap-3 transition-all duration-500`}>
          {config.icon}
          <h4 className="font-extrabold text-lg tracking-tight">{config.label}</h4>
          <p className="text-xs opacity-80 font-medium max-w-[200px] mx-auto">{config.desc}</p>
        </div>

        <div className="border-t border-slate-100 pt-4 space-y-2 text-left text-xs font-semibold text-slate-600">
          <div className="flex justify-between"><span>Customer Name:</span> <span className="text-slate-900">{order.customerName}</span></div>
          <div className="flex justify-between"><span>Total Cart Value:</span> <span className="text-slate-900 font-bold">₹{order.total}</span></div>
        </div>
      </Card>
    </div>
  );
}
