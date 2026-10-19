# Backend deployment and verification

## Render service

- Service: `kuraliupdates-bazaar`
- Repository branch: `main`
- Root directory: `backend-java-spring/`
- Runtime: Docker (`Dockerfile` in this directory)
- Health/API base: `https://kuraliupdates-bazaar.onrender.com/api/v1`

## Deployment verification

After a merge to `main`, verify the Render deployment commit SHA against the repository's current `main` SHA. A GitHub workflow success and a Vercel deployment do not prove that the Render backend has deployed the same commit.

If automatic deployment does not start, use the Render dashboard to deploy the latest commit from `main`, then confirm the resulting deployment is `live` and its commit SHA matches `main`. Do not change environment variables as part of a redeploy. Do not enable staging-only OTP capture until the Oracle database target has been independently confirmed as isolated staging.

## Safety checks

- Keep the single configured environment designated as staging.
- Never run transactional E2E tests against an unverified database target.
- Do not print or commit credentials, wallet contents, OTP tokens, or other secrets.
- Keep production-like smoke checks read-only; use dedicated synthetic identities only after isolation is confirmed.


## Negotiation chat schema

- The Oracle chat schema is applied by the versioned Flyway migration `V14__NegotiationChatSchema` during backend startup.
- The migration is non-destructive and checks whether the chat tables and indexes already exist, so schemas initialized from `schema-oracle.sql` or the older runtime setup script are preserved.
- Confirm the Render startup logs show Flyway completing migration 14 before checking `/api/v1/negotiations`.
- Do not run `schema-oracle.sql` against an existing database; it rebuilds the application schema. The legacy `negotiation-chat-runtime.sql` is retained only as a manual recovery script.
- Chat history is shared through Oracle. The browser polls the authenticated API for updates; messages are not stored solely in local browser storage.
- A bargain changes only the negotiated cart/order-item unit price. Checkout validates the accepted offer ID and price against the chat tables; the catalogue product price is not updated.
