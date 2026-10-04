# Deployment

## Web
Vercel builds the repository root with the Vite frontend.

## API
Render builds `backend-java-spring/` using its Dockerfile.

## Release gate
1. Frontend lint/build passes.
2. Backend tests/build passes.
3. Flyway starts cleanly against the target Oracle schema.
4. Backend health endpoint responds.
5. Authentication and address smoke tests pass.
6. Production frontend loads and reaches the API.

## Rollback
Rollback the application deployment to the last known-good commit. Do not repair or rewrite Flyway history to make a deployment pass.

Keep secrets in hosting environment variables, never in Git.
