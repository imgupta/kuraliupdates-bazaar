# Architecture

**Source of truth:** this file. Keep it short.

## Runtime
Browser → React/Vite → REST → Spring Boot → Oracle.

## Frontend
Feature-oriented React:
- `components/` — UI
- `context/` — shared application state
- `services/` — HTTP/API clients
- `types/` — shared TypeScript contracts
- `data/` — static/demo data only

Rules:
- React only; no Angular/RxJS/Angular CLI.
- Controlled forms and one source of truth for state.
- API calls stay out of presentational components.
- Avoid duplicate client/server state.

## Backend
Feature-oriented Spring Boot:
`Controller → Application Service → Domain/DTO → Repository → Oracle`

- Controllers: HTTP mapping, authentication context, validation.
- Services: use cases, transactions, orchestration.
- Domain: business rules/invariants when complexity warrants it.
- Repositories: persistence only.
- DTOs: API contracts; never expose JPA entities.
- Adapters: external systems such as email/maps.
- Strategy: interchangeable provider/policy behavior only.
- Factory: only when construction actually varies.

## Database
Flyway is the only schema owner.
The rebuild uses a fresh schema baseline; legacy address/backfill migrations are retired.
Use stable IDs, explicit FK/unique/check constraints, and indexes for real access paths.
One authoritative table/model per business concept.

## Quality gate
```bash
npm run lint
npm run build
cd backend-java-spring && mvn clean verify
```

Smoke test: health → register/OTP → sign-in → profile/address CRUD → default address → order → tracking.
