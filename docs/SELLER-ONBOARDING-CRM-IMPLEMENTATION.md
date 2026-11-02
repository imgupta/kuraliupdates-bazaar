# Assisted seller registration and onboarding CRM — implementation PR

**Branch:** `feat/assisted-seller-registration-crm`  
**Target:** `main`  
**Status:** Implementation candidate; CI and staging verification required.

## Included in this consolidated change

- Create a seller onboarding lead when the applicant validates contact details.
- Send email and SMS OTPs before allowing the applicant to enter shop/business details.
- Verify both OTPs server-side and bind the verification result to the lead ID and normalized email/mobile.
- Require the verified lead ID when creating the seller profile; a missing, unverified or mismatched lead is rejected.
- Allow the applicant to request a callback only after both contact methods are verified and explicit callback consent is given.
- Add an admin-only CRM queue with status/search filtering, contact verification and consent visibility, assignment, follow-up date/time, status updates, call notes and outcomes.
- Persist lead notes and audit events separately from seller application/document approval.
- Add an additive Oracle Flyway migration V27.

## API surface

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/seller-registration/leads` | Create or resume a contact lead |
| POST | `/seller-registration/leads/{leadId}/verify-contact` | Verify email and mobile OTPs |
| POST | `/seller-registration/leads/{leadId}/callback` | Record explicit callback consent |
| GET | `/admin/seller-leads` | Admin CRM queue with status/search/page/size |
| PATCH | `/admin/seller-leads/{leadId}` | Assignment, status and follow-up |
| GET | `/admin/seller-leads/{leadId}/notes` | Read internal notes |
| POST | `/admin/seller-leads/{leadId}/notes` | Add internal call note/outcome |

The existing `/auth/send-otp` API remains the delivery path. Seller registration now uses the new lead verification endpoint before business details. The final `/auth/verify-otp` request includes `leadId`; the backend validates that the lead is verified and matches the email/mobile before completing seller provisioning.

## Security and data handling

- OTP values are never persisted in the lead tables or included in lead responses.
- OTP hashing, expiry, attempt limits and resend cooldown remain in the existing OTP service.
- Admin endpoints are under `/admin/**` and protected by the existing ADMIN role policy.
- CRM contact links are disabled until mobile verification and explicit callback consent are both present.
- CRM notes are admin-only and separate from seller-facing application data.
- Seller document scanning, review and seller activation gates are unchanged.
- Unverified abandoned leads can be visible to admins, but contact is disabled.
- No secrets, live OTPs, seller documents or real applicant records are included in this change.

## Deployment gates — do not skip

1. Confirm MSG91 SMS auth key and approved template ID exist in the intended Render staging service. Do not commit or print secrets.
2. Confirm Resend and MSG91 delivery with synthetic test identities.
3. Confirm the intended Oracle staging schema is isolated and backed up; verify restore evidence before applying V27.
4. Confirm private ClamAV is healthy before exercising document upload/approval flows.
5. Run backend tests, frontend type-check/build, route regression tests and Playwright.
6. Exercise lead start, both OTPs, callback consent, admin assignment/notes/follow-up and seller submission using synthetic data.
7. Confirm seller approval still requires the existing document scan and human-review gates.
8. Record staging evidence and rollback steps before enabling the workflow for real merchants.

## Known rollout constraints

- SMS delivery is implemented through the existing MSG91 integration, but this repository change cannot prove that the Render environment has valid provider credentials/template configuration.
- Callback consent is stored with timestamp and version. A broader data-retention schedule and privacy-notice wording still need business/legal approval before public rollout.
- The CRM uses the existing ADMIN authorization boundary. If onboarding agents need separate non-admin access, introduce a dedicated permission/role policy rather than granting them seller approval privileges.
- V27 is additive and has not been applied to any database by this PR.
