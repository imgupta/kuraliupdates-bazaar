# Microfrontend Authentication and Session Contract — Phase 0

**Status:** Evidence-backed design proposal; no runtime change authorized.  
**Source baseline:** `953de3d85742fc690f44e031935707cc6fb17055`.  
**Purpose:** Record the current authentication/session behavior and the minimum decisions required before splitting role screens into independently deployed frontends.

## 1. Current implementation verified in source

| Concern | Current behavior | Evidence |
|---|---|---|
| App bootstrap | `AppProvider` wraps `RootNavigation` in `src/App.tsx`; all current routes share one React context instance. | `src/App.tsx` |
| UI session snapshot | `kurali_auth_session` stores a JSON user snapshot. On provider initialization, `isSignedIn` plus an email or phone are enough to hydrate initial UI state. | `src/context/AppContext.tsx` |
| Bearer token | `kurali_auth_token` is stored in browser localStorage after OTP login/registration and used by API calls. | `src/context/AppContext.tsx`, `src/services/api.ts` |
| Role selection | `kurali_role` persists the selected UI role; `kurali_user` caches user JSON. Other localStorage keys persist app/business UI data. | `src/context/AppContext.tsx` |
| API identity | The API client also reads `kurali_user_id` for search analytics. Most authenticated calls send `Authorization: Bearer ...`. | `src/services/api.ts` |
| Session validation | On boot, AppContext calls `bazaarApi.getMe(savedToken)`; successful server response refreshes the user snapshot. Registered roles are fetched separately. | `src/context/AppContext.tsx` |
| OTP sign-in | `AuthPageV2` calls backend OTP APIs, then `loginWithOtp` updates user/role state and persists session/token. Registration uses `registerUserWithOtp`. | `src/components/Auth/AuthPageV2.tsx`, `src/context/AppContext.tsx` |
| Logout | Calls backend logout asynchronously, then clears `kurali_auth_token`, `kurali_auth_session`, and `kurali_user`, and resets in-memory user/role. | `src/context/AppContext.tsx` |
| Role protection | Client-side route access is resolved by `routeConfig.ts` / `roleRouteAccess.ts`; backend authorization must remain authoritative. | `src/app/routing/routeConfig.ts`, `src/app/routing/roleRouteAccess.ts` |
| Automated auth coverage | Five role login tests are present, but each is skipped unless exact staging targets, a sufficiently long OTP capture token and the role-specific test identity are configured. | `e2e/login.spec.ts`, `docs/STAGING_E2E_SETUP.md` |

## 2. Important risks to resolve before splitting the SPA

1. **Bearer token in localStorage.** Any JavaScript executing on the same origin can read it. A new app must not independently invent another token store or copy token values between apps.
2. **Token appears in the `getMe` URL as well as the Authorization header.** `src/services/api.ts` builds `/auth/me?token=...` and also sends a Bearer header. URL credentials can leak through request logs, monitoring and intermediary diagnostics. Review backend compatibility and remove the query parameter in a separate, tested security change; do not silently change this as part of a frontend split.
3. **UI snapshot is not proof of authentication.** `kurali_auth_session` can hydrate a signed-in-looking initial state before the boot-time server validation finishes. Protected data and mutations must depend on server-validated authentication, not the snapshot alone.
4. **Role is distinct from identity and permissions.** `kurali_role` is a client preference, while server-registered roles and verified admin status determine what should be allowed. A role switch must never elevate backend permissions.
5. **Logout is asynchronous and local-first.** The UI clears local keys without waiting for backend logout to complete. Across independently loaded apps, stale in-memory state or a missed logout event could leave another app displaying an old session. Define and test logout propagation and token revocation semantics.
6. **Origin matters.** Browser localStorage is scoped to an origin. Different subdomains do not share it; separate apps on the same origin do. A multi-domain rollout cannot rely on localStorage being a cross-app session bridge.
7. **E2E passing does not imply all five authenticated role cases ran.** Check per-test results for skips and record the five identities' test outcome individually. Current workflow success can include intentionally skipped authenticated tests.

