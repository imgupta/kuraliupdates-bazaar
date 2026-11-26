# Buyer Portal Simplification and Checkout Implementation Plan

**Status:** Existing commerce foundations remain in place; buyer storefront interaction refresh is being delivered in PR #416. CI and staging verification pending.  
**Scope:** Online Shop buyer journey, bargaining, seller-direct payments, grouped orders and buyer support  
**Delivery target:** One consolidated implementation PR  
**Last updated:** 26 November 2026

> This is the acceptance contract for the buyer-portal implementation. Requirements are not complete merely because they are documented or appear in a mock-up. Mark them complete only after implementation, automated tests and applicable runtime evidence are recorded.

## 1. Goals

Simplify the Online Shop journey while preserving KuraliUpdates' local marketplace model: fast mobile discovery; one buyer basket; seller-owned suborders; direct customer-to-seller payments; automatic bargain acceptance into the basket; transparent payment/fulfilment states; and no regressions to Seller, Delivery, Admin or Daily Help.

## 2. Approved product and business decisions

| Area | Approved decision |
|---|---|
| Payment aggregator | Do not introduce one for Online Shop seller payments. |
| Payment destination | Customer pays each respective seller directly using that seller's verified, active payment instructions. |
| Multi-seller basket | One buyer-facing basket and grouped checkout, subject to configured seller-count and delivery-radius limits. |
| Multi-seller payment | Separate payment for each seller/suborder. |
| Funds custody | KuraliUpdates does not receive, pool, escrow, hold or settle seller funds. |
| Grocery refunds | Respective seller funds and initiates the refund; platform records and displays status. |
| Bargain acceptance | Accepted offer automatically adds/updates the product in the basket at the agreed price. |
| Product card | One primary Add action; after adding, show decrement / quantity / increment controls. |
| Buy Now | Isolated single-product checkout; must not include or mutate the existing basket. |
| COD | Show only when the relevant seller/order configuration permits it. |
| ETA | Never show a hard-coded promise. Show only a reliable estimate or say timing is confirmed after seller acceptance. |
| Payment verification | Returning from a UPI app is not proof of payment. Buyer-submitted UTR/reference remains unverified until authorized seller confirmation or a future bank-supported verification mechanism. |

These are product decisions, not legal conclusions. Actual fund flow, seller contracts and payment treatment require qualified Indian legal, tax and banking/payment review before production launch.

## 3. Buyer journey requirements

### 3.1 Home and discovery
- Clear Online Shop entry, location context and one prominent search field with live product/category suggestions and quick category shortcuts.
- Featured products, deal discovery and recently viewed products must be derived from current catalogue data or buyer-local interaction history; do not fabricate ratings, stock, savings or delivery promises.
- Compact useful categories; remove repeated promotions and competing calls to action.
- Daily Help remains a separate mode; do not mix service bookings into grocery catalogue.
- Popular nearby, deals and recently purchased sections only when backed by real data.
- Search should support English, Hindi/Hinglish and common spelling variations where technically supported.
- No invisible default maximum price: the existing ₹3,000 cap must not exclude products unless buyer explicitly chooses a limit.
- Show unavailable items honestly; show alternatives only when relevant alternatives exist.

### 3.2 Product cards and details
- Show product name, pack size, price and availability clearly; seller identity remains discoverable.
- One primary Add action; after first add show decrement / quantity / increment controls.
- Avoid simultaneous Add, Buy Now, Bargain and Compare actions on every card.
- Bargaining remains a secondary action in product details or an intentional negotiation entry point.
- Keep product detail information concise and quantity state consistent.
- Remove fixed 25-minute ETA; use backend-derived estimate only if source and validity are defined.

### 3.3 Bargaining state machine
- Buyer offer submitted: no basket change.
- Seller rejects: no basket change.
- Seller counteroffers: buyer may accept/reject; no basket change while pending.
- Seller accepts buyer offer: automatically add/update product at accepted price.
- Buyer accepts seller counteroffer: automatically add/update product at agreed price.
- Preserve accepted offer identity, seller, product, quantity and agreed unit price through checkout.
- Polling, refresh, reconnect and duplicate notifications must not add duplicate quantities.
- If buyer intentionally removes the accepted item, polling must not silently recreate it.
- If same product is already in basket, update the intended line/price safely rather than creating accidental duplicate lines.
- Checkout revalidates offer validity, expiry, seller, product and agreed price.

