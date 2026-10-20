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

On 21 October 2026, the Ignore Build Step command was configured for all six existing Vercel projects (**Settings → Git → Ignored Build Step**): five role portals plus the combined Bazaar site. A command exit status of 0 tells Vercel to skip the build; status 1 tells Vercel to continue. The script fails open (continues the build) if Vercel commit metadata is absent or Git comparison fails.

The settings update did not create a deployment. The post-merge Vercel check showed no new READY deployment for commit `c8e4932e13c4189cdfbb5206b9bc57c213a55495`; the Admin project recorded a CANCELED deployment for that commit, consistent with the ignore-build gate. Other projects retained their prior READY deployments. This is evidence of skipping for this docs/scripts/workflow-only change, not yet proof of the portal-only routing matrix.

The ignore command was updated without changing project domains, aliases, or existing build commands/output directories. Verify those existing settings match the table before the next portal runtime release.

## Build impact rules

- Portal-only feature, entry-point or portal HTML changes build only the affected role portal(s).
- Changes to shared runtime code, dependencies, Vite/build configuration, global CSS, or unknown runtime paths build all role portals.
- Documentation, tests, GitHub workflow files, build-support scripts, and root `index.html` do not trigger role-portal builds.
- The combined Bazaar site still rebuilds for runtime changes because it composes the role features; root `index.html` changes trigger the combined site build.
- CI continues to typecheck and run regression tests, builds the combined app, and builds only affected role portals instead of always running all five role builds.
- If changed-file detection cannot be trusted, CI builds all role portals. Unknown runtime paths fan out to all portals; the policy never skips a portal on an ambiguous source change.

## Vercel setup and validation

1. Verify actual project names, root directories, build commands, output directories and assigned domains in Vercel. Do not create projects or reassign aliases automatically.
2. Verify the matching Ignore Build Step command remains configured in each existing portal project; use the `site` target for the combined site.
3. Confirm a docs-only commit is skipped by all projects.
4. Confirm a Buyer-only change builds Buyer but skips Seller, Delivery, Daily Help and Admin.
5. Confirm a shared API/context/style or dependency change triggers all relevant portal builds.
6. Confirm the built deployment SHA and domain alias. A skipped build is expected for unaffected projects; it is not a failed deployment.

## Boundaries

- No API contract, backend, database, authentication, session key, route or business workflow change is part of this build optimization.
- Keep transactional staging E2E disabled until the existing role/fixture preflight passes and synthetic-data isolation is confirmed.
- Do not create extra Vercel projects or change billing/security settings without reviewing current account/project configuration.


## Applied configuration checkpoint — 21 October 2026

- Configured the Ignore Build Step on `kuraliupdates-buyer`, `kuraliupdates-seller`, `kuraliupdates-delivery`, `kuraliupdates-daily-help`, `kuraliupdates-admin`, and `kuraliupdates-bazaar`.
- The merge commit changes only workflow/build-support/test/documentation files, so it should not cause a runtime deployment. Latest Vercel inspection found no new READY deployments on that commit; the Admin project records a CANCELED deployment, consistent with an ignored build.
- The actual portal-only and shared-runtime decision matrix still needs validation on a future relevant code change; do not create dummy runtime commits solely to test it while build quota is constrained.
- Existing Vercel build commands, output directories, domain aliases, and backend targets were not modified by this configuration change.
