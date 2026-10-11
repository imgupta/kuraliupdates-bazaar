# Staging End-to-End Regression Checklist

Environment: **the single deployed environment, designated staging by the owner**. There is no separate production or staging deployment to switch between; the public site/domain and Render API are used as staging. Confirm the frontend deployment, Render service, and configured Oracle target before running mutating tests. Treat all data on this single environment as staging test data, and do not assume environment isolation.

## Environment and safety gate

Before test execution, record:
- UTC timestamp, frontend deployment ID/URL and commit SHA.
- Render service/deployment ID and commit SHA.
- Oracle schema/database identity verified from approved, sanitized deployment configuration or a read-only database identity check. Never output host secrets, wallet data, passwords, tokens, OTPs, or user PII.
- Owner confirmation that the single deployed environment is staging and that scoped staging cleanup is authorized.

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

The Render startup logs subsequently confirmed that Flyway validated 13 migrations, reported schema version 13, and found no migration pending on the currently deployed Oracle schema. This is a sanitized startup-log confirmation of V13/schema level; it is not an independent check of the database's staging-vs-production identity. The API health controller currently returns a static database label, so that endpoint alone must not be used as proof of Oracle target identity.

The currently observed deployment SHA is `b970c391b040596128236fbb20be62a6e3cdff15` on both the LIVE Render service and the READY Vercel custom-domain deployment metadata. GitHub frontend and backend checks for this SHA passed.


## Staging reset and delivery OTP status — 11 October 2026

### Staging database reset / V13
The owner reports that staging data was cleaned and Flyway V13 was executed. The repository's intended migration is `V13__reset_staging_test_data.sql`; it is a one-time destructive **data reset**, not a schema reset. It disables Oracle parallel DML, clears business/workflow/test records, retains designated admin accounts, and reseeds the standard Daily Help catalogue. Never edit or rerun an applied migration to fix application defects. The execution report still needs read-only confirmation from `flyway_schema_history` and a sanitized database/schema identity; do not infer it from a healthy API response alone.

### Delivery OTP
- PR #36 was merged. It corrected the over-escaped browser regex, and focused OTP tests plus full backend verification passed before merge.
- Subsequent `main` commit `b970c391b040596128236fbb20be62a6e3cdff15` adds awaited server-authoritative delivery claiming and further tests for leading-zero OTP, malformed input, replay protection, and payout idempotency.
- Render deployment `dep-db5b5u15efls73ah5cj0` is LIVE on that commit. The Vercel custom-domain lookup also reports READY on that commit.
- Code-level checks passing do not constitute end-to-end proof. Complete the DEL-002 through DEL-009 cases using a dedicated staging buyer, seller, and active delivery agent; preserve the canonical order ID; verify the persisted OTP-to-order assignment; check server status read-back after success; and ensure invalid/replayed codes do not change payout or trip counts.
- Never log or publish OTP values, bearer tokens, raw authentication payloads, Oracle wallet/configuration secrets, or personal data.

### Release safety caveat
The checked Render account currently lists one web service on `main`, and no dedicated staging service is separately identified in the account metadata. The owner has stated that this is staging; before any end-to-end test that creates/mutates data, capture the approved staging Oracle target/schema identity from a safe configuration source or read-only database identity query. Do not run destructive resets or mutating end-to-end tests against an unverified target.


## Live staging validation run — 11 October 2026

### Observed deployment state
- GitHub main was at `a13681489990fe2d0910135845b420c49933b366` at the start of this review.
- Vercel custom-domain deployment metadata reports READY on that same frontend commit.
- Render service `srv-db0fv9egekts739hfa6g` reports LIVE on backend commit `b970c391b040596128236fbb20be62a6e3cdff15`.
- The two deployments are not built from the same commit. Treat this as a staging release skew and record it in each test result.
- Render application startup logs show Flyway validated 13 migrations and current schema version 13, with no migration pending. This confirms Flyway's reported level on the connected schema but does not, by itself, prove that schema is isolated staging.
- The latest scheduled endpoint smoke workflow passed; it is read-only and is not an order-level E2E test.

### Deployment/configuration gate
The owner has stated that the currently tested environment is staging. Before creating or mutating synthetic records, verify the Oracle target using a safe, read-only identity query or approved deployment configuration. Never print the TNS URL, wallet path contents, credentials, tokens, or PII. The repository currently lists a single Render service on `main`, so do not infer environment isolation from the service name.

### OTP-specific proof that is still outstanding
Record each as PASS/FAIL/BLOCKED after a real staging run:
- [ ] Delivery UI accepts four numeric digits, including a leading zero.
- [ ] Claim response is awaited; failed/conflicting claim does not optimistically update local status.
- [ ] Backend maps OTP to the exact server-generated order ID and persisted row.
- [ ] Correct OTP for the assigned active agent transitions the order to DELIVERED.
- [ ] COD payment state becomes PAID and payout/trip counters change once.
- [ ] Wrong/malformed OTP, wrong agent, and post-delivery replay do not mutate order/payout.
- [ ] Resend rotates persisted OTP and enforces cooldown; old OTP fails.
- [ ] Read the order back from the server after each state-changing step.
- [ ] Delete only records marked as synthetic by this run, using an approved scoped cleanup procedure (never V13 as a test cleanup loop).

