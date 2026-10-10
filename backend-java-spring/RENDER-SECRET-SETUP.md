# Render secret setup for the Oracle backend

## Important release gate

**Do not merge the wallet-removal change until the Render service has the replacement secret files and environment variables configured.** The current Docker image no longer bundles the wallet. Merging before configuring the files will prevent the backend from connecting to Oracle.

## Required Render environment variables

Configure these on the backend service in the Render dashboard. Set values through Render's environment-variable UI; do not commit them or paste them into issues or chat.

- `ORACLE_JDBC_URL`: JDBC URL using the TNS alias from the wallet's `tnsnames.ora`, with `TNS_ADMIN=/etc/secrets` if required by the driver.
- `ORACLE_USERNAME`: database user for this service.
- `ORACLE_PASSWORD`: newly rotated database password.
- `ORACLE_WALLET_DIR`: `/etc/secrets`.
- `WALLET_PASSWORD`: password for the newly generated wallet files.
- `JWT_SECRET`: a cryptographically random secret with at least 32 random bytes. Store it only in Render.
- `FLYWAY_REPAIR_BEFORE_MIGRATE`: `false` for normal production startup.

Keep OTP provider variables in Render as required by the enabled login/registration flows.

## Protected wallet files

1. In Oracle Cloud, rotate the database credential and generate/download a fresh wallet. Use a new wallet password.
2. Extract the wallet archive on a trusted local machine. Never commit the archive or extracted files.
3. Add the required wallet files individually to Render **Secret Files**, with their expected filenames, mounted under `/etc/secrets`. These commonly include `tnsnames.ora`, `sqlnet.ora`, `cwallet.sso` or `ewallet.p12`, and the trust/key stores used by the configuration. Use the actual files in the newly generated wallet.
4. Check `sqlnet.ora` references `/etc/secrets`, not a local path such as `/app/wallet`.
5. Confirm the new wallet and database credentials work before merging the application change.

## Safe release sequence

1. Configure and validate replacement secret files and environment variables on a separate staging service/database first.
2. Rotate production database credentials and configure the matching fresh production wallet in Render.
3. Merge this change only after the production secrets are present.
4. Confirm Render deployment is live, inspect startup logs for successful Oracle connection and Flyway validation/migration (without repair), and run the read-only production smoke workflow.
5. Revoke the old wallet/credential as appropriate and coordinate a repository-history purge after rotation. Removing the file from the current branch alone does not remove it from Git history.

Never run destructive schema resets or authenticated end-to-end order/booking tests against production.
