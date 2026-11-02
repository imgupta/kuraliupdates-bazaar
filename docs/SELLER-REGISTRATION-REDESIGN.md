# Seller registration redesign — implementation specification

**Status:** Approved product/engineering specification; implementation not started  
**Last updated:** 2 November 2026  
**Scope:** Documentation and planning only  
**Target:** Existing React + TypeScript frontend, Java/Spring Boot API and Oracle database

This document is the implementation source of truth for the seller registration redesign. It complements [Seller onboarding](SELLER-ONBOARDING.md), which describes the current seller compliance/document workflow. If this document and the current implementation differ, treat this document as the approved target design, not as evidence that a feature is already implemented.

## 1. Decisions locked

| Decision | Approved direction |
|---|---|
| Seller service area | Admin-configurable radius centred on Kurali |
| Initial radius | 5 km proposed starting value; verify actual coverage before activation |
| Radius centre | Verify and record Kurali town-centre coordinates during discovery; do not guess coordinates |
| Languages | English, Punjabi and Hindi |
| Document collection | Conditional based on business activity, legal applicability and registration status |
| Seller approval | Manual admin review |
| Shop-front photograph | Required |
| Document storage | Extend existing private Oracle BLOB implementation |
| Map provider | Preserve OpenStreetMap fallback |
| Rollout | Feature branch, staging first, release gates before deployment |

**Important boundary:** Seller registration eligibility radius and grocery delivery radius are separate settings and must never share a configuration key or validation rule.

## 2. Goals and non-goals

### Goals
- Replace the long single-page seller form with a five-step mobile-first journey.
- Allow sellers to save, leave and resume applications.
- Link an existing buyer account to a seller application without creating duplicate identities.
- Enforce seller location eligibility on the backend using an admin-configurable radius.
- Collect only applicable compliance information and documents.
- Make document upload, review, correction and retry recoverable.
- Give admins a complete application review workflow.
- Let sellers see application and document status.
- Support English, Punjabi and Hindi throughout the journey.

### Non-goals for the first release
- Multiple service-area centres or complex polygon zones.
- Changes to grocery delivery radius or delivery dispatch.
- Automatic seller approval.
- Payment, commission or refund model changes.
- Replacing Oracle BLOB storage without a technical/security reason.
- Collecting Aadhaar or other sensitive identity data without a documented lawful basis.

## 3. Registration journey

Use a five-step wizard with visible progress, persistent step navigation, clear field-level errors, save/resume and final review.

### Step 1 — Owner and contact
- Owner or authorised representative name.
- Mobile number and email.
- OTP verification.
- Detect authenticated existing buyer and link seller application to the same account.
- Prevent duplicate account creation and duplicate active applications.

### Step 2 — Shop identity
- Shop name.
- Controlled business category and subcategory; do not rely on free-text keyword matching for compliance.
- Business constitution: individual, proprietorship, partnership, company/LLP as supported.
- Show registered/legal business name only where applicable.
- Optional business description and catalogue/service summary.

### Step 3 — Shop location
- Default map view centred on verified Kurali town-centre coordinates.
- Address search, map pin selection and reverse-geocoded address.
- Collect locality, street/mohalla, PIN and optional landmark only as needed.
- Validate coordinates, address completeness and service radius on the backend.
- Show a useful out-of-area explanation; do not rely on browser-only validation.

### Step 4 — Compliance and documents
- Fetch applicable requirements from a central compliance-rules API.
- Distinguish Required to submit, Required before activation and Not applicable.
- Collect GST details/documents only when relevant to the seller's legal position.
- Collect FSSAI details/documents for applicable food activities.
- Support other licences/certificates only where applicable.
- Show upload progress, preview, retry, replacement, verification status and rejection reason.
- Do not hardcode historical statutory thresholds in the frontend.

### Step 5 — Operations and final review
- Opening/closing hours and weekly closing day.
- Optional preparation time where relevant.
- Mandatory shop-front photograph.
- Seller agreement acceptance with version identifier and timestamp.
- Review all details and edit previous steps.
- Submit only when submission-stage requirements are satisfied.

## 4. Mobile, accessibility and localisation

- English, Punjabi and Hindi must cover labels, help text, validation, upload guidance, status, correction reasons and notifications.
- Language switching must not clear entered data or uploaded-document state.
- Use Unicode Punjabi and Hindi text, not transliteration.
- Keep labels visible when fields contain values; placeholders are supplementary only.
- Use large touch targets (target 44–48 CSS px for primary controls), visible focus and textual error identification.
- Test common small Android/iPhone viewport sizes, portrait and landscape.
- Avoid excessive scrolling, duplicated address fields and unexplained legal terminology.

