# Agent Rules

Read `ARCHITECTURE.md` first. Do not scan the whole repository unless required.

## Must
- Keep React as the only frontend.
- Keep backend layers thin and feature-oriented.
- Use DTOs at API boundaries.
- Put transactions in services.
- Use Flyway for schema changes.
- Prefer small, focused changes.
- Run frontend and backend quality gates before declaring completion.

## Database rebuild
The old address migration chain is retired. Do not restore V1/V2/V3/V4 compatibility logic.
New schema design must be authoritative and internally consistent.

## Context discipline
Do not copy long logs or historical debugging into markdown.
Document decisions, contracts and invariants only.
