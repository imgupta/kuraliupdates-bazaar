# KuraliUpdates Bazaar

Hyperlocal marketplace and delivery platform for Kurali.

## Stack
- Web: React 19 + TypeScript + Vite + Tailwind
- API: Java + Spring Boot + REST + JPA
- Database: Oracle + Flyway
- Hosting: Vercel + Render

## Structure
- `src/` — React application
- `backend-java-spring/` — Spring Boot API
- `backend-java-spring/src/main/resources/db/migration/` — authoritative schema
- `ARCHITECTURE.md` — architecture source of truth
- `docs/` — compact API/database/development notes

## Development
```bash
npm install
npm run lint
npm run build

cd backend-java-spring
mvn clean verify
```

## Rules
React is the only frontend. Do not add Angular.
Flyway owns schema creation. Never edit an applied migration.
Controllers stay thin; services own use cases/transactions; repositories own persistence.
Use DTOs at API boundaries. Keep entities internal.
Prefer simple composition. Add Strategy/Adapter only for genuinely interchangeable providers.

## Production
- Web: https://www.kuraliupdates.com
- API: https://kuraliupdates-bazaar.onrender.com/api/v1

## Staging and test safety
- Current active staging test checklist: `docs/STAGING-REGRESSION-TESTS.md`.
- V13 is a destructive staging-only data cleanup; it is not schema creation and must never be run in production.
- Do not treat a green build or health check as end-to-end proof. Verify actual frontend/backend deployment IDs and the approved Oracle staging target before any mutating test.
