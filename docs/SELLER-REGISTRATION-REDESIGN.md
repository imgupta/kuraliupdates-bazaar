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


---

# 17. Assisted merchant registration and onboarding CRM (approved extension)

**Added:** 2 November 2026  
**Purpose:** Extend the seller wizard into an assisted, trackable merchant-acquisition and onboarding journey. This section supersedes earlier assumptions that one email OTP at final submission is sufficient. It is a target specification; it does not claim these additions are implemented.

## 17.1 Product decisions

1. Seller registration must always provide clear navigation to the public KuraliUpdates home page, Buyer Login, and existing Seller Login.
2. Email and mobile must both be verified at the beginning of registration, before the applicant proceeds to business details.
3. Successful contact verification creates or resumes a **seller application/lead**, not an approved seller account.
4. Admin users with the appropriate onboarding permission can see a verified prospective merchant as soon as the contact-verification stage is complete, even if the form is incomplete.
5. A merchant can request a callback instead of completing the form unaided. Callback requests must verify the mobile number and record contact consent.
6. Admins can assign leads, call the merchant using the verified number, record outcomes/notes and schedule follow-up.
7. Applicants can save and resume their application. Drafts must never contain OTPs, session tokens or uploaded file bytes.
8. Final seller activation remains a separate, privileged action after profile, applicable documents and manual checks pass.
9. Lead follow-up state and compliance/document state are separate dimensions. A call outcome must never approve a seller or bypass compliance checks.

## 17.2 Entry and exit navigation

The seller-registration entry screen must show:
- **Start seller registration**
- **Request a callback**
- **Already a buyer? Go to Buyer Login**
- **Back to KuraliUpdates home**
- **Already a seller? Seller Login**

These navigation links remain available throughout the registration flow, including OTP and error states. Leaving the flow must not silently submit or discard a saved draft. If unsaved changes exist, explain whether they have been saved before leaving.

The buyer-login/home route must use the repository's canonical route configuration; do not hardcode a route until Phase 0 verifies the current route names and role-portal redirect behavior.

## 17.3 Revised registration sequence

### Stage 0 — entry
Explain merchant benefits and the steps involved. Offer self-service registration or callback assistance. Provide English, Punjabi and Hindi.

### Stage 1 — contact verification (mandatory before Stage 2)
Collect:
- Owner/authorised representative name
- Email address
- Indian mobile number

Verification sequence:
1. Normalize and validate both identifiers.
2. Check duplicates and existing account linkage without disclosing whether another person owns an identifier.
3. Send email OTP and verify it.
4. Send SMS OTP and verify it.
5. Bind both verification proofs to the exact normalized identifiers, registration purpose, application/session and expiry.
6. Create or resume the application lead and issue the minimum authenticated application session needed to continue.

Do not allow progression to business details until both channels are verified. If the user edits either identifier after verification, invalidate that channel's proof and require re-verification. Email and SMS delivery failures must have clear retry/support paths. Resend cooldowns, expiry, attempt limits, per-identifier/IP throttling and abuse monitoring are required. Never log OTP values.

Existing buyer account:
- Link the seller application to the existing authenticated user; do not create a duplicate user.
- If the applicant is already signed in, still verify any contact channel that is not already verified under an acceptable, unexpired proof policy.
- Do not expose account-existence information through the public duplicate-check response.

### Stage 2 — business identity
Reuse the existing shop name, category, business constitution and conditional legal-name fields. Add an optional indication whether the merchant already operates a physical shop. Do not make unnecessary business descriptions mandatory.

### Stage 3 — shop location
Reuse address, locality, PIN and actual shop map pin. Backend service-area validation remains authoritative. An out-of-area applicant may opt into an **out-of-area interest lead** or request a callback; this does not create seller eligibility or bypass the configured service radius.

### Stage 4 — compliance and documents
Reuse conditional GST/FSSAI logic and private document storage/scanning. Clearly distinguish documents needed to submit from documents needed before activation. Do not ask all sellers for every document. A failed malware scan keeps a document quarantined and unavailable for review/approval until a clean scan is recorded.

### Stage 5 — operations, agreement and review
Reuse operating hours, required shop-front photograph and versioned agreement acceptance. Show a complete review screen with edit links. Record the accepted agreement version and timestamp. Submit idempotently and issue an application reference.

### Stage 6 — confirmation and tracking
Show reference, submission time, application status, outstanding corrections/documents and a support/callback route. Pending sellers must not publish products or accept seller orders.

## 17.4 Callback-assisted route

Callback request fields:
- Name
- Mobile number (OTP verified)
- Shop name (optional at initial contact)
- Locality/area
- Preferred callback time window
- Short optional help request
- Explicit consent to be contacted about the seller application

