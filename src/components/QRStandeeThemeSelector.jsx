import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Palette,
  Sparkles,
  WandSparkles,
} from "lucide-react";
import { QRCodeCanvas } from "qrcode.react";
import { useMemo, useRef } from "react";
import { QR_STANDEE_THEMES } from "./qrStandeeThemes";

// const DEMO_URL = "https://chotugtt.com";

function ThemePreview({
  theme,
  restaurantName,
  restaurantLogo,
  previewQrValue,
  previewTableNumber,
}) {
  const p = theme?.preview || {};

  const background = p.background || "#F8FAFC";
  const card = p.card || "#FFFFFF";
  const primary = p.primary || "#0F172A";
  const secondary = p.secondary || "#64748B";
  const accent = p.accent || "#0F172A";
  const qrBackground = p.qrBackground || "#FFFFFF";

  const border = p.border || "rgba(148,163,184,0.25)";
  const footer = p.footer || accent;
  const footerText = p.footerText || "#FFFFFF";
  const radius = p.radius || "22px";

  //   const initial =
  //     (restaurantName || "R").trim().charAt(0).toUpperCase();

  return (
    <div
      className="relative overflow-hidden rounded-[26px] border"
      style={{
        background,
        borderColor: border,
      }}
    >
      {/* Decorative background glow */}
      <div
        className="pointer-events-none absolute -right-16 -top-16 h-36 w-36 rounded-full blur-3xl opacity-20"
        style={{ background: accent }}
      />

      <div
        className="pointer-events-none absolute -bottom-16 -left-16 h-36 w-36 rounded-full blur-3xl opacity-10"
        style={{ background: accent }}
      />

      <div className="relative px-4 pb-5 pt-6 sm:px-6 sm:pb-6 sm:pt-7">
        {/* Mini browser-like label */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span
              className="h-2 w-2 rounded-full"
              style={{ background: accent }}
            />
            <span
              className="h-2 w-2 rounded-full opacity-40"
              style={{ background: accent }}
            />
            <span
              className="h-2 w-2 rounded-full opacity-20"
              style={{ background: accent }}
            />
          </div>

          <span
            className="rounded-full px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.12em]"
            style={{
              background: `${accent}18`,
              color: primary,
            }}
          >
            Preview
          </span>
        </div>

        {/* Standee */}
        <div
          className="mx-auto w-full max-w-[290px] overflow-hidden border shadow-2xl"
          style={{
            background: card,
            borderColor: border,
            borderRadius: radius,
          }}
        >
          {/* Accent */}
          <div className="h-1.5" style={{ background: accent }} />

          <div className="px-5 py-6 text-center">
            {/* Restaurant logo placeholder */}
            {/* Restaurant Logo */}
            <div
              className="mx-auto mb-3 flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl border bg-white shadow-sm"
              style={{
                borderColor: border,
              }}
            >
              {restaurantLogo ? (
                <img
                  src={restaurantLogo}
                  alt={restaurantName || "Restaurant logo"}
                  className="h-full w-full object-contain p-1.5"
                  loading="eager"
                  onError={(event) => {
                    event.currentTarget.style.display = "none";
                  }}
                />
              ) : (
                <div
                  className="flex h-full w-full items-center justify-center text-xs font-black"
                  style={{
                    background: accent,
                    color: footerText,
                  }}
                >
                  Logo
                </div>
              )}
            </div>

            {/* Restaurant name */}
            <p
              className="truncate text-sm font-extrabold"
              style={{ color: primary }}
            >
              {restaurantName || "Your Restaurant"}
            </p>

            {/* Tagline */}
            <p
              className="mt-1 text-[8px] font-bold uppercase tracking-[0.24em]"
              style={{ color: secondary }}
            >
              Digital Menu
            </p>

            {/* Decorative line */}
            <div className="mx-auto my-4 flex items-center justify-center gap-2">
              <span
                className="h-px w-7"
                style={{ background: `${accent}55` }}
              />

              <span
                className="h-1.5 w-1.5 rotate-45"
                style={{ background: accent }}
              />

              <span
                className="h-px w-7"
                style={{ background: `${accent}55` }}
              />
            </div>

            {/* QR */}
            <div
              className="mx-auto w-fit rounded-2xl border p-3 shadow-sm"
              style={{
                background: qrBackground,
                borderColor: border,
              }}
            >
              {previewQrValue ? (
                <QRCodeCanvas
                  value={previewQrValue}
                  size={150}
                  level="H"
                  marginSize={0}
                  bgColor={qrBackground}
                  fgColor="#111827"
                  title={`QR code for table ${previewTableNumber || ""}`}
                />
              ) : (
                <div className="flex h-[150px] w-[150px] items-center justify-center text-center">
                  <p
                    className="max-w-[120px] text-[9px] font-bold uppercase tracking-wider"
                    style={{ color: secondary }}
                  >
                    Add a table to preview its QR
                  </p>
                </div>
              )}
            </div>

            <p
              className="mt-4 text-[8px] font-bold uppercase tracking-[0.2em]"
              style={{ color: secondary }}
            >
              Scan to view menu
            </p>

            <p className="mt-2 text-xl font-black" style={{ color: primary }}>
              Order Here
            </p>

            <span
              className="mt-4 inline-flex rounded-full px-4 py-2 text-[9px] font-black uppercase tracking-[0.14em]"
              style={{
                background: footer,
                color: footerText,
              }}
            >
              Table {previewTableNumber || "Preview"}
            </span>

            <div
              className="mx-auto mt-5 h-px w-full opacity-40"
              style={{ background: border }}
            />

            <p
              className="mt-3 text-[8px] font-semibold"
              style={{ color: secondary }}
            >
              Powered by{" "}
              <span className="font-black" style={{ color: primary }}>
                ChotuGTT
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ThemeCard({
  theme,
  selected,
  restaurantName,
  restaurantLogo,
  previewQrValue,
  previewTableNumber,
  onSelect,
}) {
  return (
    <article
      className={[
        "group w-[310px] shrink-0 snap-start overflow-hidden rounded-[28px]",
        "border bg-white transition-all duration-300 sm:w-[350px]",
        selected
          ? "border-red-400 ring-4 ring-red-100 shadow-[0_20px_60px_-20px_rgba(239,68,68,0.35)]"
          : "border-slate-200 shadow-sm hover:-translate-y-1 hover:border-slate-300 hover:shadow-xl",
      ].join(" ")}
    >
      {/* Preview */}
      <div className="p-3 sm:p-4">
        <ThemePreview
          theme={theme}
          restaurantName={restaurantName}
          restaurantLogo={restaurantLogo}
          previewQrValue={previewQrValue}
          previewTableNumber={previewTableNumber}
        />
      </div>

      {/* Content */}
      <div className="px-5 pb-5 pt-1 sm:px-6 sm:pb-6">
        {/* Theme title row */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="truncate text-lg font-black tracking-tight text-slate-900">
                {theme.name}
              </h3>

              {theme.category && (
                <span className="hidden rounded-full bg-slate-100 px-2 py-1 text-[8px] font-black uppercase tracking-wider text-slate-500 sm:inline-flex">
                  {theme.category}
                </span>
              )}
            </div>

            <p className="mt-1 text-xs leading-5 text-slate-500">
              {theme.description}
            </p>
          </div>

          {selected && (
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-[9px] font-black uppercase tracking-wide text-emerald-700">
              <CheckCircle2 size={12} />
              Applied
            </span>
          )}
        </div>

        {/* Color palette */}
        <div className="mt-4 flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50/70 px-3 py-2.5">
          <div>
            <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">
              Color palette
            </p>
            <p className="mt-0.5 text-[10px] font-semibold text-slate-500">
              Restaurant-ready design
            </p>
          </div>

          <div className="flex -space-x-1.5">
            {[
              theme?.preview?.accent,
              theme?.preview?.primary,
              theme?.preview?.secondary,
              theme?.preview?.card,
            ]
              .filter(Boolean)
              .map((color, index) => (
                <span
                  key={`${theme.id}-${index}`}
                  className="h-6 w-6 rounded-full border-2 border-white shadow-sm"
                  style={{ background: color }}
                />
              ))}
          </div>
        </div>

        {/* Apply */}
        <button
          type="button"
          onClick={() => !selected && onSelect(theme.id)}
          disabled={selected}
          className={[
            "mt-4 flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3.5",
            "text-xs font-black transition-all duration-200",
            selected
              ? "cursor-default border border-emerald-200 bg-emerald-50 text-emerald-700"
              : "bg-slate-900 text-white shadow-sm hover:bg-slate-800 hover:shadow-md active:scale-[0.99]",
          ].join(" ")}
        >
          {selected ? (
            <>
              <Check size={15} strokeWidth={3} />
              Current Theme
            </>
          ) : (
            <>
              <Palette size={15} />
              Apply {theme.name}
              <ArrowRight
                size={14}
                className="transition-transform group-hover:translate-x-0.5"
              />
            </>
          )}
        </button>
      </div>
    </article>
  );
}

export default function QRStandeeThemeSelector({
  selectedTheme,
  restaurantName,
  restaurantLogo,
  previewQrValue,
  previewTableNumber,
  onSelect,
  onBack,
}) {
  const sliderRef = useRef(null);

  const currentTheme = useMemo(
    () =>
      QR_STANDEE_THEMES.find((theme) => theme.id === selectedTheme) ||
      QR_STANDEE_THEMES[0],
    [selectedTheme],
  );

  const scrollSlider = (direction) => {
    if (!sliderRef.current) return;

    const amount =
      direction === "next"
        ? sliderRef.current.clientWidth * 0.72
        : -sliderRef.current.clientWidth * 0.72;

    sliderRef.current.scrollBy({
      left: amount,
      behavior: "smooth",
    });
  };

  return (
    <div className="min-h-screen bg-[#F7F8FA] text-slate-900">
      {/* ===================================================== */}
      {/* HEADER */}
      {/* ===================================================== */}

      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-4 px-4 py-3.5 sm:px-6 lg:px-8">
          {/* Left */}
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={onBack}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
              aria-label="Back to Table Monitor"
            >
              <ArrowLeft size={18} />
            </button>

            <div className="flex min-w-0 items-center gap-3">
              <div className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600 sm:flex">
                <Palette size={19} />
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="truncate text-sm font-black tracking-tight text-slate-900 sm:text-base">
                    QR Standee Designer
                  </h1>

                  <span className="hidden rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[8px] font-black uppercase tracking-wider text-emerald-700 sm:inline-flex">
                    Live
                  </span>
                </div>

                <p className="truncate text-[10px] text-slate-500 sm:text-xs">
                  Customize your table QR standee design
                </p>
              </div>
            </div>
          </div>

          {/* Right */}
          <div className="hidden items-center gap-3 sm:flex">
            <div className="text-right">
              <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">
                Current design
              </p>

              <p className="text-xs font-black text-slate-800">
                {currentTheme?.name || "Classic"}
              </p>
            </div>

            <div
              className="flex h-9 w-9 items-center justify-center rounded-xl border"
              style={{
                background: currentTheme?.preview?.accent || "#0F172A",
                borderColor: currentTheme?.preview?.accent || "#0F172A",
              }}
            >
              <Check
                size={16}
                color={currentTheme?.preview?.footerText || "#FFFFFF"}
                strokeWidth={3}
              />
            </div>
          </div>
        </div>
      </header>

      {/* ===================================================== */}
      {/* MAIN */}
      {/* ===================================================== */}

      <main className="mx-auto max-w-[1400px] px-4 pb-12 pt-6 sm:px-6 sm:pb-16 sm:pt-8 lg:px-8 lg:pt-10">
        {/* ================================================= */}
        {/* HERO */}
        {/* ================================================= */}

        <section className="relative overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-sm">
          {/* Background decoration */}
          <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-red-100/50 blur-3xl" />

          <div className="pointer-events-none absolute -bottom-28 -left-24 h-72 w-72 rounded-full bg-slate-100 blur-3xl" />

          <div className="relative grid gap-8 p-6 sm:p-8 lg:grid-cols-[1fr_auto] lg:items-center lg:p-10">
            <div>
              {/* Eyebrow */}
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-red-100 bg-red-50 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.16em] text-red-600">
                <Sparkles size={12} />
                Standee Designer
              </div>

              <h2 className="max-w-2xl text-3xl font-black tracking-[-0.04em] text-slate-950 sm:text-4xl lg:text-5xl">
                Give every table a
                <span className="text-red-500"> better first impression.</span>
              </h2>

              <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-500 sm:text-[15px]">
                Choose a professionally designed QR standee style for your
                restaurant. Preview the complete layout before printing and
                apply your preferred design instantly.
              </p>

              {/* Features */}
              <div className="mt-6 flex flex-wrap gap-2">
                {[
                  "Live preview",
                  "Print-ready",
                  "8 professional designs",
                  "Saved automatically",
                ].map((item) => (
                  <span
                    key={item}
                    className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[10px] font-bold text-slate-600"
                  >
                    <Check
                      size={11}
                      className="text-emerald-500"
                      strokeWidth={3}
                    />
                    {item}
                  </span>
                ))}
              </div>
            </div>

            {/* Current theme card */}
            <div className="w-full lg:w-[300px]">
              <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">
                      Currently applied
                    </p>

                    <p className="mt-1 text-base font-black text-slate-900">
                      {currentTheme?.name || "Classic"}
                    </p>
                  </div>

                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
                    <CheckCircle2 size={19} />
                  </div>
                </div>

                <div
                  className="h-2 rounded-full"
                  style={{
                    background: currentTheme?.preview?.accent || "#0F172A",
                  }}
                />

                <p className="mt-3 text-[10px] leading-5 text-slate-500">
                  This design will be used automatically when you print a table
                  standee.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ================================================= */}
        {/* THEME HEADER */}
        {/* ================================================= */}

        <section className="mt-8">
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-red-500">
                Choose your style
              </p>

              <h3 className="mt-1 text-xl font-black tracking-tight text-slate-900 sm:text-2xl">
                Explore standee themes
              </h3>

              <p className="mt-1 text-xs text-slate-500">
                Select a design that matches your restaurant.
              </p>
            </div>

            {/* Slider controls */}
            <div className="hidden items-center gap-2 sm:flex">
              <button
                type="button"
                onClick={() => scrollSlider("prev")}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
                aria-label="Previous themes"
              >
                <ChevronLeft size={18} />
              </button>

              <button
                type="button"
                onClick={() => scrollSlider("next")}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
                aria-label="Next themes"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>

          {/* ================================================= */}
          {/* SLIDER */}
          {/* ================================================= */}

          <div
            ref={sliderRef}
            className="flex snap-x snap-mandatory gap-5 overflow-x-auto scroll-smooth overscroll-x-contain pb-5 pr-2"
            style={{
              scrollbarWidth: "thin",
            }}
          >
            {QR_STANDEE_THEMES.map((theme) => (
              <ThemeCard
                key={theme.id}
                theme={theme}
                selected={selectedTheme === theme.id}
                restaurantName={restaurantName}
                restaurantLogo={restaurantLogo}
                previewQrValue={previewQrValue}
                previewTableNumber={previewTableNumber}
                onSelect={onSelect}
              />
            ))}
          </div>

          {/* Slider hint */}
          <div className="mt-1 flex items-center justify-center gap-2 text-[10px] font-semibold text-slate-400 sm:hidden">
            <ChevronLeft size={13} />
            Swipe to explore
            <ChevronRight size={13} />
          </div>
        </section>

        {/* ================================================= */}
        {/* BOTTOM INFO */}
        {/* ================================================= */}

        <section className="mt-8 overflow-hidden rounded-[26px] border border-slate-200 bg-white">
          <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                <WandSparkles size={17} />
              </div>

              <div>
                <p className="text-sm font-black text-slate-900">
                  Ready to print?
                </p>

                <p className="mt-1 max-w-xl text-xs leading-5 text-slate-500">
                  Your selected theme is automatically used for future QR
                  standee prints. You can change the design anytime.
                </p>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2">
              <CheckCircle2 size={15} className="text-emerald-600" />

              <span className="text-[10px] font-black text-emerald-700">
                {currentTheme?.name || "Classic"} selected
              </span>
            </div>
          </div>
        </section>

        {/* Footer note */}
        <p className="mt-6 text-center text-[10px] leading-5 text-slate-400">
          Theme selection is saved on this device and will be used automatically
          for QR standee printing.
        </p>
      </main>
    </div>
  );
}
