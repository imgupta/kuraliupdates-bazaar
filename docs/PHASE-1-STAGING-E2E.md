# Phase 1 staging transactional E2E

The transactional Playwright suite now provisions a short-lived synthetic product, Daily Help service and one-hour future slot through the protected staging-only fixture endpoint. It does not create accounts or promote role profiles.

Required pre-existing dedicated profiles:
- approved and open seller with an E2E-prefixed seller ID;
- ACTIVE and available delivery agent with an E2E-prefixed agent ID;
- verified and AVAILABLE Daily Help professional with an E2E-prefixed professional ID.

Each created fixture carries the current run ID in V32-added nullable columns. Existing business rows remain NULL and are not eligible for test cleanup.

## Execution contract

1. PR/push workflows run backend/frontend verification and read-only smoke. They do not create orders or bookings.
2. Trusted manual/scheduled runs may enable transactional E2E only against the pinned staging API and with a 32+ character flow token plus synthetic profile IDs.
3. The trusted workflow waits for database-backed /health readiness, then uses normal application APIs and service transitions: bargaining, COD checkout, seller acceptance/readiness, rider claim and delivery OTP; Daily Help booking, provider arrival/readiness, start OTP and completion.
4. Every test uses a unique run ID. Cleanup validates all run-tagged relationships before the first write, restores stock from that run's order items, then deletes only that run's chat, booking, order, product, slot, service and sessions.
5. Seller, rider, professional and user profiles are never deleted or silently approved.

## Boundaries

- COD is used; no real payment gateway is called.
- OTPs are generated and verified by the normal application logic. No global OTP bypass is introduced.
- Test addresses are explicitly synthetic/do-not-deliver; no physical service visit is initiated.
- If a profile is missing or not approved/active/verified, provisioning fails closed.
- A sequential staging journey is not proof of Oracle concurrency/race safety.
