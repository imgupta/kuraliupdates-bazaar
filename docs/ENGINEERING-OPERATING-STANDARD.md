# KuraliUpdates Engineering Operating Standard

**Status:** Mandatory for every coding, review, test and release task.  
**Mandatory companion:** [India PR Governance](INDIA-PR-GOVERNANCE.md) — applies to every PR, including docs-only and infrastructure changes.

## Professional operating perspective

Apply the breadth and rigor expected of a highly experienced multidisciplinary team: principal frontend/backend engineer, software/solution architect, product/UI designer, business and systems analyst, security/privacy consultant, operations specialist and Indian regulatory issue spotter. This is an operating standard, not a claim about anyone's literal employment history.

## Before coding — mandatory

1. Read this standard, [AGENTS.md](../AGENTS.md), [CHATGPT-CONTINUATION.md](CHATGPT-CONTINUATION.md), [CURRENT-STATE.md](CURRENT-STATE.md), [INDIA-PR-GOVERNANCE.md](INDIA-PR-GOVERNANCE.md) and relevant architecture/domain/legal documents.
2. Confirm branch, exact base SHA, open PRs, current source and relevant CI status.
3. Inspect real implementation and tests; do not rely on class names, old notes or assumptions.
4. Trace the complete user journey, actors, routes, APIs, data writes, integrations and failure paths.
5. Identify compatibility constraints: URLs, API contracts, auth/session, database, feature flags, secrets and deployment.
6. Produce a concise plan with impacted files/modules, acceptance criteria, tests, security/legal review and rollback for material changes.
7. Record unresolved business decisions rather than inventing behavior affecting money, identity, privacy, security or legal obligations.

## Architecture and implementation

- Prefer simple, explicit, maintainable solutions; avoid premature services, abstraction and bulk rewrites.
- Preserve the approved target: five frontend portals; one Spring Boot JVM with five enforced backend domain modules initially.
- Do not change runtime topology, database, hosting, payment/refund semantics or authentication without explicit approval.
- Enforce domain ownership. No cross-domain repository/entity writes.
- Preserve API contracts and existing customer journeys unless a versioned change is approved.
- Keep business rules on the server; frontend validation is for usability, not authorization.
- Make small, reviewable, tested changes. Do not combine unrelated cleanup.
- Follow existing conventions and supported framework versions; no incidental upgrades.

## India compliance, data and hosting

- Follow [India PR Governance](INDIA-PR-GOVERNANCE.md) on every PR.
- Production hosting target is India and is mandatory before production launch. Development/staging may continue in existing regions (including Singapore); document them, control access and use synthetic/minimized data by default. Verify production regions for compute, DB, replicas, object/document storage, backups, logs, CDN/cache, telemetry, support access and disaster recovery. Do not conflate dev/staging region with production residency.
- Assess central/state/local Indian laws and regulator directions applicable to actual activity, entity, fund flow, geography and data. Distinguish in-force, enacted-not-commenced, notified future-effective, draft/proposed and announced-only requirements.
- Use current official primary sources with dates. Escalate legal interpretation to qualified Indian counsel, tax to CA/CS, labour to specialists, and payment/insurance matters to relevant regulated providers.
- Map data purpose, minimization, lawful basis/consent, processors, access, retention, deletion, backups, transfers and breach response.
- Do not use real personal data in unapproved staging or test systems. Never log OTPs, passwords, tokens, payment credentials or private documents.

## Frontend, design and accessibility

- Design mobile-first for Buyer, Seller, Delivery, Daily Help and Admin workflows.
- Keep visual language, design tokens, components, loading/empty/error/success states consistent.
- Use semantic HTML, keyboard support, visible focus, labels, contrast and accessible validation.
- Preserve deep links, refresh, browser history, login/session continuity and role isolation.
- Backend authorization and ownership checks are mandatory; UI guards are not security boundaries.
- Prevent stale state, duplicate requests, memory leaks and uncleaned timers, subscriptions, polling or geolocation watches.
- Test small screens, slow networks, expired sessions, long content and API failures.

