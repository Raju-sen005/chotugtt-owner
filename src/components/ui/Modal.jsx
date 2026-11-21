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
    <div className="fixed inset-0 bg-[var(--brand-navy)]/55 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div
        className={`bg-[var(--surface)] rounded-[18px] w-full shadow-[var(--shadow-card)] border border-[var(--border)] flex flex-col max-h-[90vh] animate-fade-in ${panelClassName}`}
      >
        <div className="p-5 border-b border-[var(--border)] flex justify-between items-center">
          <h3 className="font-display font-bold text-[var(--brand-navy)] text-base">{title}</h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-[14px] text-[var(--text-muted)] hover:bg-[var(--hover-bg)] hover:text-[var(--text-primary)] transition-all cursor-pointer"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {children}
        </div>
      </div>
    </div>
  );
}