## 3. Target contract — decisions required before implementation

### Canonical identity/session authority

- Spring Boot remains the authority for authentication, registered roles, admin authorization, session expiry/revocation and all business authorization.
- Define one session bootstrap operation that returns the authenticated principal, registered roles, effective role and session-expiry/refresh state. The frontend treats session data as untrusted until this succeeds.
- Define explicit states: `unknown/loading`, `anonymous`, `authenticated`, and `expired/revoked`. Guard all protected route rendering and mutation entry points until state is resolved.
- Keep user profile and role preference separate from authentication credentials. Do not persist admin authority as a client-trusted boolean.

### Credential transport — preferred direction

- Prefer a same-origin backend-for-frontend/session cookie with `HttpOnly`, `Secure`, appropriate `SameSite`, CSRF protections for cookie-authenticated mutations, and server-side session revocation **if compatible with the existing Spring Boot deployment**.
- If bearer-token authentication must remain, use one deliberately chosen auth boundary and short-lived credentials; do not pass credentials in query strings, URL fragments, cross-app links, localStorage handoff parameters or postMessage payloads. Validate origin and message schemas for any non-secret coordination messages.
- This is an architecture decision, not a claim that cookie auth is already configured. Evaluate it separately with backend, browser, domain and CSRF constraints before implementation.

### Cross-app navigation and logout

- Use a stable public contract for login redirect, return-path allowlisting, expired-session handling, role selection and logout.
- Never accept arbitrary return URLs. Preserve deep links without carrying secrets in them.
- Logout must invalidate/revoke the authoritative session, clear the current app's local state and notify other same-origin apps; every app must revalidate on focus/navigation before protected operations. Cross-subdomain apps need an explicit redirect/session strategy rather than relying on browser storage events.
- Define behavior when logout network calls fail and ensure server-side expiry remains effective.

### API and authorization

- Preserve existing REST paths and DTOs during the first UI extraction.
- Every mutation is authorized server-side against principal, registered role, ownership and state transition; hiding UI controls is not sufficient.
- Define a typed API client contract and consistent handling for 401 (expired/invalid session), 403 (authenticated but forbidden), network failure and retryable server errors.
- No frontend should connect directly to Oracle or share database credentials.

## 4. Acceptance tests before any runtime extraction

- [ ] Cold start with no session, valid session, malformed cached snapshot, expired token and revoked token.
- [ ] Direct deep-link/refresh to every role dashboard while anonymous, authenticated as the correct role, authenticated as the wrong role, and authenticated as admin/non-admin.
- [ ] Multiple registered roles: role switching changes UI only and cannot elevate server permissions.
- [ ] Logout in one app invalidates protected requests in every other app; browser back/focus does not revive cached private UI.
- [ ] Login redirect/return path preserves only allowlisted internal paths and never includes credentials.
- [ ] API client contract tests for 401/403/network failure and concurrent expired-session responses.
- [ ] `getMe` no longer puts credentials in the URL after a separately tested backend-compatible change.
- [ ] Authenticated E2E reports an explicit pass/skip for Buyer, Seller, Delivery, Provider and Admin; do not summarize skips as passes.
- [ ] Test with isolated dedicated identities and synthetic data only. No order, booking, approval, slot, OTP resend/verification, delivery claim/location write or DB cleanup against shared staging.
- [ ] Test cross-origin/subdomain behavior on preview deployments before changing public routing.

## 5. Recommended next action

Before extracting Seller (or any role) into an independent app, agree on the credential transport/session authority, write the API contract, and add deterministic mocked tests for session bootstrap, role authorization responses and logout. Keep the current SPA and public routing unchanged until those tests pass. This document makes no production, Vercel, Render or Oracle configuration changes.
