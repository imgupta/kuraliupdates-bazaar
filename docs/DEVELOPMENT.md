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
