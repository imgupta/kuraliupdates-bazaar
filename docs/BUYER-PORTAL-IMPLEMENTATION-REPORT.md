# Buyer Portal Implementation Report

**Branch:** `feat/buyer-portal-complete-seller-direct-checkout`  
**Status:** Expanded implementation committed to this branch; final verification pending  
**Date:** 22 November 2026

This is a single consolidated implementation on PR #390. It does not create a new PR and does not claim production readiness before CI, migration and staging evidence.

## Implemented

### Buyer shopping and checkout
- Removed the implicit ₹3,000 catalogue maximum; a maximum price applies only when explicitly selected.
- Product cards use one primary ADD action followed by quantity controls.
- Newly accepted bargain offers auto-add/update at the agreed price, retain accepted offer identity, and are not recreated by historical chat hydration or polling after buyer removal.
- Buy Now uses an isolated item set and preserves the existing basket on success/failure.
- Multi-seller checkout remains one buyer group with seller-owned suborders. Delivery fee is allocated proportionally across seller suborders with a rounding remainder assigned to the last suborder.
- Checkout request carries a buyer-scoped idempotency key and request hash; the backend replays matching existing order/group and rejects reuse with a different payload.
- Existing max-seller setting is enforced. Delivery radius uses verified seller coordinates and buyer coordinates. Combined route uses Google road distance when available and a verified-coordinate nearest-neighbour fallback estimate otherwise; the configured route maximum is enforced when a route estimate is available.
- COD is controlled per seller by an admin-configurable flag. Existing sellers default to COD enabled.
- Admin-configurable buyer delivery ETA remains in place; V48 resolves the earlier duplicate V22 migration-version collision.

### Seller-direct UPI payment lifecycle
- Seller can submit/change its UPI ID and payee name. Any change resets verification and disables the destination.
- Admin can review, verify/activate or reject a seller destination. Only verified and active destinations are eligible for new UPI checkouts.
- Each UPI seller suborder receives its own payment record, exact amount, seller UPI/payee snapshot and 24-hour expiry.
- Buyer can view per-seller instructions, copy the UPI ID, submit a UTR/reference, see seller confirmation/rejection/expiry and request a seller-funded refund.
- Buyer payment actions are scoped by authenticated stable user ID; seller payment reads and decisions are scoped by the authenticated seller profile; admin configuration/review requires active admin authority.
- UTR submission uses a retry-stable idempotency key and a unique UTR constraint. UTR submission and UPI app return are never treated as proof of payment.
- Seller can explicitly confirm/reject submitted UTR. Confirmed payment updates only that seller suborder to PAID.
- UPI orders cannot transition to READY_FOR_PICKUP before seller confirmation. Buyer/seller cancellation closes unpaid payment obligations; paid orders cannot use the unpaid cancellation path.
- Multi-seller checkout shows separate seller payment obligations, so one seller's confirmation does not mark another seller paid.
- Seller refund workflow supports buyer request, seller initiation, seller rejection and seller completion with an actual external refund reference. KuraliUpdates does not initiate or fund the transfer.

### Buyer support and admin operations
- Buyer can report missing item, wrong item, damaged item, poor quality, not delivered, payment, refund or other issues against a specific seller suborder.
- Admin can view, mark in review and resolve buyer issues; issue status changes are audited.
- Admin can enable/disable COD per seller.
- Seller portal includes payment destination setup, payment review and refund workflow.

### Database and documentation
- V48: buyer ETA migration (re-versioned from duplicate V22).
- V49: order buyer-user ownership, per-seller COD setting, seller UPI destination, seller payment records, payment audit, order issues and buyer checkout idempotency.
- Added [seller-direct payment lifecycle design](BUYER-PORTAL-PAYMENT-LIFECYCLE.md), including API contract, state diagram, data model, security boundaries, migration and operational limitations.

## Critical boundaries and known limitations

- No payment aggregator, platform wallet, escrow, pooled funds or seller payout automation.
- Admin verification is an operational attestation after checking seller ownership evidence; no bank/PSP UPI ownership verification API is integrated.
- Buyer UTR remains an unverified claim until seller confirmation. Seller confirmation is operational evidence, not independent bank settlement verification.
- Seller refund completion is a seller-entered external refund reference, not bank-verified.
- Expiry is applied when buyer/seller payment APIs are read/reviewed; no scheduled background expiry worker.
- Coordinate radius checks require verified seller coordinates and buyer coordinates. When required coordinates are missing/unverified, the system cannot prove that the seller is within the configured radius.
- Smart English/Hindi/Hinglish synonym/transliteration expansion, Buy Again, favourites and saved lists remain secondary buyer-experience work.
- No staging DB, production data, seller UPI destination or real payment was modified.

## Verification record

| Check | Result |
|---|---|
| Source changes | Committed to PR #390 branch |
| Seller-direct payment service tests | Added; CI execution pending |
| Existing order/seller service test injection | Updated for new service dependency |
| Frontend TypeScript/build | Pending latest-head CI |
| Backend tests | Pending latest-head CI |
| Security scans / Docker gate | Pending latest-head CI |
| Browser E2E and read-only API smoke | Pending latest-head CI |
| Oracle V48/V49 migration execution | Not yet verified against staging Oracle |
| Multi-seller UPI partial-payment rehearsal | Not run |
| UTR duplicate/idempotency concurrency rehearsal | Not run |
| Seller/admin/buyer live staging E2E | Not run |
| Final status | **IMPLEMENTED IN SOURCE — VERIFICATION PENDING** |

## Merge gate

Keep PR #390 draft until the exact final HEAD passes all required CI jobs, Flyway V48/V49 are verified against an isolated staging schema, and the synthetic buyer/seller/admin payment lifecycle plus concurrency/idempotency scenarios pass. No live customer payment or production rollout is authorized by these source changes alone.
