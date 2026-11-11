# Seller onboarding and compliance workflow

> **Target redesign:** The approved future-state registration experience, 5 km proposed configurable seller radius, English/Punjabi/Hindi support, conditional document rules, API proposal, 86-ticket backlog and release gates are documented in [SELLER-REGISTRATION-REDESIGN.md](SELLER-REGISTRATION-REDESIGN.md). That document is a target specification, not a statement that the redesign is implemented.

## Lifecycle

1. Seller submits OTP-verified identity and shop/business profile.
2. Seller provides shop location/map pin and mandatory shop-front photo.
3. Seller supplies applicable compliance details/documents.
4. Seller accepts the versioned seller agreement/marketplace terms.
5. Documents are uploaded to private Oracle BLOB storage.
6. Admin reviews seller profile and verifies applicable documents.
7. Admin approval activates the seller. Pending/rejected sellers must not publish or fulfil live orders.

## Current registration fields

- Contact: full name, email, mobile.
- Business: shop name/category, constitution (individual, proprietorship, partnership, company/LLP), registered legal name.
- Shop: shop number, ward, street/locality, PIN, map coordinates/address and optional landmark.
- Operations: opening/closing times and weekly closed day.
- Agreement: accepted flag and version.
- Documents: shop-front photo; GST certificate when GSTIN is supplied; FSSAI certificate for applicable food businesses.

Schema/DTO fields may exceed the UI. Do not assume FSSAI expiry, interior photo, trade licence or Udyam certificate are collected end-to-end until verified in the frontend workflow.

## Conditional compliance

- GSTIN is optional where the seller is not legally required to register. Format validation is not government verification.
- FSSAI applies to relevant food businesses/activities as required by law; it is not a blanket requirement for every seller. Current category keyword matching is a known heuristic and should be replaced by a centrally maintained applicability mapping with legal review.
- Trade/shop licence, Udyam and other registrations depend on business type, activity and applicable rules.
- Do not collect Aadhaar or sensitive identity data without documented lawful basis and secure handling.

## Document storage and access

- Flyway V22.1 creates seller compliance/document schema and Oracle BLOB content storage; V26 adds malware scan state and quarantines pre-existing rows pending scan.
- `POST /sellers/me/documents` and `GET /sellers/me/documents` require an authenticated SELLER-scoped session and resolve the seller from the authenticated account. Uploads accept the configured document types, up to 5 MB, PDF/JPEG/PNG content types, and matching file signatures.
- New bytes are first persisted with `QUARANTINED` scan status. ClamAV must return `CLEAN` before the document is available for admin download or verification. Scanner absence, timeout, protocol error, infection or indeterminate response leaves the document unavailable. Upload returns `202 Accepted` while quarantined and `201 Created` after a clean scan.
- Sellers can list their own metadata and upload another document of the same type through the Seller portal correction flow. There is no destructive replacement/delete endpoint; prior uploads remain stored until an owner-approved retention/deletion policy is implemented.
- Admin APIs and UI support listing seller documents, downloading clean documents, rescanning quarantined documents, and verifying/rejecting clean documents with a rejection reason. These actions require ADMIN access. The current row stores reviewer/status timestamps and reason, but this is not an append-only audit history.
- File size/type/signature checks complement malware scanning; they do not establish that a document is genuine or legally sufficient. Oracle encryption at rest and transport TLS do not equal application-layer encryption.

## Approval checklist

- Shop-front photo present and verified.
- GST certificate verified when GSTIN is supplied.
- FSSAI evidence verified when required for the seller's food activity.
- Business/shop profile complete and no unresolved review flags.
- Agreement version and acceptance evidence retained.
- Reviewer identity, timestamp, decision and reason recorded; prefer stable internal reviewer IDs.

## Known gaps / acceptance criteria

- [x] Admin UI/API to inspect seller document metadata, download clean documents, rescan and verify/reject with a reason. Source: `AdminPortal.tsx`, `SellerDocumentController`, and `SellerDocumentControllerTest`.
- [ ] Append-only audit history for upload, view, download, scan, verify, reject and delete; current document row fields are not a full audit log.
- [ ] FSSAI expiry captured and validated where applicable; expired evidence blocks approval where required.
- [ ] Explicit category-to-compliance mapping replaces free-text keyword matching.
- [ ] Agreement acceptance timestamp/version captured consistently; IP only if legally justified and covered by privacy notice/retention.
- [x] Seller retry/resume after OTP account creation when initial document upload fails. Source: `SellerRegistrationWizard.tsx` retry screen and `SellerPortal.tsx` correction upload action.
- [ ] A formal replacement lifecycle that marks superseded documents, prevents stale documents from satisfying approval, and deletes them only under an owner-approved retention policy. Current re-upload is additive.
- [x] Malware scanning and quarantine before review/download/verification; scanner failures fail closed. Source: `SellerDocumentController`, `ClamAvMalwareScanner`, and `SellerDocumentControllerTest` scanner-unavailable and quarantine access tests.
- [ ] Decide application-layer encryption/key rotation from threat model.
- [ ] Retention, deletion, access revocation and incident-response policy.
- [ ] Expand tests for cross-seller ownership isolation, admin-only operations, signature/size/type boundaries, approval gating, and Oracle BLOB round-trip. Current controller tests cover principal/role checks, scanner failure, quarantine restrictions, file signature validation, rejection reason, and verification flow; Oracle persistence is not runtime-verified here.
- [ ] Confirm V22.1/V26 and end-to-end API behavior on the intended Oracle schema; source migrations do not prove they were applied to the runtime database.

## Legal review

Indian counsel/accounting professionals should review seller agreement, marketplace disclosures, GST/FSSAI applicability, consumer grievance/refund process, privacy/DPDP obligations, retention and contracting entity before public onboarding. This is an engineering workflow, not legal advice.
