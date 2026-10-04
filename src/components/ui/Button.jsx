export default function Button({ children, variant = "primary", className = "", ...props }) {
  const baseStyle =
    "px-4 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed";
  const variants = {
    primary:
      "bg-[var(--primary)] text-white hover:bg-[var(--primary-dark)] shadow-[0_4px_14px_rgba(244,63,94,0.18)]",
    secondary: "bg-[var(--surface-muted)] text-[var(--text-secondary)] hover:bg-[var(--border)]",
    danger: "bg-[var(--danger)] text-white hover:brightness-95",
    outline:
      "border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--surface-muted)]",
  };

  return (
    <button className={`${baseStyle} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}
