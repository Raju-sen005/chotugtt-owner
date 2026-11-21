# Transserve Admin Panel — Branding Audit

**Date:** 2026-11-21  
**Project:** `D:\food-saas-admin`  
**Stack:** React 19, Vite 8, Tailwind CSS **v4** (`@tailwindcss/vite`), TanStack Query  
**Mode:** Audit only (pre-implementation snapshot)

---

## 1. Theme architecture

| Location | Role |
|----------|------|
| `src/index.css` | **Central theme** — `:root` CSS vars + Tailwind v4 `@theme` color map + utility classes `.gtt-*` |
| `tailwind.config.js` | Empty (Tailwind v4 config lives in CSS `@theme`) |
| `index.html` | Favicon, theme-color `#F00078`, no Google Fonts yet |
| `src/App.css` | Minimal / unused for brand |
| `src/components/ThemeWrapper.jsx` | Public menu tenant accent only (`--accent-color`) — not admin chrome |

**Best place for new tokens:** extend `src/index.css` `:root` + `@theme` (already the single source of truth).

---

## 2. Current brand colors (pre-change)

Already partially Transserve-aligned:

- `--primary: #f00078` (rose)
- `--secondary: #ff9500`
- `--gradient-brand: linear-gradient(135deg, #f00078, #ff315a, #ff9500)`
- `--text-primary: #101b35`
- Rose scale remapped in `@theme` so `rose-*` / `red-*` Tailwind classes lean brand

**Gaps vs landing:**

- Landing primary accent `#FF315A` not used as `--primary`
- Soft surface landing `#F5F6F8` vs admin `#f8fafc`
- Border landing `#E6E9EF` vs admin `#e2e8f0`
- Success landing `#14965A` vs admin `#10b981` (keep admin success/warning/danger semantics)

---

## 3. Typography

- No Sora/Manrope loading in `index.html`
- UI uses Tailwind `font-sans` / default system stack
- Heavy `font-black` usage on many screens (observation)

---

## 4. Logos / public assets

| Asset | Path | Used where |
|-------|------|------------|
| Full SVG | `/Clean Transserve Brand Logo.svg` | Sidebar |
| Untitled mark | `/Untitled.svg` | Auth shell |
| PNG | `/Vibrant_Transserve_Gradient_Logo-removebg-preview.png` | Favicon |
| Also present | `transserve-logo.svg`, `transserve-icon.svg`, etc. | Mixed |

**Official landing assets not yet copied into a dedicated `public/brand/` folder.**

Sidebar logo class `w-75` is not a standard Tailwind width utility (likely ineffective).

---

## 5. Shared chrome components

| Component | Notes |
|-----------|-------|
| `Sidebar.jsx` | Light surface, rose active state, plan-gated nav (must preserve) |
| `Navbar.jsx` | Top bar notifications/logout; slate + primary hover |
| `MerchantLayout.jsx` | Desktop fixed sidebar + mobile drawer |
| `ui/Button.jsx` | Solid primary, not gradient; ~py-2.5 not 48px min-height |
| `AuthShell.jsx` | Gradient panel + login card |

Feature gating: `sidebarHotelNav`, `featureAccess` — **do not alter**.

---

## 6. Dark mode

`color-scheme: light` in HTML. No admin dark theme tokens. Light-only.

---

## 7. Breakpoints in use

Tailwind defaults (`sm`/`md`/`lg`). Layout uses `lg:` for sidebar (≥1024). Landing’s 1024/768/480/360 are reference, not required to rename Tailwind screens.

---

## 8. Implementation plan (next)

1. Align `:root` semantic tokens with landing brand + keep status colors.  
2. Load Sora + Manrope; map `--font-sans` / `--font-display`.  
3. Copy official logos to `public/brand/`.  
4. Update Sidebar, Button, AuthShell, card/button utilities — no API/auth/query changes.  
5. Build + targeted tests + reports.
