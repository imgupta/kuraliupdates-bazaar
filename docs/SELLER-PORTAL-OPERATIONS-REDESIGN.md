# Seller Portal Operations Redesign

## Purpose

Upgrade the seller workspace from a collection of basic tabs into an operational home for KuraliUpdates local merchants. This is a capability-led redesign based on public seller documentation from Amazon Seller Central, Flipkart Seller Hub / Marketplace Seller APIs, and Flipkart Commerce Cloud seller-management documentation, adapted to KuraliUpdates' seller-direct payment and local fulfilment model.

## Current-source audit (main baseline: f86d5bc4868a886966efac4ea38f86a12942bf23)

### Existing capabilities verified in source

- Seller profile, approval state, onboarding document status and correction upload.
- Store open/close and shop address update (address change resets location verification).
- Product create/edit/delete with seller ownership checks and server-side price validation.
- Seller order list, 15-second polling, accept order and mark ready for pickup.
- Seller-direct UPI destination setup and UTR confirmation/rejection.
- Bargaining inbox and existing seller discount rules.
- Seller payment API already supports seller-funded refund request actions: initiate, reject, and record an external refund reference on completion.
- Backend seller order transitions are intentionally restricted to PLACED -> ACCEPTED_BY_SELLER -> READY_FOR_PICKUP, with eligible unpaid cancellation and stock restoration. Paid orders cannot be cancelled through this status endpoint.

### Gaps confirmed in source

- Seller portal mounted SellerPaymentWorkspace with hidePaymentRecords=true. This hid the payment records and refund actions from the normal seller UI.
- No dedicated seller return/RTO case API or item-level return entity/workflow was found in SellerController/SellerService.
- Order list had no search or status filter and separated only active vs completed orders.
- No dedicated overview/action queue or low-stock/out-of-stock attention summary.
- Inventory is a simple product card list; no bulk stock import, stock movement ledger, reservation/adjustment reason or stock history endpoint was found.
- No seller-facing support ticket workspace, listing moderation queue, downloadable invoices/packing slips, or payout statement/reconciliation workspace was verified in the seller API.
- Analytics such as net sales, contribution margin, return rate and fulfilment SLA cannot be truthfully calculated from the current seller API payload alone.

## Market capability benchmark and KuraliUpdates fit

| Capability | Common seller-platform pattern | KuraliUpdates decision |
|---|---|---|
| Operations overview | Actionable new-order, dispatch and stock queues | Implement summary/action queue from current API data |
| Orders | Search, filters, lifecycle actions, detail and exception visibility | Improve search/status filtering and preserve backend-authoritative state transitions |
| Returns / refunds | Return reason, decision window, reverse movement, receipt, refund state | Expose existing seller-funded refund actions; physical returns/RTO require a dedicated backend case model and policy |
| Inventory | Stock health, bulk adjustment, history, out-of-stock suppression | Add visible low/out-of-stock attention; do not fake history or bulk actions without backend support |
| Catalogue | Listing lifecycle, quality/compliance feedback, bulk edits | Keep current CRUD; future moderation/bulk support requires backend contract |
| Payments | Payment confirmation, statements, deductions and refund reconciliation | Keep seller-direct UPI, show payment records and refund references; no platform custody |
| Notifications | New order, cancellation, return, listing and payout events | Current 15-second order polling remains; durable seller event inbox/outbox delivery is a separate backend capability |
| Analytics | Sales, SKU performance, cancellations, return and SLA metrics | Show only counts supported by seller orders/products; no fabricated margin or ratings |
| Support | Ticket IDs, status, escalation and seller help | Requires support API; do not fake a local-only ticket workflow |

## Implemented in this PR

- Seller portal now opens on an operational Overview.
- Overview surfaces order acceptance, ready-for-pickup, low-stock and out-of-stock counts with navigation into the relevant workspaces.
- Overview includes actionable order and inventory attention lists.
- Orders workspace adds search by order ID, buyer and delivery address plus status filtering.
- Seller navigation is a compact, horizontally scrollable, sticky workspace bar suitable for mobile.
- A dedicated Returns & refunds workspace exposes item-level return cases and the reverse-pickup/refund lifecycle.
- The refund workspace clearly states that refunds are seller-funded and KuraliUpdates does not transfer funds.
- UPI destination setup remains in Payments & UPI; no payment destination or custody model changed.

## Physical return and refund workflow implemented in this PR