A callback-only request creates a lead with no seller privileges. It must not create a seller account or allow product/order access. When the merchant proceeds, link the verified callback lead to the seller application using a server-authoritative, auditable operation. Do not let an admin impersonate the applicant or accept legal declarations on their behalf; the merchant must review and accept the final agreement and submit their own declarations.

## 17.5 Admin Merchant Onboarding CRM

Add a dedicated **Merchant Onboarding** area in Admin Portal, separate from the existing seller document-review screen.

Dashboard counts (computed from server-side filtered data):
- New leads
- Callback requested / callback due
- Contact verified
- In progress / abandoned
- Submitted / under review
- Correction required
- Approved / rejected
- Out-of-area interest

Queue filters:
- Application/lead status
- Callback status and due date
- Business category
- Locality/service-area eligibility
- Created/updated date
- Assigned admin/employee
- Contact verification state

List columns:
- Reference ID
- Applicant/owner name
- Shop name (when known)
- Verified email/mobile indicators
- Category and locality (when known)
- Application stage
- Callback/follow-up state
- Assigned owner
- Last activity and next follow-up

Application detail:
- Contact and verification metadata (never OTP values)
- Business/shop profile and submitted answers
- Shop location and service-area result
- Document metadata, malware-scan state and verification state
- Agreement version/acceptance timestamp
- Callback preference and contact consent
- Assignment, internal notes and activity timeline
- Current application and separate follow-up states

Admin actions:
- Assign/reassign lead to an authorised onboarding operator.
- Call verified mobile using a tel: action where supported; do not claim calls are automatically recorded.
- Record call attempt, connected, no answer, callback requested, assistance provided, not interested, invalid contact or other controlled outcome.
- Add internal note and next-follow-up date/time.
- Mark callback complete or reschedule.
- Send an approved contact message only through a configured provider and consented channel.
- Open the applicant's current stage for guidance without impersonating the applicant.
- Review documents, request corrections, approve or reject only through existing privileged review controls.

Use role/permission checks on every API. Separate onboarding-agent permissions (view permitted lead fields, assign, call outcome, notes) from compliance-review/approval permissions. Mask contact fields for roles that do not need full access. Audit views/downloads of sensitive documents and all state/assignment/decision changes. Internal notes must not be visible to applicants.

## 17.6 State model — keep dimensions separate

### Application state
DRAFT → CONTACT_VERIFIED → IN_PROGRESS → SUBMITTED → UNDER_REVIEW

From UNDER_REVIEW:
- ACTION_REQUIRED → applicant corrects details/evidence → SUBMITTED
- APPROVED only after all activation requirements pass and an authorised reviewer approves
- REJECTED with reason and resubmission policy

Other non-approval outcomes:
- WITHDRAWN
- EXPIRED for abandoned leads under a documented retention policy
- OUT_OF_AREA_INTEREST as an eligibility outcome/flag, not an approval state

### Follow-up state (independent)
NOT_REQUESTED, CALLBACK_REQUESTED, CALLBACK_DUE, CALL_ATTEMPTED, CONNECTED, FOLLOW_UP_SCHEDULED, COMPLETED, NO_LONGER_INTERESTED.

### Document state (independent)
Retain scan state (QUARANTINED, CLEAN, INFECTED, SCAN_FAILED) separately from reviewer state (PENDING, VERIFIED, REJECTED). A document is reviewable only after a clean scan. Do not collapse scanner and human-review states into one field.

Every transition records actor, timestamp, previous/new state and reason where applicable. Enforce allowed transitions and approval gates in backend services, not only in UI controls.

## 17.7 Proposed API additions

Routes below are proposals; Phase 0 must reconcile them with existing /auth, /sellers, OTP, draft and admin conventions before coding. Do not create parallel APIs where an existing endpoint can be safely extended.

| Method | Proposed route | Purpose |
|---|---|---|
| POST | /seller-onboarding/contact/start | Start/resume contact verification |
| POST | /seller-onboarding/contact/verify-email | Verify email OTP |
| POST | /seller-onboarding/contact/verify-mobile | Verify SMS OTP |
| POST | /seller-onboarding/callback | Create callback lead after mobile verification and consent |
| GET | /seller-onboarding/me | Get current applicant's lead/application |
| PUT | /seller-onboarding/me/draft | Save permitted non-secret draft fields |
| POST | /seller-onboarding/me/submit | Submit application idempotently |
| GET | /admin/merchant-onboarding | Filter/paginate lead and application queue |
| GET | /admin/merchant-onboarding/{id} | Read authorised detail and timeline |
| PATCH | /admin/merchant-onboarding/{id}/assignment | Assign/reassign operator |
| POST | /admin/merchant-onboarding/{id}/activities | Add call outcome/note/follow-up |
| POST | /admin/merchant-onboarding/{id}/contact | Trigger approved configured contact message |
| POST | /admin/merchant-onboarding/{id}/review | Request correction/approve/reject under reviewer permission |

