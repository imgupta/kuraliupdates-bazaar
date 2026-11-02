# Customer and seller registration OTP administration

## Purpose
Allow an authorized KuraliUpdates admin to independently control email and mobile OTP requirements for new buyer (customer) and seller registrations. The controls affect signup only; buyer/seller login OTP, payments, order confirmation and existing accounts are unchanged.

## Admin UI
Open Admin Portal → Marketplace & Merchants → Customer & seller OTP controls.

- Email OTP verification: independently ON/OFF.
- Mobile OTP verification: independently ON/OFF.
- Save persists the settings in Oracle.
- Both OFF: buyer applicants can create their account without an OTP challenge; seller applicants can continue from contact details to business details without an OTP challenge.
- One ON: only that channel receives a code and is required for both buyer and seller signup.
- Both ON: both channels are required for both buyer and seller signup.

## Backend enforcement
- Public read endpoints: `GET /registration/otp-settings` and `GET /seller-registration/otp-settings` (only expose whether each OTP is required).
- Admin read endpoint: `GET /admin/seller-registration/otp-settings`.
- Admin update endpoint: `PUT /admin/seller-registration/otp-settings` with `emailOtpEnabled` and `mobileOtpEnabled` booleans. Protected by the existing ADMIN role rule.
- A new seller lead snapshots the two settings when created. Buyer signup reads the current settings when the registration form starts. Changing settings later applies to new leads only; it does not silently waive an in-progress applicant's already-required verification. Existing leads created before V28 retain the previous dual-OTP requirement through migration backfill.
- The lead records each channel as verified or OTP-not-required. The CRM displays these states distinctly.
- Buyer account creation checks both channel requirements server-side. Seller provisioning checks both channel requirements server-side. A disabled channel is recorded as OTP-not-required, not falsely labelled as verified.
- Callback requests still require explicit consent. CRM call/email links remain unavailable unless consent is recorded and the relevant channel is verified or OTP-not-required.

## Database
Flyway V28 creates `SELLER_REGISTRATION_OTP_CONFIG` with both switches defaulted OFF and adds per-lead requirement/skip snapshot columns. The defaults are deliberately OFF for the current regulatory constraint described by the business owner.

## Rollout checklist
1. Apply V28 through the normal Render backend deployment and confirm Flyway reaches version 28.
2. Sign in as an admin and confirm both controls initially show OFF.
3. Create a synthetic buyer and seller registration with both OFF; confirm no email/SMS is sent and both can complete signup.
4. Turn email ON only; verify buyer and seller signup require email only.
5. Turn mobile ON only; verify buyer and seller signup require mobile only.
6. Turn both ON; verify both channels are required for buyer and seller signup.
7. Confirm an existing in-progress seller lead retains its original snapshot after settings are changed.
8. Confirm buyer and seller sign-in OTP flows are unaffected.

Do not enable SMS until the applicable government/provider restrictions and approved messaging templates permit it. The setting is an operational switch, not a legal-compliance determination.


## Audit history (PR #219)

Every effective change to the email/mobile OTP settings is recorded in `SELLER_REGISTRATION_OTP_CONFIG_AUDIT`, introduced by Flyway V29. The record captures the previous and new channel flags, authenticated administrator identity and timestamp. Saving unchanged values does not create an audit event. Admin Portal → Marketplace & Merchants → Customer & seller OTP controls displays the latest 20 changes.

The history API is `GET /admin/seller-registration/otp-settings/history?limit=20` and is protected by the existing ADMIN authorization boundary. The public settings endpoints continue to return only the two required booleans. See [Registration OTP audit history](REGISTRATION-OTP-AUDIT-HISTORY.md) for the acceptance checklist.
