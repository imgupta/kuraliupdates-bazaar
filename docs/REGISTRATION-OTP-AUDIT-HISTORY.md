# Registration OTP policy audit history

Every effective change to customer and seller registration OTP settings is recorded in an append-only audit table. Records contain the previous and new channel flags, authenticated administrator identity and timestamp. Re-saving unchanged values creates no audit record.

The Admin Portal displays the latest 20 changes. The endpoint `GET /admin/seller-registration/otp-settings/history?limit=20` is covered by the existing `/admin/**` ADMIN security rule; the public settings endpoint continues to expose only the two required booleans.

## Release and acceptance checks
- Verify email-only, mobile-only and combined changes produce one accurate audit row each.
- Verify unchanged saves create no audit row.
- Verify non-admin users cannot access history or update settings.
- Verify the public endpoint does not expose actor or audit metadata.
- Verify all four signup combinations (both OFF, email only, mobile only, both ON) for buyer and seller registration.
- Verify existing seller leads retain their original OTP requirement snapshot.
- Verify login OTP, payment verification and existing accounts are unchanged.
- Exercise OTP resend cooldown and failed-attempt lockout; the existing OTP service enforces cooldown and a five-attempt limit.


## Merge and verification record

- PR: [#219](https://github.com/imgupta/kuraliupdates-bazaar/pull/219)
- Status: merged to `main` on 3 November 2026.
- Merge commit: `9b2e51fbf20aa4f8f3d421d0725a4c9bee99624a`.
- PR CI: Spring Boot verification, frontend lint/production build, backend tests, frontend checks, and browser E2E/read-only smoke checks all passed.
- Deployment/database status: not established by PR CI. Confirm Render rollout and Flyway V29 application to the intended Oracle schema before treating the audit feature as live. Complete the acceptance checks above in staging and record evidence.
