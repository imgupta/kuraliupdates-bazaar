# Contributing

1. Read `ARCHITECTURE.md`.
2. Keep changes feature-focused.
3. React only; no Angular.
4. Keep HTTP, business logic and persistence separated.
5. Add/update DTO validation for API changes.
6. Add Flyway migrations for schema changes; never rewrite applied migrations.
7. Run:
   ```
   npm run lint
   npm run build
   cd backend-java-spring && mvn clean verify
   ```
8. Keep documentation concise. Put detailed design only in `ARCHITECTURE.md` or the relevant `docs/` file.
