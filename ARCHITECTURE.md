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

## Quality
```bash
npm run lint
npm run build
cd backend-java-spring && mvn clean verify
```
