# Global registration OTP administration

## Purpose
Allow an authorized KuraliUpdates admin to independently control email and mobile OTP requirements for Buyer, Seller, Delivery Partner and Daily Help registrations. The controls affect signup only; login OTP, payments, order confirmation and existing accounts are unchanged.

## Admin UI
Open Admin Portal → Marketplace & Merchants → Global registration OTP controls.

- Email OTP verification: independently ON/OFF.
- Mobile OTP verification: independently ON/OFF.
- Save persists the settings in Oracle.
- Both OFF: rejected by the backend. V28 seeds a fresh database with both flags OFF, so an administrator must enable at least one channel before opening registration; the admin UI displays this initial setup warning.
- Email ON / Mobile OFF: only email receives a code and is required across all four registration roles.
- Email OFF / Mobile ON: only mobile receives a code and is required across all four registration roles.
- Both ON: both codes are sent and both are required across all four registration roles.

## Backend enforcement
- Public read endpoints: `GET /registration/otp-settings` and `GET /seller-registration/otp-settings` (only expose whether each OTP is required).
- Admin read endpoint: `GET /admin/seller-registration/otp-settings`.
- Admin update endpoint: `PUT /admin/seller-registration/otp-settings` with `emailOtpEnabled` and `mobileOtpEnabled` booleans. Protected by the existing ADMIN role rule.
- A new seller lead snapshots the two settings when created. Buyer, Delivery and Daily Help registration read the public settings before sending OTPs; the backend independently enforces the enabled channels at verification time. Changing settings during an in-progress non-seller registration can require restarting the OTP step. Existing seller leads retain their original snapshot.
- The lead records each channel as verified or OTP-not-required. The CRM displays these states distinctly.
- Buyer, Delivery and Daily Help account creation checks both channel requirements server-side. Seller provisioning checks both channel requirements through its lead snapshot. A disabled channel is recorded as OTP-not-required, not falsely labelled as verified.
- Callback requests still require explicit consent. CRM call/email links remain unavailable unless consent is recorded and the relevant channel is verified or OTP-not-required.

## Database
Flyway V28 creates `SELLER_REGISTRATION_OTP_CONFIG` with both switches defaulted OFF and adds per-lead requirement/skip snapshot columns. A fresh deployment therefore starts with registration blocked until an administrator enables at least one channel. Do not enable SMS until the applicable provider and regulatory prerequisites are confirmed.

## Rollout checklist
1. Apply the existing OTP configuration migrations through the normal Render backend deployment and confirm Flyway reaches the expected version.
2. Sign in as an admin and confirm the current email/mobile channel flags.
3. Confirm saving both channels OFF is rejected by the backend.
4. Turn email ON only; verify Buyer, Seller, Delivery and Daily Help registration require email only.
5. Turn mobile ON only; verify all four registration roles require mobile only.
6. Turn both ON; verify all four registration roles show two separate inputs and require both codes.
7. Confirm an in-progress seller lead retains its original snapshot after settings are changed.
8. Confirm login OTP flows are unaffected.

Do not enable SMS until the applicable government/provider restrictions and approved messaging templates permit it. The setting is an operational switch, not a legal-compliance determination.


## Audit history (PR #219)

Every effective change to the email/mobile OTP settings is recorded in `SELLER_REGISTRATION_OTP_CONFIG_AUDIT`, introduced by Flyway V29. The record captures the previous and new channel flags, authenticated administrator identity and timestamp. Saving unchanged values does not create an audit event. Admin Portal → Marketplace & Merchants → Customer & seller OTP controls displays the latest 20 changes.

The history API is `GET /admin/seller-registration/otp-settings/history?limit=20` and is protected by the existing ADMIN authorization boundary. The public settings endpoints continue to return only the two required booleans. See [Registration OTP audit history](REGISTRATION-OTP-AUDIT-HISTORY.md) for the acceptance checklist.
