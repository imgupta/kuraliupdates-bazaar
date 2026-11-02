# Current implementation status and remaining work

**Last reconciled:** 3 November 2026  
**Source baseline:** `main` at `840842662c03ae026c9ddd996b62b074784359a0`. Open PR branches are not part of this baseline unless GitHub confirms merge.

This page distinguishes source facts from CI, deployment, database and runtime evidence. See [Engineering Operating Standard](ENGINEERING-OPERATING-STANDARD.md), [Mandatory India PR Governance](INDIA-PR-GOVERNANCE.md) and [Continuation](CHATGPT-CONTINUATION.md).

## Mandatory PR governance

Every PR, including documentation-only, dependencies, configuration and infrastructure, must use the [mandatory PR template and review gates](INDIA-PR-GOVERNANCE.md). It covers Indian central/state/local laws, regulator directions, current vs future-effective vs draft rules, personal/business data lifecycle, hosting and transfers, security, consumer/seller/provider rights, payment and tax impacts, risk ownership, tests and release evidence.

**Production hosting target: India.** This is an approved target, not proof of current region. Current app/DB/storage/backup/log/CDN/vendor/support/DR regions remain unverified until resource-by-resource evidence is collected. Do not claim India residency from a high-level account setting or provider marketing page.

## Architecture decision

The approved target remains five frontend portals and one Spring Boot JVM containing five enforced backend domain modules: Identity, Marketplace, Orders, Delivery and Daily Help. This is a modular monolith, not five independently deployed microservices. Communications is a shared integration capability.

## Phase 0 source audit — partial, not complete

Baseline main SHA: `840842662c03ae026c9ddd996b62b074784359a0`.

### New method-level backend discovery

The source audit inspected all 20 controller files present in the tree. Endpoint families and representative methods are documented in [Backend Service and Dependency Map](SERVICE-DEPENDENCY-MAP.md). The inventory includes auth, buyer, seller, delivery, Daily Help, admin, tracking, negotiation, seller documents, seller onboarding leads/drafts, OTP settings, seller service areas, diagnostics, E2E, search analytics and health.

SecurityConfig source observations:
- `/admin/**` is matched to ADMIN role.
- Selected public paths and final catch-all are `permitAll()`; SessionAuthenticationFilter is inserted in the chain.
- No `@EnableMethodSecurity` was found in the inspected config and no controller `@PreAuthorize` was observed in the inspected files.
- This is not proof of an exploitable authorization defect; endpoint-level filter/service/record-owner behavior must be tested.

High-priority authorization and abuse test candidates:
- Daily Help professional-by-phone and latest-booking-by-phone reads.
- Seller service-area PUT, seller registration OTP admin settings/history.
- Admin onboarding-lead notes/updates, seller document download/scan/verification.
- Delivery location updates and tracking reads.
- Search analytics caller-supplied userId.
- E2E cleanup destructive endpoint and staging-only guard.
- All sensitive APIs against anonymous, expired/revoked session, wrong role, wrong record owner and spoofed active role.

Service coupling/transaction observations:
- OrderService uses Order, Seller and Product repositories plus JdbcTemplate; several transactional methods.
- SellerService uses Seller, Product, Order and BillDiscount repositories; cross-domain Orders coupling.
- DeliveryService uses DeliveryAgent and Order repositories plus JdbcTemplate; in-memory OTP resend cooldown map is resettable/process-local.
- AuthService uses User, UserSession, Seller, DeliveryAgent and DailyHelpProfessional repositories; cross-domain role-profile persistence.
- DailyHelpService uses service/professional/booking/slot repositories; one transaction uses `noRollbackFor=ApiException.class`, requiring failure-semantics review.
- AdminController spans multiple domain repositories and JdbcTemplate.

These are source observations and risk candidates, not proof of runtime exploitability. Full call graph, transaction propagation, all repository reads/writes and negative tests remain incomplete.

### Remaining closure work

1. Enumerate every controller method, HTTP route, authentication requirement, role, record-owner check and negative authorization case; include WebSocket and other non-MVC handlers.
2. Trace each service method to repository/entity/table reads and writes; identify cross-domain persistence access.
3. Inventory all `@Transactional` boundaries, propagation, isolation, nested calls, rollback rules and multi-domain transaction participants.
4. Inventory every JdbcTemplate, EntityManager, native SQL and direct DB access path.
5. Enumerate all Flyway migrations and DDL; map each object to its owning domain. Verify applied versions/FKs/triggers only with authorized read-only database access.
6. Inventory scheduled jobs, async executors, event listeners, WebSocket handlers, caches and process-local state.
7. Inventory all external integrations, secrets/config keys, timeouts, retries, idempotency, webhook validation and failure behavior without exposing credentials.
8. Trace complete workflows (happy path, authorization, invalid input, retry, timeout, duplicate and partial failure): registration/OTP/login; seller lead/onboarding/docs/approval; catalogue/inventory; bargain/cart/checkout; multi-seller order/payment/refund; dispatch/delivery OTP/tracking; Daily Help discovery/booking/start OTP/completion; admin approvals/audit.
9. Complete frontend route/portal import graph, AppContext state/action/effect consumer map, API facade, auth bootstrap/storage, route refresh/deep-link and hosting fallback tests.
10. Build data inventory and flow map: purposes, notices, lawful basis/consent, processors/subprocessors, actual regions, cross-border/support access, retention/deletion, backups, access audit and incident response.
11. Validate legal applicability with qualified Indian professionals for the actual entity, contracts, payment/fund flow, worker model, geography and operational activity.
12. Update source evidence and tests continuously; unknowns remain explicit.

### Phase 0 exit criteria

Phase 0 closes only when every endpoint, table/entity writer, scheduled/async task, integration and critical workflow has an identified owner, dependencies, authz/record ownership, transaction boundary, failure behavior and appropriate test evidence; every migration has an owner and safe rollout plan; data/vendor regions and lifecycle are documented; legal applicability is professionally reviewed; and every Critical/High risk has verified containment, accountable owner and remediation evidence.

Until then, no broad code movement or persistence refactor. Next implementation should be separate, small FE-1 and BE-1 PRs after exit.

## Known release/security blockers and unknowns

- PR #84 wallet/secret handling must not be merged/deployed until secure replacement credentials/configuration are in place and verified. Treat tracked wallet/credentials as potentially exposed; rotate securely. No secrets or wallet contents in source/logs.
- Current hosting resource regions and data flows are not established by source inspection. India is the production target, not a verified present state.
- Oracle live schema, applied migration versions, FKs/triggers and restore test are not verified here.
- Full endpoint authz/record-owner coverage is incomplete.
- Actual entity incorporation, seller/customer/provider contracts, grievance appointment, GST/FSSAI/payment-provider classification, Punjab/local licences and worker scheme applicability require evidence and professional review.
- Do not run transactional E2E against real/shared data. Use verified isolated synthetic data and safe cleanup.
- No production hosting, credentials, database, payment or deployment changes are included in this governance work.

## Historical implementation notes

Earlier notes and linked domain maps describe observed source state and past CI/deployment runs. Revalidate exact main SHA and current provider status before treating any dated statement as current. CI passing does not prove migration application, live deployment or end-to-end transaction correctness.
