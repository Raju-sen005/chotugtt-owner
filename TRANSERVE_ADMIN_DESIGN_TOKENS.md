# Transserve Admin — Design Tokens

**Source of truth:** `src/index.css` (`:root` + Tailwind v4 `@theme`)  
**Aligned with:** Landing brand (`TRANSERVE_DESIGN_TOKENS.md`)

---

## Brand

| Token | Value |
|-------|-------|
| `--brand-primary` | `#FF315A` |
| `--brand-rose` | `#F00078` |
| `--brand-orange` | `#FF9500` |
| `--brand-navy` | `#101B35` |
| `--brand-gradient` | `linear-gradient(135deg, #F00078 0%, #FF315A 50%, #FF9500 100%)` |

Aliases for existing UI:

| Token | Value |
|-------|-------|
| `--primary` | `#FF315A` |
| `--primary-dark` | `#F00078` |
| `--primary-light` | `#FFF0F7` |
| `--secondary` | `#FF9500` |
| `--secondary-light` | `#FFF7ED` |
| `--gradient-brand` | same as `--brand-gradient` |

---

## Surfaces & text

| Token | Value | Role |
|-------|-------|------|
| `--background` | `#F5F6F8` | Page canvas |
| `--surface` | `#FFFFFF` | Cards / panels |
| `--surface-muted` | `#F5F6F8` | Nested / quiet surfaces |
| `--hover-bg` | `#FFF0F7` | Hover wash |
| `--text-primary` | `#101B35` | Primary copy |
| `--text-secondary` | `#626B7C` | Supporting copy |
| `--text-muted` | `#8B93A7` | Labels / meta |
| `--text-disabled` | `#94A3B8` | Disabled |
| `--border` | `#E6E9EF` | Default border |
| `--border-strong` | `#CBD5E1` | Stronger border |
| `--focus-ring` | `rgba(255, 49, 90, 0.16)` | Focus halo |

---

## Status (semantics preserved)

| Token | Value |
|-------|-------|
| `--success` | `#10B981` |
| `--warning` | `#F59E0B` |
| `--info` | `#3B82F6` |
| `--danger` | `#EF4444` |
| `--preparing` | `#FF9500` |
| `--veg` / `--nonveg` | `#16A34A` / `#DC2626` |

---

## Elevation & geometry

| Token | Value |
|-------|-------|
| `--shadow-card` | `0 4px 20px rgba(16, 27, 53, 0.06)` |
| `--shadow-soft` | `0 2px 8px rgba(16, 27, 53, 0.04)` |
| `--radius-button` | `14px` |
| `--radius-card` | `18px` |
| `--control-height` | `48px` |

---

## Typography

| Role | Family | Weights |
|------|--------|---------|
| Display / headings | **Sora** (`--font-display` / `.font-display`) | 600–800 |
| Body / UI | **Manrope** (`--font-sans`) | 400–800 |

Loaded via Google Fonts in `index.html` (`preconnect` + stylesheet).

---

## Utility classes

| Class | Purpose |
|-------|---------|
| `.gtt-card` | White card, 18px radius, border + soft shadow |
| `.gtt-btn-primary` | Brand gradient CTA, 48px min-height, 14px radius |
| `.gtt-btn-secondary` | Light bordered button |
| `.gtt-gradient-brand` | Brand gradient fill |
| `.gtt-input` | Form control height/radius + focus ring |
| `.gtt-kpi-value` | Sora numeric KPI styling |

---

## Brand assets

| Asset | Path |
|-------|------|
| Nav / wordmark logo | `/brand/transserve-logo-nav.svg` |
| Mark | `/brand/Vibrant_Transserve_Gradient_Logo-removebg-preview.png` |
| Favicon (SVG) | `/brand/Vibrant_Transserve_Gradient_Logo-removebg-preview.png` |
| PNG fallback icon | `/transserve-icon.png` |

Copied unmodified from landing `img/transserve-logo-nav.svg` and `img/Vibrant_Transserve_Gradient_Logo-removebg-preview.png`.
