# Production End-to-End Regression Checklist

Environment: production only (controlled testing; no staging).
Test account: Shubham.gupta180296@gmail.com.
OTP handling: read the test OTP from the approved production database/session store only when authorized; never print or commit OTPs, tokens, passwords, or PII in logs/artifacts.

## Execution record

Record each run with timestamp, build/commit SHA, environment, result (PASS/FAIL/BLOCKED), and sanitized evidence. Do not mark a flow PASS from a build or health check alone.

| ID | Area | Test | Expected result | Status |
|---|---|---|---|---|
| PROD-001 | Availability | API health and database readiness | Health returns success after service is ready | Pending |
| AUTH-001 | Login | Request email OTP for test account | OTP request succeeds once; no duplicate requests on one click | PASS: user received fresh OTP in production |
| AUTH-002 | Login | Submit user-provided current OTP once | Session created and user lands on intended screen | PASS: user confirmed successful production login |
| AUTH-003 | Login | Navigate to My Account after login | User remains authenticated; no logout/redirect loop | PASS: profile details visible and session retained |

| AUTH-004 | Login | Submit incorrect, expired, and reused OTP | Clear validation; no session created; no false “expired” after a successful first submission | Pending |
| BUY-001 | Catalogue | Search products and open product/store details | API-backed products display without 5xx errors | Pending |
| BUY-002 | Cart | Add/remove items and change quantities | Cart totals update consistently | Pending |
| BUY-003 | Checkout | Submit valid order using controlled test data | Exactly one server order is created; canonical server order ID is retained | Pending |
| BUY-004 | Checkout | Refresh/reopen order tracking | Same order and status are shown; no duplicate order is created | Pending |
| SELL-001 | Seller | Login as approved seller; load orders | Only that seller's orders appear | Pending |
| SELL-002 | Seller | Mark order accepted, then ready for pickup | Valid status transitions persist | Pending |
| DEL-001 | Delivery | Pending agent attempts to access pickup jobs | Access denied until approved/active | Pending |
| DEL-002 | Delivery | Active agent loads available pickup jobs | READY_FOR_PICKUP orders appear | Pending |
| DEL-003 | Delivery | Claim an available order | Server assigns the canonical order to exactly one agent | Pending |
| DEL-004 | Delivery OTP | Verify with correct OTP for claimed order | Order transitions to delivered; replay is rejected | Pending |
| DEL-005 | Delivery OTP | Wrong OTP, malformed OTP, another agent's order | Rejected without changing order state | Pending |
| HELP-001 | Daily Help | Load service catalogue and availability | Available services/slots are returned correctly | Pending |
| HELP-002 | Daily Help | Book an available slot | Booking and slot reservation commit atomically | Pending |
| HELP-003 | Daily Help | Attempt to book same slot twice | Second booking is rejected; no duplicate booking | Pending |
| HELP-004 | Daily Help | Professional updates availability; customer rechecks | Updated slots and booking eligibility agree | Pending |
| ADMIN-001 | Admin | Load demand-trends analytics with existing orders | Analytics returns successfully; no Hibernate LazyInitializationException | Fix proposed; verify after deploy |
| ADMIN-002 | Admin | Approve/reject seller and delivery agent | Only authorized admin can change status; change persists | Pending |
| PROFILE-001 | Profile | View/update buyer profile and address | Changes persist after refresh and re-login | Pending |
| PROFILE-002 | Profile | Sign in with an account that has multiple saved addresses | Use addresses included in the OTP response immediately; empty refresh responses must not erase existing same-account addresses | Follow-up fix implemented; pending CI and production verification |
| REG-001 | Regression | Inspect backend logs after each workflow | No new unhandled exceptions, unexpected 5xx, or auth/session errors | Pending |

## Safety and execution rules

- Run one flow at a time and record its result before proceeding.
- Use existing approved test accounts and controlled test orders; avoid real payments, real customer notifications, or destructive database changes.
- Never dump OTPs, session tokens, full user rows, or secrets into CI logs or test reports.
- If database access, account approval, or a test prerequisite is unavailable, record BLOCKED and continue with independent read-only checks.
- Deploy a fix only after automated checks pass; then confirm the actual production deployment and re-run the affected flow.
