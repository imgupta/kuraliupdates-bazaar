# Buyer Portal Experience — Source Specification

- Repository: `imgupta/kuraliupdates-bazaar`
- Branch: `feat/buyer-experience-complete-refresh`
- Base: `5d0bb5c66c0bec7ec3f33c76b2753144249a7d76` (PR #418 merge)
- Updated: 26 November 2026
- Scope: web buyer portal; no backend API, database, payment, hosting or runtime-topology changes in this refresh.
- Excluded: loyalty/referrals and iOS.

## UI map

| Screen | Component | Labels / fields / actions | State / responsive behavior |
|---|---|---|---|
| Buyer entry | `src/features/buyer/BuyerPortal.tsx` | Online Shop, Daily Help, cart, checkout, order tracking, negotiation chat | Existing authenticated context; overlays independently mounted |
| Search | `src/components/Buyer/BuyerHome.tsx` | Search products across Kurali shops; Search Daily Help services; Clear search; product, category, seller and catalogue price suggestions | Up to six suggestions for non-empty Online Shop query; existing English/Hindi/Punjabi search expansion; Escape closes; keyboard-focusable; no cart mutation |
| Discovery | `src/components/Buyer/OnlineShopHome.tsx` | Category tiles, Buy again, Featured local finds, deals, Recently viewed, sort, locality/stock/max-price filters, favourites and saved lists | Data-backed sections; recent/favourites/lists are browser-local |
| Product card | `src/components/Buyer/ProductCard.tsx` | Title, pack/unit, seller, locality/distance, stock, price/MRP/savings, Compare, Bargain, ADD or quantity decrement/increment | Mobile two-column grid; increment disabled at displayed stock; backend remains authoritative |
| Product details | `src/components/Buyer/ProductDetailsModal.tsx` | Price/MRP/savings, pack, seller details when supplied, Compare sellers, Bargain, Add to cart, Buy now, unit price when parseable | Bounded viewport, independent scroll, mobile safe-area padding; related category items labelled as not guaranteed equivalents |
| Seller comparison | `CompareSellersModal.tsx`, `comparableProducts.ts` | In-stock seller offers, locality/distance and ratings when present; Buy from..., Negotiate/Bargain | Exact normalized title and pack-size matching; one offer per seller; category similarity alone is not equivalence |
| Basket / checkout | `CartDrawer.tsx`, `CheckoutModal.tsx` | Existing quantity/removal, seller-grouped totals, checkout, seller-specific COD/UPI state | Existing server validation and seller-direct payments preserved |
| Tracking / support | `OrderTrackingModal.tsx`, `BuyerOrderIssuePanel.tsx` | Backend-backed order status and issue reporting | No fabricated delivery progress or hard-coded ETA |

## Unit-price derivation

`src/utils/productUnitPricing.ts` derives normalized price only from explicit numeric catalogue units: kg/g, L/ml or piece variants. It displays ₹/kg, ₹/L or ₹/piece. Ambiguous units such as `1 Pack`, zero quantities, invalid prices and unsupported units return no value. Display-only; checkout and persisted product prices are unchanged.

## API, data and transaction map

No API, DTO, controller, service, table, Flyway migration, transaction, payment instruction or order-state transition changes in this refresh. Search suggestions use the existing in-memory catalogue. Unit price and related-category items are client-side display derivations. Cart/checkout continue to use existing commerce APIs and server-side price, stock, seller, delivery and payment validation.

## Security, privacy and operations

- Suggestions use catalogue fields already visible to buyers; no new personal data is collected.
- Recently viewed, favourites and saved lists remain browser-local and are not cross-device synchronized.
- Category matches are not claims of interchangeable products. Seller comparison requires matching title and pack size.
- Client stock/price are informational; backend checkout remains authoritative.
- Rollback is a frontend revert; no schema/data rollback exists.
- Hosting region, live deployment, Oracle state and production readiness require separate verification.

## Verification commands

- `npm run lint`
- `node --import tsx --test --test-concurrency=1 tests/*.test.ts`
- `node --test --test-concurrency=1 tests/*.test.mjs`
- `npm run build:buyer`
- Unit price coverage: `tests/productUnitPricing.test.ts`; checkout isolation contract: `tests/buyerCheckoutIsolation.test.mjs`.
- Browser E2E, full backend Maven suite, exact-head CI and Render/Vercel runtime verification remain separate gates; do not infer them from local frontend checks.
