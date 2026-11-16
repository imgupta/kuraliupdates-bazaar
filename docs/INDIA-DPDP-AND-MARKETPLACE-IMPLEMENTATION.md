# India Privacy, Data Governance and Marketplace Compliance Implementation

**Baseline:** 16 November 2026. **Status:** Engineering controls introduced; not legal certification or proof of deployment/provider configuration.

## Legal calendar
- DPDP Act 2023 / Rules 2025: Gazette commencement is phased. Rule 4 has a one-year commencement date (13 Nov 2026); the principal Data Fiduciary obligations and Rules 3, 5–16, 22 and 23 are scheduled for 13 May 2027. Verify Gazette notifications and corrigenda at release.
- Consumer Protection (E-Commerce) Amendment Rules 2026: effective 1 Jan 2027. Marketplace controls include legal entity/contact/grievance disclosure, complaint acknowledgement within 48 hours and redressal within one month, NCH convergence, truthful search/ranking, sponsored listing labels, 30-day prior-price disclosures and annual dark-pattern self-audit/certificate.
- CERT-In Directions 2022: where applicable, specified incidents must be reported within six hours; covered entities must maintain ICT logs securely for a rolling 180 days within Indian jurisdiction and nominate a point of contact.
- FSS Act 2006 section 31: food business operators require applicable registration/licence. Applicability depends on activity and current FoSCoS eligibility, not a universal hard-coded FSSAI number rule.

## Engineering changes
- Adds database-backed privacy request register for ACCESS, CORRECTION, ERASURE, WITHDRAW_CONSENT and GRIEVANCE, with authenticated user ownership and 30-day operational target.
- Adds versioned privacy-notice acknowledgement record per user and language.
- Adds admin-only configuration storage for GST/FSSAI applicability categories, minimum age, minor-account policy and privacy/grievance contacts.
- Adds admin-only request triage endpoints and audit events.
- Defaults preserve current seller onboarding: GST not universally mandatory; FSSAI categories are configurable and must be interpreted against actual food activity/licence class.
- Adds migration V40 for privacy/compliance tables and V41 for partner ward-number columns. V41 deliberately avoids the existing V23 seller-service-area migration version; duplicate Flyway versions prevent startup. Apply through Flyway; do not manually create production tables.

## Endpoints
- GET /privacy/notice-metadata — public notice version/contact metadata.
- POST /me/privacy/notice-acknowledgement — authenticated notice version/language acknowledgement.
- POST /me/privacy/requests and GET /me/privacy/requests — create and track a user's request.
- GET /admin/privacy/requests?status=OPEN and PUT /admin/privacy/requests/{id} — admin queue and triage.
- GET /admin/compliance/requirements and PUT /admin/compliance/requirements — admin configuration.

These endpoints create request and audit records; they do not themselves export, correct, erase or withdraw data. An operator must verify identity, map records across systems and complete the request subject to statutory retention/legal holds. Do not mark a request completed without evidence.

## Administrator configuration
KU_COMPLIANCE_CONFIG supports:
- SELLER_GST_REQUIRED (boolean)
- SELLER_GST_REQUIRED_CATEGORIES (comma-separated category codes)
- SELLER_FSSAI_REQUIRED_CATEGORIES (comma-separated category codes)
- MINIMUM_REGISTRATION_AGE (18–100)
- ALLOW_MINOR_REGISTRATION (boolean)
- PRIVACY_NOTICE_VERSION
- PRIVACY_CONTACT_EMAIL
- GRIEVANCE_CONTACT_EMAIL

GST/FSSAI settings are policy metadata in this release; seller registration/activation must consume them before treating a seller as compliant. GST is not universally compulsory for every seller; applicability depends on law, turnover, supply and category. FSSAI depends on actual food-business activity and licence/registration eligibility. Admin configuration cannot override statute.

Default minimum age is 18 and minor registration is disabled. Do not enable minors until verifiable parental consent and child-data safeguards are implemented. Age policy is not a substitute for reliable age assurance.

## Retention and data inventory decisions
| Data | Purpose | Control / decision |
|---|---|---|
| Name, email, phone | Account, contact, fulfilment | Keep only while purpose continues; erase/anonymise when no longer required, subject to claims |
| OTP | Contact verification | Hash, short expiry, bounded attempts; scheduled purge required |
| Sessions | Authentication | Current implementation stores bearer tokens; hash migration requires compatible rollout/forced re-auth |
| Addresses/coordinates | Delivery | Collect when needed; restrict access; avoid indefinite location history |
| Seller GST/FSSAI | Eligibility/tax/food compliance | Restrict access; verify applicable class and expiry |
| Seller documents | Verification/disputes | Private access, encryption, scan quarantine, download audit and deletion schedule |
| Security logs | Security/incident response | CERT-In 180-day India logs where applicable; DPDP one-year security logs where applicable |
| Orders/invoices/tax/disputes | Contract/statutory | Retain applicable statutory periods; account closure does not automatically erase them |

Do not use one blanket retention period. Approve a record-class schedule with counsel/CA and implement purge, backup expiry and legal holds.

## Infrastructure evidence still required
Source code cannot prove actual provider regions. Record primary/backup/export/diagnostic locations and retention for Oracle; runtime/log/backup/support locations for Render; build/runtime/edge logs and artifacts for Vercel; and data locations/subprocessors for email, SMS, maps, analytics and monitoring. Keep CERT-In covered logs in India for the required period. DPDP and CERT-In logs are distinct.

## Release gates
1. Apply V40 and V41 on isolated staging Oracle; verify Flyway has one migration per version, then prove migration/restart/recovery.
2. Add integration tests for ownership, admin authorization, validation, acknowledgement and config audit.
3. Connect the registration flow to the published privacy notice and authenticated rights endpoints; require acknowledgement at the appropriate point and retain notice version/language.
4. Verify seller registration and activation consume GST/FSSAI settings; block food-seller activation when applicable evidence is missing/expired and revalidate expiry.
5. Implement scheduled purge for OTPs and retention classes, with legal holds and audit evidence.
6. Implement token-hash migration with forced re-auth plan before changing sessions.
7. Verify provider/region/backup/log settings from provider consoles/contracts.
8. Publish full privacy notice, grievance officer and legal entity/address only after details are confirmed.
9. Test rights fulfilment end-to-end and retain proof; request triage alone is not fulfilment.
10. Obtain India counsel/CA/CS review before declaring compliance.

## Primary sources
- DPDP Rules Gazette: https://www.meity.gov.in/static/uploads/2025/11/53450e6e5dc0bfa85ebd78686cadad39.pdf
- DPDP Act commencement G.S.R. 843(E): https://egazette.gov.in/WriteReadData/2025/267647.pdf
- E-Commerce Amendment Rules Gazette: https://consumeraffairs.gov.in/public/upload/files/E%20Commerce%20Amendment%20Rules%202026_1789128659.pdf
- CERT-In Directions: https://www.cert-in.org.in/PDF/CERT-In_Directions_70B_28.04.2022.pdf
- FSSAI: https://fssai.gov.in/business/registration and https://fssai.gov.in/business/licensing
