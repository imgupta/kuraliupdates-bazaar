# Architecture

## System
Browser → React 19/Vite → Spring Boot REST API → Oracle.

React is the only frontend. Angular is retired.

## Backend
Controller → Application Service → Domain/DTO → Repository → Oracle.

Use Service Layer for use cases and transactions; Strategy for interchangeable policies/providers; Factory for provider-specific creation; Adapter for Resend, MSG91, Google Maps and other external APIs; Repository for persistence. Use Specification only when composable search rules add value.

Keep controllers thin, entities internal, DTOs as API contracts, and business rules in services/domain code.

## Database
Flyway is the single schema owner. The rebuild creates a fresh baseline migration representing the current schema. Legacy V1–V4 address migrations and backfill logic are removed.

Use stable IDs, explicit FK/unique/check constraints, and indexes for user/order/search access paths. One authoritative persistence path must exist for each business concept.

## Frontend
Feature-oriented React:
```
src/
  components/
  context/
  services/
  types/
  data/
```

API access stays in service modules. Shared state belongs in Context/hooks. Forms are controlled React state. Avoid duplicated state and page-sized business logic.

No Angular, RxJS, Angular CLI, Angular Material, or Angular-style service architecture.

## Core flows
React UI → API client → Controller → Service → Repository → Oracle.

OTP generation, hashing, expiry and verification remain server-side. Delivery uses adapters/strategies: Email → Resend; SMS → MSG91.

Addresses are normalized in USER_ADDRESSES. One default address per user is enforced by service logic plus database constraints/indexing.

## Quality gates
```
mvn clean verify
npm run build
```
Then verify Flyway on a clean database, health, authentication, registration, address CRUD/default, checkout and tracking smoke tests.
