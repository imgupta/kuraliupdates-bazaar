# Mandatory PR Governance — India Compliance, Data, Security and Product Quality

**Status:** Mandatory for every pull request, including documentation-only, dependency, configuration, infrastructure and emergency changes.  
**Owner:** Repository maintainers.  
**Applies from:** Adoption PR merge onward.  
**Companion standard:** [Engineering Operating Standard](ENGINEERING-OPERATING-STANDARD.md).

## 1. Non-negotiable PR rule

Every PR must complete the applicable sections of this standard. A PR must not be raised as review-ready until the author has:
- Read `AGENTS.md`, the Engineering Operating Standard, this document, [Current State](CURRENT-STATE.md), [Continuation](CHATGPT-CONTINUATION.md), and relevant domain/security/data/legal documents.
- Identified the exact base/head commit and inspected the actual diff and impacted user journeys.
- Assessed India central, state, local and regulator requirements relevant to the change; separated in-force requirements from notified future commencement, draft/proposed and announced changes.
- Assessed personal/business data lifecycle and hosting/vendor implications.
- Assessed security, fraud, consumer/seller/provider rights, payments, tax, labour, accessibility and operational failure modes as relevant.
- Recorded risks, severity, containment, durable remediation, accountable owner and verification evidence.
- Included tests and source-backed evidence appropriate to the change; clearly marked anything not verified.

A reviewer should return a PR for completion if material applicable sections are blank, unsupported, or merely say “not applicable” without a reason. Emergency exceptions must state the reason, temporary controls, owner and expiry/remediation date.

## 2. Hosting and data residency decision

**Production target: India.** Production application compute, primary databases and production data storage must be hosted in India before launch, subject to provider capabilities, contractual terms, legal review and verified configuration. **Development/staging may continue using the currently configured regions** (including Singapore) when clearly identified, access-controlled, documented and populated only with synthetic/minimized or otherwise specifically approved data.

This is a target decision, not evidence of current residency. Read-only Render service inspection on 3 Nov 2026 verified the backend web service region as **Singapore**. The frontend is a Render static site served through a CDN; its service details expose no single deployment region, so treat delivery as globally distributed and verify cache/data-flow behavior. Oracle database, replicas, backups and other vendors remain **unknown/unverified**. The current backend is therefore not India-hosted. Never claim that staging, current production, backups, logs, object storage, email/SMS vendors, support tooling, telemetry or disaster-recovery copies are India-hosted based only on an account setting or marketing statement.

For every environment and vendor, record:
- Provider, service, account/project, environment and resource.
- Region/location for compute, primary DB, replicas, object/document storage, backups, logs, CDN/cache, telemetry and disaster recovery.
- Data categories and whether personal, sensitive, financial, identity, seller, worker or customer content is processed.
- Provider/subprocessor, support/admin access locations, cross-border access/transfer, contractual safeguards and retention.
- Encryption in transit/at rest, key ownership/rotation, access model, audit logging, deletion and backup expiry.
- Evidence: provider console/export, contract/DPA, official provider documentation or support confirmation, timestamp and verifier.

**India production gate:** Before production launch, move production application compute and primary data storage to verified India locations or select a provider that supports the target. The current Render backend is Singapore; the Render region options inspected did not include India. Do not assume a simple in-place region change is available. Verify all production resource locations and data flows against the approved India target. Any unavoidable non-India processing, support access, CDN/logging/backup flow or vendor transfer must be explicitly documented, legally assessed, risk-accepted by the owner and supported by appropriate safeguards. Do not assume India region alone satisfies every legal obligation or that all data must be localized under every law.

Development/staging may use a different region from production and may retain the existing provider region configuration; do not migrate it to India solely to satisfy the production target. Record region, purpose, access and vendors. Use synthetic/minimized data by default; never copy real customer/seller/worker data into a non-approved environment. Before production launch, independently verify India residency for all production resources and assess any CDN, support, telemetry or subprocessor flows.

## 3. Indian legal and regulatory assessment

Assess applicability based on the actual business model, entity, activity, geography, fund flow, data and feature. Include central, Punjab/state and local requirements where relevant, for example:
- DPDP Act 2023 and DPDP Rules 2025, phased commencement, notices, purposes, consent/other permitted grounds, rights, processors, security safeguards, breach response, retention/deletion and children where relevant.
- Consumer Protection Act 2019, Consumer Protection (E-Commerce) Rules 2020 and amendments, Dark Patterns Guidelines 2023, advertising/endorsement requirements, grievance handling, marketplace disclosures, ranking/sponsored listings, pricing/fees, returns/refunds and seller information.
- CERT-In directions and applicable incident reporting, log retention, time synchronization and evidence preservation.
- Payment and settlement rules, PSS Act/RBI directions, PA/PG boundary, bank terms and actual funds flow.
- GST (including TCS/section 9(5)/registration and invoicing where applicable), income-tax/TDS and accounting.
- FSSAI and food safety/traceability/recall requirements; Legal Metrology and packaged commodity declarations.
- Social Security Code/gig-platform worker provisions, applicable rules/schemes, worker classification, safety and insurance.
- Companies Act/MCA, contracts, IP, consumer grievance, Shops & Establishments, municipal/trade and other Punjab/local licences where applicable.

For each legal item state:
1. Status: in force now / enacted but not commenced / notified with future effective date / draft or proposed / announced only / applicability uncertain.
2. Exact provision/notification and publication/effective date.
3. Official primary source link and date checked.
4. Feature/business process affected and owner.
5. Required product, policy, operational and evidence control.
6. Counsel/CA/CS/insurer/bank/provider confirmation needed.

