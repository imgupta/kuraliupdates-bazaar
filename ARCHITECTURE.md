# Architecture and system invariants

See [docs/CURRENT-STATE.md](docs/CURRENT-STATE.md) for verified implementation status and [docs/SELLER-ONBOARDING.md](docs/SELLER-ONBOARDING.md) for the compliance workflow.

## Runtime and environment
`Browser → React/Vite → REST API → Spring Boot → Oracle`.
Vercel hosts the combined Bazaar frontend and five role-specific portals; Render hosts the Spring Boot Docker service. The owner-designated deployed environment is one shared **staging** environment. Do not infer a separate production environment from hosting-provider labels.

## Frontend
- React + TypeScript + Vite + Tailwind; no Angular.
- One monorepo/shared runtime with role-specific entry points/build outputs (Buyer, Seller, Delivery, Daily Help, Admin) plus the combined Bazaar app.
- This is not five independently owned micro-frontends and does not use Module Federation.
- `AppContext` remains a compatibility facade while domain hooks/API facades isolate operations. Some facades still delegate to shared `bazaarApi`; endpoint extraction is not complete.
- Keep UI presentational; give polling, timers and geolocation explicit cleanup.

## Backend
`Controller → Service → DTO/Domain → Repository → Oracle`.
Controllers handle HTTP/auth/validation; services own use cases, authorization-sensitive ownership checks and transactions; repositories own persistence. Use DTOs at API boundaries and never expose JPA entities.

## Database
Oracle is the system of record; Flyway owns schema evolution. Applied migrations are immutable. V13 is destructive staging/test-data cleanup and must not be rerun routinely. V14 (`V14__seller_compliance_and_documents.sql`) adds seller compliance fields and private document BLOB storage. Verify the deployed schema version from sanitized startup/database evidence, not from source alone.

## Product invariants
- **Online Shop:** server validates seller ownership, catalogue price, accepted bargain offer and stock. Multi-seller checkout creates seller-owned suborders under one checkout group.
- **Payments/refunds:** grocery customer pays seller directly; KuraliUpdates earns configured commission/platform fee. Grocery refund is seller-funded and paid directly to the customer; platform records status/evidence. Do not imply payment-aggregator or automatic bank-split integration is active without code/config evidence.
- **Seller activation:** manual admin approval after profile and applicable documents are reviewed.
- **Daily Help:** booking locks an available slot and changes it to BOOKED transactionally; provider identity/ownership is server-authoritative.
- **Delivery:** only active agents access jobs; claim, OTP, order status and payout are server-authoritative. Never log OTPs.
- **Maps:** OpenStreetMap fallback is available; Google Routes road optimization requires valid backend configuration.

## Security
Enforce role and record ownership on every protected operation. Private seller documents must not be served publicly. File size/type/signature checks do not replace malware scanning. Oracle encryption-at-rest/TLS do not equal application-layer document encryption. Do not collect sensitive identity data without a documented lawful basis.

## Quality gates
```bash
npm run lint
npm run build
cd backend-java-spring && mvn clean verify
```
