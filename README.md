# KuraliUpdates Bazaar

Hyperlocal marketplace and delivery platform for Kurali.

## Stack
- Web: React 19 + TypeScript + Vite + Tailwind.
- API: Java 21 + Spring Boot + REST + JPA.
- DB: Oracle + Flyway.
- Hosting: Vercel + Render.

## Structure
- `src/` — React app.
- `backend-java-spring/` — Spring Boot API.
- `backend-java-spring/src/main/resources/db/migration/` — schema migrations.
- `ARCHITECTURE.md` — compact technical source of truth.
- `DEPLOYMENT.md` — release/runbook rules.

## Rules
React only. Angular is retired and must not be reintroduced.
Backend uses Controller → Service → Domain/DTO → Repository → Oracle.
Keep controllers thin, entities internal, DTOs as API contracts, and business logic in services/domain code.
Use Strategy/Adapter for interchangeable external providers; Factory only when construction genuinely varies.

Flyway owns schema creation. The clean rebuild uses a new baseline migration; do not edit applied migrations.

## Commands
```bash
npm install
npm run build
cd backend-java-spring
mvn clean verify
```

Production:
- Web: https://www.kuraliupdates.com
- API: https://kuraliupdates-bazaar.onrender.com/api/v1
