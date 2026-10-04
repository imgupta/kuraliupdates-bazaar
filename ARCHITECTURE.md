# Architecture

## Runtime
Browser → React/Vite → Spring Boot REST → Oracle.

React is the only UI. Angular/RxJS/Angular CLI are retired.

## Backend
Controller → Application Service → Domain/DTO → Repository → Oracle.

- Service: use cases, transactions, orchestration.
- Domain: business rules/invariants.
- Repository: persistence only.
- Adapter: Resend, MSG91, Google Maps, and other external APIs.
- Strategy: interchangeable provider/policy behavior.
- Factory: only where object creation varies.

Rules:
- Controllers contain HTTP mapping/validation, not business workflows.
- DTOs cross API boundaries; do not expose JPA entities.
- Keep transactions at service/use-case boundaries.
- Prefer composition over inheritance.
- Keep modules small and feature-oriented.

## Frontend
Feature-oriented React. API calls live in `src/services`; shared state in Context/hooks; UI in components; types in `src/types`.
Use controlled React forms and avoid duplicated state.
Do not create Angular modules/services/components or a second frontend.

## Database
Flyway is the schema owner.
The rebuild will create a fresh baseline schema. Legacy address migrations/backfills are removed.
Use stable IDs, explicit FK/unique/check constraints, and indexes for primary access paths.
Keep one authoritative persistence model per business concept.

## Quality gates
```bash
mvn clean verify
npm run build
```
Then smoke-test: health → registration/OTP → sign-in → profile/address CRUD → default address → order → tracking.