Do not mark these cases passed based on unit tests, health status, or deployment badges alone.


## Run update — 11 October 2026 (after commit 64bd645)

### Verified deployment and CI
- Render service is LIVE on backend commit `64bd645f55437cf23977ebf5b2ceeef8dc6e2510`; the service completed startup and logged `Started KuraliBazaarApplication`.
- Vercel deployment `dpl_CGS929cKJeF36S4eUENYwHxaDjyx` is READY on the same `64bd645` main commit, with the site's aliases attached.
- Render logs show no error/exception lines at startup, but the connected log feed returned no request access logs for the observation interval, so no successful public /health request is claimed from that evidence.
- GitHub Actions run [38112645576](https://github.com/imgupta/kuraliupdates-bazaar/actions/runs/38112645576) passed: frontend type checks, OTP validator regression, frontend build, focused delivery/health/address/Daily Help tests, and the full backend `mvn clean verify` suite.

### Additional automated coverage
- PR #42 adds test cases for loading multiple persisted addresses in repository order without rewriting saved rows, refusing updates to an address that belongs to another user, and changing the default address while syncing the primary address fields.
- The focused CI gate now includes `BuyerAddressServiceTest` and `DailyHelpServiceTest` as well as delivery OTP/tracking and health tests.
- PR #42 is a test-only change set and is currently open; tests passed on its head commit. No live service deployment was triggered by this PR because it has not been merged.

### Runtime execution record (do not infer PASS from unit tests)
| ID group | Result | Evidence / blocker |
|---|---|---|
| DEPLOY-001 | PASS | Render LIVE, Vercel READY on commit `64bd645` |
| CI-001 | PASS | Frontend checks/build and focused + full backend suite in Actions run 38112645576 |
| STG-001 | BLOCKED | No live HTTP request result was returned by the available runtime tools; a healthy startup log is not an HTTP health response |
| STG-002 | PARTIAL | Startup logs state Flyway validated 13 migrations and schema was at V13; not a fresh read-only `flyway_schema_history` query in this run |
| AUTH-001–004 | BLOCKED | No verified admin session or current OTP was available to this run |
| BUY-001–004 | BLOCKED | No admin-authenticated test harness/session and scoped synthetic order fixture available |
| SELL-001–002 | BLOCKED | Requires authenticated seller/test order workflow; not run |
| DEL-001–009 | BLOCKED | Unit regressions pass; live buyer-to-seller-to-active-agent OTP, persisted state read-back and payout verification not run |
| HELP-001–004 | BLOCKED | Unit Daily Help tests pass; authenticated user/provider booking lifecycle not run live |
| ADMIN-001–002 | BLOCKED | Admin routes require ROLE_ADMIN and a valid session; no session was supplied to this run |
| PROFILE-001–002 | BLOCKED | Service-level address regressions pass; live authenticated account screen and multiple-address reload not run |
| CLEANUP | NOT RUN | No broad deletion. V13 is a destructive one-time migration, not routine cleanup. No scoped synthetic record set was created by this run |

### Runtime safety gates still open
1. Configure the repository variable `KURALI_STAGING_API_BASE_URL` to the verified staging API base URL. Scheduled smoke run 38112156596 failed at the explicit missing-variable gate before issuing an HTTP request.
2. Run one read-only DB/schema identity query through an approved access path to confirm target/schema identity and V13 history before any mutation. Do not print connection strings, wallet information, secrets or PII.
3. Provide/use the existing admin account's normal login/OTP in the staging UI to establish an admin session; do not bypass OTP or manufacture an auth token.
4. Use only run-tagged synthetic records and scoped cleanup; never re-run V13 as cleanup.
5. For live order delivery E2E, create a synthetic buyer order, advance seller state, assign one active agent, verify correct/wrong/replayed OTPs, then read back order/payment/payout/trip state from APIs before cleaning only that run's fixtures.


## Environment model correction — 11 October 2026

The owner confirms there is **one deployed environment and it is staging**. There is no separate production environment or separate staging environment. The public website/custom domain and the Render API represent the same staging deployment and must be treated as staging for this work. Earlier references requiring production/staging isolation or a separate staging URL are superseded by this owner clarification.

- Do not block the workflow waiting for a nonexistent second environment.
- Keep the smoke test read-only by default.
- Use the known staging API base only after checking that it matches the owner's current single deployed API; do not use a missing variable as the sole blocker when the canonical API base is already documented.
- Never rerun V13 just to clean records; cleanup must be scoped to the synthetic records created by a specific run.
- Live authenticated actions still require a valid admin session established through the normal login/OTP path. Do not fake or bypass an admin token.

### Live authenticated E2E status
Automated unit/build tests passed in Action run 38112710952. This does **not** prove the UI-to-Oracle order, payout, address-screen or Daily Help journeys; those cases remain outstanding until the app is exercised with the real staging admin session and test fixtures.
