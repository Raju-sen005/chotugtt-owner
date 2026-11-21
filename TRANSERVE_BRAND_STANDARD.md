# Transserve — Mandatory Global Brand Design Standard

Transserve has **one official and unified brand identity** across all products.

## Applies to

1. Public Landing Page  
2. Restaurant Admin Panel  
3. Hotel Management Panel  
4. Resort Management Panel  
5. Super Admin Panel  
6. Authentication and registration screens  
7. All future Transserve applications and modules  

## Official brand colors

| Role | Hex |
|------|-----|
| Primary | `#FF315A` |
| Rose | `#F00078` |
| Orange | `#FF9500` |
| Navy / Ink | `#101B35` |

## Official gradient

```css
linear-gradient(135deg, #F00078 0%, #FF315A 50%, #FF9500 100%)
```

## Official typography

| Use | Family | Weights |
|-----|--------|---------|
| Headings / display | **Sora** | 600–800 |
| Body / navigation / controls / UI | **Manrope** | 400–800 |

## Official component styling

- Primary buttons: minimum height **48px**, radius **14px**
- Standard cards: radius **18px**
- Consistent spacing, borders, shadows, focus and hover states
- Official Transserve SVG brand assets only
- Accessible contrast and responsive layouts required

## Mandatory implementation rules

1. Never introduce unrelated brand colors or fonts without approval.  
2. Do not create alternative logos or change official logo artwork.  
3. Use centralized design tokens instead of hardcoded colors wherever practical.  
4. Reuse shared UI components and consistent interaction patterns.  
5. Use the brand gradient selectively, not excessively.  
6. Maintain professional, readable dashboard surfaces.  
7. Business-specific layouts may differ; brand identity must remain consistent.  
8. Preserve all existing APIs, authentication, permissions, tenant isolation, subscription entitlements, and business logic.  
9. Do not introduce visual changes that expose unauthorized modules.  
10. Do not deploy or modify production data without explicit approval.  

## Before every UI task

Inspect existing Transserve design tokens and shared components first.

Admin Panel references:

- `src/index.css` (central tokens)
- `TRANSERVE_ADMIN_DESIGN_TOKENS.md`
- `public/brand/`
- Shared UI: `src/components/ui/*`, AuthShell, Sidebar

Any new page, feature, component, or module **must** follow this standard.

This is the mandatory design standard for the entire Transserve ecosystem.
