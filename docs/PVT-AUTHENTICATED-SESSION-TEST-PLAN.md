# Authenticated Session PVT Test Plan

## Purpose
Verify authenticated-user behavior after functional release `1c80f64a147539509536191fc602510da612c4e2`, especially account-menu visibility and buyer-only delivery OTP visibility.

## Safety gate (must pass before executing mutation tests)
- [ ] Use a dedicated staging backend connected to a disposable/staging database, or a test environment with equivalent isolation.
- [ ] Use synthetic test identities and inboxes controlled by the project owner.
- [ ] Confirm OTP/email provider configuration and test rate limits.
- [ ] Do not create users, place orders, change order statuses, or trigger delivery flows against production for this test.
- [ ] Never log or attach passwords, session tokens, OTPs, or personal customer details to test output.
- [ ] If staging isolation is unavailable, execute only read-only/unauthenticated checks and mark authenticated end-to-end cases BLOCKED.

## Test identities
Prepare in the isolated test environment:
- Buyer A: owns Test Order A and has a verified session.
- Buyer B: separate verified session; does not own Test Order A.
- Seller test user: approved seller identity.
- Delivery-agent test user: approved delivery identity.
- Admin test user: admin identity.
Use the app's normal registration/login flow. Do not manually insert rows or bypass authentication.

## Test cases

| ID | Scenario | Steps | Expected result |
|---|---|---|---|
| AUTH-01 | Buyer login | Sign in as Buyer A using the normal flow. | Login succeeds; authenticated navigation appears; no token or OTP is exposed in UI/logs. |
| AUTH-02 | My Account menu | Open the signed-in profile menu as Buyer A. | **My Account** is visible and opens the account page. |
| AUTH-03 | Admin/multi-role account menu | Sign in as an authorized non-buyer account that is signed in. Open profile menu. | My Account visibility follows the intended signed-in-user rule; admin tools remain governed by role authorization. |
| AUTH-04 | Sign out | Sign out, then revisit an authenticated page and call an authenticated endpoint. | Session is cleared; protected API returns 401/unauthorized; no stale account data remains visible. |
| AUTH-05 | Expired/invalid session | Use an expired or invalid session in the isolated test environment. | Protected API rejects it (401); UI prompts for re-authentication; no protected data is rendered. |
| OTP-01 | Owner sees own delivery OTP | As Buyer A, open tracking for Test Order A when the order is at the status where OTP is available. | Tracking displays a valid four-digit OTP only when the backend authorizes Buyer A and the OTP is available. |
| OTP-02 | Non-owner cannot see OTP | As Buyer B, request tracking for Buyer A's Test Order A using Buyer B's session. | No OTP is returned or rendered; request follows the app's intended not-found/forbidden behavior without leaking order details. |
| OTP-03 | Anonymous cannot see OTP | Request Test Order A tracking without a session. | No OTP is returned; protected access is rejected or redacted according to the API contract. |
| OTP-04 | Tampered/unknown order ID | Request tracking with an unknown ID and with a modified order ID. | No OTP or customer details leak; unknown order returns the documented not-found/authorization response. |
| OTP-05 | OTP unavailable | Track an order whose state does not yet make an OTP available. | UI shows the neutral placeholder and does not show an old/stale OTP. |
| ROLE-01 | Seller access boundary | Sign in as Seller test user and attempt buyer-only account/order actions. | Only explicitly permitted actions succeed; other protected actions are rejected. |
| ROLE-02 | Delivery-agent access boundary | Sign in as Delivery-agent test user and access only assigned/available jobs per policy. | No unrelated buyer order details or delivery OTPs are exposed. |
| ROLE-03 | Admin access boundary | Sign in as Admin test user and check admin routes/API. | Admin routes follow server-side authorization; hiding/showing menu items alone is not treated as security. |
| SESSION-01 | Refresh persistence | Refresh an authenticated page in the isolated environment. | Session state is restored only if valid; no duplicate login or stale identity appears. |
| SESSION-02 | Cross-account browser isolation | Sign out Buyer A, then sign in as Buyer B in the same browser. | Buyer A's profile/orders/tracking state is cleared and not visible to Buyer B. |

## Execution record
For each case record: environment, build/commit SHA, role, result (PASS/FAIL/BLOCKED), timestamp, sanitized request/response status, and defect link. Do not record secrets or actual OTP values.

## Current status
- Frontend/backend release commit: `1c80f64a147539509536191fc602510da612c4e2`.
- CI build/type checks/backend tests passed for the functional fix PR.
- Authenticated end-to-end verification is **BLOCKED** until an isolated staging backend/database and controlled test identities are available.
- Do not mark the release fully PVT-verified based on unauthenticated smoke tests alone.
