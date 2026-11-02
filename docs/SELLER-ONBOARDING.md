# Seller onboarding and compliance workflow

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

- Flyway V14 creates seller compliance/document schema, including Oracle BLOB content storage.
- Seller-authenticated upload/list operations are scoped to the current seller.
- Seller metadata listing exists; seller download/replacement behavior requires explicit product/API confirmation.
- Admin review/download/verification is role-restricted; confirm exact controller mappings and permission tests before release.
- File size/type/signature checks and format allowlisting do not replace malware scanning.
- Oracle encryption at rest and transport TLS do not equal application-layer encryption. Malware scanning, audit and retention policy remain gaps.

## Approval checklist

- Shop-front photo present and verified.
- GST certificate verified when GSTIN is supplied.
- FSSAI evidence verified when required for the seller's food activity.
- Business/shop profile complete and no unresolved review flags.
- Agreement version and acceptance evidence retained.
- Reviewer identity, timestamp, decision and reason recorded; prefer stable internal reviewer IDs.

## Known gaps / acceptance criteria

- [ ] Admin UI to inspect profile, preview/download documents, verify/reject with reason and view audit history.
- [ ] FSSAI expiry captured and validated where applicable; expired evidence blocks approval where required.
- [ ] Explicit category-to-compliance mapping replaces free-text keyword matching.
- [ ] Agreement acceptance timestamp/version captured consistently; IP only if legally justified and covered by privacy notice/retention.
- [ ] Seller retry/resume flow after OTP account creation if document upload fails.
- [ ] Seller can view upload status and replace invalid/expired evidence through controlled workflow.
- [ ] Malware scanning/quarantine before review.
- [ ] Decide application-layer encryption/key rotation from threat model.
- [ ] Audit log for upload, view, download, verify, reject and delete.
- [ ] Retention, deletion, access revocation and incident-response policy.
- [ ] Tests for ownership isolation, admin-only operations, signature, size, invalid type, malformed expiry, approval gating and BLOB round-trip.
- [ ] Confirm V14 and end-to-end API behavior on intended Oracle schema.

## Legal review

Indian counsel/accounting professionals should review seller agreement, marketplace disclosures, GST/FSSAI applicability, consumer grievance/refund process, privacy/DPDP obligations, retention and contracting entity before public onboarding. This is an engineering workflow, not legal advice.
