# Transserve Branding Migration Report

**Date:** 2026-11-19  
**Brand:** Transserve  
**Tagline:** A Complete Restaurant & Hospitality Platform  
**Projects:** `food-saas-backend`, `food-saas-admin`, `Captain/captain-app`

---

## Summary

Customer-facing ChotuGTT branding was replaced with **Transserve** across emails, Admin UI/PWA metadata, and Captain display names/icons. Internal compatibility identifiers (Mongo disposable DB prefixes, AsyncStorage/sessionStorage keys, Android package ID, Cloudinary folder paths) were **preserved**.

**Status:** Branding update complete for audited customer-facing surfaces.  
**Asset note:** No official Transserve wordmark PNG/SVG from design was present in-repo. A new gradient icon SVG + wordmark SVG were created from the approved palette and the existing gradient icon PNG (`final-icon-removebg-preview.png`).

---

## Brand identity applied

| Token | Value |
|---|---|
| Rose | `#F00078` |
| Pink | `#FF315A` |
| Orange | `#FF9500` |
| Primary text | `#101B35` |
| Secondary text | `#626B7C` |
| Background | White / `#FFFFFF` |
| Gradient | Rose → Pink → Orange |

---

## Assets created / organized

### Admin (`food-saas-admin/public`)
- `Untitled.svg` — standalone mark
- `transserve-logo.svg` — mark + “Transserve” wordmark
- `transserve-icon.png` — copied from `src/assets/final-icon-removebg-preview.png`
- `favicon.png` — updated to Transserve icon
- `manifest.webmanifest` — PWA name/short_name/theme

### Captain (`captain-app/assets`)
- `transserve-icon.png` / `.svg`
- `transserve-logo.svg`
- `icon.png`, `splash-icon.png`, `favicon.png`, `android-icon-foreground.png` refreshed from Transserve icon

### Manual / store steps still required
- Replace Expo store listing screenshots if they show ChotuGTT
- Optional: supply a designer-authored Transserve wordmark SVG to replace the generated `transserve-logo.svg` text rendering
- Rebuild native binaries (EAS) so launcher icons update on devices
- Old `ChotuGTT__1_-removebg-preview.png` files left on disk for compatibility; no longer referenced by customer UI

---

## Surfaces updated

### Backend
- `services/emailService.js` — from/subject/body Team Transserve
- `services/passwordResetEmailService.js`
- Comment in `controllers/adminController.js`
- Doc titles (content): staging checklist, FieldCrypto reports, CHOTUGTT_* audit docs (filenames kept)

### Admin Panel
- `index.html` — title, favicon, theme-color, OG/Twitter meta
- `public/manifest.webmanifest`
- `src/index.css` — Transserve CSS variables + rose/orange theme map
- Auth: `AuthShell`, `Login`, `RegisterTenant`, `RegistrationSuccess`
- `Sidebar`, `SubscriptionCheckout`, `CommercialCatalogPreview`
- SuperAdmin, Supply Admin/Store, Live Order KOT “Powered by”, Room QR print, Table monitor, Bill template Razorpay name, printOrderBill, QR standee label
- Tests updated for Welcome/Room QR branding strings

### Captain
- `app.json` — display name **Transserve Captain**; icons; **package `com.raju005.captainapp` unchanged**
- `package.json` name → `transserve-captain`
- `App.js` / `SplashScreen.js` / Login & Profile footers
- `Color.js` already matched brand palette

---

## Intentionally preserved (compatibility)

| Item | Why kept |
|---|---|
| `chotugtt_pending_checkout_plan`, `chotugtt_registration_welcome`, `chotugtt_pending_registration_email` | Existing browser sessions |
| `chotugtt:kot-language:*` localStorage | Existing captain/admin KOT language prefs |
| `chotugtt_captain_token`, `chotugtt_captain_user_cache` | Existing Captain installs stay logged in |
| Disposable Mongo DB prefixes `chotugtt_*` in tests/scripts | Local-only; renaming breaks assertions |
| Cloudinary folder `chotugtt/supply-products` | Existing uploaded media paths |
| Guest doc path examples `chotugtt-private` | Ops docs / env examples |
| Android `package`: `com.raju005.captainapp` | Store identity; no migration approved |
| Expo `slug`: `captain-app` | EAS project continuity |
| Filenames `CHOTUGTT_*.md`, old PNG filenames on disk | Avoid broken doc links / asset orphans |

---

## Validation executed

| Check | Result |
|---|---|
| Admin `registrationManualApproval` + `roomQrPrint` + `displayText` tests | **19/19 pass** |
| Admin `npm run build` | **pass** (dist includes new branding bundles) |
| Captain `displayText` unit tests | **4/4 pass** |
| Backend `fieldCrypto.responseSanitize.unit.test.js` | **7/7 pass** |
| Customer-facing `ChotuGTT` in admin src / emails / Captain UI sources | **none found** |
| Browser visual smoke | **not run** |
| Captain Expo native rebuild / device icon check | **not run** |
| Full backend suite | **not re-run in full** (spot-check only) |

---

## Remaining legacy references (expected)

- Test DB names / scripts: `chotugtt_*`
- Storage keys listed above
- Historical lighthouse JSON / benchmark JSON under `docs/` (artifacts)
- On-disk old logo PNGs (unreferenced by updated UI)
- `package-lock` may still mention old name in nested metadata until next full lock regenerate

---

## Final status

**CONDITIONAL PASS** — Customer-facing Transserve branding is applied and verified by unit tests + Admin production build. Native store icon refresh and designer wordmark asset swap remain manual follow-ups.
