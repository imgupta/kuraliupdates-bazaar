# Web security hardening — PR #382 status

Scope: web application and Spring Boot API only. Native iOS is explicitly excluded.

## Implemented on this branch

- **Same-origin API proxy:** Vercel rewrites `/api/v1/*` to the Render API before the SPA fallback. Production and development browser code use `/api/v1`; Vite proxies that path to `http://localhost:8080` (or `VITE_DEV_API_PROXY_TARGET`) locally so cookie and CSRF behavior is exercised on the same origin.
- **Cookie authentication:** the browser receives a `__Host-ku_session` cookie with Secure, HttpOnly, SameSite=Lax and Path=/ attributes after OTP verification, portal handoff redemption, and legacy bearer-session validation. Logout revokes the server session and clears the cookie. Cookie sessions take precedence over Authorization headers at the filter boundary so existing controller/service contracts remain compatible.
- **CSRF:** same-origin browser mutations require an allowlisted Origin plus a constant-time double-submit `__Host-ku_csrf` / `X-KU-CSRF` match. The browser transport bootstraps the CSRF cookie before unsafe API calls. Non-browser bearer integrations without cookies remain compatible.
- **Browser token storage:** successful OTP and legacy-session bootstrap replaces the stored bearer value with a non-secret marker. The shared fetch transport removes Authorization headers after cookie upgrade. Legacy raw bearer values are accepted only for the first session restoration request so existing users can be upgraded without a forced logout.
- **Session token hashing:** application-issued session tokens are SHA-256 hashed before persistence. AuthService lookups, active-role lookups, logout, delivery tracking and portal handoff use the same digest. Portal handoff rows store the source session digest, not the raw credential.
- **Oracle migration:** V43 converts existing `USER_SESSIONS.SESSION_TOKEN` and `AUTH_PORTAL_HANDOFFS.SESSION_TOKEN` values to lowercase SHA-256 hex in place, preserving valid existing browser tokens because lookups hash the presented token before querying. Migration has not been run against staging or production from this session.
- **Session lifetime:** standard web sessions now have a 12-hour absolute expiry; E2E sessions remain short-lived and portal handoff sessions cannot outlive their source.
- **Security headers:** HSTS, no-store cache controls, strict referrer policy, CSP report-only and Permissions-Policy are configured. CSP remains report-only pending a real asset/report review.
- **Automation and dependency remediation:** CodeQL covers Java and JavaScript/TypeScript. Trivy scans Maven and Bun dependency manifests/lockfiles without relying on GitHub Dependency Graph. Its first scan identified a high-severity Vite advisory; Vite and the Bun lockfile were upgraded from 8.3.2 to patched 8.3.3, after which the dependency scan passed. ZAP remains opt-in and requires an explicitly configured HTTPS `STAGING_BASE_URL`.
- **OTP abuse throttling:** OTP send is limited to 5 requests per identifier per hour; OTP verification is limited to 20 per identifier per hour, in addition to the existing cooldown and five-attempt OTP consumption rules. The browser transport adds a random UUIDv4 device key; device limits are 10 sends and 30 verifications per hour. Device keys are treated as untrusted abuse-friction signals, and only their SHA-256-derived rate-limit bucket is persisted.
- **Trusted client IP handling:** `TrustedClientIpResolver` ignores forwarded headers unless the immediate peer is in the explicitly configured `ku.security.trusted-proxy-cidrs` CIDR list. When configured, it walks the forwarding chain from the trusted edge inward and selects the first untrusted hop. Until the actual Render ingress/Vercel proxy chain is verified and `KU_SECURITY_TRUSTED_PROXY_CIDRS` is configured, IP-based OTP buckets are intentionally not activated; arbitrary `X-Forwarded-For` is never trusted.
- **Regression tests:** added cookie-session filter tests, CSRF allow/deny tests, token-hash tests, portal handoff digest assertions, trusted-proxy spoofing tests, OTP device/IP limiter tests and Vercel/Vite same-origin proxy contract tests. Browser local login/handoff tests were updated to use cookies. The registration flow was corrected to accept first-party cookie login responses that intentionally omit a JavaScript bearer token.

## Remaining controls before security programme completion

1. **Trusted-proxy IP activation:** identifier and device OTP limits are implemented. The IP limiter is implemented but deliberately inactive until the actual Vercel-to-Render immediate-peer chain is verified and `KU_SECURITY_TRUSTED_PROXY_CIDRS` is configured with exact CIDRs. Do not use `0.0.0.0/0`, guess ranges, or trust arbitrary forwarded headers.
2. **Complete IDOR/ownership matrix:** inventory every protected read/write across buyer, seller, delivery, Daily Help, documents, negotiations, tracking and admin; add owner-positive and wrong-owner/wrong-role negative tests for every endpoint. Existing route-role gates and selected ownership tests are not a complete audit.
3. **Admin MFA/step-up:** implement a separate short-lived, single-use admin step-up challenge, recovery lifecycle and privileged-action enforcement. Login OTP alone is not admin MFA.
4. **Idle timeout and refresh rotation:** absolute session expiry is 12 hours; idle timeout, refresh-token rotation, replay detection and concurrent refresh semantics are not yet implemented.
5. **Explicit DTO inventory:** convert remaining controller/entity responses to explicit response DTOs without breaking the five portal contracts.
6. **Audit and alerts:** complete immutable security-event coverage, redaction, retention and alert routing. Never log bearer tokens, OTPs or document contents.
7. **CSP enforcement:** review real browser reports and third-party asset requirements, then remove unsafe directives and enforce CSP in a separately validated step.
8. **Authenticated DAST:** configure a dedicated staging target and non-production test identities, then run authenticated ZAP/DAST. The current ZAP baseline job refuses to guess a target.
9. **Operational validation:** verify Vercel rewrite and cookie behavior on every deployed portal hostname; configure and verify trusted proxy CIDRs; run V43 against isolated staging Oracle; complete all web role journeys and inspect CI on the final PR head before merge.

## Safety and deployment boundary

- No iOS source or build configuration changed.
- No production deployment, Vercel project environment variable, Render configuration, secret, or live database was changed from this session.
- The V43 migration is committed but has not been executed against Oracle. Do not merge/deploy until staging migration rehearsal and recovery checks pass.
- Keep PR #382 in draft until remaining critical controls and final-head tests pass.