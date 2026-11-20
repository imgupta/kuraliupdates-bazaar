# Web security hardening — implementation status

This document is the release checklist for the consolidated web-security PR. It deliberately distinguishes code shipped in this PR from work that remains blocked on coordinated application and Oracle changes.

## Included in this PR

- Add HSTS with `includeSubDomains` and a one-year max-age to HTTPS responses.
- Add Spring Security cache-control headers to prevent browser/proxy caching of API responses.
- Add a conservative `Content-Security-Policy-Report-Only` header as a non-blocking CSP rollout step; enforcement remains gated on browser report review and complete third-party asset inventory.
- Add a restrictive `Permissions-Policy` disabling camera and microphone access and limiting geolocation/payment browser features to the first-party origin.
- Add a `SecurityConfigTest` regression asserting the report-only CSP and Permissions-Policy headers.
- Remove the session token from the `/auth/me` query string; credentials are sent only in the Authorization header in the current compatibility flow.
- Add CodeQL analysis for Java and TypeScript/JavaScript on PRs, main pushes and weekly schedule.
- Add dependency review on PRs, failing on high-severity dependency changes.
- Add an explicitly configured HTTPS staging target for OWASP ZAP baseline scans. The scan refuses to guess a target and is non-blocking until findings are reviewed.

## Required follow-up gates before this can be called complete

The following requested P0/P1 controls are not claimed as implemented by this foundation commit. They require coordinated changes and regression evidence:

1. **HttpOnly web sessions + CSRF:** the current React application and many domain API modules pass bearer tokens explicitly and store the token in browser storage. A cookie migration must update every web fetch boundary, login/registration response, logout, cross-portal handoff/redeem, session bootstrap and all five portal journeys together. Enable CSRF only with a defined token delivery/validation contract. Do not turn on cookie auth while leaving the old localStorage bearer path as the default.
2. **Session-token hashing:** `USER_SESSIONS.SESSION_TOKEN` is currently the lookup key and is read directly by multiple backend services, including tracking/ownership checks and portal handoff. A safe migration needs a versioned hash lookup, legacy-session invalidation/expiry policy, repository-call-site conversion, Oracle migration, and tests. A partial conversion would lock out legitimate users or break authorization.
3. **OTP/IP rate limiting:** identifier-based Oracle rate limiting and OTP attempt controls already exist. Verify and add source-IP/device limits at the controller boundary, behind a trusted-proxy policy; never trust arbitrary `X-Forwarded-For`.
4. **IDOR/resource ownership:** finish endpoint-by-endpoint inventory across buyers, sellers, delivery, daily-help, documents, negotiations and tracking. Add anonymous/wrong-role/wrong-owner/owner-positive tests for each read and mutation before tightening matcher rules.
5. **Admin MFA/step-up:** use a separate short-lived, single-use step-up challenge for privileged operations, with recovery and audit design. Do not treat ordinary login OTP as MFA for every admin action.
6. **Refresh/session rotation:** define idle and absolute lifetime, rotation concurrency behavior, revocation and portal-switch semantics before changing the current session expiry.
7. **CSP:** start with report-only after inventorying Vite assets, map tiles, image hosts, payment providers and inline scripts/styles; enforce only after report review.
8. **DTO exposure:** inventory controller return types and add explicit response DTOs without breaking portal contracts.
9. **Audit/alerts:** define immutable event schema, sensitive-field redaction, retention and alert routing; never log OTPs, bearer tokens or full personal documents.
10. **DAST/dependencies:** CodeQL and dependency review are wired here. ZAP runs only when `STAGING_BASE_URL` is explicitly configured; review reports and add authenticated DAST after safe test-account setup.

## Source-audit findings confirmed on the PR branch

The following were verified against the current branch source, not inferred from the original plan:

- `AuthController` still returns a bearer token from OTP verification and portal-handoff redemption. The browser auth context still initializes from `readAuthToken()`; `authSessionStorage` owns the `kurali_auth_token` storage key. The web API layer contains direct token reads in multiple domain modules, so changing only `authApi.ts` would not remove browser token exposure.
- `UserSessionEntity` maps the raw session token to `USER_SESSIONS.SESSION_TOKEN`. Repository lookups use `findBySessionToken`; at least `AuthService` and `DeliveryTrackingService` query sessions by the raw token. Portal handoff also carries the source session token internally. All of these call sites must move together with the Oracle migration.
- `SecurityConfig` on this branch already uses an explicit public-route allowlist and ends with `.anyRequest().authenticated()`; it does not have the broad catch-all `.permitAll()` described in some older audit notes. Keep that default-deny posture and add route-level role/ownership regressions rather than reverting it.
- The existing custom session filter currently authenticates from the Authorization Bearer header. It does not yet read an HttpOnly cookie or validate a CSRF token.
- The current auth response contract exposes the session token to JavaScript. Logout and portal switching still accept/use bearer tokens. Cookie migration must cover these endpoints and every web API consumer in the same change.
- Admin endpoints have existing role gates and some privileged-action audit rows, but no complete admin MFA/step-up flow was found in the inspected source. Existing login OTP must not be described as admin MFA.

These findings supersede older documentation statements where the source now differs. In particular, the allowlist/default-authenticated route policy is already present and should be preserved.

## Latest source audit and implementation boundary

- Browser auth remains Bearer-token based. `AuthController` returns session tokens to JavaScript, `AuthSessionContext` reads the persisted token, and multiple domain modules read it directly. A cookie migration must be coordinated across the complete web fetch inventory, SSO handoff, logout, session bootstrap and CORS. This PR has not switched authentication to cookies.
- `USER_SESSIONS.SESSION_TOKEN` remains a raw-token primary key. `AuthService`, `DeliveryTrackingService`, portal handoff and repository methods depend on that lookup. Hashing only the entity column or only the repository method would break authentication/ownership checks. No partial hash migration was applied.
- `ApiRateLimitService` stores hashed fixed-window bucket keys and handles concurrent Oracle MERGE insert races. It does not yet provide a trusted client-IP/device policy. The backend is behind a reverse proxy; trusting arbitrary `X-Forwarded-For` would let clients spoof their source and must not be added without a verified trusted-proxy configuration.
- SecurityConfig already has an explicit public-route allowlist, `/admin/**` ADMIN gate and `.anyRequest().authenticated()`. Keep this default-deny baseline; do not add blanket role matchers to routes that contain public discovery and role-specific endpoints.
- Admin routes have role enforcement and some audit events, but no complete independent MFA/step-up challenge and recovery lifecycle has been implemented.

## Validation status

- Repository source was inspected before changes.
- Automated checks have not been executed in this environment. GitHub Actions results are authoritative after the PR is opened.
- No Oracle migration, production configuration, secrets, staging data or deployment was changed.
- This PR is intentionally a draft and must not be merged as completion of the full priority plan.
