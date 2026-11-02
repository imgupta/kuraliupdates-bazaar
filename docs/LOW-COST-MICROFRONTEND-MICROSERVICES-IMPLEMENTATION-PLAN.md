# KuraliUpdates Low-Cost Microfrontend and Microservices Implementation Plan

**Status:** Approved planning baseline; implementation not started by this document  
**Created:** 2026-11-03  
**Baseline:** `main` at `e0264529da34ea5a512e150e9f8df5ca1c515c97`  
**Repository:** `imgupta/kuraliupdates-bazaar`  
**Scope:** Five frontend applications, five backend business services, low-cost co-located deployment, and a controlled path to independent deployment.

> This is an execution plan, not evidence that the architecture has already been implemented. All runtime, database, CI and deployment claims must be verified independently.

## 1. Executive decisions

1. Keep one Git monorepo for frontend and backend during the migration.
2. Keep five independently buildable frontend applications (Buyer, Seller, Delivery, Daily Help Provider, Admin). Publish their static outputs from one static-site deployment initially.
3. Define five backend bounded services: Identity, Marketplace, Orders, Delivery, and Daily Help.
4. **Low-traffic deployment default:** keep these five bounded services in one Spring Boot runtime (a modular monolith) and one Render Docker web service. This is the lowest-complexity and usually lowest-memory option. It is not five independently running microservices yet.
5. Preserve a deployment seam so the same domain code can later be packaged into five separate service processes and images/containers.
6. If the business explicitly requires five independently running Spring Boot applications immediately, one Docker image can contain all five executable JARs and a process supervisor can start them in one container. This is a temporary **co-located multi-process deployment**, not independent scaling or fault isolation. It must be benchmarked before use.
7. Do not add Kubernetes, Kafka, a service mesh, a dedicated API gateway, or five separately billed backend instances at this stage.
8. Keep the existing Oracle database instance initially, but establish strict logical ownership and prevent cross-domain writes. Schema separation is a later security/operations decision, not a prerequisite to begin modularisation.
9. Communications remains a shared outbound integration capability initially (email/SMS/Zender and notification delivery). Do not count it as a sixth independently deployed business service in this five-service target.

### Important terminology

- **Monorepo:** source code and build definitions are stored together.
- **Microfrontend:** a portal has an independently buildable application boundary and owned routes; separate hosting is optional.
- **Bounded service/module:** a business capability with explicit code, data and API ownership.
- **Microservice runtime:** an independently running/deployable process with its own operational lifecycle.
- **Single image:** one immutable filesystem artifact. It does not imply one process, one service, or independent scaling.
- **Single container:** one runtime allocation. Every process inside shares its CPU/memory and container lifecycle.

## 2. Research findings and deployment decision

### 2.1 Can five backend applications run from one Docker image?

Yes. A Docker image can contain multiple JARs and a startup supervisor can start multiple JVM processes. Docker's own guidance says multiple processes are possible, but recommends one service per container and warns that the main process must manage child processes and shutdown correctly. Render forwards public HTTP traffic to only one port per web service, so the deployment needs one public gateway/listener and private loopback ports for internal applications.

This arrangement saves the cost of five separate Render service allocations, but it does **not** save the memory needed by five JVMs. All five JVMs plus the gateway and supervisor share one instance. A JVM crash, container restart, deploy or out-of-memory event can affect all five. All services are released and rolled back together.

### 2.2 Recommended modes

| Mode | Runtime | Cost/operations | Decision |
|---|---|---|---|
| A. Modular monolith | One Spring Boot JVM with five enforced domain modules | Lowest memory and operational overhead; one deployment | **Start here** |
| B. Co-located services | Five Spring Boot JVMs + gateway + supervisor in one container/image | One hosting allocation, but five JVM heaps, shared resource ceiling and shared failure/release domain | Optional short-lived experiment only after measurement |
| C. Independent services | Five images/containers or five Render services | Independent scaling, health, deployment and rollback; higher base cost | Target when usage/operational need justifies it |

