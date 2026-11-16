# Seller onboarding, CRM and compliance workflow

> Current implementation checkpoint: 17 November 2026. See [Implementation Baseline — November 2026](IMPLEMENTATION-BASELINE-2026-11.md) for the wider product, security and release context.

## Lifecycle

1. Seller lead is created and contact verification is completed through the configured OTP flow.
2. A verified lead is linked to the seller application; the verified email/mobile identity cannot be silently changed in a lead-linked application.
3. Seller completes the four-step application with shop/business identity, location, conditional compliance information, operating hours, shop photo and agreement acceptance.
4. Seller or Admin CRM uploads applicable documents. Seller continuation is provided through a one-time token; the token is cryptographically hashed at rest and expires after 30 days.
5. Documents are checked for allowed type/size/signature and malware-scanned.
6. Admin reviews application, documents and audit history; correction/rejection reasons are returned through the application workflow.
7. Admin approval activates the seller. Pending/rejected sellers must not publish or fulfil live orders.

## Current registration and CRM behavior

- Contact: full name, email and mobile, with contact verification in the lead/application flow.
- Business: shop name/category, constitution and registered legal name where requested by the application.
- Shop: shop number, ward, street/locality, PIN, map coordinates/address and optional landmark according to the current form.
- Operations: opening/closing times and weekly closed day.
- Agreement: seller personally accepts the terms in the continuation flow; preserve the accepted version/evidence.
- Admin CRM: assisted application creation/editing, assignment, continuation link, document review, correction status and application audit history.
- Seller wizard: four steps; the service-area availability gate belongs to the shop-location step, not the initial contact step.

## Conditional compliance

- GSTIN is optional where the seller is not legally required to register. Format validation is not government verification.
- FSSAI applies to relevant food businesses/activities as required by law; it is not a blanket requirement for every seller.
- PR #365 adds admin-configured GST applicability and FSSAI-required seller categories, and seller registration enforces those configured requirements. Correctness depends on legally reviewed configuration; category keyword matching or a form-level check is not a legal determination.
- Trade/shop licence, Udyam and other registrations depend on business type, activity and applicable rules.
- Do not collect Aadhaar or sensitive identity data without documented lawful basis and secure handling.
- Minimum-age/minor policy is configurable metadata only. No DOB/age-assurance or verifiable parental-consent workflow is implemented; minors must remain disabled.

## Document storage, scanning and access

- Seller documents are stored privately in Oracle BLOB storage; they must not be exposed through public URLs.
- Allowed uploads: PDF/JPEG/PNG, maximum 5 MB, with content-type and file-signature checks.
- New uploads are quarantined until malware scanning reports CLEAN. Scanner absence, timeout, protocol error, infection or indeterminate response leaves the document unavailable (fail closed).
- Only clean documents may be downloaded or verified by Admin. Responses should retain safe content-disposition and nosniff protections.
- Seller can upload corrections/resubmissions; previous document records remain as history. Do not assume old files are automatically deleted or superseded under a retention policy.
- Admin CRM supports assignment, document verification/rejection with reason, clean-file download and application audit-history viewing.
- File size/type/signature checks and malware scanning do not prove document authenticity or legal sufficiency. Oracle encryption at rest and transport TLS do not equal application-layer document encryption.

## Approval checklist

- Shop-front photo present and reviewed.
- GST evidence reviewed when GST registration is supplied/required.
- FSSAI evidence reviewed when required for the seller's food activity.
- Business/shop profile complete and no unresolved review flags.
- Agreement version and acceptance evidence retained.
- Reviewer identity, timestamp, decision and reason recorded.

## Known gaps / acceptance criteria

- [x] Admin CRM supports assisted seller application, seller continuation and review workflow.
- [x] Verified lead is linked to the application; verified contact identity is protected from silent changes.
- [x] Document type/size/signature validation and fail-closed malware quarantine.
- [x] Admin document review, correction/rejection and application audit-history workflow.
- [x] Configurable GST/FSSAI requirements enforced during seller registration (legal correctness of configuration remains a human/professional responsibility).
- [ ] Append-only document-level audit history for every upload, view, download, scan, verify, reject and delete action; application audit history is not necessarily a complete document access log.
- [ ] FSSAI expiry capture/revalidation and blocking behavior where legally required.
- [ ] Centrally maintained, legally reviewed category-to-compliance mapping; avoid relying on free-text heuristics.
- [ ] Formal document supersession/deletion and retention lifecycle.
- [ ] Decide application-layer encryption/key rotation from threat model.
- [ ] Retention, deletion, access revocation, backup expiry and incident-response evidence.
- [ ] Oracle BLOB round-trip and full authenticated seller-to-admin CRM lifecycle verified on the designated staging database.
- [ ] Complete role/record-owner negative tests and transactional E2E for correction, resubmission, approval and rejection.

## Legal review

Indian counsel/accounting professionals should review seller agreement, marketplace disclosures, GST/FSSAI applicability, consumer grievance/refund process, privacy/DPDP obligations, retention and contracting entity before public onboarding. This is an engineering workflow, not legal advice or a legal-compliance certificate.
