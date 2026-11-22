# KuraliUpdates Bazaar

## Latest release checkpoint — 22 November 2026

PR #382 is merged as `65918519b5a17c51299e80545a77351216a5fdce`. Six Vercel web projects and Render backend are deployed on that SHA in the owner-designated shared staging environment; Oracle Flyway V43–V46 are confirmed applied. Main browser E2E and Oracle recovery workflows have failures, so this is not a production-readiness or security certification. See [Security release checkpoint](docs/SECURITY-RELEASE-2026-11-22.md) for exact evidence and all pending work.

KuraliUpdates is a Kurali, Punjab hyperlocal marketplace with two customer journeys: **Online Shop** (multi-seller grocery/retail) and **Daily Help** (local service bookings).

> **Environment note:** The owner-designated shared environment is staging. The public custom domains are currently part of that same environment; do not assume a separate production environment exists.

## Product and operating model

- **Online Shop:** hybrid own-store and third-party seller marketplace; sellers own their catalogue and fulfilment obligations.
- **Daily Help:** independent service providers offer bookable services and time slots.
- **Payments:** current business decision is direct customer-to-seller payment for marketplace grocery orders; KuraliUpdates earns the configured commission/platform fee. Daily Help payment handling is a separate configured workflow. Do not assume a payment aggregator or automatic bank split is active.
- **Refunds:** grocery refunds are initiated and funded directly by the seller because the customer paid the seller directly. The platform records and tracks the refund workflow; it does not promise an advance platform-funded refund or seller reserve.
- **Delivery:** agents use their own two-wheelers. Multi-seller checkout, grouped seller suborders, delivery and optional store pickup are backend workflows; verify feature flags and runtime configuration before describing a mode as enabled.
- **Seller onboarding:** OTP registration, business/shop details, map pin, shop-front photo, applicable compliance documents and agreement acceptance; manual admin review gates activation.
- **Buyer registration:** Buyer is the primary self-registration journey; contact OTP requirements follow admin-configured channels. Address collection is optional during registration and remains required at delivery checkout.

## Technology

- Frontend: React 19, TypeScript, Vite, Tailwind
- Backend: Java, Spring Boot, REST, JPA
- Database: Oracle; Flyway migrations
- Hosting: Vercel frontend projects; Render backend
- Maps: OpenStreetMap fallback is available. Google Routes-dependent routing requires valid backend credentials/configuration.
- Oracle connectivity: walletless JDBC Thin TCPS; configure the OCI TLS-authentication connection string in Render secrets. Do not restore wallet/TNS alias assumptions unless the deployment architecture is deliberately changed.

## Repository map

- `src/` — React application and role portals
- `backend-java-spring/` — Spring Boot API, Dockerfile and Flyway migrations
- `docs/` — API, database, workflows, testing and operational runbooks
- `ARCHITECTURE.md` — concise architecture and invariants
- `DEPLOYMENT.md` — shared-environment release and rollback gates
- `docs/CURRENT-STATE.md` — historical implementation evidence and remaining work
- `docs/IMPLEMENTATION-BASELINE-2026-11.md` — consolidated November 2026 product, security, privacy, deployment and verification baseline
- `docs/SELLER-ONBOARDING.md` — seller registration, CRM, documents and review lifecycle

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
- Flyway owns schema evolution. Never edit an applied migration or reuse a migration version.
- Controllers handle HTTP/auth/validation; services own use cases and transactions; repositories own persistence.
- Use DTOs at API boundaries; do not expose JPA entities.
- Never log OTPs, bearer tokens, secrets, wallet contents or unnecessary personal data.
- Keep shared staging smoke tests read-only. Mutating E2E requires isolated synthetic fixtures, explicit authorization and run-scoped cleanup.
- Distinguish source implementation, CI tests, staging runtime evidence and legal/provider sign-off. Passing one does not imply the others.

## Links

- Website: https://www.kuraliupdates.com
- API base: https://kuraliupdates-bazaar.onrender.com/api/v1
- Repository: https://github.com/imgupta/kuraliupdates-bazaar
