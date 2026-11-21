# Transserve Admin — Branding Visual QA Report

**Date:** 2026-11-21  
**Project:** `D:\food-saas-admin`  
**Scope:** Visual QA + branding-only defect fixes. No API, permission, subscription, backend, or customer-data changes.

---

## 1. Implementation inspection (code vs tokens)

Verified against `TRANSERVE_ADMIN_DESIGN_TOKENS.md` / `src/index.css` (computed in browser):

| Token | Expected | Computed |
|-------|----------|----------|
| `--brand-primary` | `#FF315A` | `#ff315a` |
| `--brand-rose` | `#F00078` | `#f00078` |
| `--brand-orange` | `#FF9500` | `#ff9500` |
| `--brand-navy` | `#101B35` | `#101b35` |
| `--brand-gradient` | `135deg, #F00078 → #FF315A → #FF9500` | matches |
| `--radius-button` / `--radius-card` | `14px` / `18px` | matches |

**Fonts (live `document.fonts`):** Manrope (body/UI) and Sora 700 (headings) both check as loaded.

**Logos:** Sidebar `/brand/transserve-logo-nav.svg` (~182×44 at desktop). Auth mark PNG under `/brand/`.

---

## 2. Local authenticated login

| Item | Result |
|------|--------|
| App URL | `http://localhost:5173` (Vite + local API `:5000`) |
| Account | Local test owner for tenant **R&P Groups** (role chip **OWNER**) |
| Outcome | **Login succeeded** — sidebar + restaurant Overview rendered |
| Password handling | Used only for local sign-in; **not** written to docs, commits, or logs in this report |

No password reset attempted. Credentials were not used against production.

---

## 3. Authenticated screens actually inspected

| Screen | Evidence | Notes |
|--------|----------|-------|
| Sidebar + active nav | Overview / Rooms / Menu | Official SVG logo; pink rail + soft active wash; Manrope labels |
| Topbar | Overview @768/mobile | “Transserve” wordmark, OWNER chip, notifications, sign out |
| Restaurant Overview | KPI + hero + charts sections | Official gradient hero; KPI cards `gtt-card` 18px |
| Rooms Management | Filters + room cards + Add Room modal | Hotel module available on this plan |
| Room Bookings | KPI + search + table headers | Guest/room columns visible |
| Menu Catalog | Hero, category pills, cards | Orange “Combo” badge keeps status color semantics |
| Notifications dropdown | Opened on Overview | Empty state “You’re all caught up”; panel radius brand tokens |
| Add Room modal | Opened, closed via Cancel | Shared Modal `rounded-[18px]`; **no create** performed |
| Profile | Loaded | Restaurant Profile form surfaces |
| **Hotel Overview landing** | **Not shown** | Account is **not** hotel-only — landing is restaurant Overview (expected) |
| **Dedicated Resort dashboard** | **N/A for this account** | Same restaurant Overview + hospitality modules; no separate Resort shell |

---

## 4. Viewports actually tested (authenticated)

CDP `Emulation.setDeviceMetricsOverride` + screenshots. Overflow-X measured via `scrollWidth` vs `clientWidth`.

| Viewport | Screen | Overflow-X | Screenshot |
|----------|--------|------------|------------|
| 1920×1080 | Overview | None | `docs/qa-screenshots/auth-overview-1920.png` |
| 1440×900 | Overview, notifications, rooms, modal, menu, bookings | None | `auth-overview-1440.png`, `auth-notifications-1440.png`, `auth-rooms-1440.png`, `auth-rooms-modal-1440.png`, `auth-menu-1440.png`, `auth-bookings-1440.png` |
| 1024×768 | Overview (desktop sidebar still visible) | None | `auth-overview-1024.png` |
| 768×1024 | Overview (hamburger + Transserve header) | None | `auth-overview-768.png`, `auth-mobile-nav-768.png` |
| 430×932 | Overview | None | `auth-overview-430.png` |
| 375×812 | Overview | None | `auth-overview-375.png` |
| 360×800 | Overview + Rooms | None | `auth-overview-360.png`, `auth-rooms-360.png` |

**Prior unauthenticated auth QA** (login/register/forgot) remains documented from the earlier pass under the same `docs/qa-screenshots/` folder (`login-*.png`, `register-1440.png`, `forgot-password-1440.png`).

---

## 5. Brand validation (authenticated)

| Check | Result |
|-------|--------|
| Colors `#FF315A` / `#F00078` / `#FF9500` / `#101B35` | Pass (CSS vars + visible accents) |
| Official 135° gradient | Pass on Overview hero (`background-image` measured) |
| Sora headings / Manrope UI | Pass (`document.fonts` + computed families) |
| Sidebar logo sizing | Pass (~182×44, not stretched) |
| KPI / modal radius 18px | Pass for `gtt-card` KPIs and shared Modal |
| Contrast | Pass on navy text / white surfaces; white on gradient hero |
| Responsive shell | Pass — no horizontal overflow at listed widths; mobile menu button at ≤768 |

---

## 6. Branding defects found and fixed

### Earlier (pre-auth) fixes

1. Restored Google Fonts in `index.html`  
2. Auth CTAs → `.gtt-btn-primary` gradient  
3. Favicon / theme-color / manifest MIME corrections  

### Authenticated-session fix

| Issue | Fix |
|-------|-----|
| Overview secondary panels (`Sales Trend`, `Top Items`, etc.) still used `rounded-3xl` (24px) while KPIs used 18px | Updated those articles in `DashboardOverview.jsx` to `gtt-card` (18px) — visual-only |

No entitlement, route, API, or data changes.

---

## 7. Remaining visual issues / unverified screens

- Many feature pages (Rooms/Menu/Bookings controls) still mix local slate / `rounded-*` utilities; they inherit brand via remapped rose accents but are not fully token-normalized.
- Live Orders table density, Counter POS, Analysis charts, Room Billing, Guests, Staff — **not** fully screenshot-audited in this pass (Rooms/Bookings/Menu cover tables/filters/modals pattern).
- Dedicated **Hotel Overview** UI requires a hotel-only test tenant (this account correctly shows restaurant Overview).
- Notification panel screenshot crop sometimes dominated by sidebar; panel was confirmed open via a11y snapshot (“Notifications” / “You’re all caught up”).

---

## 8. Business functionality safety

| Check | Result |
|-------|--------|
| Nav for this tenant | Restaurant modules **and** Rooms/Bookings/Guests/folios — consistent with non–hotel-only entitlement |
| Hotel-only Overview | Correctly **not** shown |
| Modal | Opened Add Room; cancelled — **no** room created |
| `npm run test:sidebar-hotel` | **14/14 pass** |
| `npm run test:subscription-visibility` | **5/5 pass** |
| Backend / DB / production | Untouched |

---

## 9. Build result

| Check | Result |
|-------|--------|
| `npm run build` | **Pass** (~1.3s) |

---

## 10. Honest coverage summary

**Completed with browser evidence:** Local login; restaurant Overview; Rooms (+ modal); Bookings; Menu; notifications open; Profile load; responsive Overview (and Rooms @360) at 1920 / 1440 / 1024 / 768 / 430 / 375 / 360; brand token/font/logo measurements; build + nav entitlement unit tests.

**Not claimed:** Separate Hotel Overview or Resort-only shell for this account; exhaustive every-module table/pagination audit; production testing.