### 3.4 Basket and seller grouping
- Keep one buyer-facing basket.
- Group line items visibly by seller when multiple sellers are present.
- Show item totals, allocated delivery charge and exact payable amount per seller.
- Show combined basket total as an informational aggregate, never as one payment to KuraliUpdates.
- Enforce configured maximum seller count, delivery radius, seller eligibility and delivery rules before order creation.
- Make separate seller payment obligations clear before checkout.

### 3.5 Checkout and seller-direct payment

**Single seller**
- Show one seller summary and exact seller-payable amount.
- COD only when enabled for that seller/order.
- UPI only through that seller's verified and active UPI ID/QR/payment instructions.
- Disclose that customer pays seller directly and KuraliUpdates does not collect the funds.

**Multiple sellers**
- One buyer-facing checkout group, with a separate seller-owned suborder per seller.
- Show seller, items, item total, allocated delivery charge, exact seller payable and payment progress for each seller.
- Disclose before order placement that separate payments to each seller are required.
- Provide payment instructions and progress per seller (for example, Payment 1 of N).
- Returning from an external UPI app must not mark an order paid.
- Submitted UTR/reference is a buyer claim awaiting seller confirmation, not verified settlement.
- Represent partial payment explicitly. Confirmed suborders remain distinct from pending/unpaid suborders; unpaid suborders cannot be dispatched.
- Let buyer resume outstanding payment while order remains valid.
- Expiry, cancellation and seller-funded refunds must be explicit, seller-specific and auditable. Never imply a refund occurred before seller confirmation.

Minimum payment states: Awaiting payment; Payment submitted by buyer; Awaiting seller confirmation; Payment confirmed; Payment rejected; Payment expired.

### 3.6 Orders, delivery and support
- One grouped buyer order overview with separate seller suborder details.
- Payment and fulfilment states shown independently for each seller.
- Delivery milestones only when backed by actual backend events.
- Issue reporting for missing, wrong, damaged, poor-quality, not-delivered, payment and refund concerns.
- Explain which seller is responsible for seller-funded refunds.
- Keep seller-specific accountability visible without making the buyer navigate multiple unrelated order pages.

### 3.7 Retention (secondary)
Buy Again, favourites, saved shopping lists and relevant unavailable-product alternatives may be added where current data/API support is adequate. These must not delay checkout correctness.

## 4. Backend and data integrity requirements

### 4.1 Seller payment instructions
- Store seller payment destination with explicit verification and activation state.
- Only verified, active destinations may be used for new payment instructions.
- Restrict create/change/verify/activate actions; record actor and timestamp.
- Snapshot destination and instructions on order/suborder so later profile edits do not mutate existing orders.
- Never collect/store UPI PINs, bank passwords, card credentials or buyer banking secrets.
- Do not add aggregator, wallet, escrow, pooled account or platform-controlled split settlement.

### 4.2 Seller payment records and audit
For each seller suborder persist expected amount and payment lifecycle, including checkout-group association, amount/currency, destination snapshot, buyer-submitted UTR/reference and timestamp, seller confirmation/rejection actor/time/reason, state transitions, expiry/cancellation and seller-funded refund status.

Seller authorization is limited to its own suborders and confirmations. Buyers access only their own groups/orders/payments. Admin payment configuration and exceptions are role-protected and audited.

### 4.3 Checkout and order integrity
- Backend recalculates amounts; client totals are never authoritative.
- Revalidate product availability, stock, seller status, prices, accepted bargain, delivery eligibility, configured radius, seller-count limit and delivery fees immediately before order creation.
- Define safe stock reservation/revalidation and expiry behavior.
- Idempotency for checkout creation, payment-reference submission and state transitions.
- Retries/network failures must not create duplicate groups, suborders or payment records.
- Unpaid suborders cannot enter dispatch/fulfilment.
- Partial payment cannot mark the whole group paid.
- Seller cancellation, buyer cancellation, expiry and seller-funded refund transitions are explicit and auditable.
- Preserve seller-direct funds model through all failure and recovery paths.

### 4.4 Buy Now isolation
- Buy Now creates a checkout context containing only the selected product and requested quantity.
- Existing basket contents and quantities remain unchanged.
- Canceling/failing Buy Now does not clear or rewrite normal basket.
- Backend validates isolated checkout as rigorously as ordinary checkout.

## 5. API, authorization and domain ownership

