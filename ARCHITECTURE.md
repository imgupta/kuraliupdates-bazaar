# Architecture and system invariants

See [docs/CODE-QUALITY-AUDIT-2026-11.md](docs/CODE-QUALITY-AUDIT-2026-11.md) for the six-workstream code-quality and complexity audit. See [docs/IMPLEMENTATION-BASELINE-2026-11.md](docs/IMPLEMENTATION-BASELINE-2026-11.md) for the consolidated November 2026 implementation and verification checkpoint, [docs/CURRENT-STATE.md](docs/CURRENT-STATE.md) for historical Phase 0/1 evidence, and [docs/SELLER-ONBOARDING.md](docs/SELLER-ONBOARDING.md) for the current seller CRM/document lifecycle.

See [all product flows end-to-end](docs/ALL-FLOWS-END-TO-END.md) for the complete role-by-role workflow, API families, database map and sequence diagrams. The focused [Daily Help design](docs/DAILY-HELP-END-TO-END.md) remains the detailed authority for Daily Help.

## Runtime and environment

`Browser → React/Vite → REST API → Spring Boot → Oracle`.

Vercel hosts the combined Bazaar frontend and role-specific portal builds; Render hosts the Spring Boot Docker service. The owner-designated deployed environment is one shared **staging** environment. Do not infer a separate production environment from hosting-provider labels.

## Frontend

- React + TypeScript + Vite + Tailwind; no Angular.
- One monorepo/shared runtime with role-specific entry points/build outputs (Buyer, Seller, Delivery, Daily Help, Admin) plus the combined Bazaar app.
- This is not five independently owned micro-frontends and does not use Module Federation.
- `AppContext` remains a compatibility facade while domain hooks/API facades isolate operations. Some facades still delegate to shared `bazaarApi`; endpoint extraction is not complete.
- Buyer is the primary public registration path. Partner applications remain separate routes; OTP requirements follow admin-configured channels. Buyer address is optional at registration but checkout must require a valid delivery address.
- Keep UI presentational; give polling, timers and geolocation explicit cleanup.

## Backend

`Controller → Service → DTO/Domain → Repository → Oracle`.

Controllers handle HTTP/auth/validation; services own use cases, authorization-sensitive ownership checks and transactions; repositories own persistence. Use DTOs at API boundaries and never expose JPA entities.

The backend is a modular monolith, not a set of independently deployed domain microservices. Preserve domain boundaries and explicit service-level transaction ownership.

## Database

Oracle is the system of record; Flyway owns schema evolution. Applied migrations are immutable and migration version numbers are unique. V13 is destructive staging/test-data cleanup and must not be rerun routinely. V14 adds seller compliance fields and private document BLOB storage. Later migrations include seller document scanning/quarantine, provider/delivery ward numbers and privacy/compliance request/configuration structures. Verify deployed schema version from sanitized startup/database evidence, not source alone.

Oracle connectivity is configured for walletless JDBC Thin TCPS. Runtime configuration uses the OCI TLS-authentication JDBC URL; do not assume Oracle wallet files, TNS aliases or OraclePKI provider setup are required by the current path.

## Product invariants

- **Online Shop:** server validates seller ownership, catalogue price, accepted bargain offer and stock. Multi-seller checkout creates seller-owned suborders under one checkout group.
- **Payments/refunds:** grocery customer pays seller directly; KuraliUpdates earns configured commission/platform fee. Grocery refund is seller-funded and paid directly to the customer; platform records status/evidence. Do not imply payment-aggregator, escrow or automatic bank-split integration is active without code/config evidence.
- **Seller activation:** application and applicable documents are reviewed in the admin CRM; manual admin approval activates the seller. Clean malware scan is required before document download/verification.
- **Daily Help:** booking locks an available slot and changes it to BOOKED transactionally; provider identity/ownership is server-authoritative.
- **Delivery:** only active agents access jobs; claim, OTP, order status and payout are server-authoritative. Never log OTPs.
- **Maps:** OpenStreetMap fallback is available; Google Routes road optimization requires valid backend configuration.
- **Admin operations:** order edits/cancellation are permission- and state-gated; pre-fulfilment quantity changes must lock/update inventory transactionally. Operation history is append-only; internal support notes are admin-only; refund reconciliation is recorded.

## Security and privacy

- Enforce role and record ownership on every protected operation. Client-side route guards are usability controls, not authorization.
- Private seller documents must not be served publicly. File size/type/signature checks do not replace malware scanning. Scanner failure or indeterminate result fails closed.
- Seller continuation tokens are hashed at rest and expire; never log or expose OTPs, bearer tokens or continuation secrets.
- PR #365 adds privacy request tracking, versioned notice acknowledgement, admin compliance settings and security audit events. The request API tracks requests but does not itself fulfil export/correction/erasure/withdrawal. Operational fulfilment and evidence remain required.
- GST/FSSAI applicability is configuration-driven; configuration and format validation are not government verification or legal sign-off.
- Age/minor policy is metadata only; minors must remain disabled until age assurance and verifiable parental-consent controls are implemented and approved.
- PR #382 / Flyway V43 hashes opaque session-token references at rest in the session store; browser auth uses Secure HttpOnly host-only cookies with double-submit CSRF. This does not complete endpoint-level IDOR certification or all session lifecycle runtime testing.
- Retention/deletion, OTP expiry purge, provider-region verification, India log/backup location, processor contracts and legal review remain open release gates.
- Oracle encryption at rest/TLS do not equal application-layer document encryption. Do not collect sensitive identity data without documented lawful basis.

## Web security release checkpoint (22 November 2026)

PR #382 merged as `65918519b5a17c51299e80545a77351216a5fdce`. Browser API traffic uses the same-origin Vercel/Vite `/api/v1` proxy. Browser sessions use Secure HttpOnly host-only cookies and double-submit CSRF; V43 hashes session token references at rest; browser idle timeout is 30 minutes with 12-hour absolute expiry and active-use rotation. Admin TOTP MFA/step-up, OTP rate limits, append-only admin mutation audit, and backend/edge security headers were added. CSP remains report-only. Trusted proxy CIDRs remain unset until the real proxy chain is verified.

Render logs confirm V43–V46 applied to Oracle schema ADMIN (v46). Six Vercel web projects and Render backend are deployed on the merge SHA in shared staging. Main CI has two admin-positive E2E 403 failures and six skipped tests; Oracle recovery timed out before cleanup/rollback checks. Full IDOR, audit, DTO, authenticated DAST, backup/restore and data-residency evidence remain open. See [Security release checkpoint](docs/SECURITY-RELEASE-2026-11-22.md).

## Quality gates

```bash
npm run lint
npm run build
cd backend-java-spring && mvn clean verify
```

Shared staging smoke/preflight must remain read-only. Transactional E2E is explicitly gated and must use isolated synthetic fixtures and run-scoped cleanup. CI passing does not prove Oracle transaction correctness, complete lifecycle coverage, deployment health or legal compliance.
