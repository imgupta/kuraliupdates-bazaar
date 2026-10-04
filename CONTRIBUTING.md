# Contributing

## Read first
1. README.md
2. ARCHITECTURE.md
3. Only the files required for the task

## Rules
- React + TypeScript only. Angular is retired.
- Backend: Controller → Service → Domain/DTO → Repository.
- Keep controllers thin and transactions in services.
- Flyway owns schema; never edit an applied migration.
- Keep docs short. Do not paste logs, chat history, or large code blocks into Markdown.
- Never commit secrets.

## Verify
```bash
npm run build
cd backend-java-spring && mvn clean verify
```

During the current clean rebuild, database reset is intentional and must be completed before the fresh baseline is production-ready.
