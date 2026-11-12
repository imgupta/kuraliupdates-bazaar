# Oracle wallet and credential remediation

Tracking issue: [#16](https://github.com/imgupta/kuraliupdates-bazaar/issues/16). This guide supersedes the deployment instructions in PR #84; PR #19 was superseded and should not be used as a second implementation track.

## Runtime contract

The backend uses the password-protected Oracle PKCS12 wallet for JDBC mTLS. The JDBC connection properties explicitly select `file:${ORACLE_WALLET_DIR}/ewallet.p12` and pass `WALLET_PASSWORD` as `oracle.net.wallet_password`. Oracle documents that this selects `ewallet.p12` instead of the auto-login `cwallet.sso`. The previous directory-only configuration selected the SSO wallet and failed in Oracle's SSO keystore parser with an ASN.1 format exception.

The following Render Secret Files remain mandatory in the same directory because the startup validator currently checks all six filenames:

- `tnsnames.ora`
- `sqlnet.ora`
- `cwallet.sso`
- `ewallet.p12`
- `truststore.jks`
- `keystore.jks`

Only `ewallet.p12` is selected as the active JDBC mTLS wallet by the current configuration. The JKS files are still required by the existing startup filename/readability validator, but they are not configured as JSSE keystore/truststore properties. `cwallet.sso` is also retained to satisfy the current six-file validator; it is not the wallet file explicitly selected by the JDBC connection property.

`sqlnet.ora` must reference the mounted wallet directory (currently `/etc/secrets`). `ORACLE_WALLET_DIR` is set by the Docker image to `/etc/secrets`; change the image and this file together if that mount contract changes. The password-protected wallet must correspond to the configured `WALLET_PASSWORD`. Never place wallet files or passwords in source control, build arguments, image layers, logs, or this document.

Required Render environment variables are `ORACLE_JDBC_URL`, `ORACLE_USERNAME`, `ORACLE_PASSWORD`, `WALLET_PASSWORD`, and `JWT_SECRET`. The JWT value must be at least 32 characters. Values are never placed in source, build arguments, image layers, logs, or this document. `JWT_SECRET` is configured for compatibility with the existing application property contract; source review at this change found no Java consumer of `app.jwt.secret`, and the current authentication flow uses database-backed opaque sessions. Do not claim this setting signs current sessions or that replacing it revokes those sessions. Any session invalidation decision must be reviewed separately by the auth owner.

Startup validates the required environment keys and wallet files before Spring beans (including datasource and Flyway) initialize. It checks filenames and readability only; it does not inspect PKCS12 structure, validate the wallet password, or prove that the wallet can establish a TLS session. Missing values and missing/unreadable files fail closed with key or filename-only errors. CI supplies nonconnecting placeholders only in the environment of Maven test steps; test variables are not configured in the POM, packaged application, or Docker build. `/api/v1/health/live` remains process liveness and does not establish database readiness. `/api/v1/health/ready` and `/api/v1/health` remain unavailable until Flyway and the Oracle connection succeed.

## Required owner sequence

1. **Security owner and DBA:** treat the committed archive and historical hard-coded credential defaults as exposed. Inventory and rotate the Oracle account password, wallet/JKS password, and any independently used JWT signing material. Confirm scope for any credentials that appeared in PR or build artifacts. Do not treat deleting the current file as revocation.
2. **DBA and service owner:** agree a zero/low-downtime credential transition before invalidating the old Oracle password. Prefer a tested overlap mechanism or replacement least-privilege database principal that can access the existing schema without altering schema ownership or migration history. If overlap is unavailable, schedule an approved maintenance window and define a rapid forward-fix. Do not test against shared staging with write operations.
3. **Oracle wallet custodian:** generate/download a replacement wallet after the rotation decision, set and securely communicate its wallet password, verify the six required files, and produce a `sqlnet.ora` whose wallet directory points to `/etc/secrets`. Deliver files through Render Secret Files, not source control, chat, CI artifacts, Docker build context, or a developer workstation copied into the repo.
4. **Render service owner:** provision the six files and five required environment variables on the existing owner-designated shared staging service only after authorization. Do not create a second staging service. Secret-file upload/replacement may trigger a deploy; schedule it with the credential transition and verify the resulting deployment. This PR does not change Render settings.
5. **Release owner:** verify the exact image, all required secret names, secret-file mount paths, Oracle connectivity, and readiness before changing traffic or revoking any credential still needed by a running instance. The deployment is not accepted until the PKCS12 wallet is successfully opened, Hikari reports startup completion, Flyway succeeds, and `/api/v1/health/ready` returns HTTP 200.
6. **Security owner and repository administrator:** after credentials are rotated and revoked, assess Git history and all forks/clones/caches/artifacts. History rewriting is a separate approved operation: coordinate a freeze, retain a protected backup, prepare and independently review the rewrite, notify collaborators, invalidate affected credentials, rewrite all relevant refs, force-push only with repository-owner approval, and require clean reclones. History cleanup is not a substitute for rotation and is not included in this PR.

## Verification and rollout

Before deployment, CI builds the backend image from the actual Docker context. A BuildKit bind-mount probe checks each of the six synthetic wallet fixture files is absent from that filtered context. CI then saves the final image and scans every shipped layer and nested application archive for wallet filenames and test-only values. The runtime image copies only the application JAR from the builder. Run the backend focused tests and full `mvn verify` without Oracle credentials. `docker build --check` validates syntax only and is not image-content evidence.

During the approved shared-staging rollout, compare the deployed image SHA with the reviewed PR SHA. Inspect sanitized startup output for successful initialization and Flyway outcome; never print environment values, wallet contents, JDBC URL, or exception details. Require `/api/v1/health/ready` to return HTTP 200 and perform only approved read-only API smoke checks. A liveness response, green container, successful image build, or CI result alone does not prove Oracle readiness. Do not run destructive migrations, schema rebuild scripts, V13 cleanup, or data-mutating E2E as part of credential remediation.

Flyway remains enabled, `baseline-on-migrate` remains enabled at baseline version 13, the missing-migration handling remains unchanged, and Hibernate remains `ddl-auto: none`. No migration file is changed by this security change. Applied migration history and the shared database are not modified by tests.

## Rollback and recovery

Rollback is safe only to an image that supports the replacement Secret File mount and external environment variables. The current image contains the legacy wallet in a lower Docker image layer; deleting it from a later layer does not erase it. A rollback to that image may reintroduce bundled exposed material and may not understand the replacement secret contract. Build and verify a known-good wallet-external image before the credential transition, and retain replacement secrets while it is the rollback target. If Oracle credentials have already been revoked, an old image that requires them is not a viable rollback. Roll back application code only; assess schema compatibility independently and use a forward fix for database issues. Never restore revoked credentials merely to make an old image start.

## Acceptance and blockers

- No committed wallet archive or wallet directory; no credential fallback in application configuration.
- Startup validation precedes datasource/Flyway initialization and reports only missing key/file identifiers.
- Tests prove missing credentials, missing wallet directory/files, unreadable files, symlink rejection, redacted error messages, and valid configuration without real Oracle credentials. Exact-head CI builds and inspects the final Docker image and probes fixture exclusion from build context.
- Exact-head backend tests and Docker/image-content evidence are recorded in the PR.
- The active JDBC wallet is explicitly `ewallet.p12` with `oracle.net.wallet_password`; JSSE JKS properties are not mixed with Oracle Wallet configuration.
- Flyway enabled/baseline 13/`ddl-auto: none` and all migration files are unchanged.
- Render secret files and variables are provisioned by their owner before deployment; Oracle connection readiness is verified on the existing staging service.
- Credential rotation/revocation, a staged rollback image, Git history cleanup, session invalidation decision, and all required security/DBA/Render-owner approvals remain explicit release blockers until evidenced.
