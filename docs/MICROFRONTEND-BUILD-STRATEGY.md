# Quota-aware micro-frontend deployment

## Goal

Keep the five role portals independently buildable/deployable while reducing unnecessary build executions. This is a staged micro-frontend architecture: role-specific HTML entry points and Vite builds are isolated, while shared React/API/auth/context code remains in the existing repository. It is not yet five separate source repositories or a Module Federation runtime.

## Portal build contract

Configure each existing Vercel portal project with repository root `.`, framework preset Vite, install command `bun install --frozen-lockfile`, the build command and output directory below. Keep each portal's current hostname alias assigned to its existing project.

| Portal | Build command | Output directory | Ignore Build Step command |
|---|---|---|---|
| Buyer | `bun run build:buyer` | `dist/buyer` | `node scripts/vercel-ignore-build.mjs buyer` |
| Seller | `bun run build:seller` | `dist/seller` | `node scripts/vercel-ignore-build.mjs seller` |
| Delivery | `bun run build:delivery` | `dist/delivery` | `node scripts/vercel-ignore-build.mjs delivery` |
| Daily Help | `bun run build:daily-help` | `dist/daily-help` | `node scripts/vercel-ignore-build.mjs daily-help` |
| Admin | `bun run build:admin` | `dist/admin` | `node scripts/vercel-ignore-build.mjs admin` |
| Combined Bazaar site, if retained | `bun run build` | `dist` | `node scripts/vercel-ignore-build.mjs site` |

Set the Ignore Build Step command in each Vercel project's **Settings → Git → Ignored Build Step**. A command exit status of 0 tells Vercel to skip the build; status 1 tells Vercel to continue. The script fails open (continues the build) if Vercel commit metadata is absent or Git comparison fails.

Repository changes do not automatically configure Vercel dashboard settings. Apply the relevant command separately to each existing project and confirm each project's root/build/output settings before expecting quota savings.

## Build impact rules

- Portal-only feature, entry-point or portal HTML changes build only the affected role portal(s).
- Changes to shared runtime code, dependencies, Vite/build configuration, global CSS, or unknown runtime paths build all role portals.
- Documentation, tests, GitHub workflow files, build-support scripts, and root `index.html` do not trigger role-portal builds.
- The combined Bazaar site still rebuilds for runtime changes because it composes the role features; root `index.html` changes trigger the combined site build.
- CI continues to typecheck and run regression tests, builds the combined app, and builds only affected role portals instead of always running all five role builds.
- If changed-file detection cannot be trusted, CI builds all role portals. Unknown runtime paths fan out to all portals; the policy never skips a portal on an ambiguous source change.

## Vercel setup and validation

1. Verify actual project names, root directories, build commands, output directories and assigned domains in Vercel. Do not create projects or reassign aliases automatically.
2. Add the matching Ignore Build Step command to each existing portal project; use the `site` target for the combined site if it is still deployed.
3. Confirm a docs-only commit is skipped by all projects.
4. Confirm a Buyer-only change builds Buyer but skips Seller, Delivery, Daily Help and Admin.
5. Confirm a shared API/context/style or dependency change triggers all relevant portal builds.
6. Confirm the built deployment SHA and domain alias. A skipped build is expected for unaffected projects; it is not a failed deployment.

## Boundaries

- No API contract, backend, database, authentication, session key, route or business workflow change is part of this build optimization.
- Keep transactional staging E2E disabled until the existing role/fixture preflight passes and synthetic-data isolation is confirmed.
- Do not create extra Vercel projects or change billing/security settings without reviewing current account/project configuration.
