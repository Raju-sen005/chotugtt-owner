export default function Input({ label, error, className = "", ...props }) {
  return (
    <div className="w-full space-y-1">
      {label && (
        <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
          {label}
        </label>
      )}
      <input
        className={`gtt-input w-full px-4 py-2.5 text-sm transition-all placeholder:text-[var(--text-disabled)] ${
          error
            ? "border-[var(--danger)] focus:border-[var(--danger)] focus:ring-[rgba(239,68,68,0.12)]"
            : ""
        } ${className}`}
        {...props}
      />
      {error && (
        <p className="text-xs font-medium text-[var(--danger)]">{error}</p>
      )}
    </div>
  );
}