The exact request/response DTOs, idempotency keys, error codes and pagination contract are implementation deliverables. Derive applicant identity from authenticated server-side context. Do not trust user IDs, roles, application status or reviewer identity from request payloads.

## 17.8 Data model additions — discovery before migration

Reuse existing SELLER_REGISTRATION_DRAFTS, user identity, seller profile, seller document and audit structures where appropriate. Do not create duplicate identity records.

Evaluate the smallest safe model, likely:
- SELLER_ONBOARDING_APPLICATION: stable reference, applicant/user link where one exists, normalized contact references, business/profile fields, application state, eligibility outcome, agreement evidence and timestamps.
- SELLER_ONBOARDING_ACTIVITY: append-only lifecycle events, actor, state transition, event type and reason.
- SELLER_ONBOARDING_ASSIGNMENT: current/previous assignment or assignment history.
- SELLER_ONBOARDING_FOLLOWUP: callback preference, due time, outcome and completion.
- SELLER_ONBOARDING_NOTE: access-controlled internal notes.
- Optional contact-verification challenge/proof persistence only if existing OTP service cannot safely bind both channels to an application; never store plaintext OTPs.

Use Oracle-compatible types, constraints and indexes. Avoid storing redundant copies of email/mobile if a stable user/contact reference suffices. Define retention, deletion/anonymisation and audit access before collecting leads. Select a new Flyway version only after inspecting the deployed history; never edit applied migrations.

## 17.9 Privacy, security and abuse controls

- Explicit consent for application-related callback/contact, with timestamp, notice version and channel scope.
- Purpose limitation: use lead data for seller onboarding, not unrelated marketing without separate consent.
- Collect only fields required for onboarding; avoid Aadhaar and other sensitive IDs unless counsel confirms lawful necessity and controls.
- Protect public duplicate checks against account enumeration.
- OTPs are short-lived, single-purpose, rate-limited and never logged or stored in plaintext.
- Prevent OTP replay, cross-application/channel reuse and identifier-change bypass.
- Restrict CRM and notes to least-privilege admin roles; audit contact/document access.
- Validate all state transitions and ownership server-side.
- Use pagination and server-side filters; never load all leads into the browser.
- Define retention/expiry for abandoned and callback-only leads, and provide a deletion/withdrawal process consistent with legal obligations.
- Do not automatically send SMS/WhatsApp/call unless provider configuration, consent and delivery handling are verified.
- No admin impersonation or acceptance of seller declarations on the merchant's behalf.

## 17.10 Delivery plan and implementation order

### Phase 0 — repository and product discovery (first)
- [ ] Inspect canonical buyer home/login and seller login routes in combined app and role portals.
- [ ] Trace current seller wizard, legacy auth wrapper, AppContext registration and login behavior.
- [ ] Trace sendOtp, verifyOtp, checkRegistration, OTP purposes/channels, expiry, resend and rate limits.
- [ ] Verify whether SMS OTP delivery is configured and operational in the designated staging environment; do not assume email provider implies SMS support.
- [ ] Inspect existing user phone verification semantics and whether existing verified phone claims are trustworthy/current.
- [ ] Trace seller registration draft V25 and authenticated resume behavior.
- [ ] Trace seller profile creation, seller document upload, ClamAV scan gates and approval endpoint.
- [ ] Inspect admin route permissions and existing seller queue/document review components.
- [ ] Inspect Oracle schema/Flyway history and decide whether a dedicated onboarding application table is necessary.
- [ ] Record existing endpoint contracts and backward compatibility requirements.
- **Exit:** reviewed route/API/schema map, SMS provider/config readiness, data-retention/consent decisions and migration proposal.

### Phase 1 — registration entry and contact verification
- [ ] Add persistent Home, Buyer Login and Seller Login navigation.
- [ ] Implement email OTP and SMS OTP verification before business details.
- [ ] Bind verified channels to the same applicant/application and invalidate proof on identifier change.
- [ ] Link existing buyer identity without duplicate account creation.
- [ ] Add callback-request entry with mobile verification and explicit consent.
- [ ] Add unit/API tests for OTP expiry, replay, rate limits, identifier changes and duplicate identity.
- **Exit:** applicant cannot enter Stage 2 without both channels verified; buyer routes remain functional.

