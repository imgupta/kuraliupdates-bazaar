# KuraliUpdates Bazaar

Hyperlocal marketplace and delivery platform for Kurali.

## Stack
- Frontend: React 19 + TypeScript + Vite + Tailwind CSS.
- Backend: Java 21 + Spring Boot + REST + JPA + Flyway.
- Database: Oracle.
- Hosting: Vercel (frontend) + Render (backend).

## Repository structure
```
src/                         React application
backend-java-spring/         Spring Boot API
backend-java-spring/.../migration/  Flyway schema
docs/                        Architecture and operational notes
```

## Architecture
The system is a modular monolith: React is the only web UI; Spring Boot owns API, business rules, persistence, authentication, OTP, ordering and delivery workflows.

Backend layers:
**Controller → Application Service → Domain/Model → Repository → Oracle**

Use dependency inversion at service boundaries and keep controllers free of business logic. Use Strategy where behavior varies (OTP/email/SMS, pricing/discount rules), Factory where object creation varies, and transactional services for multi-step database operations.

## Database
Flyway owns the schema. For the clean rebuild, the schema is recreated from a new baseline migration; legacy V1–V4 address migrations are not part of the new schema.

Never edit an applied migration. For intentional schema changes, add the next migration.

## Frontend
React only. Do not add Angular components, modules, services, RxJS, Angular CLI, or a second frontend framework.

Keep API access in `src/services`, shared state in context/hooks, and reusable UI in components. Prefer small feature modules over large page components.

## Local development
```bash
npm install
npm run dev
npm run build
```

Backend:
```bash
cd backend-java-spring
mvn clean verify
mvn spring-boot:run
```

## Production
- Web: https://www.kuraliupdates.com
- API: https://kuraliupdates-bazaar.onrender.com/api/v1
- Frontend deployment: Vercel
- Backend deployment: Render

See [ARCHITECTURE.md](./ARCHITECTURE.md) for the concise technical source of truth.
See [DEPLOYMENT.md](./DEPLOYMENT.md) for deployment and environment rules.
