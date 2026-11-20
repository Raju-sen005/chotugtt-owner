import { Check, Sparkles } from "lucide-react";
import {
  CHANNEL_MANAGER_COMING_SOON,
  COMMERCIAL_CATEGORIES,
  getFoundationPlansByCategory,
  mergeServerPlanWithCopy,
} from "./commercialCatalog";

const formatPrice = (amount) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(amount) || 0);

/**
 * Professional SaaS pricing catalog: Restaurant / Hotel / Resort.
 * Amounts always come from the server plan DTO; copy from commercialCatalog.
 */
export default function CommercialCatalogPreview({
  serverPlans = [],
  activeCategory = "RESTAURANT",
  onCategoryChange,
  onSelectPlan,
  ctaLabel = "Get Started",
  busyPlan = null,
  className = "",
  showHero = true,
  footnote = null,
  /** When true, only the activeCategory tab is shown (tenant-scoped renewal). */
  lockCategory = false,
}) {
  const byCode = new Map(
    (Array.isArray(serverPlans) ? serverPlans : [])
      .map((plan) => mergeServerPlanWithCopy(plan))
      .filter(Boolean)
      .map((plan) => [plan.code, plan]),
  );

  const categories = COMMERCIAL_CATEGORIES.map((category) => ({
    ...category,
    plans: getFoundationPlansByCategory(category.id)
      .map((meta) => byCode.get(meta.code))
      .filter(Boolean),
  })).filter((category) =>
    lockCategory ? category.id === activeCategory : true,
  );

  const visible =
    categories.find((c) => c.id === activeCategory) || categories[0];

  const featuredCode =
    visible.id === "RESTAURANT"
      ? "RESTAURANT_GROWTH"
      : visible.id === "HOTEL"
        ? "HOTEL_STARTER"
        : "RESORT_RESTAURANT_GROWTH_HOTEL_STARTER";

  return (
    <section
      className={`mx-auto w-full max-w-6xl ${className}`}
      aria-labelledby="commercial-catalog-heading"
    >
      {showHero ? (
        <div className="mx-auto mb-10 max-w-3xl text-center">
          <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-600 shadow-sm">
            <Sparkles size={13} className="text-rose-600" />
            Annual plans
          </p>
          <h2
            id="commercial-catalog-heading"
            className="text-3xl font-black tracking-tight text-slate-950 sm:text-4xl"
          >
            Choose the Right Plan for Your Business
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
            Transserve helps you manage restaurant, hotel, and resort operations
            from one platform. All paid plans are billed annually in INR.
          </p>
        </div>
      ) : (
        <h2 id="commercial-catalog-heading" className="sr-only">
          Choose the Right Plan for Your Business
        </h2>
      )}

      {!lockCategory ? (
        <div
          role="tablist"
          aria-label="Business category"
          className="mx-auto mb-8 flex w-full max-w-xl rounded-2xl border border-slate-200 bg-slate-100/80 p-1.5"
        >
          {categories.map((category) => {
            const selected = visible?.id === category.id;
            return (
              <button
                key={category.id}
                type="button"
                role="tab"
                aria-selected={selected}
                tabIndex={selected ? 0 : -1}
                onClick={() => onCategoryChange?.(category.id)}
                onKeyDown={(event) => {
                  if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") {
                    return;
                  }
                  event.preventDefault();
                  const idx = categories.findIndex((c) => c.id === category.id);
                  const next =
                    event.key === "ArrowRight"
                      ? categories[(idx + 1) % categories.length]
                      : categories[(idx - 1 + categories.length) % categories.length];
                  onCategoryChange?.(next.id);
                }}
                className={`flex-1 rounded-xl px-3 py-2.5 text-sm font-bold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 ${
                  selected
                    ? "bg-white text-slate-950 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {category.title}
              </button>
            );
          })}
        </div>
      ) : (
        <div className="mx-auto mb-8 max-w-xl text-center">
          <p className="inline-flex rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-700 shadow-sm">
            {visible?.title || activeCategory} plans
          </p>
        </div>
      )}

      <p className="mb-6 text-center text-sm text-slate-500">
        {visible.subtitle}
        {visible.id === "RESORT"
          ? " All six restaurant × hotel combinations are listed below."
          : null}
      </p>

      <div
        className={`grid gap-5 ${
          visible.plans.length >= 4
            ? "md:grid-cols-2 xl:grid-cols-3"
            : visible.plans.length === 3
              ? "md:grid-cols-3"
              : "md:grid-cols-2"
        }`}
      >
        {visible.plans.map((plan) => {
          const loading = busyPlan === plan.code;
          const featured = plan.code === featuredCode;
          return (
            <article
              key={plan.code}
              className={`flex h-full flex-col rounded-3xl border bg-white p-6 transition duration-200 hover:-translate-y-0.5 hover:shadow-lg ${
                featured
                  ? "border-slate-900 shadow-md ring-1 ring-slate-900/5"
                  : "border-slate-200 shadow-sm"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-black tracking-tight text-slate-950">
                    {plan.name}
                  </h3>
                  {plan.category === "RESORT" ? (
                    <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                      {String(plan.restaurantTier || "")
                        .replaceAll("_", " ")
                        .toLowerCase()}{" "}
                      +{" "}
                      {String(plan.hotelTier || "")
                        .replaceAll("_", " ")
                        .toLowerCase()}
                    </p>
                  ) : null}
                </div>
                {featured ? (
                  <span className="rounded-full bg-slate-900 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-white">
                    Popular
                  </span>
                ) : null}
              </div>

              <div className="mt-5">
                <p className="text-4xl font-black tracking-tight text-slate-950">
                  {formatPrice(plan.amount)}
                </p>
                <p className="mt-1 text-xs font-bold uppercase tracking-wide text-slate-500">
                  Billed annually
                </p>
              </div>

              <p className="mt-4 text-sm leading-6 text-slate-600">
                {plan.description}
              </p>

              <ul className="mt-5 space-y-2.5">
                {plan.featureLabels.map((label) => (
                  <li
                    key={`${plan.code}-${label}`}
                    className="flex items-start gap-2.5 text-sm font-medium text-slate-700"
                  >
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                      <Check size={12} strokeWidth={3} />
                    </span>
                    <span>{label}</span>
                  </li>
                ))}
              </ul>

              {plan.channelManagerComingSoon ? (
                <div className="mt-5 rounded-2xl border border-dashed border-amber-300 bg-amber-50 px-3.5 py-3">
                  <p className="text-[11px] font-black uppercase tracking-wide text-amber-900">
                    {CHANNEL_MANAGER_COMING_SOON.label} — Coming Soon / Not
                    Available Yet
                  </p>
                  <p className="mt-1 text-[11px] leading-5 text-amber-900/80">
                    {CHANNEL_MANAGER_COMING_SOON.detail}
                  </p>
                </div>
              ) : null}

              <button
                type="button"
                disabled={Boolean(busyPlan)}
                aria-label={`${ctaLabel}: ${plan.name}`}
                onClick={() => onSelectPlan?.(plan)}
                className={`mt-auto w-full rounded-2xl px-4 py-3.5 text-sm font-black transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 disabled:cursor-not-allowed disabled:opacity-50 ${
                  featured
                    ? "bg-slate-950 text-white hover:bg-slate-800"
                    : "bg-rose-600 text-white hover:bg-rose-700"
                }`}
              >
                {loading ? "Working..." : ctaLabel}
              </button>
            </article>
          );
        })}
      </div>

      {footnote ? (
        <p className="mx-auto mt-8 max-w-3xl text-center text-sm leading-6 text-slate-500">
          {footnote}
        </p>
      ) : null}
    </section>
  );
}
