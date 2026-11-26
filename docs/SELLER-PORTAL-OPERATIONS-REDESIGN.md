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
- A dedicated Returns & refunds workspace exposes the already-supported seller payment/refund records and actions that were previously hidden by the parent portal.
- The refund workspace clearly states that refunds are seller-funded and KuraliUpdates does not transfer funds.
- UPI destination setup remains in Payments & UPI; no payment destination or custody model changed.

## Explicitly not claimed / remaining backend work

The following are not implemented by this UI slice and must not be represented as live capabilities:
- Physical item return requests, return approval/dispute, reverse pickup, item receipt/QC, partial item returns, replacement and RTO/courier-return processing.
- Seller return policy configuration or automatic return eligibility windows.
- Bulk inventory update, stock movement/audit ledger, inventory reservation visibility.
- Downloadable invoices, packing slips, pickup manifests or courier label generation.
- Seller statement export, fee/commission breakdown and settlement reconciliation.
- Durable notification centre and support tickets.
- Net margin, SKU profitability or return-rate analytics.

These need explicit API/DTO/domain/ownership/transaction contracts, migration and rollback design, and staging Oracle verification before being exposed. In particular, customer pays the seller directly; refunds remain seller-funded and externally executed. The platform records/reconciles the reference only. No aggregator, wallet, escrow, platform fund custody or automatic transfer is introduced.

## Verification and release gates

- TypeScript, frontend regression tests and seller portal production build.
- Backend tests and security checks if backend source changes are added.
- Browser E2E for seller role, seller-owned orders, UPI confirmation and refund action visibility.
- Staging test with synthetic buyer/seller accounts for refund request -> seller initiation -> external reference recording -> reconciliation.
- Negative tests for cross-seller payment/refund/order access.
- Manual responsive acceptance on iPhone Safari and desktop.
- No production launch claim until staging and deployed seller portal are checked.
