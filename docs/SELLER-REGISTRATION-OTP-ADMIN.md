# Seller registration OTP administration

## Purpose
Allow an authorized KuraliUpdates admin to independently control email and mobile OTP requirements for new seller registrations. This is a seller-onboarding control only; it does not alter buyer registration/login, seller login, payments, order confirmation, or existing seller accounts.

## Admin UI
Open Admin Portal → Marketplace & Merchants → Registration OTP controls.

- Email OTP verification: independently ON/OFF.
- Mobile OTP verification: independently ON/OFF.
- Save persists the settings in Oracle.
- Both OFF: applicants can submit contact details and continue to business details without an OTP challenge.
- One ON: only that channel receives a code and is required.
- Both ON: both channels are required.

## Backend enforcement
- Public read endpoint: `GET /seller-registration/otp-settings` (only exposes whether each OTP is required).
- Admin read endpoint: `GET /admin/seller-registration/otp-settings`.
- Admin update endpoint: `PUT /admin/seller-registration/otp-settings` with `emailOtpEnabled` and `mobileOtpEnabled` booleans. Protected by the existing ADMIN role rule.
- A new lead snapshots the two settings when created. Changing settings later applies to new leads only; it does not silently waive an in-progress applicant's already-required verification.
- The lead records each channel as verified or OTP-not-required. The CRM displays these states distinctly.
- Seller provisioning checks both channel requirements server-side. A disabled channel is recorded as OTP-not-required, not falsely labelled as verified.
- Callback requests still require explicit consent. CRM call/email links remain unavailable unless consent is recorded and the relevant channel is verified or OTP-not-required.

## Database
Flyway V28 creates `SELLER_REGISTRATION_OTP_CONFIG` with both switches defaulted OFF and adds per-lead requirement/skip snapshot columns. The defaults are deliberately OFF for the current regulatory constraint described by the business owner.

## Rollout checklist
1. Apply V28 through the normal Render backend deployment and confirm Flyway reaches version 28.
2. Sign in as an admin and confirm both controls initially show OFF.
3. Create a synthetic seller lead and confirm no email/SMS is sent and the applicant can continue.
4. Turn email ON only; verify email is required while mobile is marked OTP-not-required.
5. Turn mobile ON only; verify mobile is required while email is marked OTP-not-required.
6. Turn both ON; verify both channels are required.
7. Confirm an existing in-progress lead retains its original snapshot after settings are changed.
8. Confirm buyer and seller sign-in OTP flows are unaffected.

Do not enable SMS until the applicable government/provider restrictions and approved messaging templates permit it. The setting is an operational switch, not a legal-compliance determination.
