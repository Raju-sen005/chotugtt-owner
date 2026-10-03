import { X } from 'lucide-react';

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  panelClassName = "max-w-md",
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div
        className={`bg-white rounded-2xl w-full shadow-2xl border border-slate-100 flex flex-col max-h-[90vh] animate-fade-in ${panelClassName}`}
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex justify-between items-center">
          <h3 className="font-extrabold text-slate-900 text-base">{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-all cursor-pointer">
            <X size={18} />
          </button>
        </div>
        {/* Content Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {children}
        </div>
      </div>
    </div>
  );
}