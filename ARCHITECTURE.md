# Architecture

**Source of truth. Keep short.**

## Runtime
Browser → React/Vite → REST → Spring Boot → Oracle.

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
`V5__reset_application_schema.sql` is the clean application-schema reset: it drops the discarded application tables and recreates the current model.
Historical V1–V3 files are retained only as Flyway history; do not reuse or modify them.
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
- /delivery/me resolves the approved agent from the authenticated account email/phone.
- Pickup jobs are server-authoritative READY_FOR_PICKUP orders.
- Claim and delivery OTP operations require the authenticated agent to own the delivery profile/order.

## Quality
```bash
npm run lint
npm run build
cd backend-java-spring && mvn clean verify
```