### Phase 2 — lead/application persistence and draft recovery
- [ ] Implement or adapt server-side application/lead record.
- [ ] Create visible lead at contact verification; callback lead at verified callback request.
- [ ] Autosave permitted fields and restore across refresh/session.
- [ ] Keep OTP/token/file bytes out of drafts and logs.
- [ ] Implement idempotent create/submit and safe duplicate detection.
- [ ] Add out-of-area interest handling without bypassing radius eligibility.
- **Exit:** verified applicant is visible to admin before completing the form; draft safely resumes.

### Phase 3 — admin Merchant Onboarding CRM
- [ ] Add permission-scoped, paginated queue and dashboard counts.
- [ ] Add detail panel, verification indicators, profile/location/document status.
- [ ] Add assignment, callback outcome, internal notes and next follow-up.
- [ ] Add call action using verified number; no claim of automatic call recording.
- [ ] Keep sales follow-up separate from compliance review/approval.
- [ ] Add audit events and access tests.
- **Exit:** admin can identify, contact, assist and track a lead without changing seller approval state.

### Phase 4 — application completion, compliance and notifications
- [ ] Refine existing five-step wizard and autosave.
- [ ] Add status tracker and correction/resubmission path.
- [ ] Preserve clean-scan-before-review and mandatory-document approval gates.
- [ ] Add applicant notifications only for configured, consented channels.
- [ ] Add explicit abandoned-lead retention/expiry policy.
- **Exit:** merchant can complete, correct and track the application end to end.

### Phase 5 — security, E2E and controlled staging pilot
- [ ] Test buyer-to-seller linking and duplicate contact races.
- [ ] Test both OTP channels, expiry/replay/rate limits and identifier changes.
- [ ] Test callback consent, lead creation and CRM permissions.
- [ ] Test admin assignment, notes, call outcomes and audit trail.
- [ ] Test out-of-area lead versus seller eligibility.
- [ ] Test document quarantine, clean scan, correction, resubmission and approval gates.
- [ ] Run Playwright with dedicated synthetic seller/admin identities and isolated staging fixtures.
- [ ] Confirm private ClamAV endpoint is configured and healthy before document lifecycle E2E.
- [ ] Verify Oracle backup/restore and migration rollback plan before applying new migrations.
- [ ] Pilot with a small set of consenting test merchants; do not use real personal documents in automated tests.
- **Exit:** all P0 acceptance tests pass and runtime staging evidence is recorded.

## 17.11 P0 acceptance criteria

1. Seller registration entry always exposes working Home, Buyer Login and Seller Login navigation.
2. A new applicant cannot proceed beyond contact stage until both email and mobile OTP are verified.
3. Verification is bound to the exact identifiers, application and purpose; changing an identifier requires re-verification.
4. OTP expiry, replay, brute-force and resend abuse are blocked and tested.
5. Existing buyer can start seller onboarding without a duplicate user account.
6. Admin can see the verified lead before the merchant completes business details.
7. Callback-only request requires verified mobile and explicit contact consent and creates no seller privileges.
8. Admin can assign a lead, record call outcomes, notes and follow-up date with an audit trail.
9. Onboarding-agent permissions cannot approve sellers or verify compliance documents.
10. Lead follow-up status cannot bypass application/document approval gates.
11. Out-of-area applicants can request contact but cannot become eligible sellers through that route.
12. Draft autosave/resume does not store OTPs, tokens or file bytes.
13. Seller can submit, receive a reference, view status and correct rejected information/documents.
14. A seller cannot publish/accept orders until authorised approval and mandatory compliance checks pass.
15. Applicant navigation to buyer home/login works from every wizard state.
16. Admin queue is paginated, filtered server-side and access-controlled.
17. CRM notes/contact data are not exposed to sellers or unauthorised roles.
18. Automated tests use synthetic identities and isolated staging fixtures only.

## 17.12 Definition of done for this extension

- Entry, buyer escape routes and seller login routes are verified.
- Dual-channel OTP is working in staging with verified SMS delivery configuration.
- Leads and callback requests are persisted with consent and retention metadata.
- Admin CRM supports queue, assignment, calling workflow, notes, follow-up and audit.
- Application and follow-up states are independent.
- Existing seller document scan/review/approval protections remain intact.
- All P0 acceptance criteria pass in automated tests.
- New Oracle migrations are additive, reviewed and applied only to verified isolated staging after backup confirmation.
- Staging UI/API/database behavior is independently verified; a green build alone is not sufficient.
- Rollout, monitoring, retention and support runbooks are documented.
