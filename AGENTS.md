# Agent Context

Read README.md and ARCHITECTURE.md first. Inspect only task-relevant files.

- React only; remove/ignore Angular.
- Spring Boot service-layer architecture.
- Flyway owns schema.
- Never edit an applied migration.
- Keep changes focused.
- Never commit secrets.
- Validate with npm run build and/or mvn clean verify.

Current rebuild: the database is intentionally reset and rebuilt from a fresh schema baseline. Legacy V1–V4 address migrations are not the target architecture.

Keep this file short; durable design belongs in ARCHITECTURE.md.
