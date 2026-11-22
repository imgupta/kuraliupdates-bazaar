# Admin MFA — Future Hardening Backlog

**Status:** Planned / deferred. This document records follow-up work identified during the Java/Spring Security review after PR #385. It does not claim that the items below are implemented. No runtime behavior is changed by this backlog.

**Current baseline:** Admin MFA is enforced server-side for protected `/admin/**` requests. The current design uses TOTP, one-time recovery codes, an HttpOnly step-up cookie, a session-bound step-up proof with a 10-minute lifetime, encrypted TOTP secrets, and replay protection for accepted TOTP counters. See the implementation in `AdminMfaFilter`, `AdminMfaController`, and `AdminMfaService`.

## Deferred improvements

### P1 — Separate MFA encryption key from the JWT signing secret

**Current concern:** TOTP-factor encryption key derivation currently depends on `app.jwt.secret`. Rotating the JWT secret can make existing encrypted MFA seeds undecryptable, coupling two independent security lifecycles.

**Future work:**
- Introduce a dedicated high-entropy secret such as `app.admin-mfa.encryption-key`, supplied by the deployment secret manager.
- Define a versioned encryption envelope containing key identifier, IV/nonce, and authenticated ciphertext.
- Support key rotation with an explicit re-encryption migration: decrypt with the old key, encrypt with the new key, verify row counts and authentication tags, then retire the old key.
- Never log, expose through actuator, or commit either key.
- Document backup/restore and emergency key-loss procedures. Do not silently fall back to the JWT secret once the dedicated key is enabled.

**Acceptance criteria:** JWT signing-key rotation does not affect MFA seed decryption; MFA encryption-key rotation is tested against existing enrolled factors and can be safely rolled back before the old key is retired.

### P1 — Rate-limit and abuse-protect MFA verification endpoints

**Current concern:** TOTP has a small search space. MFA enrollment confirmation and step-up verification need explicit, independently tested abuse controls.

**Future work:**
- Apply per-account and per-source throttling to `POST /admin/mfa/confirm` and `POST /admin/mfa/verify`; include distributed enforcement for multi-instance deployments.
- Add progressive cooldown/temporary lockout with bounded maximum duration and a safe administrator recovery procedure.
- Avoid permanent account lockout that an attacker can trigger intentionally.
- Return generic failure responses and avoid revealing whether an account has MFA enabled or whether a recovery code exists.
- Record security audit events for repeated failures, lockouts, successful recovery-code use, enrollment, and recovery-code regeneration.
- Ensure logs contain identifiers and event metadata only, never submitted OTPs, recovery codes, raw step-up tokens, or TOTP seeds.

**Acceptance criteria:** integration tests prove thresholds across multiple application instances, cooldown expiry, non-enumerating responses, and no logging of secrets.

### P1 — Expand automated MFA security and role-switch regression coverage

Add focused service, controller, filter, and browser-level tests for:

- Buyer → Admin and Admin → Buyer → Admin portal switching, including stale/missing step-up cookies and changed session tokens.
- Admin endpoints without an authenticated admin role, without enrollment, and without a valid step-up proof.
- Step-up expiry at the exact boundary and proof reuse after expiry.
- TOTP previous/current/next time-step acceptance, clock-skew behavior, and replay rejection under concurrent requests.
- Recovery-code single use, concurrent double-submit, invalid code, and exhaustion of the recovery-code set.
- Enrollment cancellation/restart and attempts to confirm an expired or replaced enrollment.
- CSRF/origin behavior for MFA endpoints and cookie behavior across the actual production frontend/API host topology.
- Concurrent sessions and the current single stored step-up proof per user; explicitly decide whether a new verification should invalidate older sessions or whether proof state should be tracked per session.

**Acceptance criteria:** deterministic tests use a controllable clock and concurrency barriers where needed; no test depends on sleeping for real TOTP windows.

### P2 — Define the complete MFA lifecycle and recovery process

**Future work:**
- Design an authenticated, audited disable-MFA flow; require fresh MFA proof or a separately approved recovery procedure.
- Define lost-device recovery, administrator identity re-verification, and support escalation. Do not let ordinary email-only login silently bypass admin MFA.
- Add recovery-code regeneration that invalidates all previously issued codes atomically and displays the new set only once.
- Define behavior for factor replacement, device migration, lost authenticator, compromised account, and admin offboarding.
- Consider requiring a second authorized administrator or out-of-band approval for exceptional MFA reset.
- Add admin-facing audit visibility for enrollment, disablement, reset, recovery-code use, and suspicious failures.

**Acceptance criteria:** each lifecycle transition is authorized, atomic, auditable, and covered by tests; recovery cannot be used as a weaker permanent MFA bypass.

### P2 — Step-up verification for sensitive administrative actions

The current step-up gate protects admin routes generally. Evaluate risk-based re-verification for especially sensitive actions, for example:
- Changing payout/bank details or payment configuration.
- Changing admin roles, permissions, or privileged accounts.
- Refunds, settlement overrides, or high-value financial adjustments.
- Exporting sensitive customer or seller data.
- Changing security settings, MFA factors, or authentication configuration.

Define action-specific freshness windows and audit requirements. Avoid prompting for MFA on every routine read-only operation.

**Acceptance criteria:** sensitive actions enforce the required freshness server-side, independently of frontend state, and produce attributable audit events.

### P2 — Review step-up proof storage and concurrent-session semantics

**Current design note:** step-up proof material is stored as hashes and bound to the authenticated session. The factor record currently holds one active step-up token/session hash pair per user.

**Future work:**
- Confirm whether one active proof per administrator is the intended product/security policy.
- If multiple concurrent admin sessions should be supported, model step-up grants per session (with expiry and revocation) rather than overwriting one user-level grant.
- Ensure revocation, logout, session rotation, and role switching invalidate the intended grants.
- Keep raw step-up tokens only in secure HttpOnly cookies; store only one-way hashes server-side.

**Acceptance criteria:** documented session semantics match implementation and tests cover concurrent sessions, logout, revocation, and portal switching.

### P3 — Operational monitoring and security response

**Future work:**
- Add metrics for MFA enrollment coverage, verification success/failure, throttling, lockouts, recovery-code usage, and step-up expiry.
- Alert on unusual failure spikes and repeated recovery-code use.
- Add an operational runbook for suspected admin-account compromise, session revocation, factor reset, encryption-key rotation, and audit-log review.
- Define retention and access controls for MFA security audit events.

**Acceptance criteria:** metrics contain no secrets or raw user-entered codes; alerts and runbooks are validated in staging.

## Suggested implementation sequence

1. Dedicated MFA encryption key and a tested rotation/migration design.
2. Distributed rate limiting, safe lockout/cooldown, and security audit events.
3. Deterministic automated tests for role switching, TOTP replay, recovery-code replay, expiry, CSRF, and concurrent sessions.
4. MFA lifecycle and recovery controls.
5. Risk-based step-up for sensitive admin operations.
6. Operational metrics, alerts, and incident runbook.

## Scope and release discipline

- These are future improvements, not a statement that the current MFA implementation is broken.
- Keep this backlog separate from routine feature work; prioritize P1 items before expanding the number of administrators or exposing additional high-impact admin operations.
- Implement related code, database migrations, configuration, tests, and documentation together in a reviewed pull request.
- Do not weaken the existing server-side admin authorization or allow frontend-only MFA enforcement as a shortcut.
- Update this document as items are implemented; move completed work to a dated release note with links to the PR and test evidence.
