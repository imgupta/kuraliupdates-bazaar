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