## 5. Seller service-area rules

The initial configuration is a **5 km radius**, subject to coverage validation before activation.

Required configuration:
- Active centre latitude/longitude for Kurali town centre.
- Radius in kilometres.
- Enabled/disabled state.
- Effective timestamp and configuration version.
- Actor and reason for every admin change.

Required behaviour:
1. Frontend displays the configured boundary and centres the map on the configured point.
2. Seller chooses the actual shop location; coordinates are not inferred from the user's current location.
3. Backend validates coordinate ranges and calculates distance from the active centre using a consistent geodesic calculation.
4. Backend accepts locations within the configured radius and rejects locations outside it, with a clear response.
5. Authorised admin exceptions, if product policy permits them, require a recorded reason, reviewer identity and audit history.
6. Configuration changes affect subsequent validations and are auditable.
7. Existing seller records must not be silently deactivated when the radius changes; define a separate review/transition process.
8. Seller registration radius remains independent of grocery delivery radius.

The exact centre coordinates must be verified in Phase 0. Do not copy coordinates from a device's current location or from a sample screenshot.

## 6. Conditional compliance model

Create a centrally managed, versioned mapping from category/subcategory and seller attributes to compliance requirements. Avoid free-text category keyword heuristics.

Each requirement must have:
- Requirement code and display label.
- Applicability conditions.
- Required evidence/document type.
- Collection stage: submission or before activation.
- Expiry/renewal behaviour where applicable.
- Rule version and effective date.
- Admin verification requirement.

Document states:
- NOT_APPLICABLE
- REQUIRED
- UPLOAD_PENDING
- UPLOADED
- UNDER_REVIEW
- VERIFIED
- REJECTED
- EXPIRED

Application-level requirements must distinguish:
- **Required to submit:** blocks submission until satisfied.
- **Required before activation:** allows submission/review but blocks seller activation.
- **Not applicable:** not requested and does not block progression.

Compliance must be reviewed against current applicable Indian law by qualified counsel/accounting/compliance professionals. FSSAI applicability must use current FoSCoS rules. GST treatment must consider the seller, goods, turnover and applicable e-commerce conditions. Do not blanket-reject every unregistered GST seller or hardcode superseded thresholds.

## 7. Application lifecycle

Proposed lifecycle:

`DRAFT → OTP_VERIFIED → SUBMITTED → UNDER_REVIEW`

From UNDER_REVIEW:
- `ACTION_REQUIRED`: seller must correct details or replace evidence; resubmission returns to review.
- `APPROVED`: only after all activation-stage requirements and manual approval are satisfied.
- `REJECTED`: record reason and whether resubmission is permitted.

Keep authentication identity separate from seller application state. OTP verification is not seller approval. Form submission is not seller activation.

Every transition must record timestamp, actor, previous state, new state and reason where relevant. Enforce allowed transitions in the service layer and prevent clients from directly setting privileged states.

## 8. Proposed API contract

These are design proposals, not assertions that these routes currently exist. During Phase 0, align naming and payloads with repository conventions and existing APIs before implementation.

| Method | Proposed route | Purpose |
|---|---|---|
| POST | `/seller-applications` | Create draft |
| GET | `/seller-applications/me` | Retrieve current user's application |
| PUT | `/seller-applications/{id}` | Save draft details |
| GET | `/seller-applications/rules` | Fetch category/compliance rules |
| POST | `/seller-applications/{id}/documents` | Upload document |
| GET | `/seller-applications/{id}/documents` | List own document metadata |
| DELETE | `/seller-applications/{id}/documents/{documentId}` | Remove/replace eligible document |
| POST | `/seller-applications/{id}/submit` | Submit application |
| GET | `/seller-applications/{id}/status` | Retrieve application status |
| GET | `/admin/seller-applications` | Admin review queue |
| POST | `/admin/seller-applications/{id}/review` | Request changes, approve or reject |
| GET/PUT | `/admin/service-area` | Read/update seller service-area configuration |

Use authenticated identity to derive ownership. Do not trust seller IDs supplied by the browser for authorisation. Upload, submission and review operations should be idempotent where retries are expected.

## 9. Data model proposal

Final table/entity names and migration number must be selected only after inspecting current entities and Flyway history. Never edit an applied migration.

