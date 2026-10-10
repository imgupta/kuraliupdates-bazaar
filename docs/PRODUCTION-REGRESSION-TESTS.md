# Staging End-to-End Regression Checklist

Environment: **staging only** for the workflows below. Confirm the frontend deployment, Render service, and Oracle target before running mutating tests. Do not run these tests against the public production domain or an unverified database.

## Environment and safety gate

Before test execution, record:
- UTC timestamp, frontend deployment ID/URL and commit SHA.
- Render service/deployment ID and commit SHA.
- Oracle schema/database identity verified from approved, sanitized deployment configuration or a read-only database identity check. Never output host secrets, wallet data, passwords, tokens, OTPs, or user PII.
- Confirmation that staging and production are isolated and that staging cleanup has owner authorization.

The one-time Flyway migration `V13__reset_staging_test_data.sql` is destructive. It deletes business/test records and retains selected admin accounts before reseeding Daily Help catalogue rows. It is **not** a routine regression test. Never edit an applied migration; any correction must use a new versioned migration. Do not rerun or repair V13 simply to clear an application defect.

## Execution record

Record each case as PASS, FAIL, or BLOCKED with sanitized evidence. A green build or health response is not proof of end-to-end behavior. Never log OTP values or authentication secrets.

| ID | Area | Test | Expected result | Status |
|---|---|---|---|---|
| STG-001 | Availability | API health and DB readiness | Health reports application and database ready | Pending |
| STG-002 | Schema | Inspect Flyway history read-only | V13 is successful; no failed/pending migration | Pending |
| AUTH-001 | Login | Request an email OTP once | One request succeeds; no duplicated request | Pending |
| AUTH-002 | Login | Submit current user-provided OTP once | Session is created, expected role is selected | Pending |
| AUTH-003 | Session | Open My Account and navigate away/back | Session remains valid | Pending |
| AUTH-004 | Login | Wrong, expired, and reused OTP | Rejected with clear response; no new session | Pending |
| BUY-001 | Catalogue | Search products and open details | API-backed catalogue responds without 5xx | Pending |
| BUY-002 | Cart | Add/remove items and change quantities | Cart and totals remain consistent | Pending |
| BUY-003 | Checkout | Place one synthetic test order | One persisted order is created; canonical server order ID is retained | Pending |
| BUY-004 | Tracking | Refresh/reopen the order | Same order and persisted status are returned; no duplicate order | Pending |
| SELL-001 | Seller | Load orders as approved seller | Only that seller's orders are visible | Pending |
| SELL-002 | Seller | Mark synthetic order accepted then ready for pickup | Server validates and persists lifecycle transitions | Pending |
| DEL-001 | Delivery | Pending agent requests pickup jobs | Denied until agent is ACTIVE | Pending |
| DEL-002 | Delivery | Active agent loads available jobs | READY_FOR_PICKUP orders appear | Pending |
| DEL-003 | Delivery | Claim an available synthetic order | Canonical order is assigned to one agent; a competing claim is rejected | Pending |
| DEL-004 | Delivery OTP | Enter correct four-digit OTP on the dashboard | Browser permits numeric input; backend accepts persisted OTP for exact order/agent | Pending |
| DEL-005 | Delivery OTP | Read back the order after success | Server status is DELIVERED; COD is PAID; payout/trip updates occur once | Pending |
| DEL-006 | Delivery OTP | Replay the same OTP after delivery | Rejected; no additional payout or trip count | Pending |
| DEL-007 | Delivery OTP | Submit incorrect or malformed OTP | Rejected without changing order status or payout | Pending |
| DEL-008 | Delivery OTP | Submit correct OTP as a different agent | Forbidden; no order mutation | Pending |
| DEL-009 | Delivery | Resend OTP then submit old code | Old code rejected, newest persisted OTP accepted; resend cooldown enforced | Pending |
| HELP-001 | Daily Help | Load service catalogue and availability | Active service catalogue and eligible slots returned | Pending |
| HELP-002 | Daily Help | Book available slot using synthetic buyer/provider | Booking and slot reservation commit together | Pending |
| HELP-003 | Daily Help | Attempt concurrent duplicate booking | At most one booking succeeds | Pending |
| HELP-004 | Daily Help | Professional updates slots/availability | Customer view reflects persisted availability | Pending |
| ADMIN-001 | Admin | Load analytics and review service logs | No unhandled exception/5xx | Pending |
| ADMIN-002 | Admin | Approve/reject synthetic seller or delivery agent | Only authorized admin can make permitted transition | Pending |
| PROFILE-001 | Profile | Add/update address and reload | Address changes persist | Pending |
| PROFILE-002 | Profile | Account with multiple saved addresses | All persisted addresses load and stay present after refresh/session restore | Pending |
| REG-001 | Regression | Review sanitized backend logs and API responses | No unexpected 5xx, auth drift, secrets, or OTPs in logs | Pending |

## Test data and workflow

1. Use dedicated staging-only synthetic accounts and records. Avoid real payments, real customers, and real SMS/email delivery unless specifically intended.
2. Use the UI and documented authenticated API flow, preserving the canonical order ID from server responses. Do not read, print, or commit OTPs from raw logs.
3. Capture status codes, response shape, order status, and non-sensitive record identifiers only.
4. For any failure, add a regression test reproducing it, fix the cause, run focused tests then the full frontend/backend checks, and repeat the failing scenario.
5. After any change, verify the actual deployed frontend and backend commit. A Vercel READY or Render LIVE badge alone does not establish the end-to-end flow is working.

## Current known fix

The delivery dashboard's four-digit regex was over-escaped, causing valid numeric OTPs to fail client-side before the server call. PR #36 corrected it and added backend unit tests for successful verification/payout, incorrect OTP rejection, and assignment ownership. Those automated checks passed before merge. The full staging user-interface-to-Oracle flow remains to be executed and recorded as above.
