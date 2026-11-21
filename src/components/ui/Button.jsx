export default function Button({ children, variant = "primary", className = "", ...props }) {
  const baseStyle =
    "inline-flex items-center justify-center gap-2 px-4 min-h-12 rounded-[14px] text-sm font-semibold font-sans transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--focus-ring)]";
  const variants = {
    primary:
      "gtt-gradient-brand text-white shadow-[0_4px_14px_rgba(255,49,90,0.22)] hover:brightness-[0.97] active:scale-[0.99]",
    secondary:
      "bg-[var(--surface)] text-[var(--text-primary)] border border-[var(--border)] shadow-sm hover:bg-[var(--surface-muted)] hover:border-[var(--border-strong)]",
    tertiary:
      "bg-transparent text-[var(--text-secondary)] shadow-none hover:bg-[var(--hover-bg)] hover:text-[var(--primary-dark)]",
    danger: "bg-[var(--danger)] text-white hover:brightness-95 shadow-sm",
    outline:
      "border border-[var(--border)] bg-transparent text-[var(--text-secondary)] shadow-none hover:bg-[var(--surface-muted)]",
  };

  return (
    <button className={`${baseStyle} ${variants[variant] || variants.primary} ${className}`} {...props}>
      {children}
    </button>
  );
}
