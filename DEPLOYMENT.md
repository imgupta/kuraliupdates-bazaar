# Deployment

## Environments

- **Staging** is the environment for routine end-to-end workflow testing, synthetic users/orders, and validation of database migrations.
- **Production** is the live customer environment. Do not create test users/orders, run staging cleanup, or execute mutating E2E scenarios against it.
- Verify the active Vercel deployment, Render service/deployment, and Oracle target before any mutating test. A branch or deployment label alone does not prove which database is configured.
- The public custom domain `kuraliupdates.com` is production traffic unless an explicit, independently verified staging domain says otherwise.

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