## Security, privacy and integrity

- Apply least privilege and deny-by-default server authorization.
- Validate role and record ownership for every sensitive read and mutation.
- Threat-model authentication, registration, payment/refund, seller documents, delivery OTP, admin and personal-data changes.
- Validate inputs server-side; consider injection, IDOR, replay, brute force, mass assignment and unsafe uploads.
- Redact logs and reports; use correlation IDs without sensitive values.
- Review minimization, consent, retention, deletion and auditability.
- Record risk severity, exploit/failure scenario, containment, durable fix, owner, due date, verification and residual risk.

## Data, money and workflows

- Identify authoritative data owner, readers, writers and migration owner before persistence changes.
- Preserve transaction boundaries, idempotency, concurrency, audit history and recovery behavior.
- Never silently change customer payment destination, seller-direct refunds, commissions, fees or settlement.
- Preserve immutable snapshots for accepted bargains and historical orders.
- Prefer explicit cross-domain contracts and an outbox when reliable event publication is needed; avoid distributed transactions initially.
- Use expand/migrate/contract database changes and documented rollback/forward-fix plans.
- Test duplicate requests, retries, partial failures, invalid/expired OTPs and concurrent transitions.

## Testing and evidence

- Add/update appropriate unit, component, route/authorization, contract, repository/integration, architecture and E2E tests.
- Cover negative paths: invalid input, unauthorized access, ownership mismatch, timeout, retry and null/empty responses.
- Run targeted tests, then the regression suites required by impact.
- Never claim build, test, CI, deployment, migration or runtime success without inspecting the actual result for the exact SHA.
- Distinguish source merged, CI passed, deployment built, deployment live, migration applied, read-only smoke passed and transactional journey verified.
- Skipped tests are not passes. Browser smoke is not proof of a transactional lifecycle.
- Mutating E2E must use verified isolated synthetic data, never real business records.

## Documentation and developer handoff\n\n- Follow [Codebase Documentation Standard](CODEBASE-DOCUMENTATION-STANDARD.md) for every code-changing PR.\n- Update canonical Markdown docs in the same PR for affected UI, routes, APIs, domain logic, schema, integrations, security, deployment and operations.\n- UI documentation includes exact labels, fields, components, layout/wireframe, interactions, responsive states and accessibility. API documentation includes DTOs, auth/ownership, service/data flow, transaction and errors.\n- Maintain frontend, backend modular-monolith, API, ERD/data ownership, integration, deployment and security diagrams as source-backed facts.\n- Clearly label implemented, test-verified, runtime-verified, planned and unknown facts; tie evidence to exact SHA.\n- Generate Word/PDF/PPT deliverables on demand from current source and canonical docs; do not keep stale manually edited copies.\n\n## Release and handoff

- Material changes need acceptance criteria, evidence, risks and rollback/mitigation.
- PRs must state changes, non-changes, tests, known gaps and operational steps, using the mandatory governance template.
- Verify exact commit and target before deploying.
- Do not alter production secrets, DNS, hosting or database state without authorization.
- Update relevant docs in the same PR whenever architecture, workflow, API, configuration, security or operations change.
- State blockers and uncertainty directly; never overstate completion.

## Completion checklist

- [ ] Requirements and full user journey understood.
- [ ] Existing code and boundaries inspected.
- [ ] India legal/regulatory applicability and status assessed.
- [ ] Data lifecycle, residency, vendor and transfer implications assessed.
- [ ] UX, accessibility and responsive behavior considered.
- [ ] Authorization, ownership, privacy and security reviewed.
- [ ] Transaction, integrity, retry and failure behavior considered.
- [ ] Tests added/updated and actually executed.
- [ ] CI/build results tied to exact commit.
- [ ] Deployment/database/runtime claims independently verified or marked unverified.
- [ ] Documentation and handoff updated.
- [ ] Remaining risks and blockers stated.

Any exception must be documented with reason, temporary control, accountable owner, approver and expiry/remediation date.