Potential entities/tables:
- `SELLER_APPLICATIONS`: applicant, seller relationship, state, profile, timestamps and agreement version.
- `SELLER_APPLICATION_HISTORY`: state transitions, actor and reason.
- `SELLER_SERVICE_AREA_CONFIG`: centre, radius, enabled state, version and audit metadata.
- `SELLER_CATEGORY`: controlled category/subcategory taxonomy.
- `SELLER_COMPLIANCE_RULES`: versioned applicability and collection-stage rules.
- `SELLER_APPLICATION_DOCUMENTS`: metadata, BLOB reference/content strategy, document type, status, expiry and verification metadata.
- `SELLER_DOCUMENT_AUDIT`: upload, view, download, replace, verify, reject and delete events.
- `SELLER_AGREEMENT_VERSIONS`: agreement text/version and acceptance evidence.

Reuse existing seller/authentication/document structures where sound. Avoid duplicate identity and document storage. Design indexes and constraints from actual query patterns.

## 10. Document security and reliability

- Preserve private Oracle BLOB storage and authenticated access.
- Enforce seller ownership for upload/list/download/replace.
- Restrict verification and administrative download to authorised roles.
- Validate size, allowlisted type and file signature; do not rely on filename or browser MIME.
- Add malware scanning and quarantine before admin review.
- Never expose public BLOB URLs or log document bytes, OTPs, tokens or secrets.
- Add upload retry and safe recovery after OTP/account creation.
- Record access and decision audit events.
- Define retention, deletion, backup and incident-response procedures.
- Threat-model application-layer encryption and key management; do not equate database encryption-at-rest/TLS with application-layer encryption.

## 11. Admin and seller experience

### Admin
- Filterable application queue: Submitted, Under Review, Action Required, Approved and Rejected.
- Profile, category, location and distance from service-area centre.
- Document preview, verification and rejection reason.
- Request-correction, approve and reject actions.
- Service-area configuration and exception review (if enabled).
- Reviewer identity, timestamps and complete audit history.
- Server-side approval gates; UI hiding alone is not security.

### Seller
- Application status tracker.
- Per-document status and expiry where relevant.
- Clear correction reason and direct route to edit the relevant step.
- Replace rejected/expired evidence and resubmit.
- Email/SMS/WhatsApp notification only where integration, consent and delivery configuration are confirmed.

## 12. Phased delivery plan

Indicative estimates; confirm after discovery.

| Phase | Scope | Estimate | Exit gate |
|---|---|---:|---|
| 0. Discovery | Audit current UI, APIs, auth, V14, BLOB, map, validation and schema | 1–2 days | Approved technical design and no unresolved assumptions |
| 1. Wizard | Five steps, mobile UI, translations, conditional fields and review | 3–4 days | Complete responsive journey and frontend tests |
| 2. Draft/location | Persistence, account linking, resume, map and radius enforcement | 3–5 days | Draft recovery and backend geofence tests pass |
| 3. Compliance/docs | Rules engine, upload recovery, verification, scanning/quarantine | 3–5 days | Applicability, upload and security tests pass |
| 4. Admin/tracking | Review queue, decisions, correction flow, seller status and notifications | 3–5 days | End-to-end manual review flow passes |
| 5. Hardening | Backend/frontend/E2E, migration, security, pilot and rollback | 2–4 days | All release-blocking tests pass |

### Release sequence
- R1: Wizard, translations, drafts and account linking.
- R2: Location and configurable radius.
- R3: Compliance and document reliability.
- R4: Admin review and seller tracking.
- R5: Hardening and controlled rollout.

No phase should be treated as deployed merely because its code is merged. Verify staging deployment, database migration and runtime behaviour independently.

## 13. Backlog ticket index

### SR-01 — Discovery
- SR-001 inspect registration components and routing.
- SR-002 inspect OTP/authentication and buyer-to-seller linking.
- SR-003 inspect seller entities, DTOs, repositories and migrations.
- SR-004 inspect V14 and Oracle BLOB document flow.
- SR-005 inspect seller upload and admin verification APIs.
- SR-006 verify PIN validation regex and tests.
- SR-007 inspect map/geocoding and OSM fallback.
- SR-008 document existing API contracts and compatibility constraints.

### SR-02 — Wizard
- SR-009 wizard shell and progress.
- SR-010 owner/contact step.
- SR-011 shop identity/category step.
- SR-012 conditional constitution/legal-name fields.
- SR-013 shop location step.
- SR-014 compliance/document step.
- SR-015 operating-hours step.
- SR-016 shop-front photo.
- SR-017 final review/edit.
- SR-018 mobile/accessibility validation.

### SR-03 — Localisation
- SR-019 central translation resources.
- SR-020 English/Punjabi/Hindi labels and help.
- SR-021 translated validation/API errors.
- SR-022 translated document/status text.
- SR-023 translated notifications.
- SR-024 persist language without losing form state.