**Do not describe Mode A as five deployed microservices.** It is five bounded backend modules in one runtime, designed for extraction. Mode B may be called five service processes, but it is still one co-located deployment unit. Mode C is the full independent microservices operating model.

### 2.3 Why Mode A is the initial recommendation

The current backend is one Maven project, one Spring Boot application and one Dockerfile. The Dockerfile builds one executable JAR and starts one JVM. Turning it into five JVMs solely to use the word microservices introduces extra heap, thread pools, connection pools, startup time and operational complexity without creating additional hosting capacity. For very low traffic, use one JVM and enforce the five service boundaries in code first.

If an experiment proves that Mode B is affordable and is a hard product requirement, use a supervisor with:
- one foreground PID 1 process;
- explicit child-process startup ordering and readiness checks;
- signal forwarding and graceful shutdown;
- fail-fast behaviour if a required child exits;
- bounded heap per JVM and a total memory budget;
- one public gateway listening on Render's `PORT`;
- service processes bound only to loopback/private ports;
- per-service health endpoints aggregated by gateway readiness;
- logs to stdout/stderr with service identifiers;
- no secrets in Docker build arguments or image layers.

Do not use a shell script that backgrounds five Java commands and then exits or ignores child exit codes. Do not expose five public ports: Render routes public traffic to one port per web service.

### 2.4 Frontend deployment

The current repository already has five Vite portal HTML entries and scripts `build:buyer`, `build:seller`, `build:delivery`, `build:daily-help`, `build:admin`, and `build:portals`. Keep the five separate build targets, but publish one combined artifact from one static site initially. Before changing deployment, implement and test correct nested asset paths, SPA fallback, direct navigation/refresh, and portal route isolation. Existing Vite configuration currently uses root base paths for separate-host deployments; it must be deliberately changed/tested for path-based consolidated hosting rather than blindly reusing that assumption.

Suggested public paths:
- `/` — Buyer
- `/seller/*` — Seller
- `/delivery/*` — Delivery
- `/daily-help/*` — Daily Help customer/provider entry as designed
- `/admin/*` — Admin

Keep legacy registration and account paths working as redirects/aliases. If nested paths create unacceptable complexity, retain one domain with subdomains or move to independent static sites only after cost and cookie/CORS implications are evaluated.

## 3. Repository baseline and constraints

Verified baseline facts from the current repository:
- Frontend: React 19, TypeScript, Vite 8, one package manifest and Bun lockfile.
- Five role portal HTML files and five role-specific Vite build scripts already exist.
- Vite currently selects a portal HTML entry using `VITE_PORTAL`; `base: '/'` was chosen for standalone host-root deployments.
- Backend: one Maven project at `backend-java-spring/pom.xml`, Spring Boot 3.3.4, Java 17, Oracle JPA/JDBC, Flyway, Spring Security, WebSocket and one application artifact.
- Backend Dockerfile at `backend-java-spring/Dockerfile` builds one executable JAR and starts one JVM. It copies the Oracle wallet ZIP into the image during build; this existing secret/configuration handling must be reviewed before any Docker refactor.
- Existing API facade, global context and several large controllers/services indicate coupling that must be mapped before extraction.
- Existing docs include `docs/UI-MODULARIZATION-PLAN.md`; that plan is frontend-only and its historical file-size figures are stale. Reconcile rather than overwrite its useful history.

Do not change Java/Spring versions, Oracle connection configuration, Flyway history, authentication semantics, public API routes or payment/refund behaviour as incidental architecture work.

## 4. Target service boundaries

The five service boundaries below are provisional contracts to validate against actual controller/service/repository/entity and workflow dependencies in Phase 0. A file is not moved just because its name resembles a domain.