Before changing APIs/schema, inspect existing checkout grouping, order/suborder models, COD flow, payment/refund endpoints, seller payment configuration, bargaining APIs, Flyway history and frontend contracts.

- Orders owns checkout groups, seller suborders, item/price snapshots and payment/refund state.
- Marketplace owns seller/product/catalogue and negotiation lifecycle before acceptance.
- Accepted bargain is handed to Orders as a validated immutable checkout snapshot/contract.
- Seller payment confirmation is authorized only for that seller's own suborder.
- Buyer access is scoped to authenticated buyer's own records.
- Delivery owns delivery execution and cannot dispatch unpaid suborders.
- Admin payment destination verification/override is role-protected and audited.
- Avoid cross-domain repository/entity access; use domain contracts or a documented adapter.
- Preserve COD and unrelated Daily Help workflows unless separately approved.

## 6. Automated tests and acceptance checklist

### Buyer experience
- [ ] Home/search/category/product cards responsive and accessible.
- [ ] Header search is wired to shared buyer search state; suggestions select real catalogue products/categories and quick shortcuts resolve to real categories.
- [ ] Featured and deal rails use real catalogue fields; recently viewed history is local, bounded and clearable.
- [x] No implicit ₹3,000 max-price filter (source implemented; final CI verification pending).
- [ ] Add and decrement/quantity/increment remain synchronized across card, detail, basket and checkout.
- [x] Buy Now checks out only selected product and preserves existing basket (source implemented; final CI verification pending).
- [x] Delivered orders provide Buy Again using current catalogue prices and stock checks (source implemented; final CI verification pending).
- [x] Favourites and named saved lists are available with browser/device-local persistence.
- [x] Common English/Roman Hindi/Devanagari/Gurmukhi grocery synonyms are expanded per search token; all query tokens must match.
- [ ] No hard-coded ETA or disabled payment method shown as available.

### Bargaining
- [ ] Pending/rejected offer does not alter basket.
- [ ] Seller acceptance auto-adds at agreed price exactly once.
- [ ] Buyer acceptance of counteroffer auto-adds at agreed price exactly once.
- [ ] Polling/reload/reconnect does not duplicate quantity.
- [ ] Buyer removal is not undone by later polling.
- [ ] Checkout rejects expired/revoked/mismatched offer snapshots.

### Seller-direct payment and grouped checkout
- [ ] One-seller COD creates correct seller order.
- [ ] One-seller UPI shows only verified active seller instructions.
- [ ] Two- and three-seller checkout create separate seller suborders and payment instructions.
- [ ] Buyer sees exact per-seller amounts, delivery allocation and combined informational total.
- [ ] UPI app return does not mark payment confirmed.
- [ ] Buyer-submitted UTR remains pending until authorized seller confirmation.
- [ ] Seller can confirm/reject only its own suborder payment.
- [ ] Partial payment leaves group partially paid and unpaid suborders blocked from dispatch.
- [ ] Seller destination changes do not mutate existing order snapshots.
- [ ] Unverified/inactive destination cannot be used for new payment instructions.
- [ ] Payment submission retries are idempotent.
- [ ] Seller-funded refund/cancellation states are accurate and audited.
- [ ] No platform wallet, escrow, pooled funds or aggregator flow introduced.

### Security, concurrency and regression
- [ ] Buyer cannot read/mutate another buyer's order/payment.
- [ ] Seller cannot confirm another seller's payment.
- [ ] Admin payment configuration/override is authorized and audited.
- [ ] Concurrent/retried checkout does not duplicate orders or oversell reserved stock.
- [ ] Server recalculates prices, fees and totals.
- [ ] Seller-count/radius/stock/availability constraints enforced server-side.
- [ ] Seller, Delivery, Admin, Daily Help and registration/OTP journeys remain green.

### Quality and evidence
- [ ] Backend unit/integration tests pass.
- [ ] Frontend lint, type checks and production build pass.
- [ ] Playwright buyer happy-path and failure-path tests pass.
- [ ] Payment lifecycle, partial-payment, authorization, idempotency and concurrency tests pass.
- [ ] CI passes on exact PR head SHA.
- [ ] Staging verification uses approved synthetic data and does not mutate real/shared business data.
- [ ] Skipped tests, unavailable integrations and runtime limitations are explicitly recorded, never described as passed.

## 7. Delivery strategy — one consolidated PR