Do not convert a press announcement, draft, consultation or proposed rule into current law. Track future effective dates and create readiness work before commencement. Re-check primary official sources at PR time for material legal changes; this register is not a substitute for legal advice.

## 4. Data governance and privacy review

For each changed or newly collected data element, document:
- Data subject and category; source and collection point.
- Specific purpose and necessity/minimization; notice and lawful basis/consent where applicable.
- Controller/fiduciary and processor/vendor responsibilities.
- Storage location, access roles, service-to-service access and cross-border flows.
- Encryption, key custody, redaction, audit trail and breach detection.
- Retention schedule, legal hold, deletion workflow and backup expiry.
- Data-subject request, correction, grievance and account closure effects.
- Whether data appears in logs, analytics, support tickets, exports, backups, search indexes or third-party tools.

Do not collect excess identity, location, health, financial or document data “just in case”. Do not log OTPs, passwords, tokens, full payment credentials, private documents or unnecessary personal data. Ensure deletion and retention behavior includes derived copies and vendor systems where applicable.

## 5. Security, trust and operational risk

Threat-model relevant assets, actors, trust boundaries and abuse cases. At minimum consider authentication/session, authorization and record ownership, IDOR, admin privilege, OTP brute force/replay, rate limits, injection, mass assignment, upload malware, secrets, payment/refund fraud, seller/provider impersonation, location privacy, webhook authenticity, concurrency/idempotency, dependency/supply-chain vulnerabilities, backup/restore and incident response.

Every material risk must have:
- Severity (Critical/High/Medium/Low) and likelihood/impact rationale.
- Exploit/failure scenario and affected users/business data.
- Immediate containment and durable fix.
- Accountable owner and target date.
- Verification test/evidence and residual risk/acceptance.

A contract, checkbox, client-side guard or UI-hidden control is not a substitute for server-side authorization or required operational control.

## 6. Seller-first and customer product-quality review

Consider whether the change improves or harms trust, accessibility and local-business usability:
- Clear seller onboarding, document status, reasons for rejection, save/resume and human support.
- Transparent fees, commissions, ranking, sponsored content, order ownership, cancellation/refund and dispute evidence.
- Fair and understandable customer pricing, availability, delivery promises and product information.
- Punjabi/Hindi/English usability where relevant; mobile-first, low-bandwidth, low-end device and accessible interaction.
- Clear consent, grievance and contact routes; avoid dark patterns and coercive defaults.
- Resilient retry, offline/poor-network, duplicate-submit and partial-failure behavior.
- Admin auditability without unnecessary access to private data.

State at least one concrete improvement considered, or explain why none is relevant to this PR.

## 7. Mandatory PR description template

Every PR description must include:

### Scope and traceability
- Problem/user journey:
- Base SHA / head SHA:
- Domains, portals, routes, APIs, tables and vendors affected:
- Explicit non-goals and unchanged business decisions:

### India law and regulatory status
- Applicable provisions / official sources / checked date:
- Current vs future-effective vs draft/proposed:
- Counsel/CA/CS/bank/provider confirmation required:

### Data and hosting
- Data collected/changed and purpose:
- Environment/provider/resource regions (verified or unknown):
- Data flows, subprocessors and cross-border access:
- Security, retention, deletion, backup and evidence:

### Security and operational risk
- Threat/abuse/failure cases:
- Severity, containment, durable fix, owner and due date:
- Incident/rollback/recovery plan:

### Product and rights
- Customer/seller/provider impact:
- Fees, payment/refund, grievance and transparency impact:
- Accessibility/local-language/low-bandwidth review:
- Product or operational improvement considered:\n\n### Documentation and developer handoff\n- Canonical docs updated (paths):\n- UI labels/routes/components/states documented (if applicable):\n- API/data/architecture/integration diagrams updated (if applicable):\n- Implemented vs planned vs unverified clearly distinguished:

### Verification
- Tests executed and exact commands/results:
- CI run and exact SHA:
- Manual/API/browser evidence:
- Migration/deployment/runtime status (do not infer):
- Known gaps, skipped tests and residual risk:

### Release decision
- Ready / blocked / exception requested:
- Required approvals and evidence:
- Rollback or forward-fix plan:

## 8. Documentation and developer handoff gate\n\nEvery code-changing PR must update the relevant canonical documentation in the same PR, following [Codebase Documentation Standard](CODEBASE-DOCUMENTATION-STANDARD.md). UI changes must record exact screen/route/component, labels, layout, field rules, interactions and responsive/accessibility states. API changes must record method/path, DTO, authorization/ownership, service flow, persistence, transaction and error contract. Data/integration/architecture changes must update ownership, ERD/flow/deployment/security views as relevant. Distinguish implemented, test-verified, runtime-verified, planned and unknown. Markdown in Git is canonical; Word/PDF/PPT are generated on demand from the current source and must include commit/date/evidence.\n\n## 9. Review and merge gate

Reviewers must check that the PR template is complete and consistent with the diff. Block merge for:
- Unresolved Critical/High security or privacy risk without approved containment and owner.
- Unapproved change to payment destination/fund custody/refund, identity, roles, data residency, production hosting, secrets or runtime topology.
- Missing migration ownership/rollback or unsafe destructive data change.
- Unsupported legal claims or unverified residency claims.
- Missing authorization/ownership tests for sensitive endpoints.
- Unclear handling of personal data, private seller documents or worker/customer records.
- Claims of tests, CI, deployment, migration or runtime success without evidence tied to the exact SHA.
- Failure to update relevant documentation.

A PR checklist is evidence of review, not legal certification. Qualified Indian counsel, CA/CS, labour specialists, insurer and regulated providers must confirm matters within their expertise. No process can guarantee zero loopholes; the objective is continuous identification, prioritization and verified remediation.