| Service | Owns | Explicitly does not own |
|---|---|---|
| Identity | Buyer/seller/provider/agent/admin identity, credentials, registration, OTP policy and verification, roles, sessions/token lifecycle, account linking | Seller catalogue, orders, delivery jobs, bookings |
| Marketplace | Seller business profile after account identity, seller onboarding/compliance profile and documents, product/catalogue/category, inventory, price, seller availability | Credentials/session, order lifecycle, delivery execution |
| Orders | Cart/checkout validation, order and suborder lifecycle, accepted bargain price snapshot, payment/refund records and order financial ledger/reconciliation workflow | Product master/inventory master, delivery-agent assignment, Daily Help job execution |
| Delivery | Agent operational profile after identity, approval/availability, dispatch/assignment, route/tracking, delivery OTP and delivery lifecycle | Order master/financial state; it requests state transitions through Orders contracts |
| Daily Help | Provider service catalogue, service areas/slots/availability, booking, job acceptance/start/completion OTP, job lifecycle and provider earnings records | Identity credentials, grocery order lifecycle |

### 4.1 Cross-domain rules

- Identity owns authentication. Other domains consume authenticated principal/claims and call Identity only for identity operations; no duplicate password/OTP store.
- Marketplace owns product and inventory truth. Orders may store immutable item/price/tax/discount snapshots needed to preserve the accepted order contract.
- Orders owns order state. Delivery cannot directly update order tables; it sends a delivery outcome/command to Orders.
- Orders owns grocery payment/refund state. Seller-direct refund workflow must preserve the currently selected business rule: seller refunds the customer directly; platform records/co-ordinates the case. Do not silently implement payment aggregation or platform-held seller reserves.
- Daily Help booking/job lifecycle is separate from grocery order lifecycle. Payment ownership and actual current settlement implementation must be verified before designing cross-domain events.
- Bargaining conversation may live with Marketplace initially, but accepted offer/cart/order price snapshot ownership must be explicitly assigned. An accepted offer must be revalidated server-side at checkout.
- Seller onboarding CRM lead/callback/assignment data must be distinguished from the final Marketplace seller account/profile and Identity account.
- Admin is a frontend/role, not a sixth backend service. Admin APIs live with the domain that owns the operation.
- Communications is an outbound adapter/capability. It receives notification intents from domains and must not become the owner of business state.
- Shared code must be technical and small (security primitives, error model, observability, clock/ID utilities). Do not create a shared repository layer that allows cross-domain database access.

### 4.2 Database ownership

Create a table-level data ownership inventory before changing repositories:
- table/entity and Flyway migration owner;
- current readers/writers;
- proposed owning service;
- foreign-key/cascade relationships;
- transaction boundaries;
- sensitive/financial/PII classification;
- indexes and query plans;
- migration/rollback strategy.

Initially one Oracle database/schema may be retained for cost and migration simplicity. Enforce ownership in package structure and repository access first. Use separate database users/schemas only when supported by the actual Oracle account/privileges and when migration/connection-pool implications are documented. No service may write another service's owned tables. Avoid distributed transactions; use local transactions, idempotent commands and an outbox for cross-domain events.

## 5. Frontend implementation phases

### FE-0 — Route and build baseline
- Inventory all current URLs, route guards, registration aliases, redirects, shared shell/session and all five HTML entry files.
- Record current build output and deployment URL mapping.
- Add tests for each portal's entry, role restrictions, direct URL load and refresh.
- Record shared imports between role components.

**Exit:** baseline route matrix and reproducible build evidence exist; no runtime changes.

### FE-1 — Enforce five application boundaries
- Retain one monorepo and one dependency lock.
- Establish `apps/buyer`, `apps/seller`, `apps/delivery`, `apps/daily-help`, `apps/admin` as real application entry boundaries incrementally. Do not perform a blind bulk move.
- Establish shared packages for UI/design tokens, auth client, API transport/domain clients, shared contracts, validation and utilities only when there are real consumers.
- Keep each portal's pages/state/services private to that portal; cross-portal imports use package public exports.
- Keep one auth/session contract and one source of truth.
- Split AppContext by domain and consumer map; retain a compatibility facade until consumers are migrated.
- Split the API facade into typed domain API clients; preserve backend request/response contracts.
- Resolve buyer-facing Daily Help catalogue/booking versus provider operations ownership: customer discovery/booking UI belongs to Buyer; provider operational UI belongs to Daily Help.