Oracle migration V51 adds SELLER_RETURN_CASES and SELLER_RETURN_EVENTS. V52 adds durable ORDERS.DELIVERED_AT plus KU_RETURN_POLICIES and append-only KU_RETURN_POLICY_EVENTS. Root admins can manage a global default and category-specific returnability/window rules from Seller Management → Category return policies. The backend exposes buyer, seller and delivery-agent endpoints with role checks and resource ownership checks.

1. Buyer creates an item-level return request against an order item and quantity. The order must be DELIVERED (or COMPLETED), the buyer must own it, category must be returnable, the configured calendar-day window must not have expired from DELIVERED_AT, and previously active returned quantities are deducted from the available quantity.
2. Seller reviews the request and approves or rejects it with a reason.
3. An ACTIVE, available delivery agent sees approved pickup jobs, claims one, records collection proof, then records seller handover proof.
4. The case moves to RECEIVED_BY_SELLER only after the assigned agent records handover.
5. Seller initiates refund preparation only after receipt, executes the refund outside KuraliUpdates, then records the actual refund reference.
6. The backend enforces that the recorded refund method matches the original order payment method (UPI or COD). It does not initiate or move money.

The seller UI now supports approve/reject, tracking pickup progress, preparing the refund after handover, and recording the refund reference. Delivery-agent assignment uses the same ACTIVE profile/availability rule as ordinary delivery jobs. The delivery API exposes available, assigned, claim, pickup and handover operations. Buyer API exposes request and return-history operations.

Return states: REQUESTED -> APPROVED -> PICKUP_ASSIGNED -> PICKED_UP -> RECEIVED_BY_SELLER -> REFUND_PENDING -> REFUNDED; seller rejection ends at REJECTED. Every state change writes an event record.

### Boundaries and remaining work

- Return eligibility requires a delivered/completed order. Root admins can configure a global default and category-specific returnable flag/window (1–90 days when enabled; 0 days allowed only when disabled). Policy updates are audited. Admin override and return-fee policy are not implemented.
- V52 backfills DELIVERED_AT for legacy delivered orders from their previous UPDATED_AT value; this is an approximation for historical orders. New delivery and store-pickup completions set DELIVERED_AT explicitly.
- Return quantity is item-level, but exchange/replacement, QC grading, partial acceptance of damaged quantities, and RTO before customer delivery are not implemented.
- Buyer tracking now exposes item-level return requests and return status history after delivery.
- Delivery dashboard exposes available and assigned return pickups, collection proof and seller handover proof. Buyer sees the return-case status and seller refund reference in the tracking panel.
- Pickup and handover use mandatory agent-entered proof/reference values, not OTP or photo uploads.
- COD/UPI refunds are externally executed by the seller. Cash refund evidence or UPI transaction reference is recorded; no platform money movement is implemented.
- Bulk inventory update, stock movement/audit ledger, inventory reservation visibility.
- Downloadable invoices, packing slips, pickup manifests or courier label generation.
- Seller statement export, fee/commission breakdown and settlement reconciliation.
- Durable notification centre and support tickets.
- Net margin, SKU profitability or return-rate analytics.

These require explicit contracts and staging verification before being represented as complete.
- Bulk inventory update, stock movement/audit ledger, inventory reservation visibility.
- Downloadable invoices, packing slips, pickup manifests or courier label generation.
- Seller statement export, fee/commission breakdown and settlement reconciliation.
- Durable notification centre and support tickets.
- Net margin, SKU profitability or return-rate analytics.

These need explicit API/DTO/domain/ownership/transaction contracts, migration and rollback design, and staging Oracle verification before being exposed. In particular, customer pays the seller directly; refunds remain seller-funded and externally executed. The platform records/reconciles the reference only. No aggregator, wallet, escrow, platform fund custody or automatic transfer is introduced.

## Verification and release gates

- TypeScript, frontend regression tests and seller portal production build.
- Backend Maven tests, controller/service authorization tests and security scans.
- Browser E2E for seller role, seller-owned orders, UPI confirmation and refund action visibility.
- Staging Oracle V51/V52 migration rehearsal and synthetic buyer -> seller decision -> delivery claim/pickup/handover -> seller original-mode refund lifecycle, including category override and expired-window rejection.
- Negative tests for cross-seller payment/refund/order access.
- Manual responsive acceptance on iPhone Safari and desktop.
- No production launch claim until staging and deployed seller portal are checked.
