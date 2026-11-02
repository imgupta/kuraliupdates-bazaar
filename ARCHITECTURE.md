# Architecture and system invariants

This is the concise architecture source of truth. Current verified gaps are tracked in [docs/CURRENT-STATE.md](docs/CURRENT-STATE.md); detailed workflows live in the linked documents below.

## Runtime

`Browser → React/Vite → REST API → Spring Boot → Oracle`

Vercel hosts the frontend projects. Render hosts the Spring Boot Docker service. The owner-designated deployed environment is **one shared staging environment**; public custom domains do not imply a separate production environment.

## Frontend

- React + TypeScript + Vite + Tailwind.
- One monorepo/shared runtime with role-specific entry points/build outputs (Buyer, Seller, Delivery, Daily Help and Admin) plus the combined Bazaar app.
- This is not five independently-owned micro-frontends and does not use Module Federation.
- `AppContext` remains a compatibility facade while domain hooks and API facades isolate operations. Some domain facades still delegate to the shared `bazaarApi`; do not describe all endpoint implementations as fully extracted.
- Keep UI components presentational; API calls belong in service/domain API modules; effects, polling and geolocation must have explicit cleanup.

## Backend

`Controller → Service → DTO/Domain → Repository → Oracle`

- Controllers: HTTP mapping, auth boundary and request validation.
- Services: business use cases, authorization-sensitive ownership checks and transaction boundaries.
- Repositories: persistence/query logic.
- DTOs: public contracts; JPA entities remain internal.
- Use adapters/strategies only for genuinely interchangeable providers.

## Data and migrations

Oracle is the system of record. Flyway is authoritative. Applied migrations are immutable. The current migration inventory is under `backend-java-spring/src/main/resources/db/migration/`; current schema version and rollout must be confirmed from Render startup logs and the database, not inferred from source alone.

- V13 is a destructive staging/test-data reset, not a schema migration to rerun routinely.
- V14 is `V14__seller_compliance_and_documents.sql`, adding seller compliance fields and private seller-document BLOB storage.
- Never run destructive resets or transactional tests until the actual Oracle target/schema is independently verified as isolated staging.

See [docs/DATABASE.md](docs/DATABASE.md).

## Core product boundaries

### Online Shop
- Marketplace checkout validates seller ownership, product price, accepted bargaining offer and stock on the server.
- Multi-seller checkout creates seller-owned suborders under a checkout group; fees/payouts must not be double-counted across suborders.
- Seller activation is manually gated by admin review.
- Grocery direct-payment decision: customer pays the seller; KuraliUpdates earns commission/platform fees. Refund execution is therefore seller-funded and direct to the customer; platform records the status and evidence.

### Seller compliance
- Seller registration captures business constitution, registered name, shop identity/location, map pin, business hours, shop-front photo, agreement acceptance and applicable GST/FSSAI details.
- Food-business compliance is conditional on activity and applicable law; do not require FSSAI for every seller.
- Documents are stored in Oracle BLOBs with private API access and admin verification workflow. See [docs/SELLER-ONBOARDING.md](docs/SELLER-ONBOARDING.md).
- Uploads are separate from OTP account creation; partial registration/upload failure must be recoverable.

### Daily Help
- Service catalogue and professional availability/slots are distinct.
- A slot is bookable only when available and its provider is verified and available.
- Booking must lock the slot and transition it to BOOKED within one transaction.
- Provider ownership is resolved from authenticated identity; do not trust client-supplied provider IDs.

### Delivery
- Only active/approved agents can access pickup jobs.
- Claim, assignment, OTP verification, order status and payout are server-authoritative.
- Never log OTP contents. Ownership and replay checks belong on the backend.
- Google Routes-dependent combined routing requires a valid configured key; OpenStreetMap fallback does not provide Google road-route optimization.

## Security and privacy invariants

- Enforce seller/admin/provider/agent ownership on every protected operation.
- Private documents must not be publicly served or exposed through predictable URLs.
- Validate file size, allowed media type and file signatures; restrict document download to authorized roles.
- Oracle encryption-at-rest/TLS assumptions are not equivalent to application-layer document encryption or malware scanning.
- Do not collect Aadhaar or other sensitive identity data unless a documented lawful requirement exists.
- Keep secrets and personal data out of source control, logs, CI output and documentation.

## Quality gates

```bash
npm run lint
npm run build
cd backend-java-spring && mvn clean verify
```

Release and test constraints: [DEPLOYMENT.md](DEPLOYMENT.md), [E2E_TESTING.md](E2E_TESTING.md), [docs/STAGING-REGRESSION-TESTS.md](docs/STAGING-REGRESSION-TESTS.md).