**Exit:** each portal builds independently; no circular imports or private cross-portal imports; auth/session and all existing flows pass.

### FE-2 — Combined static artifact
- Build five portal outputs to a single deterministic publish directory.
- Configure Vite `base` and asset paths for the chosen URL strategy.
- Configure host rewrites/fallbacks so deep links serve the correct portal entry.
- Prevent a missing portal path from silently returning the Buyer app.
- Add cache strategy: content-hashed assets long-cache; HTML short/no-cache as appropriate.
- Verify all five portals, registration routes, account links, browser Back/Forward, refresh, logout and session transitions on staging.
- Deploy through one static site. No five static hosting services initially.

**Exit:** one static deployment serves five independent portal entry bundles and all five role journeys pass.

## 6. Backend implementation phases

### BE-0 — Discovery and baseline
- Inventory every controller endpoint, service, repository, entity, scheduled task, WebSocket handler, Flyway migration and external integration.
- Build endpoint-to-domain and entity/table-to-domain matrices.
- Trace end-to-end workflows: registration/OTP, seller onboarding, catalogue/inventory, bargain, checkout, seller order handling, refund, dispatch/delivery, Daily Help booking/start/complete, notifications.
- Identify cross-domain transactions and direct repository/JdbcTemplate access.
- Record Oracle connection pool sizing, Hikari settings, expected connection count and Render memory/CPU limits.
- Record baseline build/test/CI and staging health evidence.

**Exit:** all endpoint/table/workflow ownership is assigned or listed as an explicit unresolved decision. No extraction begins while critical transaction/table ownership is unknown.

### BE-1 — Modularise existing Spring Boot runtime (Mode A)
- Keep the current one Maven project, one Spring Boot application and one Docker runtime.
- Establish package boundaries: `identity`, `marketplace`, `orders`, `delivery`, `dailyhelp`, plus narrow `shared` and `config`.
- Move code in small vertical slices, starting with contracts/interfaces and tests; do not move entire domains blindly.
- Enforce package dependency direction. Domain modules cannot reach into another module's repositories/entities.
- Add architecture tests (e.g. ArchUnit if compatible) to prevent forbidden imports and cross-module repository access.
- Define domain application interfaces and typed command/query contracts.
- Keep controllers at explicit API boundaries; avoid a controller calling another domain's repository.
- Keep business rules and existing API payloads stable during structural refactoring.
- Separate Communications adapters behind interfaces; do not add a new runtime yet.
- Add correlation IDs, redacted structured logs and per-domain metrics.
- Configure Spring Boot Actuator health/readiness safely; expose only required health information publicly.
- Use one process and one connection pool initially; avoid multiplying connection pools.

**Exit:** all modules have enforceable boundaries, tests pass, no cross-domain repository access remains except documented temporary exceptions with owner and removal date, and staging business journeys pass.

### BE-2 — Service contracts and asynchronous consistency
- Document REST API contracts for commands/queries between domains.
- Define event names, schema versions, idempotency keys and delivery semantics.
- Implement transactional outbox only for events that must not be lost after a local commit.
- Implement retry with bounded exponential backoff, poison-message handling and observable backlog.
- Use synchronous calls for simple request/response where appropriate; do not introduce Kafka just for architecture.
- Define timeout budgets and avoid unbounded synchronous chains.
- Make order/payment/refund and delivery/booking state transitions idempotent.
- Add contract tests and failure tests (timeout, duplicate event, retry, consumer unavailable).
- No distributed transaction / XA design.

**Exit:** contracts and failure semantics are documented and tested; critical events survive process restart and duplicate delivery safely.

### BE-3 — Deployment-mode decision gate
Before Mode B, measure Mode A in staging under representative load:
- startup time and memory at idle;
- peak memory and CPU during concurrent catalogue, order, delivery and booking requests;
- Oracle connection count and pool saturation;
- thread count, request latency and error rate;
- current Render plan constraints and monthly cost.