### SR-04 — Drafts and identity
- SR-025 application persistence model.
- SR-026 create draft.
- SR-027 retrieve application.
- SR-028 update draft.
- SR-029 OTP verification/account linking.
- SR-030 ownership and duplicate-submit protection.
- SR-031 resume-after-login.
- SR-032 incomplete registration recovery.

### SR-05 — Location
- SR-033 service-area config schema.
- SR-034 verified Kurali centre and initial 5 km config.
- SR-035 admin read/update API.
- SR-036 boundary map.
- SR-037 pin selection/reverse geocoding.
- SR-038 backend distance validation.
- SR-039 invalid/out-of-radius handling.
- SR-040 audited admin exceptions if approved.
- SR-041 separate seller and delivery radius settings.

### SR-06 — Compliance
- SR-042 category taxonomy.
- SR-043 central compliance rules.
- SR-044 GST applicability.
- SR-045 FSSAI applicability.
- SR-046 other applicable licences.
- SR-047 submission/activation requirement stages.
- SR-048 not-applicable handling.
- SR-049 expiry/renewal.
- SR-050 ruleset versioning.

### SR-07 — Documents
- SR-051 private BLOB reuse.
- SR-052 upload progress/retry.
- SR-053 preview/replacement.
- SR-054 size/type/signature validation.
- SR-055 malware scanning/quarantine.
- SR-056 private downloads/ownership.
- SR-057 admin verification/rejection.
- SR-058 access audit.
- SR-059 retention/deletion.
- SR-060 partial upload recovery.

### SR-08 — Admin
- SR-061 review queue.
- SR-062 profile/location details.
- SR-063 document preview/verification.
- SR-064 correction requests.
- SR-065 approval/rejection.
- SR-066 service-area exception review.
- SR-067 audit history.
- SR-068 activation gates.

### SR-09 — Seller tracking
- SR-069 status page.
- SR-070 document status.
- SR-071 correction reasons.
- SR-072 correction/resubmission.
- SR-073 email notifications.
- SR-074 SMS/WhatsApp where configured.
- SR-075 expiry reminders.

### SR-10 — Testing/release
- SR-076 backend unit/integration tests.
- SR-077 frontend tests.
- SR-078 Playwright registration journeys.
- SR-079 buyer-to-seller linking.
- SR-080 radius boundary/invalid coordinate tests.
- SR-081 compliance applicability tests.
- SR-082 document security/recovery tests.
- SR-083 admin approval/activation tests.
- SR-084 three-language/mobile tests.
- SR-085 staging migration/rollback verification.
- SR-086 controlled pilot/monitoring.

## 14. Release-blocking acceptance tests

1. New seller completes registration.
2. Existing buyer becomes seller without duplicate account.
3. Draft resumes after refresh, logout and a later session.
4. Seller inside the configured radius can proceed.
5. Seller outside the radius is rejected by backend validation.
6. Admin radius change is applied to subsequent validation and audited.
7. Non-food seller is not asked for FSSAI evidence.
8. Applicable food seller cannot activate without verified required evidence.
9. GST applicability does not blanket-reject unregistered sellers.
10. Invalid, oversized or malformed files are rejected.
11. Failed uploads can be retried/replaced.
12. Seller cannot access another seller's documents.
13. Non-admin cannot verify documents or approve applications.
14. Rejected evidence can be replaced and resubmitted.
15. Seller cannot sell before manual approval and applicable compliance checks.
16. English, Punjabi and Hindi cover the complete journey.
17. Registration works on supported mobile viewport sizes.
18. Duplicate submissions and concurrent review actions are safely handled.
19. Grocery delivery radius remains unchanged by seller radius settings.
20. Migration and rollback procedures are verified on staging before rollout.

## 15. Definition of done

The redesign is complete only when:
- New journey is deployed and verified on staging.
- Existing seller and buyer accounts remain functional.
- Drafts persist and resume correctly.
- Backend enforces service-area and compliance rules.
- Document workflow is private, recoverable and security-reviewed.
- Admins can review, correct, approve and reject applications.
- Seller can track application status.
- All P0 automated tests pass.
- Database migration and rollback are verified.
- Controlled pilot results and known limitations are documented.

## 16. Legal and operational review

Before real seller onboarding, obtain qualified review of seller agreement, marketplace disclosures, GST/FSSAI applicability, privacy/DPDP notices, document retention, grievance handling and contracting entity. This document specifies engineering behaviour and is not legal advice.
