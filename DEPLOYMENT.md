# Deployment

## Topology
- Vercel: React web.
- Render: Spring Boot Docker service.
- Oracle: application database.
- Domain: www.kuraliupdates.com.
- API: https://kuraliupdates-bazaar.onrender.com/api/v1

## Environment
Frontend: `VITE_API_BASE_URL`.
Backend: Oracle/wallet settings plus provider credentials.
Never commit secrets.

## Clean database rebuild
The rebuild is intentional and destructive. Database reset must be performed as an explicit controlled operation before the fresh Flyway baseline is deployed.
Application startup must never drop production tables.

## Release order
1. Run backend tests.
2. Build backend.
3. Reset/recreate the target database under explicit approval.
4. Deploy backend and verify Flyway baseline + health.
5. Build/deploy React.
6. Smoke-test auth, address CRUD/default, orders and tracking.

## Rollback
Rollback application code first. Do not rewrite applied Flyway migrations.
For schema rollback, use a forward migration or restore a known database backup.

## Context rule
Keep this file operational. Put design decisions in ARCHITECTURE.md; put implementation detail in code. Do not paste long incident histories here.