Estimate Mode B memory as the sum of five JVM baseline heaps/metaspace/native memory + gateway + supervisor + safety headroom. Do not assume five small services fit into the same memory allocation as one JVM. Include Oracle connection pools for every process.

**Default:** stay in Mode A unless Mode B provides a demonstrated isolation/operational benefit and fits the existing plan with at least 30% memory headroom under the agreed load test.

### BE-4 — Optional co-located five-process image (Mode B)
Only if the decision gate approves:
- Create five independently bootable Spring Boot service applications from the bounded modules.
- Use one Dockerfile with multi-stage build and a final runtime image containing five executable JARs, gateway and a minimal supervisor/init.
- Define explicit process commands, internal ports and per-process heap limits.
- Gateway is the only process binding Render's externally routed `PORT`; all service ports bind to loopback.
- Readiness checks verify each required service and the gateway. Render's health endpoint must fail if a required process is unavailable.
- Supervisor forwards SIGTERM, gives services a graceful shutdown window, reaps child processes and exits non-zero if a required process dies.
- Emit all logs to stdout/stderr; include service name, trace/correlation ID and severity; redact tokens, OTPs, credentials and personal documents.
- Ensure one process cannot consume all memory: set JVM `-Xms/-Xmx`/container-aware memory limits conservatively and load-test the aggregate.
- Keep services stateless; Oracle is the source of durable data. Do not rely on container filesystem for uploads or durable queues.
- Deploy one Render Docker web service; one release updates all five processes.
- Document that individual services cannot be independently scaled, deployed or rolled back in this mode.

**Exit:** container starts all processes, all internal health endpoints pass, gateway routes correctly, SIGTERM/restart behaviour is verified, one child failure is handled as designed, and load test demonstrates memory/CPU headroom. If any criterion fails, revert to Mode A.

### BE-5 — Extract to independent containers when justified (Mode C)
- Start with the lowest-coupling domain chosen from measured dependency analysis, not by a fixed assumed order.
- Build a standalone image per service from the same monorepo and shared source; image may be built from the same Dockerfile using a target/argument or dedicated build target.
- Deploy one service at a time. Route through the current gateway/API facade.
- Give each service its own resource allocation, health checks, logs, environment and deployment/rollback.
- Migrate database ownership and consumers deliberately; no dual writes.
- Verify contract, E2E and rollback before extracting the next service.
- Remove the old in-process implementation only after the new service is stable and telemetry confirms no callers remain.

**Exit:** each extracted service can be deployed/rolled back independently and owns its data writes.

## 7. Suggested extraction sequence and caveats

The sequence is a starting hypothesis; Phase BE-0 dependency mapping can change it.

1. **Communications capability** — easiest to isolate as an adapter/worker, but it is not one of the five core business services. Extract only if provider throughput/reliability justifies another process.
2. **Daily Help** — separate lifecycle, but verify payment/earnings coupling and provider identity dependencies.
3. **Delivery** — clear operational domain, but carefully coordinate delivery outcome with Orders via contracts/events.
4. **Marketplace** — seller/catalogue/inventory ownership; resolve accepted bargain and inventory reservation semantics.
5. **Orders** — highest transaction/financial risk; extract only after idempotency, outbox, payment/refund and seller-direct refund contracts are proven.
6. **Identity** — cross-cutting dependency across every portal and service; extract only after token/session/OTP contract, account linking and migration are proven.

The five target services are Identity, Marketplace, Orders, Delivery and Daily Help. The above sequence is not permission to create a sixth core service.

## 8. Docker, configuration and secrets

