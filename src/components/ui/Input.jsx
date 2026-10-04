export default function Input({ label, error, className = "", ...props }) {
  return (
    <div className="w-full space-y-1">
      {label && (
        <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
          {label}
        </label>
      )}
      <input
        className={`w-full rounded-xl border border-[var(--border)] bg-white px-4 py-2.5 text-sm text-[var(--text-primary)] transition-all placeholder:text-[var(--text-disabled)] focus:border-[var(--primary)] focus:outline-none focus:ring-4 focus:ring-[rgba(244,63,94,0.12)] ${
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
