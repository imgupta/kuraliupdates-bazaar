# Architecture

**Source of truth. Keep short.**

## Runtime
Browser → React/Vite → REST → Spring Boot → Oracle.

## Environments
- Staging: synthetic end-to-end testing and staging-only data cleanup.
- Production: live customer environment; no synthetic users/orders and never run V13 cleanup.
- Verify Vercel alias, Render service/commit, and Oracle schema target independently. A deployment status alone does not establish end-to-end readiness.

## Frontend
Feature-oriented React:
- `components/` — UI
- `context/` — shared state
- `services/` — API clients
- `types/` — contracts
- `data/` — static/demo data

React is the only frontend. No Angular/RxJS/Angular CLI.

## Backend
`Controller → Service → DTO/Domain → Repository → Oracle`

- Controller: HTTP/auth/validation only.
- Service: use case + transaction boundary.
- Domain: business rules when needed.
- Repository: persistence only.
- DTO: public API contract; never expose JPA entities.
- Adapter/Strategy: only for genuinely interchangeable external behavior.

## Database
Flyway owns schema.
`V5__reset_application_schema.sql` is the clean application-schema rebuild.
`V13__reset_staging_test_data.sql` is a destructive staging-only data reset, not schema creation. Never run it on production, and never edit an applied migration.
Historical V1–V3 files are retained as Flyway history; do not reuse or modify them.
Use stable IDs, FK/unique/check constraints and query-driven indexes.

## Operational workflows

### Daily Help
- DAILY_HELP_SERVICES is the customer catalogue.
- Professionals own dated time slots in DAILY_HELP_PROFESSIONAL_SLOTS.
- A slot is bookable only when the slot is AVAILABLE and the professional is verified and AVAILABLE.
- Booking locks the selected slot and changes it to BOOKED in the same transaction.
- Professional availability is independent of the user's primary role; the authenticated phone must own the professional profile.

### Delivery
- Delivery approval is stored on DELIVERY_AGENTS.STATUS; only ACTIVE agents can access pickup jobs.
- `/delivery/me` resolves the approved agent from authenticated email/phone.
- Pickup jobs are server-authoritative READY_FOR_PICKUP orders.
- Claim and delivery OTP operations require the authenticated agent to own the delivery profile/order.
- The browser validates the four-digit format; the backend remains authoritative for the OTP, order association, assignment, status transition, and payout. Never log OTP contents.
- Successful end-to-end proof requires a staging order and agent, exact server order ID, persisted OTP association, server status read-back, and replay/invalid-code checks.

## Quality
```bash
npm run lint
npm run build
cd backend-java-spring && mvn clean verify
```

## Staging reset and OTP verification status (11 October 2026)
- The owner reports staging data cleanup and Flyway V13 execution. Confirm the successful V13 row in Flyway history and the Oracle schema identity using read-only, sanitized evidence before running write workflows; no credentials/PII are to be surfaced.
- PR #36 corrected the four-digit frontend OTP regex and added backend verification/payout/assignment unit tests. Focused and full backend checks passed before merge.
- Current main includes delivery claim synchronization and extra leading-zero, malformed OTP, replay, and payout-idempotency tests.
- Render deployment `dep-db5b5u15efls73ah5cj0` is live on `b970c391b040596128236fbb20be62a6e3cdff15`; Vercel custom-domain lookup reports READY at the same commit.
- Real staging end-to-end UI → API → Oracle evidence is still required. Use synthetic staging-only buyer/seller/agent records and assert canonical order ID, assignment, persisted OTP, delivered state, COD payment state, and exactly-once payout. Never print OTP contents.
