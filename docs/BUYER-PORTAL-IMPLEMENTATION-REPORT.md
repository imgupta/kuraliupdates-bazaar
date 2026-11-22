# Buyer Portal Implementation Report

**Branch:** `feat/buyer-portal-complete-seller-direct-checkout`  
**Status:** Partial implementation — not complete  
**Date:** 22 November 2026

This report records only changes present in this branch. It does not mark the approved implementation plan complete.

## Implemented in this branch

- Removed the default ₹3,000 catalogue maximum-price filter. A maximum price applies only after the buyer explicitly selects one.
- Simplified product cards to show a single **ADD** action before an item is in the basket, then quantity decrement/increment controls. Removed the competing Buy Now action from each product card; Buy Now remains available from product details.
- Implemented accepted-bargain auto-add for a newly observed transition from a non-accepted state to `ACCEPTED`. It uses the agreed price and accepted message ID. The transition is processed once per observed conversation state; historical accepted chats loaded on initial hydration do not repopulate a basket, and subsequent polling does not recreate an item after the buyer removes it.
- Added an isolated Buy Now item set. Buy Now submits only the selected item and does not clear or mutate the buyer's existing basket. Normal basket checkout continues to use and clear the basket only after server confirmation.
- Replaced hardcoded delivery promises with an admin-configurable buyer ETA in Delivery & Fulfilment settings (0 disables the estimate; 5–360 minutes can be configured). The backend snapshots the configured value on new delivery orders; store-pickup orders have no delivery ETA. Existing orders retain their original snapshot. Checkout/tracking show only the server-provided configured estimate.
- Added source-level regression tests for the above behaviours.

## Existing backend behavior retained

- Multi-seller COD checkout already creates seller-owned suborders under one checkout group in a transaction.
- Server-side product, stock, seller, bargain and amount validation remains authoritative.
- Online payments are not enabled in the backend. `OrderService.placeOrder` and `placeMultiSellerOrder` currently reject payment methods other than COD. The buyer UI must not imply that UPI/card payment is available.

## Mandatory work still outstanding — do not mark complete

### Direct seller UPI payments
The current repository does not contain the required verified seller payment-destination model or a complete payment lifecycle. The following are not implemented by this branch:

- Seller UPI ID/QR configuration, admin verification and activation controls.
- Immutable verified destination snapshot on each seller suborder.
- Seller-specific payment records and exact per-seller payment instructions.
- Buyer UTR/reference submission and seller-only confirmation/rejection endpoints.
- Payment state machine, partial-payment group state, expiry and resume flow.
- Dispatch/fulfilment enforcement for unpaid seller suborders.
- Seller-funded refund lifecycle and buyer-visible refund evidence.
- Audit records and buyer/seller/admin authorization tests for these actions.

No aggregator, wallet, escrow, pooled account or platform-held funds have been introduced. Do not work around the missing payment lifecycle by deriving UPI IDs from seller phone numbers, trusting a buyer screenshot/UTR as proof, or marking a payment paid when the buyer returns from a UPI app.

### Remaining buyer experience
- Seller-by-seller payable breakdown and payment progress UI for grouped orders.
- Smart English/Hindi/Hinglish search and spelling normalization.
- Buyer issue reporting and support workflow.
- Buy Again, favourites and saved shopping lists.
- Full accessibility/responsive and buyer order-history regression coverage.

## Verification record

| Check | Result |
|---|---|
| Implementation source changes | Present on branch |
| Regression tests added | Present; execution pending |
| Admin-configurable buyer ETA | Implemented in UI/API/backend with migration V22; execution pending |
| Frontend lint/typecheck | Not run in this environment |
| Frontend production build | Not run in this environment |
| Backend test suite | Not run in this environment |
| Playwright buyer flows | Not run |
| Direct seller UPI lifecycle | Not implemented |
| Partial payment / seller confirmation | Not implemented |
| Staging verification | Not run |
| Final status | **PARTIAL — NOT COMPLETE** |

## Completion gate

The approved plan in [BUYER-PORTAL-IMPLEMENTATION-PLAN.md](BUYER-PORTAL-IMPLEMENTATION-PLAN.md) remains authoritative. Overall completion requires the direct-seller payment lifecycle and all mandatory acceptance criteria to be implemented and verified in the same consolidated feature PR. This report must be updated with exact CI head SHA, test evidence, migration details and staging results before the plan is marked complete.