1. Correctness foundation: Buy Now isolation, accepted-bargain auto-add/idempotency, backend amount/stock/offer validation, seller-direct payment state, grouped checkout and partial-payment safeguards.
2. Buyer UX: home/search, product card/detail actions, seller-grouped basket, one-screen COD checkout, seller-specific UPI instructions and grouped order status.
3. Support/retention: issue reporting, Buy Again, favourites, lists and alternatives where supportable.
4. Regression/evidence: authorization, idempotency, concurrency, responsive/accessibility and cross-portal tests; update API, UI, data and operations docs.

Deliver as one coherent PR. Do not split into partial feature PRs unless a concrete technical/safety blocker makes that impossible; document evidence and obtain approval before reducing scope.

## 8. Required documentation in implementation PR

- Buyer UI map: screen -> route -> component -> labels/fields/actions/states.
- API map: endpoint -> DTO -> auth/ownership -> service/domain -> transaction -> persistence.
- Data model/ERD: checkout group, seller suborder, seller payment, destination snapshot, audit and refund relationships; migration and rollback notes.
- Workflow/state diagrams: bargain acceptance, single/multi-seller checkout, payment confirmation, partial payment, cancellation and seller-funded refund.
- Security/operations: idempotency, retry, expiry, stock handling, audit, monitoring and support runbook.
- Update README/current-state evidence without claiming production readiness or live payment verification that has not been tested.

## 9. Completion record

Set overall status to **Complete** only when mandatory requirements in sections 4–8 are implemented or explicitly dispositioned with approved evidence, required tests pass on exact PR head, and documentation is merged.

| Evidence | Record |
|---|---|
| Implementation PR | [#390](https://github.com/imgupta/kuraliupdates-bazaar/pull/390) |
| Merge commit | TBD |
| Exact tested head SHA | `59c7e090d0f007e82e220b130937cbb64ddfc916` (code HEAD; report-only commit follows) |
| Backend tests | Passed on exact tested code HEAD; full Maven verification suite |
| Frontend lint/type/build | Passed on exact tested code HEAD |
| Buyer Playwright tests | Browser E2E and read-only API smoke passed on exact tested code HEAD |
| Payment/partial-payment tests | Service-level payment tests passed; Oracle partial-payment integration rehearsal pending |
| Authorization/idempotency/concurrency tests | Service/controller tests and checkout replay/payload-conflict tests passed; Oracle multi-session concurrency pending |
| Staging verification | Read-only role/fixture preflight and browser E2E passed; mutating transactional staging rehearsal not run |
| Flyway migration versions (if any) | V48 and V49; isolated Oracle execution pending |
| Known limitations/deferred items | TBD |
| Final disposition | **SOURCE COMPLETE; CI PASSED; ORACLE/STAGING VALIDATION PENDING** |

## 10. Related documentation

- [Architecture and system invariants](../ARCHITECTURE.md)
- [Current implementation status](CURRENT-STATE.md)
- [Domain boundaries](DOMAIN-BOUNDARIES.md)
- [Mandatory India PR governance](INDIA-PR-GOVERNANCE.md)
- [Codebase documentation standard](CODEBASE-DOCUMENTATION-STANDARD.md)
- [Deployment and release runbook](../DEPLOYMENT.md)


## 10. Current implementation evidence (PR #390)

The same consolidated PR now contains seller UPI destination submission and admin verification/activation; per-seller payment snapshots and payment records; buyer UTR submission; seller confirmation/rejection; seller-specific payment progress; seller-funded refund request/recording; per-seller COD configuration; unpaid UPI dispatch guard; buyer issue reporting and admin issue triage; buyer-user-scoped checkout idempotency; fail-closed verified-coordinate delivery-radius checks; combined route limit and route-based per-kilometre fee fallback; scheduled payment expiry with Oracle `FOR UPDATE SKIP LOCKED` and audit; admin-configurable ETA; multilingual grocery search expansion; browser-local favourites and saved lists; Buy Again; and migrations V48/V49.

Remaining boundaries are operational: no bank/PSP ownership or settlement verification, no independent bank proof for seller refunds, browser-local saved items are not synchronized across devices, and search synonyms are curated rather than a general Indic transliteration engine. Source changes are not accepted as production-ready until the exact-head CI and staging/Oracle merge gates in the [implementation report](BUYER-PORTAL-IMPLEMENTATION-REPORT.md) are met.