# Render HTTP port binding and Oracle startup readiness

**Status:** Source implementation proposal in this PR; runtime behavior is not verified until the exact PR commit is deployed and smoke-tested.

## Problem

The Render Docker service receives its listener port through `PORT`. The application already binds to `0.0.0.0` and uses `server.port: ${PORT:8080}`; this is the correct port contract and is not changed by this fix.

The startup delay occurs because Flyway's Oracle connection and migration work can execute as part of Spring context initialization, before the embedded servlet container has bound the HTTP listener. A correct port value cannot resolve a listener that has not started yet.

## Startup sequence

1. `OracleSecretsEnvironmentPostProcessor` continues validating required environment keys and wallet files before context refresh. Missing/unreadable secrets still fail closed.
2. Spring creates the Flyway initializer and applies the existing `FlywayMigrationStrategy`.
3. The strategy marks migration state `RUNNING` and submits the existing migration/recovery operation to a single-thread `ThreadPoolTaskExecutor`. It returns without waiting for Oracle. The executor waits up to 120 seconds for an in-flight migration during graceful application shutdown.
4. The Spring Boot application continues context refresh and binds Tomcat to `0.0.0.0:${PORT}`.
5. An `ApplicationRunner` dependency forces the Flyway initializer to be instantiated after context refresh if global lazy initialization deferred it. This ensures migrations are scheduled even before any repository is first used.
6. `/api/v1/health/live` returns process liveness without opening a database connection.
7. While migration is `NOT_STARTED`, `RUNNING` or `FAILED`, `MigrationReadinessFilter` returns HTTP 503 for application routes. `/api/v1/health` and `/api/v1/health/ready` remain available and report migration/database readiness without exposing connection details.
8. Only after Flyway completes successfully does the state become `READY` and the filter allow application traffic. The readiness endpoint then verifies a real datasource connection.

## Failure behavior

- Oracle unavailable, wallet rejected, or migration failed: process liveness may remain UP and the listener remains bound, but business/API routes remain HTTP 503 and readiness remains HTTP 503.
- Failure responses disclose only a stable status and, for migration failures, the exception class name. They do not include JDBC URLs, credentials, schema details or exception messages.
- The existing V30-only failed-migration recovery rule is preserved. Other failed migrations are not automatically repaired.
- The existing Flyway baseline version 13, missing-migration handling, Hibernate `ddl-auto: none`, migration files and database are unchanged by this change.
- Secret/wallet validation still happens before context refresh; this fix does not bypass it or make Oracle optional for application readiness.

## Verification required

- Unit test that proves the migration strategy returns before the queued migration task executes.
- Unit test that proves migration failure leaves the process unready.
- Filter tests for liveness while pending, business-route rejection while pending, and business-route access after success.
- Health tests proving readiness does not open a datasource connection before migration success and redacts failure details.
- Exact-head Maven test/build and standard CI.
- After deployment: confirm Render detects the listener, `/api/v1/health/live` returns 200 promptly, `/api/v1/health/ready` returns 503 until Flyway completes, then returns 200 with database UP. Confirm the deployed SHA and sanitized Flyway completion logs. Do not run write-heavy tests against shared staging as part of port verification.

## Rollback

Revert this code change if it prevents the listener from binding or leaves the service permanently unready. Do not disable Flyway, relax wallet validation, lower schema checks, change Render's assigned port, or bypass the readiness filter as a rollback workaround. Database migration rollback is separate and must follow the existing migration recovery policy.
