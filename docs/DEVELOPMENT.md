# Development

## Frontend
React + TypeScript + Vite + Tailwind.

Keep components presentational where possible. Put API access in services and cross-feature state in context/hooks.

## Backend
Java + Spring Boot + JPA.

Use:
`Controller → Service → Repository`

Add DTO/domain objects when API or business rules require separation.

## Patterns
Use Strategy for interchangeable behavior and Adapter for external providers.
Use Factory only when creation logic genuinely varies.
Do not introduce patterns for naming's sake.

## Context discipline
Read `ARCHITECTURE.md` first.
Prefer targeted file searches.
Do not put logs, debugging history or generated output in documentation.

## Staging regression workflow
1. Read `ARCHITECTURE.md` and `docs/STAGING-REGRESSION-TESTS.md`.
2. Identify the actual Vercel deployment, Render service/deployment, and Oracle schema target independently.
3. For the reported V13 reset, confirm the successful Flyway history entry read-only; do not edit/rerun applied migrations to fix application behavior.
4. Use synthetic staging identities and test records only. Do not create/modify data until the Oracle target is verified to be the authorized staging target.
5. Run focused tests, then frontend lint/build and `mvn clean verify`; then repeat the exact failing end-to-end scenario and record sanitized status/order transitions.
