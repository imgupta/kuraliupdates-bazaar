# Codebase Documentation and Technical Handoff Standard

**Status:** Mandatory for every PR that changes code, UI, APIs, data, architecture, configuration, tests or operational behavior.  
**Purpose:** Ensure a developer can understand the exact current implementation and generate a source-backed Word, PDF or PowerPoint deliverable on demand.

## 1. Documentation is part of implementation

A feature is not documentation-complete merely because its code is readable or its PR description is detailed. Every material change must update the appropriate living Markdown documentation in the same PR. Documentation must describe what the code actually does, not only intended architecture.

Keep Markdown as the canonical, version-controlled source. Word (.docx), PDF and PowerPoint (.pptx) are generated deliverables created when the owner requests them. Do not maintain manually divergent copies of the same technical facts.

Each statement must be tagged or clearly distinguished as:
- **Implemented and source-verified**
- **Test-verified** (include test name and exact commit)
- **Runtime-verified** (include environment, date and evidence)
- **Planned / target architecture**
- **Unknown / not yet verified**

Never present target architecture, mock UI, design intention, or a passing compile as proof of live runtime behavior.

## 2. Required documentation by change type

| Change | Required documentation update |
|---|---|
| UI/component/UX | Screen inventory, route, portal, component tree, layout/wireframe, responsive behavior, labels/copy, validation, states, interactions, accessibility and API/data bindings |
| Frontend route/navigation | Exact path, portal owner, guard/role, redirect, deep-link/refresh behavior, entry point, tests |
| API/controller/service | Method/path, request/response DTO, validation, auth/role/record ownership, error contract, service call flow, idempotency and tests |
| Domain/business logic | Business rule, state machine, invariants, edge cases, permissions, data owner and examples |
| Database/entity/migration | Entity/table/columns, keys/constraints/indexes, relationships, migration order, backfill, rollback/forward-fix, data classification and owner |
| Integration/vendor | Provider, purpose, endpoints/events, data sent/received, region, secrets by variable name only, timeout/retry/rate limit/idempotency, failure behavior and owner |
| Security/privacy/compliance | Threats, controls, data purpose/notice, authorization, retention/deletion, audit evidence, legal status and unresolved professional review |
| Architecture/runtime/hosting | C4 context/container/component views, module boundaries, deployment topology, environments, regions, trust boundaries, network/data flows, dependencies, capacity and recovery |
| Tests/operations | Test strategy, exact commands/results, CI run/SHA, dashboards/log signals, alert/runbook, rollout and rollback |

Documentation-only changes must still use the PR governance review, but need not invent technical sections that the change does not affect.

## 3. UI and screen-level specification

For every screen or materially changed UI component, maintain:
1. Screen ID and human-readable name.
2. Portal, route and entry component/file path.
3. Intended actor, role and permissions.
4. Layout hierarchy and component tree, including reusable components.
5. Wireframe or screenshot reference with viewport/device size and source commit.
6. Exact visible labels, button text, placeholders, helper text, validation messages and status copy.
7. Field specification: type, required/optional, format, constraints, default, source, privacy classification and API mapping.
8. Interactions: click/submit/navigation, loading, success, empty, error, disabled and retry states.
9. Responsive behavior for mobile/tablet/desktop; keyboard, screen reader, focus and contrast considerations.
10. API calls and state dependencies; loading and error ownership.
11. Analytics/events only where approved and privacy-reviewed.
12. Tests/evidence and known gaps.

Do not use a screenshot alone as the specification. It cannot establish exact labels, validation, accessibility, responsive rules or server-side behavior. Avoid putting real customer data, OTPs, tokens or private seller documents into screenshots.

## 4. Backend/API and domain specification

For each endpoint or command, document:
- HTTP method and exact path/version.
- Owning domain/module and controller/handler.
- Authentication, role/permission and record-owner rule.
- Request DTO fields, validation and examples using synthetic data.
- Response DTO/status codes/error contract.
- Service/application flow and repository/table reads/writes.
- Transaction boundary, isolation/locking and idempotency.
- Events, notifications and external side effects.
- Rate limits, timeout/retry and abuse controls.
- Audit events and sensitive-data redaction.
- Unit, integration, contract and authorization tests.

