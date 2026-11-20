# Subscription Navigation & Expiry Fix Report

**Date:** 2026-11-20  
**Projects:** `food-saas-backend`, `food-saas-admin`, `Captain/captain-app`  
**Status:** CONDITIONAL PASS (automated tests + admin build executed; no browser/EAS smoke)

---

## Bug 1 — Hotel plans showed restaurant navigation

### Root cause

Backend entitlements for `HOTEL_STARTER` / `HOTEL_GROWTH` were already hotel-only and fail-closed. The admin **Sidebar always spread restaurant `NAV_ITEMS`**, then *appended* hotel links when features were present. Result: restaurant + hotel navigation for hotel-only accounts.

`MerchantLayout` only redirected hotel `/` away from the restaurant dashboard; restaurant routes (`/counter`, `/orders`, `/menu`, …) remained mounted and reachable by URL.

Features were **not** merged on the backend (entitlements are recomputed from `subscriptionPlan`). Stale React Query caches could linger after a SuperAdmin plan change until `/auth/me` refreshed.

### Before → after

| Surface | Before | After |
|---|---|---|
| Sidebar (hotel-only) | Restaurant nav + hotel links | Hotel Overview, Rooms, Bookings, Room QR, Room Billing, Guests, Profile, Staff (+ Manage Plan) |
| Home `/` (hotel-only) | Redirect to `/rooms` | `HotelOverview` (rooms/bookings stats only; no restaurant revenue/orders) |
| Direct restaurant URLs | Reachable | Redirect / `FeatureRoute` fail-closed |
| Restaurant nav (non-hotel) | Always showed full restaurant list | Gated by `availableFeatures` (e.g. Starter hides Analysis) |
| `/auth/me` refresh | Replaced user object | Also clears React Query when plan/features change |
| Plan assign | Did not sync category | Sets `businessCategory` from commercial `planFamily` |

### Files changed (Bug 1)

**Admin**
- `src/components/Sidebar.jsx`
- `src/components/sidebarHotelNav.js`
- `src/layouts/MerchantLayout.jsx`
- `src/features/dashboard/HotelOverview.jsx` (new)
- `src/context/AuthContext.jsx`
- `src/components/sidebarHotelNav.node.test.js`
- `src/components/planNavigationMatrix.node.test.js` (new)

**Backend**
- `routes/orderRoutes.js` — require feature gates on split/mixed/status/complete/folio complete
- `controllers/adminController.js` — sync `businessCategory` on commercial plan assign

**Captain**
- No Captain UI change required for this bug (admin sidebar / merchant routes). Package IDs and session keys unchanged.

---

## Bug 2 — Plan change reset subscription expiry

### Root cause

`updateRestaurantSubscription` treated every SuperAdmin plan assignment as a duration grant: it always called `calculateSubscriptionExpiry` with the current (future) expiry as base, which **added another 12 months**.

`toggleApproval` already preserved expiry for already-active accounts; paid renewal in `paymentFinalizationService` correctly extends — those paths were left alone.

### Policy implemented

Central helper: `utils/subscriptionTransition.js`

| Transition | When | Expiry |
|---|---|---|
| `ACTIVE_PLAN_CHANGE` | `ACTIVE` + not expired | **Preserve exactly** |
| `NEW_ACTIVATION` | No prior expiry | Now + plan duration |
| `EXPIRED_REACTIVATION` | Expired / inactive with prior expiry | Now + plan duration |
| `RENEWAL` | Paid checkout (unchanged) | Extend via existing payment finalization |

Also: same-plan reassignment is a no-op (no extension). Duplicate active plan changes cannot extend expiry.

### Before → after (example)

- Activate Starter `2026-11-20` → expiry `2027-11-20`
- Upgrade to Pro on `2026-12-20`

| | Expiry |
|---|---|
| Before (bug) | Extended (~`2027-12-20` or later) |
| After | Still `2027-11-20` |

### Files changed (Bug 2)

- `utils/subscriptionTransition.js` (new)
- `controllers/adminController.js` — uses transition helper
- `src/features/admin/SuperAdminPanel.jsx` — copy updated (preserve expiry messaging)
- `tests/subscriptionTransition.unit.test.js` (new)
- `tests/adminPlanChangeExpiry.http.integration.test.js` (new)

---

## Tests executed

| Suite | Result |
|---|---|
| `node --test tests/subscriptionTransition.unit.test.js` | **13/13** with HTTP suite below |
| `node --test tests/adminPlanChangeExpiry.http.integration.test.js` | **3/3** (disposable Mongo) |
| `node --test tests/adminAssignablePlans.unit.test.js` | **3/3** |
| `node --test src/components/sidebarHotelNav.node.test.js` | **pass** |
| `node --test src/components/planNavigationMatrix.node.test.js` | **pass** (30 total with hotel nav) |
| Admin `npm run build` | **pass** |

Coverage notes:
- HTTP+Mongo: plan switch preserves expiry; duplicate changes; `/auth/me` hotel-only features after HOTEL switch.
- Unit: upgrade/downgrade/resort switches preserve expiry; new activation + expired reactivation grant from now.
- Nav matrix: HOTEL_*, restaurant tiers, six resort codes (not hotel-only), legacy PLUS/PRO shapes.

**Not executed:** interactive browser plan-switch smoke, Captain EAS build, Atlas/production DBs.

---

## Remaining limitations

1. Merchant sidebar updates after SuperAdmin plan change when the merchant session next hits `/auth/me` (interval / focus / navigation). Query cache clears on entitlement key change.
2. `/orders/live` still allows `ROOM_QR_ORDERING` (intentional for room QR ops); hotel-only UI no longer queries it from Sidebar.
3. No production deploy, migration, price, or entitlement matrix redesign.
4. Browser validation of sidebar after live SuperAdmin switch was not run in this pass.

---

## Safety checklist

- No production deployment
- No production DB writes
- No migrations / collection renames
- No plan price or duration catalog changes
- Paid renewal path unchanged
- Tenant isolation / FieldCrypto / JWT behavior unchanged
