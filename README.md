# KuraliUpdates Bazaar

KuraliUpdates is a Kurali, Punjab hyperlocal marketplace with two customer journeys: **Online Shop** (multi-seller grocery/retail) and **Daily Help** (local service bookings).

> **Environment note:** The owner-designated shared environment is staging. The public custom domains are currently part of that same environment; do not assume a separate production environment exists.

## Product and operating model

- **Online Shop:** hybrid own-store and third-party seller marketplace; sellers own their catalogue and fulfilment obligations.
- **Daily Help:** independent service providers offer bookable services and time slots.
- **Payments:** current business decision is direct customer-to-seller payment for marketplace grocery orders; KuraliUpdates earns the configured commission/platform fee. Daily Help payment handling is a separate configured workflow. Do not assume a payment aggregator or automatic bank split is active.
- **Refunds:** grocery refunds are initiated and funded directly by the seller because the customer paid the seller directly. The platform records and tracks the refund workflow; it does not promise an advance platform-funded refund or seller reserve.
- **Delivery:** agents use their own two-wheelers. Multi-seller checkout, grouped seller suborders, delivery and optional store pickup are backend workflows; verify feature flags and runtime configuration before describing a mode as enabled.
- **Seller onboarding:** OTP registration, business/shop details, map pin, shop-front photo, applicable compliance documents and agreement acceptance; manual admin review gates activation.

## Technology

- Frontend: React 19, TypeScript, Vite, Tailwind
- Backend: Java, Spring Boot, REST, JPA
- Database: Oracle; Flyway migrations
- Hosting: Vercel frontend projects; Render backend
- Maps: OpenStreetMap fallback is available. Google Routes-dependent routing requires valid backend credentials/configuration.

## Repository map

- `src/` — React application and role portals
- `backend-java-spring/` — Spring Boot API, Dockerfile and Flyway migrations
- `docs/` — API, database, workflows, testing and operational runbooks
- `ARCHITECTURE.md` — concise architecture and invariants
- `DEPLOYMENT.md` — shared-environment release and rollback gates
- `docs/CURRENT-STATE.md` — latest verified implementation status and remaining work
- `docs/SELLER-ONBOARDING.md` — seller registration, documents and review lifecycle

## Local quality gates

```bash
npm install
npm run lint
npm run build

cd backend-java-spring
mvn clean verify
```

## Non-negotiable engineering rules

- React is the only frontend framework; do not introduce Angular.
- Flyway owns schema evolution. Never edit an applied migration.
- Controllers handle HTTP/auth/validation; services own use cases and transactions; repositories own persistence.
- Use DTOs at API boundaries; do not expose JPA entities.
- Never log OTPs, bearer tokens, secrets, wallet contents or unnecessary personal data.
- Keep shared staging smoke tests read-only. Mutating E2E requires isolated synthetic fixtures and explicit preflight.

## Links

- Website: https://www.kuraliupdates.com
- API base: https://kuraliupdates-bazaar.onrender.com/api/v1
- Repository: https://github.com/imgupta/kuraliupdates-bazaar
