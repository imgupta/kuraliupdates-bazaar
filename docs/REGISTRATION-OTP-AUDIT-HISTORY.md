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
