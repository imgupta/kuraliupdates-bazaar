# Web security hardening — PR #382 status

Scope: web application and Spring Boot API only. Native iOS is explicitly excluded.

## Implemented on this branch

- **Same-origin API proxy:** Vercel rewrites `/api/v1/*` to the Render API before the SPA fallback. Production browser code uses `/api/v1`; a production `VITE_API_BASE_URL` cannot silently bypass the proxy. Local development may set an explicit API base.
- **Cookie authentication:** the browser receives a `__Host-ku_session` cookie with Secure, HttpOnly, SameSite=Lax and Path=/ attributes after OTP verification, portal handoff redemption, and legacy bearer-session validation. Logout revokes the server session and clears the cookie. Cookie sessions take precedence over Authorization headers at the filter boundary so existing controller/service contracts remain compatible.
- **CSRF:** same-origin browser mutations require an allowlisted Origin plus a constant-time double-submit `__Host-ku_csrf` / `X-KU-CSRF` match. The browser transport bootstraps the CSRF cookie before unsafe API calls. Non-browser bearer integrations without cookies remain compatible.
- **Browser token storage:** successful OTP and legacy-session bootstrap replaces the stored bearer value with a non-secret marker. The shared fetch transport removes Authorization headers after cookie upgrade. Legacy raw bearer values are accepted only for the first session restoration request so existing users can be upgraded without a forced logout.
- **Session token hashing:** application-issued session tokens are SHA-256 hashed before persistence. AuthService lookups, active-role lookups, logout, delivery tracking and portal handoff use the same digest. Portal handoff rows store the source session digest, not the raw credential.
- **Oracle migration:** V43 converts existing `USER_SESSIONS.SESSION_TOKEN` and `AUTH_PORTAL_HANDOFFS.SESSION_TOKEN` values to lowercase SHA-256 hex in place, preserving valid existing browser tokens because lookups hash the presented token before querying. Migration has not been run against staging or production from this session.
- **Session lifetime:** standard web sessions now have a 12-hour absolute expiry; E2E sessions remain short-lived and portal handoff sessions cannot outlive their source.
- **Security headers:** HSTS, no-store cache controls, strict referrer policy, CSP report-only and Permissions-Policy are configured. CSP remains report-only pending a real asset/report review.
- **Automation:** CodeQL covers Java and JavaScript/TypeScript. Trivy scans Maven and Bun dependency manifests/lockfiles without relying on GitHub Dependency Graph. ZAP remains opt-in and requires an explicitly configured HTTPS `STAGING_BASE_URL`.
- **Regression tests:** added cookie-session filter tests, CSRF allow/deny tests, token-hash tests, portal handoff digest assertions and Vercel proxy contract tests. Browser local login/handoff tests were updated to use cookies.

## Remaining controls before security programme completion

1. **Trusted-proxy-aware OTP/IP/device throttling:** existing Oracle-backed identifier/endpoint rate limiting remains. Do not trust arbitrary `X-Forwarded-For`. Configure and verify the actual Vercel-to-Render proxy chain and trusted proxy ranges before adding IP-derived keys.
2. **Complete IDOR/ownership matrix:** inventory every protected read/write across buyer, seller, delivery, Daily Help, documents, negotiations, tracking and admin; add owner-positive and wrong-owner/wrong-role negative tests for every endpoint. Existing route-role gates and selected ownership tests are not a complete audit.
3. **Admin MFA/step-up:** implement a separate short-lived, single-use admin step-up challenge, recovery lifecycle and privileged-action enforcement. Login OTP alone is not admin MFA.
4. **Idle timeout and refresh rotation:** absolute session expiry is 12 hours; idle timeout, refresh-token rotation, replay detection and concurrent refresh semantics are not yet implemented.
5. **Explicit DTO inventory:** convert remaining controller/entity responses to explicit response DTOs without breaking the five portal contracts.
6. **Audit and alerts:** complete immutable security-event coverage, redaction, retention and alert routing. Never log bearer tokens, OTPs or document contents.
7. **CSP enforcement:** review real browser reports and third-party asset requirements, then remove unsafe directives and enforce CSP in a separately validated step.
8. **Authenticated DAST:** configure a dedicated staging target and non-production test identities, then run authenticated ZAP/DAST. The current ZAP baseline job refuses to guess a target.
9. **Operational validation:** verify Vercel rewrite and cookie behavior on every deployed portal hostname; run V43 against isolated staging Oracle; complete all web role journeys and inspect CI on the final PR head before merge.

## Safety and deployment boundary

- No iOS source or build configuration changed.
- No production deployment, Vercel project environment variable, Render configuration, secret, or live database was changed from this session.
- The V43 migration is committed but has not been executed against Oracle. Do not merge/deploy until staging migration rehearsal and recovery checks pass.
- Keep PR #382 in draft until remaining critical controls and final-head tests pass.