- Keep a multi-stage Docker build: Maven build stage, minimal Java runtime stage.
- Pin supported base image versions and scan image/dependencies.
- Run as non-root where compatible.
- Use exec-form entrypoints; ensure SIGTERM reaches Java processes.
- Keep secrets out of source, image layers, build args and logs.
- Review current Oracle wallet handling: do not bake private wallet material into a public repository image. Use the platform's protected secret/file mechanism or a secure runtime mount, validate access permissions, and rotate credentials if exposure is suspected. Never print wallet content.
- Externalise environment-specific config; validate required variables at startup.
- Keep file uploads/documents in durable object/database storage, not container ephemeral filesystem.
- Keep Flyway migrations controlled. A single shared schema must have one migration execution authority; do not have five JVMs race to run migrations on startup. Run migration once through a controlled release step or a single designated application process after validating Render plan support. Migration rollback must be documented; Flyway versioned migrations are normally forward-fixed, not manually deleted.
- Render web service exposes one public port. Internal service ports must not be exposed publicly.

## 9. API gateway and routing

Initially the existing Spring Boot API remains the public entry point. Do not add a separate gateway product yet.

As services split:
- retain one stable public API base URL;
- route domain paths to internal services;
- preserve existing API paths and response contracts during migration;
- enforce authentication/authorization at the backend, not only in frontend route guards;
- propagate correlation IDs and authenticated principal context;
- prevent direct public access to internal service ports;
- define timeout and error translation rules;
- avoid gateway business logic.

A dedicated gateway is considered only when routing/security/traffic needs exceed what the existing API entry point can safely handle.

## 10. CI/CD and test strategy

- Keep one repository and lockfile.
- Use path-based CI: portal-only changes test that portal; shared auth/UI/contracts test every consumer; backend domain changes test that domain and its dependents; shared security/database changes trigger full relevant regression.
- Add concurrency groups to cancel obsolete PR builds safely.
- Cache Bun and Maven dependencies.
- Do not deploy on documentation-only changes unless the workflow explicitly needs docs validation.
- Run full integration tests for security, Flyway, shared contracts and release candidates.
- Use dedicated synthetic staging identities/data; never run mutating E2E against real customer/seller data.
- Report skipped authenticated tests as skipped, not passed.
- Build immutable artifacts once and promote the same artifact from staging to production.
- Keep production deployment approval and rollback.
- Do not claim deployment or migration success from CI alone.

Required test layers:
1. Domain unit tests.
2. Repository/integration tests against supported Oracle-compatible test strategy or isolated Oracle schema.
3. API contract tests.
4. Architecture boundary tests.
5. Frontend component/route tests.
6. Five-role authenticated E2E.
7. Cross-domain workflows: checkout, bargain acceptance, seller order handling, seller-direct refund coordination, delivery assignment/completion, Daily Help booking/start/completion.
8. Resilience tests: duplicate request/event, timeout, downstream unavailable, restart during event processing.
9. Docker startup, health, signal/shutdown and memory/load tests for Mode B.

## 11. Release and acceptance gates

No phase is complete until evidence is attached to its PR/implementation record.

| Gate | Required evidence |
|---|---|
| G0 Baseline | Commit SHA, route/endpoint/entity inventories, dependency map |
| G1 Frontend boundaries | Five individual builds, import-boundary tests, route/auth regression |
| G2 Single static site | Staging URL checks for all portals, refresh/deep-link/assets, role E2E |
| G3 Backend modules | Architecture tests, backend unit/integration tests, API compatibility |
| G4 Data ownership | Table ownership matrix, repository audit, migration plan, transaction map |
| G5 Mode decision | Measured resource report, connection count, cost comparison, signed decision |
| G6 Co-located image (if selected) | All five health checks, gateway routing, shutdown/failure test, load/memory evidence |
| G7 Independent extraction | Separate deployment/rollback evidence, contract/E2E tests, no cross-owner writes |
| G8 Production readiness | Security review, backup/restore, observability, incident and rollback runbooks |

## 12. Rollback rules

