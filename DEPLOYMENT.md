# Deployment

## Topology
- Frontend: Vercel
- Backend: Render Docker web service
- Database: Oracle Autonomous Database
- Domain: www.kuraliupdates.com
- API: https://kuraliupdates-bazaar.onrender.com/api/v1

## Configuration
Frontend: VITE_API_BASE_URL.

Backend secrets include Oracle connection/wallet settings, Resend credentials and MSG91 credentials. Never commit secrets.

## Database
Flyway creates the complete schema on a clean database. Production startup must not drop tables. Destructive rebuild is an explicit database operation, not application startup behavior.

## Release order
1. Backend tests/build.
2. Deploy backend.
3. Confirm Flyway success and health.
4. Frontend build/deploy.
5. Smoke-test auth, buyer account/address, orders and tracking.
6. Declare production ready.

## Rollback
Prefer application rollback. Schema migrations should be backward-compatible for rolling releases.

## Services
Render: kuraliupdates-bazaar.
Vercel: kuraliupdates-bazaar.
