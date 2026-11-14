# Unified Seller Onboarding and CRM – Implementation Notes

## Scope
This change consolidates the seller lead, contact-verification, application and admin-review journey while retaining the existing shared seller application and malware-scanned document storage.

## Delivered in this branch
- Simplified the public seller wizard from five stages to four: owner/contact, shop identity, location, and documents/review (including operating hours).
- Preserved the one-time admin-to-seller registration handoff and added the verified lead reference to the shared application payload.
- Seller submission now requires a linked lead for self-service submission and advances that lead to APPLICATION_SUBMITTED in the same transaction.
- Verified email/mobile values are immutable on a lead-linked application. Contact changes require a fresh verification journey.
- Admin CRM has backend summary counts, page navigation, a combined lead/application activity feed, and an audited OTP resend action. The OTP itself is never returned to admins.
- Admin lead status changes are constrained by an explicit transition map; admins cannot manually mark a lead CONVERTED.
- Application status changes are constrained by a transition map. Approval requires the latest uploaded required document to be clean and admin-verified.
- Submission requires a clean shop-front photo and clean GST/FSSAI evidence when those identifiers are supplied.
- Replaced document evidence is evaluated using the latest upload for that document type, preventing an older verified file from masking a newer rejected/unclean replacement.

## Operational semantics
- A skipped OTP channel is not represented as verified. Existing contact requirement logic still requires at least one actual verified channel.
- Admin OTP assistance only requests resend while the lead is in STARTED state. Admins cannot read OTP values.
- CONVERTED is set only when the linked seller application is approved.
- Seller activation/product-publishing enforcement must continue to be verified against the existing role/approval guards; this PR does not assert that a live Render/Oracle environment has applied the migration or that provider delivery has been confirmed.
- The CRM summary is based on backend counts; list pagination uses 25 records per page.
- Admin assignment remains a free-text field pending an authoritative authorized-admin directory endpoint. It should not be interpreted as access control.

## Validation still required
- Run frontend lint/typecheck/build and backend unit/integration tests.
- Run the migration and application flow against the isolated staging Oracle database.
- Verify email/mobile OTP delivery and resend cooldown with configured providers.
- Verify document scanning, latest-document replacement, approval and seller product-publishing restrictions in staging.
- Verify the admin dashboard counts and pagination against more than 25 leads.

## Follow-up completion additions
- CRM assignment now resolves to active administrator accounts only. The backend validates the selected user ID against USERS (IS_ADMIN=1, ACCOUNT_STATUS='ACTIVE'); free-text assignee names are rejected.
- The CRM exposes an actionable due-follow-up filter, ordered by overdue callback time, and the dashboard's due count can open that queue.
- Seller draft persistence already existed; its accepted step range is now aligned to the four-step wizard, and the obsolete fifth step is rejected.
- The registration progress indicator now renders four steps rather than five.

## Remaining gaps after this increment
- No scheduled reminder delivery has been added; due follow-ups are visible in CRM but still require an admin to act.
- Duplicate contact matching reuses a lead pair, but there is no admin duplicate-review/merge workflow or fuzzy shop-name detection.
- Reviewer assignment is limited to active admin accounts; a separate reviewer/team permission model is not present.
- Application workspace assignment still needs the same active-admin validation and consistent UI treatment.
- End-to-end staging acceptance remains required for draft resume, all OTP channel configurations, document replacement/scanning, activation guards and database migration.