- Frontend: redeploy previous static artifact; keep previous portal entry bundle available until release is accepted.
- Mode A backend: redeploy previous known-good image; database migrations must be backward-compatible during rollout.
- Mode B: rollback the entire co-located image as one unit; no per-service rollback is possible.
- Mode C: rollback only the affected service if contracts remain backward compatible.
- Never roll back by deleting applied Flyway migrations or manually editing production data.
- Use expand/migrate/contract for schema changes: add compatible schema, deploy compatible code, migrate data, then remove obsolete schema only in a later approved release.
- Feature flags must default safely and have documented owners/expiry dates.

## 13. Cost and scale triggers

Do not choose service count based on an arbitrary user count. Review monthly:
- actual request volume and p95 latency by domain;
- CPU/memory peaks and OOM/restart events;
- Oracle connections and query latency;
- queue/outbox backlog and delivery latency;
- deploy frequency and incidents;
- incremental monthly cost of an additional instance;
- operational burden of coordinating releases.

Extract a service when at least one measurable reason exists:
- one domain consistently saturates shared CPU/memory;
- a fault in one domain repeatedly affects unrelated critical workflows;
- a domain needs a different release cadence;
- one domain needs independent scaling or security isolation;
- the co-located container cannot meet availability/latency targets;
- the additional hosting cost is approved and sustainable.

Do not split solely because the architecture diagram has five boxes.

## 14. Immediate task sequence

The first implementation PR should be documentation and inventory only. Follow this order:

1. Reconcile current architecture docs and baseline SHA.
2. Create route/portal inventory and frontend dependency graph.
3. Create controller/endpoint-to-domain inventory.
4. Create entity/table ownership and transaction matrix.
5. Trace the six critical business workflows listed in BE-0.
6. Record existing Docker/Render configuration and Oracle wallet/secret handling risks without exposing values.
7. Add architecture decision record for Mode A default and Mode B conditional experiment.
8. Add CI path-filter design and test matrix.
9. Review the completed discovery with the owner.
10. Start FE-1 and BE-1 as separate small PRs; do not mix frontend route rewrites with backend service extraction.

## 15. Architecture decision record

**ADR-KU-001 — Low-cost co-located service strategy**

- **Decision:** begin with one Spring Boot runtime containing five enforceable domain modules and one Docker web service. Keep five frontend applications buildable separately and deploy their static assets together.
- **Reason:** lowest operational and memory overhead for very low traffic while retaining clear domain boundaries and future extraction seams.
- **Alternative:** five JVM processes in one Docker image/container behind one gateway. Permitted only after measured resource headroom and lifecycle tests; this is co-located deployment, not independent scaling.
- **Rejected for initial phase:** five separately billed backend services, Kubernetes, Kafka and dedicated gateway.
- **Consequences:** one backend deploy/restart affects all domains initially; shared runtime resources; no independent rollback. These are accepted temporary trade-offs.
- **Review trigger:** resource saturation, isolation incident, independent release requirement or approved budget for separate services.

## 16. External technical references

Research checked on 2026-11-03:
- Docker, *Run multiple processes in a container*: one service per container is the recommended default; when multiple processes are used, the main process must manage them and graceful process reaping/shutdown matters. https://docs.docker.com/engine/containers/multi-service_container/
- Docker, *Multi-stage builds*: separate build and runtime stages to keep final images smaller and omit build tools. https://docs.docker.com/build/building/multi-stage/
- Render, *Docker*: Dockerfile-based build/deploy, Docker command and multi-command options. https://render.com/docs/docker
- Render, *Web Services*: a public web service binds to `0.0.0.0`; Render forwards inbound traffic to one HTTP port per service. https://render.com/docs/web-services
- Render, *Health Checks*: TCP and HTTP health-check behaviour for web/private services. https://render.com/docs/health-checks
- Render, *Deploys*: pre-deploy commands, deployment sequence and shutdown behaviour. https://render.com/docs/deploys
- Spring Boot Actuator endpoints: health/readiness exposure and endpoint access controls. https://docs.spring.io/spring-boot/reference/actuator/endpoints.html

Recheck vendor documentation and plan limits before changing production hosting; pricing, free-tier limits and platform capabilities can change.
