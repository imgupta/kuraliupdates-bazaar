# Phase 1 staging transactional E2E

The transactional Playwright suite now provisions a short-lived synthetic product, Daily Help service and one-hour future slot through the protected staging-only fixture endpoint. It does not create accounts or promote role profiles.

Required pre-existing dedicated account and profiles:
- one shared email identity configured for BUYER, SELLER, DELIVERY, PROFESSIONAL and ADMIN; the API must return all five roles for that same account;
- approved and open seller profile, ACTIVE and available delivery-agent profile, and verified and AVAILABLE Daily Help professional profile;
- all three profiles must resolve to the same `USERS.USER_ID` as the shared email. Seller and delivery IDs are checked against authenticated `/sellers/me` and `/delivery/me` responses; the professional profile is resolved from the shared account at runtime. Profile IDs do not need an artificial `E2E-` prefix.

Each created fixture carries the current run ID in V32-added nullable columns. Existing business rows remain NULL and are not eligible for test cleanup.

## Execution contract

1. PR/push workflows run backend/frontend verification and read-only smoke. They do not create orders or bookings.
2. Trusted manual/scheduled runs may enable transactional E2E only against the pinned staging API, with the same five-role email, a 32+ character flow token, and the dedicated profile ownership/readiness checks above. The dedicated Phase 1 workflow requires `confirm_staging_mutations=true`; its default is false.
3. The trusted workflow waits for database-backed /health readiness, then uses normal application APIs and service transitions: bargaining, COD checkout, seller acceptance/readiness, rider claim and delivery OTP; Daily Help booking, provider arrival/readiness, start OTP and completion.
4. Every test uses a unique run ID. Cleanup validates all run-tagged relationships before the first write, restores stock from that run's order items, then deletes only that run's chat, booking, order, product, slot, service and sessions.
5. Seller, rider, professional and user profiles are never deleted or silently approved. Issuing a staging ADMIN-scoped session must not mutate the account's primary role or persistent admin flag.

## Boundaries

- COD is used; no real payment gateway is called.
- OTPs are generated and verified by the normal application logic. No global OTP bypass is introduced.
- Test addresses are explicitly synthetic/do-not-deliver; no physical service visit is initiated.
- If a profile is missing or not approved/active/verified, provisioning fails closed.
- A sequential staging journey is not proof of Oracle concurrency/race safety. The transactional suite separately checks concurrent rider claims, competing Daily Help slot bookings, concurrent last-stock checkout and multi-seller rollback.

## Cancellation and inventory restoration coverage

The current implementation branch adds a run-scoped staging scenario that exercises buyer cancellation and seller cancellation through their public APIs. It checks order/fulfilment cancellation state, preservation of the unpaid COD `PENDING_COD` payment state, stock decrement and restoration, and idempotent cancellation replay. Render logs from the first run exposed an Oracle check-constraint violation because the services attempted to write unsupported `PAYMENT_STATUS='CANCELLED'`; the correction keeps payment lifecycle separate from order cancellation. The scenario uses only the provisioned synthetic product and run-tagged orders; guarded cleanup removes only rows tagged to that run. Runtime proof requires the trusted staging workflow to execute successfully against the merged/deployed exact backend SHA. Paid-order cancellation remains rejected because no refund workflow exists.


## Public endpoint throttling

The same release adds database-backed fixed-window limits for seller registration lead creation (contact pair, email and phone), OTP and callback operations, and search analytics. Only SHA-256 bucket hashes are stored in API_RATE_LIMIT_BUCKETS; contact details and client identifiers are not stored in the rate-limit table. Seller lead input lengths are validated before persistence. The staging workflow does not generate public leads or send OTPs as part of its transactional order tests.

## Runtime verification addendum — 7 November 2026

The main-branch transactional workflow now has a successful exact-backend-commit run: [42365076271](https://github.com/imgupta/kuraliupdates-bazaar/actions/runs/42365076271).

- Expected backend SHA was resolved from the live Render deployment; readiness required 12 consecutive healthy API/database responses over two minutes.
- Five Playwright test groups passed: order/bargaining/seller/delivery lifecycle; Daily Help slot/OTP lifecycle; multi-seller rollback; concurrent last-stock checkout; admin approval-queue authorization.
- Result: **5 passed, 0 failed, 0 skipped**. Artifact ID `13571925468`.
- Test fixtures are run-scoped and cleanup is executed by the suite. The test report is evidence for the exercised synthetic staging scenarios, not for a separate isolated Oracle schema or every P1-C race.

The admin test is now enabled for the `push` event, with the existing staging URL, staging environment and configured role-identity checks retained. PR #289 is merged.

## Combined checkout group claim coverage — bounded unit evidence

The current staging Playwright suite verifies a concurrent claim race on a single seller order using the configured active delivery identity. It does not currently provision a second active delivery profile or exercise the combined-checkout-group claim endpoint.

Service-level regression tests now cover:
- authenticated delivery profile ownership for combined group claims;
- rejection before DB/order access when the caller supplies another agent ID;
- assignment of all seller orders to one authenticated agent with a shared OTP and one group payout snapshot;
- rejection of partially ready groups without mutation.

These mocked service tests are not Oracle concurrency evidence. A two-distinct-agent combined-group race remains blocked until a dedicated isolated Oracle target and two approved synthetic active delivery identities are available.

## Daily Help completion precision finding — 7 November 2026

A staging rerun found a one-microsecond mismatch in `serviceCompletedAt` between the completion response and the next read. Oracle stores `TIMESTAMP(6)`; completion had returned a nanosecond-precision local timestamp. The completion service now normalizes the timestamp to microseconds before save/response, with a focused regression test. The failed staging run is retained as a failure (4 passed plus one flaky test); a fresh exact-commit run is required after deployment.


## Staging readiness runtime reduction — 7 November 2026

The actual main-push run `42365076271` showed that the database readiness gate consumed about 1 minute 55 seconds because it required 12 consecutive successful `/health` responses at 10-second intervals, after the exact Render backend SHA and `database=UP` were already verified. The workflow now requires three consecutive successful probes at 5-second intervals (approximately 10–15 seconds after the first successful response). Every probe must still return HTTP success, API `UP`, database `UP`, and the exact expected backend commit. The eight-minute outer deadline remains to accommodate Render cold starts; a failed or mismatched probe resets the consecutive counter. This reduces repeated DB load without removing database or deployment identity verification. Transactional Playwright tests remain serial because they share staging role identities and exercise overlapping account-level history and cleanup behavior.


## Measured runtime and next optimization — 7 November 2026

Main staging run #30 (commit `3297899541d640c90f93561fbba37092fd9c8b3f`) passed all five transactional tests. Job logs show about 24 seconds for setup, about 92 seconds until the first healthy API/database response, about 11 seconds for the three consecutive exact-commit readiness probes after first health, and 3m04s for the Playwright suite. Total job duration was about 5m17s; workflow creation-to-completion was about 6m34s including runner scheduling delay.

The readiness change from 12 probes at 10-second intervals to three probes at five-second intervals is working, but Render cold start dominates the first response. A follow-up best-effort read-only warm-up job now runs concurrently with browser setup. It does not use staging secrets or mutate data; the transactional job's exact backend SHA, API-UP and database-UP readiness check remains authoritative. Independent read-only assertions in the transactional spec are run concurrently; state-changing operations and dependent lifecycle transitions remain sequential. Expected savings are not considered verified until a fresh main run records them.
