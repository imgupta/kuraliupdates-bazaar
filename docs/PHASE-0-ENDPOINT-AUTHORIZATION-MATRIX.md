# Phase 0 — Endpoint authorization and state inventory

**Audit date:** 2026-11-11
**Scope:** Static source review of Spring MVC controllers, security filter chain, session filter, ownership checks and cross-origin headers. This is an implementation inventory, not a penetration-test certification.

## Route policy

The current Phase 0 branch uses explicit public method/path matchers. All routes not listed below require an authenticated session. /admin/** additionally requires ROLE_ADMIN.

| Route family | Public entry points | Protected operations / enforcement |
|---|---|---|
| Health and API docs | GET /health, /health/live, OpenAPI and Swagger GET paths | No user data; readiness checks datasource |
| Authentication | POST /auth/send-otp, /auth/registration-check, /auth/verify-otp, /auth/portal-handoff/redeem | Portal handoff creation, current profile, role list, onboarding status, profile/address changes and logout require session |
| Buyer | GET /buyers/products/search | Order creation/checkout require session; pickup confirmation and order tracking verify the owning buyer |
| Seller | POST /sellers/register is legacy and returns 410 | /sellers/me/** requires session; service methods resolve seller profile from authenticated user and enforce product/order ownership |
| Delivery | POST /delivery/register | /delivery/me and job actions require session; service verifies the agent profile belongs to the authenticated user and checks active approval |
| Daily Help | GET /daily-help/services, /daily-help/availability | Booking and professional profile, slot, job and earnings routes require session; professional ownership and buyer booking ownership are checked in controller/service |
| Tracking | None | /tracking/** requires session; location updates verify delivery-agent identity and active status; order tracking permits the owning buyer or assigned rider |
| Bargaining | None | /negotiations/** requires session; service resolves chat participant ownership and role |
| Seller onboarding leads | POST create, send contact OTPs, verify contact and callback | Applicant endpoints use high-entropy lead IDs and configured OTP checks; admin lead list/update/notes are under /admin/** |
| Seller documents | None | Seller upload/list require authenticated seller; document admin list/download/scan/verification paths are under /admin/** |
| Registration OTP policy | GET /seller-registration/otp-settings, GET /registration/otp-settings | Admin read/history/update paths are under /admin/** |
| Seller service radius | GET /seller-service-area | PUT is explicitly checked for ROLE_ADMIN in controller |
| Search analytics | POST /analytics/search | Public event ingestion; user attribution comes only from authenticated principal, never request-body userId |
| Staging E2E helpers | /e2e/** is route-permitted | Each helper fails closed unless explicitly staging-configured with a strong constant-time shared-secret check; auth helper also requires configured synthetic identities; cleanup validates run-tagged records before writes |

## Changes carried in this branch

1. Default-deny route policy with method-specific public allowlist and admin role enforcement.
2. Regression tests for public route access, protected unknown routes, valid/invalid sessions and non-admin rejection.
3. CORS now allows the custom headers used by the UI and run-scoped tests: X-Active-Role, X-E2E-Run-Id, X-E2E-Flow-Token and X-E2E-OTP-Token.
4. Search analytics ignores client-supplied identity; only a verified UserEntity session principal is attributed.
5. Delivery live-location updates now reject profiles not in ACTIVE status, even if a session token is otherwise valid.
6. Portal handoff uses a shared Oracle table in Flyway V31. It generates a 256-bit random code, stores only its SHA-256 digest, and consumes it with one conditional database update. Consume runs in REQUIRES_NEW so a later session/role rejection cannot roll back the one-time consume.
7. Every newly issued OTP session is bound to its verified/requested portal role in `USER_SESSIONS.ACTIVE_ROLE` (Flyway V35). A redeemed handoff creates a distinct session scoped to the target role, with expiry no later than the source session. The source session's role is not changed.

## Outstanding authorization and abuse controls

- Public seller lead endpoints now apply persistent, identifier-scoped Oracle rate budgets: lead creation is limited to 3/hour for the normalized email+phone pair and independently for email and phone; OTP send is 3/hour per lead; verification is 10/15 minutes per lead; callback requests are 2/day per lead. ApiRateLimitService stores only a SHA-256 bucket key. These are not per-IP limits or CAPTCHA, so network-level abuse controls remain an open follow-up. Controller tests assert that a rejected budget prevents the lead/OTP service from being invoked.
- Existing-lead lookup behavior can reveal that a matching email/phone pair has an active lead and returns its lead ID. Review enumeration and applicant-name update semantics before public launch.
- Public search analytics now applies a persistent fixed-window budget of 600 events/minute per anonymous remote IP and 300/minute per authenticated user. Query text is normalized and capped at 255 characters, and the client-supplied userId is ignored. Controller regression tests assert that a rejected rate-limit decision prevents persistence. The anonymous budget is still relatively permissive, and retention/deletion policy plus proxy-aware source-IP validation remain open.
- Complete IDOR tests are still required for every buyer order, seller product/order, delivery assignment, professional booking/slot and chat/offer identifier.
- Admin seller-lead and registration OTP-policy audit events now record the stable authenticated UserEntity.userId rather than Authentication.getName().
- Resource ownership remains the final authorization check for multi-profile accounts. Session role is now explicitly bound at login/registration or portal handoff; client role headers alone do not grant authority.
- E2E route permission is intentionally broad at the HTTP matcher but relies on controller-level fail-closed staging checks. Keep E2E secrets out of normal application environments and rotate them before production.
- Confirm CORS preflight behavior against every deployed frontend origin and custom header, not just the local MockMvc test.

## Verification boundaries

- Backend and frontend CI are required on the latest PR head.
- Database-backed readiness smoke and anonymous-access probes have passed on the shared staging deployment before V31 was added.
- V31 has not been applied to Oracle in this branch. Do not merge/deploy the new handoff persistence code until CI passes and the migration is validated through the normal staging deployment path.
- Browser coverage currently includes public portal/login checks; authenticated and transactional flows remain skipped until OTP capture and synthetic fixture configuration are explicitly approved.

## Multi-profile session role binding — 11 November 2026

Source review found a mismatch between Flyway V35's `ACTIVE_ROLE` column and runtime session creation: ordinary OTP registration/login sessions left it null, while handoff redemption returned the source session unchanged. `SessionAuthenticationFilter` then fell back to `USERS.ROLE`, which prevented a user with multiple profiles from using a handoff target role and could leave the source session's authority ambiguous across portal origins.

The fix creates new sessions with a validated role, and portal handoff redemption mints a new target-role session bounded by the source session expiry. Portal-specific login routes submit their intended role; the backend checks it against roles actually registered to the authenticated account. Tests cover target-role session creation, source-expiry preservation, rejection of unregistered target roles, and handoff returning the new token.

**Evidence boundary:** this is source and mocked-service/controller test evidence. No Oracle schema migration is added, no shared database was accessed, and no authenticated staging journey was run for this change.


## Admin audit actor refinement — 2026-11-06

The seller-lead update/note and registration OTP-policy update controllers now require an authenticated UserEntity principal and persist its stable userId as the audit actor. They no longer fall back to the generic ADMIN string or Authentication.getName(), which may not be a stable identifier for this principal type.


## Phase 1 — Bargaining chat ownership regression coverage (2026-11-06)

The bargaining service resolves each conversation by `CHAT_ID` and then compares the authenticated participant identity against the persisted owner:
- Buyer role: normalized authenticated account email must match `NEGOTIATION_CHATS.BUYER_EMAIL`.
- Seller role: authenticated email must resolve to an approved seller profile whose `SELLER_ID` matches the conversation's `SELLER_ID`.
- Only after participant ownership passes may message/offer lifecycle locks and writes occur.

Added `NegotiationChatServiceTest` regressions:
- An authenticated buyer cannot send a message to a conversation owned by a different buyer; the test verifies no lifecycle query or write occurs after denial.
- An authenticated seller cannot send a message to a conversation belonging to another seller store; the test verifies no lifecycle query or write occurs after denial.

**Evidence boundary:** these are service-level negative ownership tests using synthetic JDBC results. They do not replace Oracle integration tests, full read/list/notification IDOR coverage, or authenticated browser journeys.


### CI evidence — bargaining participant ownership tests

- Tested code head: `7bb45e4551d8b64e0a27e7b52d23b8729ab20836`.
- `NegotiationChatServiceTest`: 9 tests passed, 0 failures/errors/skips.
- Full backend Maven verification: 142 tests passed, 0 failures/errors/skips.
- Spring Boot verification, frontend lint/build and frontend regression checks passed.
- Browser E2E: 3 passed, 9 skipped; authenticated/transactional flows were not enabled for the PR event.
- Read-only smoke: 7 passed, 0 failed; `databaseHealthChecked=false`, so this run checked process liveness and anonymous guards only.
- No database-backed bargaining transaction, staging mutation or live Oracle concurrency proof is claimed.

## Admin approval-queue authorization — 7 November 2026

The Phase 1 staging E2E now includes a read-only role-boundary test for:
- `GET /admin/sellers/pending`
- `GET /admin/delivery/pending`
- `GET /admin/daily-help/helpers`

The test requires the trusted staging environment, the exact staging API URL, and configured ADMIN, BUYER and SELLER identities. ADMIN must receive HTTP 200; BUYER and SELLER must receive HTTP 401/403. The test is enabled for main-branch `push` events (PR #289), not silently skipped on the normal main-push workflow.

Runtime evidence: staging run [42365076271](https://github.com/imgupta/kuraliupdates-bazaar/actions/runs/42365076271), 5 passed / 0 failed / 0 skipped, including the admin approval-queue test. This is limited to the three listed queue reads; it does not prove every admin PII-bearing route.

## Combined delivery checkout-group claim authorization — 7 November 2026

`POST /delivery/jobs/checkout/{checkoutGroupId}/claim` resolves the delivery profile from the authenticated user and requires the caller-supplied agent ID to match that profile before locking or mutating seller orders. `DeliveryService.claimCheckoutGroup` locks all orders in the checkout group and requires every seller order to be ready, unassigned and eligible for delivery before assigning the group.

New `DeliveryServiceTest` coverage verifies spoofed agent ID rejection before JDBC/order access, successful all-order assignment with shared OTP/single payout snapshot, and no mutation when one seller order is not ready. This is service-level mocked coverage only; the distinct-agent Oracle lock race remains unverified.


## Public endpoint abuse-control evidence update — 7 November 2026

Source review of SellerOnboardingLeadController and SearchAnalyticsController confirms persistent Oracle-backed rate-limit calls execute before service persistence. The shared limiter hashes scope and identifier before storing a bucket, so raw email, phone, lead ID, IP or user ID is not stored in API_RATE_LIMIT_BUCKETS.

This PR adds explicit negative-path controller tests:
- Seller lead creation budget rejection stops before SellerOnboardingLeadService.start and before the independent email/phone budgets are evaluated.
- Seller OTP-send budget rejection stops before the lead service is invoked.
- Search analytics budget rejection stops before SearchTrendRepository.save.

These tests prove controller ordering with mocked limiter/repository dependencies; the Oracle limiter's independent-session contention and actual reverse-proxy remote-address behavior remain separate runtime questions. This update does not close P1-D.


## Bargaining chat read/list ownership evidence — 7 November 2026

The service scopes buyer chat listing by normalized authenticated buyer email and seller chat listing by the approved seller profile resolved from the authenticated account. Notification listing is scoped by normalized recipient email and active role; marking a notification read uses the notification ID together with recipient email and role.

The follow-up regression slice adds query-boundary tests for:
- Buyer chat listing uses only the authenticated buyer email.
- Seller chat listing uses only the approved store resolved from the authenticated seller email.
- Notification listing uses the authenticated recipient and active role.

Existing tests already cover cross-buyer and cross-store denial for message sends and offer responses, plus recipient-scoped notification read updates. These remain mocked JDBC/service tests: they do not prove Oracle execution plans, row-level database policies, or full authenticated browser journeys. The broader IDOR matrix remains open.
