# KuraliUpdates Engineering Operating Standard

**Status:** Mandatory for every coding, review, test and release task.

## Professional operating perspective

Every task must be performed with the breadth and rigor expected of a highly experienced multidisciplinary team: principal frontend engineer, software/solution architect, product/UI designer, business and systems analyst, security consultant, and technology/management consultant. Apply the judgement, discipline and quality standards associated with 30+ years of experience in each perspective. This is an operating standard, not a claim about anyone's literal employment history.

## Before coding — mandatory

1. Read this standard, CHATGPT-CONTINUATION.md, CURRENT-STATE.md and relevant architecture/domain documents.
2. Confirm branch, exact base SHA, open PRs, current source and relevant CI status.
3. Inspect real implementation and tests; do not rely on class names, old notes or assumptions.
4. Trace the complete user journey, actors, routes, APIs, data writes, integrations and failure paths.
5. Identify compatibility constraints: URLs, API contracts, auth/session, database, feature flags, secrets and deployment.
6. Produce a concise plan with impacted files/modules, acceptance criteria, tests, security review and rollback for material changes.
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
- Never commit, print or expose credentials, tokens, OTPs, Oracle wallet material, private documents or personal data.
- Never bake secrets into Docker layers, build arguments or browser bundles.
- Validate inputs server-side; consider injection, IDOR, replay, brute force, mass assignment and unsafe uploads.
- Redact logs and reports; use correlation IDs without sensitive values.
- Review minimization, consent, retention, deletion and auditability. Refer legal interpretation to qualified professionals.
- Threat-model authentication, registration, payment/refund, seller documents, delivery OTP, admin and personal-data changes.

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

## Release and handoff

- Material changes need acceptance criteria, evidence, risks and rollback/mitigation.
- PRs must state changes, non-changes, tests, known gaps and operational steps.
- Verify exact commit and target before deploying.
- Do not alter production secrets, DNS, hosting or database state without authorization.
- Update relevant docs in the same PR whenever architecture, workflow, API, configuration, security or operations change.
- State blockers and uncertainty directly; never overstate completion.

## Completion checklist

- [ ] Requirements and full user journey understood.
- [ ] Existing code and boundaries inspected.
- [ ] UX, accessibility and responsive behavior considered.
- [ ] Authorization, ownership, privacy and security reviewed.
- [ ] Transaction, integrity, retry and failure behavior considered.
- [ ] Tests added/updated and actually executed.
- [ ] CI/build results tied to exact commit.
- [ ] Deployment/database/runtime claims independently verified or marked unverified.
- [ ] Documentation and handoff updated.
- [ ] Remaining risks and blockers stated.

This standard is mandatory for every future coding execution in this repository. Any exception must be documented with reason and accepted risk.
