// import { ChefHat } from "lucide-react";

export const authInputClass =
  "w-full rounded-xl border border-[var(--border)] bg-white px-3.5 py-3 text-sm font-medium text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-disabled)] focus:border-[var(--primary)] focus:ring-4 focus:ring-[rgba(244,63,94,0.12)]";

export function AuthField({ label, hint, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-[var(--text-secondary)]">
        {label}
      </span>
      {children}
      {hint ? (
        <span className="mt-1 block text-xs text-[var(--text-muted)]">{hint}</span>
      ) : null}
    </label>
  );
}

export default function AuthShell({
  title,
  subtitle,
  children,
  footer,
  panelTitle,
  panelPoints = [],
  wide = false,
}) {
  return (
    <div className="min-h-dvh bg-[var(--background)] font-sans lg:grid lg:grid-cols-12">
      <aside className="relative overflow-hidden bg-slate-950 text-white lg:col-span-5 lg:flex lg:min-h-dvh lg:flex-col lg:justify-between">
        <div className="pointer-events-none absolute inset-0 gtt-gradient-brand opacity-90" />
        <div className="pointer-events-none absolute -right-16 top-8 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-0 h-40 w-40 rounded-full bg-[var(--secondary)]/20 blur-3xl" />

        <div className="relative px-5 py-4 sm:px-8 lg:px-10 lg:pt-12">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-[var(--primary)] shadow-sm">
              {/* <ChefHat size={22} strokeWidth={2.25} /> */}
              <img
                src="/ChotuGTT__1_-removebg-preview.png"
                alt="ChotuGTT Logo"
                className="h-6 w-6"
              />
            </span>
            <div className="leading-tight">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/70">
                Restaurant
              </p>
              <p className="text-lg font-black tracking-tight">
                Chotu<span className="text-white">GTT</span>
              </p>
            </div>
          </div>

          <div className="mt-12 hidden max-w-sm lg:block">
            <h2 className="text-3xl font-black leading-tight">{panelTitle}</h2>
            <ul className="mt-6 space-y-3">
              {panelPoints.map((point) => (
                <li
                  key={point}
                  className="flex items-start gap-3 text-sm text-white/80"
                >
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-white" />
                  {point}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <p className="relative hidden px-10 pb-10 text-xs text-white/55 lg:block">
          Menu, orders, and billing for your restaurant.
        </p>
      </aside>

      <main className="flex items-start justify-center px-4 py-6 sm:px-6 lg:col-span-7 lg:items-center lg:py-10">
        <div className={`mx-auto w-full ${wide ? "max-w-xl" : "max-w-md"}`}>
          <div className="rounded-3xl border border-[var(--border)] bg-white p-5 shadow-[var(--shadow-card)] sm:p-8">
            <h1 className="text-2xl font-black tracking-tight text-[var(--text-primary)]">
              {title}
            </h1>
            {subtitle ? (
              <p className="mt-1 text-sm leading-relaxed text-[var(--text-muted)]">
                {subtitle}
              </p>
            ) : null}
            <div className="mt-6">{children}</div>
          </div>
          {footer ? (
            <div className="mt-4 text-center text-sm text-[var(--text-muted)]">
              {footer}
            </div>
          ) : null}
        </div>
      </main>
    </div>
  );
}
