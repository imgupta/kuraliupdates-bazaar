# Deployment

## Environments

- There is one deployed environment, designated **staging** by the owner. Do not assume a separate production deployment exists.
- The public custom domains and Render API are part of this same owner-designated environment unless the owner independently verifies a separate environment.
- Keep routine smoke checks read-only. Do not run transactional E2E or destructive cleanup until the Oracle target and synthetic fixture isolation are verified.
- Verify the active Vercel deployment, Render service/deployment, and Oracle target independently. A hosting label alone does not prove which database is configured.

## Web
Vercel builds the repository root with the Vite frontend. Verify the domain alias and commit SHA, not only deployment state. A READY preview is not proof that the custom domain uses that build.

## API
Render builds `backend-java-spring/` using its Dockerfile. Verify service ID, environment configuration and deployed commit. Never print credentials or wallet contents.

## Staging database reset (V13)

`V13__reset_staging_test_data.sql` is a one-time, destructive staging/test-data cleanup that retains the documented admin accounts and reseeds the Daily Help catalogue. Use it only after the owner confirms the target Oracle schema is isolated staging. Confirm the Flyway row reports success after it is run. Do not rerun it as a general fix, and never edit an already-applied migration; use a new versioned migration for corrections.

## Release gate

1. Frontend typecheck and production build pass.
2. Focused backend tests and `mvn clean verify` pass.
3. Flyway validation succeeds against the intended Oracle target.
4. API health and database readiness pass.
5. Staging end-to-end regression checklist passes for the changed workflows.
6. Verify the actual frontend domain alias and backend deployment commit.
7. Promote to production only through the separately approved release workflow.

## Rollback

Rollback the application deployment to the last known-good commit. Do not repair or rewrite Flyway history solely to make a deployment pass. Database rollback requires its own assessed migration plan.

Keep secrets in hosting secret/environment configuration, never in Git.


## Quota-aware role portals

The Buyer, Seller, Delivery, Daily Help and Admin portals have role-specific Vite entry points and build outputs. Build commands and output directories are documented in [docs/MICROFRONTEND-BUILD-STRATEGY.md](docs/MICROFRONTEND-BUILD-STRATEGY.md).

- Use the per-project Vercel Ignore Build Step command from that document to skip deployments for unaffected portals.
- Shared runtime, dependency, Vite configuration and global CSS changes intentionally trigger all role portals.
- Documentation, test-only and workflow-only changes should not trigger Vercel site builds.
- CI builds the combined app plus only affected role-portal artifacts; if change detection is unavailable, it fails safe by building all portals.
- Vercel project settings must be updated and verified separately. A committed ignore script alone does not change settings in the Vercel dashboard.
