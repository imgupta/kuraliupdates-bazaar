# Private Playwright report hosting

This setup publishes the latest Playwright HTML report from trusted `main`-branch GitHub Actions runs to a Cloudflare Pages project so it can be opened in iPhone Safari.

## Security model

- Reports are **not deployed from pull-request runs**. PR reports remain GitHub Actions artifacts.
- Only the `playwright-report/` folder is deployed. The `test-results/` folder, traces, and other raw test output are not copied to the site.
- Deployment is disabled until the repository variable `CLOUDFLARE_REPORT_ACCESS_CONFIGURED` is exactly `true`.
- Set that variable only after you have verified that the Pages hostname is behind Cloudflare Access. Reports can still contain internal routes, test identifiers, screenshots, or application data; never make them public.
- This deploy replaces the current production report with the newest trusted run. GitHub Actions artifacts remain the historical record for 14 days.

## One-time Cloudflare setup

1. In the Cloudflare dashboard, open **Workers & Pages** and create a Pages project named `kuraliupdates-playwright-report`. Choose **Direct Upload** if prompted. The deployment workflow uploads the generated report itself.
2. Open the new Pages project → **Settings** and enable the Access policy for the Pages project/preview deployments.
3. Follow Cloudflare's current instructions to protect the production `*.pages.dev` hostname too. In Zero Trust → Access → Applications, make sure an Access application covers the exact production hostname (not only preview URLs). Add an allow policy for your own email address or other intended users.
4. If you add a custom domain, create a separate Access application and allow policy for that hostname as well. Do not assume protecting the custom domain automatically protects the `pages.dev` hostname.
5. Test both the production Pages URL and any deployment URL in a private/incognito browser session while signed out. Each must show the Cloudflare Access login page, not the Playwright report. If any URL bypasses Access, stop and fix the policy before enabling publishing.
6. Create a Cloudflare API token scoped to the correct account with the minimum Pages deployment permissions needed. Do not use the Global API Key.

Cloudflare references:
- https://developers.cloudflare.com/pages/configuration/preview-deployments/#customize-preview-deployments-access
- https://developers.cloudflare.com/pages/configuration/custom-domains/
- https://developers.cloudflare.com/pages/how-to/use-direct-upload-with-continuous-integration/

## GitHub repository configuration

In **Settings → Secrets and variables → Actions**, add:

### Repository secret

- `CLOUDFLARE_API_TOKEN`: the scoped Cloudflare API token. Keep it secret; never commit it.

### Repository variables

- `CLOUDFLARE_ACCOUNT_ID`: Cloudflare account ID.
- `CLOUDFLARE_PAGES_PROJECT`: `kuraliupdates-playwright-report` (or the exact Pages project name you created).
- `CLOUDFLARE_REPORT_ACCESS_CONFIGURED`: set to `true` **only after completing and testing the Access setup above**.

The existing `playwright-e2e-report` artifact is uploaded by the E2E job. No new test identities, OTP configuration, or staging data changes are required for report hosting.

## How it works

- Pushes to `main`, scheduled runs, and manual runs run the existing unified workflow.
- After the E2E job completes, the publish job downloads the report artifact from that same workflow run and deploys only the HTML report folder.
- If the E2E job fails after creating a report, the publish job still attempts to publish it so the failure details can be inspected.
- Pull-request runs never publish to Cloudflare.
- If Access has not been confirmed, the publish job is skipped and the artifact remains available under the GitHub Actions run's **Artifacts** section.

## Open the report on iPhone

1. Open the Cloudflare Pages report URL in Safari.
2. Complete the Cloudflare Access login with an allowed identity.
3. The latest Playwright HTML report should render, including test outcomes and report assets.

If the report is missing, open the same GitHub Actions run and inspect **Browser E2E and read-only smoke checks** plus **Publish private Playwright report**. If publishing was skipped, verify the repository variable `CLOUDFLARE_REPORT_ACCESS_CONFIGURED`; if it failed, inspect the Cloudflare credentials, project name, and artifact contents.
