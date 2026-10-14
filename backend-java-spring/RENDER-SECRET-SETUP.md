# Render secret setup for the Oracle backend

## Release gate — do not merge before secrets are configured

This change removes the Oracle wallet archive from the current branch and stops baking it into the Docker image. The application will not connect to Oracle until the Render service has the matching fresh wallet files and required environment variables configured.

The single deployed environment is designated **staging**. Validate replacement credentials against an independently verified isolated staging database before enabling any authenticated transactional E2E.

## Required Render environment variables

Set these in the Render dashboard for the backend service. Never commit values or paste secrets into issues, logs, or chat.

- `ORACLE_JDBC_URL`: JDBC URL using the service's TNS alias from the fresh wallet.
- `ORACLE_USERNAME`: database user for this service.
- `ORACLE_PASSWORD`: newly rotated database password.
- `ORACLE_WALLET_DIR`: `/etc/secrets`.
- `WALLET_PASSWORD`: password for the newly generated wallet files, if required by the wallet's trust/key stores.
- `JWT_SECRET`: cryptographically random secret with at least 32 random bytes.
- Keep existing OTP-provider variables configured as required by enabled login/registration flows.

Do not enable Flyway or run schema resets as part of this wallet change. Preserve the current schema-management configuration on `main`.

## Protected wallet files

1. In Oracle Cloud, generate/download a fresh wallet and rotate the database credential. Treat the previously committed wallet and hard-coded credentials as compromised.
2. Extract the new wallet on a trusted machine. Do not commit the archive or extracted files.
3. Add the required wallet files individually as Render **Secret Files**, mounted under `/etc/secrets`, retaining their original filenames. Depending on the wallet, these commonly include `tnsnames.ora`, `sqlnet.ora`, `cwallet.sso` or `ewallet.p12`, `truststore.jks`, and `keystore.jks`.
4. Check that `sqlnet.ora` references `/etc/secrets`, not a local path such as `/app/wallet`.
5. Configure the environment variables above with values matching the new wallet. Do not reveal values in logs or handoff docs.

## Safe release sequence

1. Configure and validate the replacement files and credentials on a separate staging service/database first.
2. Confirm the current Render service's database target and schema are the intended staging target before enabling test-only OTP capture or authenticated transactional tests.
3. Rotate the current service's database credential and configure the matching fresh wallet and JWT secret in Render.
4. Only then merge this change and verify the resulting Render deployment is live, its commit SHA matches `main`, and startup logs show a successful Oracle connection.
5. Run only read-only smoke checks until the isolated synthetic test database and cleanup strategy are verified.
6. Revoke the old wallet/credential as appropriate and coordinate a repository-history purge after rotation. Deleting the archive from the current branch does not remove it from Git history.

Never run destructive schema resets or authenticated order/booking tests against an unverified or shared database.