For each business workflow, document a sequence diagram and state machine, including happy path, rejection, timeout, retry, duplicate submission, partial failure, cancellation/refund and recovery where relevant.

## 5. Architecture documentation set

Keep these living views current:
- System context: users, external actors, providers and trust boundaries.
- Frontend architecture: five portals, entry/build targets, route ownership, shared shell, component/library structure, API clients, auth/session and state management.
- Backend architecture: one Spring Boot modular monolith initially; five domain modules (Identity, Marketplace, Orders, Delivery, Daily Help), shared adapters, package boundaries and dependency direction.
- API architecture: endpoint catalogue, contracts and domain ownership.
- Data architecture: ERD, entity/table ownership, read/write map, transaction boundaries, migrations, PII classification and retention.
- Integration architecture: provider sequence/data-flow diagrams, timeouts/retries and failure modes.
- Deployment architecture: environments, service topology, regions, secrets/config names, CDN, network paths, backups and DR.
- Security architecture: authentication, authorization, trust boundaries, threat model, audit and incident response.
- Operations: health checks, logs/metrics, alerts, runbooks, capacity, recovery and release gates.

Use Mermaid source for diagrams where possible so diagrams remain reviewable in Git. Diagrams must be generated from verified facts and label planned elements as planned. Do not call the initial modular monolith five deployed microservices.

## 6. Traceability and accuracy

Every technical document must state:
- Repository and branch/ref.
- Exact source commit SHA.
- Date generated and author/tooling where useful.
- Scope and excluded areas.
- Evidence references: source file paths, symbol names, tests, CI run and runtime evidence.
- Known gaps and confidence/status.

Prefer automated extraction for routes, OpenAPI, dependency graphs, schema/ERD and test inventories where reliable. Review generated output for stale/incorrect names and omitted dynamic behavior. Never expose secrets or private data.

## 7. On-demand deliverables

When the owner asks for documentation, generate the requested format from the current repository source and canonical Markdown:
- **Word (.docx):** detailed developer handoff, screen specifications, API contracts, implementation guide, data dictionary, operations/runbook.
- **PDF:** stable review/approval/architecture pack with clickable references, version/date and diagrams.
- **PowerPoint (.pptx):** concise architecture/product/engineering presentation with context, frontend, backend, data, integrations, deployment, risks and roadmap.

A full end-to-end technical pack should include:
1. Executive overview and scope.
2. Product roles and end-to-end user journeys.
3. UI screen catalogue and wireframes.
4. Exact routes, labels, components and interactions.
5. Frontend structure and state/API flow.
6. Backend modules, services, APIs and sequence diagrams.
7. Database ERD, table/field dictionary and ownership.
8. Authentication, authorization and security model.
9. Integrations and data flows.
10. Environment/deployment topology and hosting-region status.
11. Tests, CI evidence, release/rollback and operations.
12. Compliance/privacy controls, risks, decisions and open questions.

For large systems, split packs into navigable volumes (product/UI, frontend, backend/API, data, security/compliance, deployment/operations) and provide a master index. Do not create a giant unreadable slide deck; use Word/PDF for detail and PPT for synthesis.

## 8. PR checklist additions

Every code-changing PR must answer:
- [ ] What documentation files were updated?
- [ ] Are exact routes, labels, components, API/data contracts and states documented where affected?
- [ ] Are screenshots/wireframes and diagrams linked to a source commit where useful?
- [ ] Are implemented facts distinguished from planned and unverified behavior?
- [ ] Are tests and CI evidence tied to the exact commit?
- [ ] Can another developer follow the flow from UI -> route -> API -> service -> data -> integration?
- [ ] Are security, privacy, regulatory, operational and accessibility implications documented?
- [ ] Are known gaps, owners and next actions recorded?

A PR may be blocked for missing material documentation. The documentation requirement must remain proportionate: update only affected areas, but preserve end-to-end traceability.
