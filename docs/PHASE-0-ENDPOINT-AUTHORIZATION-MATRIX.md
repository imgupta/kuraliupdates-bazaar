# Phase 0 — Endpoint authorization and state inventory

**Audit date:** 2026-11-06  
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
6. Portal handoff is being moved from process-local memory to a shared Oracle table in Flyway V31. The new code generates a 256-bit random code, stores only its SHA-256 digest, and consumes it with one conditional database update. Consume runs in REQUIRES_NEW so a later session/role rejection cannot roll back the one-time consume.

## Outstanding authorization and abuse controls

- Public seller lead endpoints have no demonstrated per-IP/request throttling or CAPTCHA. OTP service has an identifier cooldown and five-attempt verification cap, but this is not a substitute for endpoint-level abuse protection.
- Existing-lead lookup behavior can reveal that a matching email/phone pair has an active lead and returns its lead ID. Review enumeration and applicant-name update semantics before public launch.
- Public search analytics remains susceptible to event flooding; add server-side throttling, payload size limits and retention policy.
- Complete IDOR tests are still required for every buyer order, seller product/order, delivery assignment, professional booking/slot and chat/offer identifier.
- Admin seller-lead and registration OTP-policy audit events now record the stable authenticated UserEntity.userId rather than Authentication.getName().
- Verify role semantics for multi-profile accounts: account-level authority is derived from the primary user role; resource ownership must remain the final authorization check.
- E2E route permission is intentionally broad at the HTTP matcher but relies on controller-level fail-closed staging checks. Keep E2E secrets out of normal application environments and rotate them before production.
- Confirm CORS preflight behavior against every deployed frontend origin and custom header, not just the local MockMvc test.

## Verification boundaries

- Backend and frontend CI are required on the latest PR head.
- Database-backed readiness smoke and anonymous-access probes have passed on the shared staging deployment before V31 was added.
- V31 has not been applied to Oracle in this branch. Do not merge/deploy the new handoff persistence code until CI passes and the migration is validated through the normal staging deployment path.
- Browser coverage currently includes public portal/login checks; authenticated and transactional flows remain skipped until OTP capture and synthetic fixture configuration are explicitly approved.


## Admin audit actor refinement — 2026-11-06

The seller-lead update/note and registration OTP-policy update controllers now require an authenticated UserEntity principal and persist its stable userId as the audit actor. They no longer fall back to the generic ADMIN string or Authentication.getName(), which may not be a stable identifier for this principal type.
