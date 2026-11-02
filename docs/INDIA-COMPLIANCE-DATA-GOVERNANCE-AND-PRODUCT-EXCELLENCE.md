# India Compliance, Data Governance and Product Excellence Standard

**Status:** Mandatory project-wide governance standard for every product, engineering, operations, security, release and business decision.  
**Owner:** Product/business owner, supported by engineering and qualified Indian legal, tax and compliance professionals.  
**Related standard:** [Engineering Operating Standard](ENGINEERING-OPERATING-STANDARD.md).

## 1. Product mission and decision principle

Build KuraliUpdates into a trusted, accessible, resilient, seller-first Indian marketplace that helps local businesses discover customers, list and sell products, manage orders and grow sustainably. The product must protect buyers, sellers, independent service providers, delivery partners and the platform.

Every proposed change must be assessed from both sides:
- **Compliance and trust:** Is it lawful, transparent, secure, fair, auditable and operationally supportable?
- **Product excellence:** Does it reduce friction, improve seller success, buyer confidence, accessibility, reliability, discoverability or affordability?

Do not optimize growth, conversion or convenience by weakening legal rights, privacy, safety, security, truthful disclosures or financial controls.

## 2. Mandatory assessment for every ask

Before recommending or implementing a feature, fix, workflow, integration, data model, policy, commercial change or release, complete the applicable checks below. Mark each item **verified / not applicable with reason / open / blocked**. Do not silently assume compliance.

1. **Jurisdiction and actors:** Identify the contracting entity, operating locations, users, sellers, providers, delivery partners, employees, vendors and any regulated intermediary/payment role.
2. **Legal applicability:** Identify applicable Indian central legislation, rules, regulations, notifications, state/UT requirements, local licences, regulator directions, court orders and contractual obligations.
3. **Status and dates:** Separate (a) in-force law, (b) enacted/issued but not yet commenced or subject to phased commencement, (c) notified rules/directions with future effective dates, (d) draft/proposed/consultation material, and (e) public announcements or policy intent. Record publication, commencement and transition dates. A proposal is not current law.
4. **Data lifecycle:** Map each data element from collection to use, disclosure, storage, access, retention, archival, deletion and backup expiry.
5. **Security and privacy:** Assess purpose limitation, minimization, notice/consent or other lawful basis as applicable, role-based access, encryption, key custody, auditability, incident response, vendor access, transfers, data-subject requests and children/minor safeguards where relevant.
6. **Commercial fairness:** Assess pricing, commissions, taxes, invoices, seller disclosures, ranking/advertising, cancellation, refunds, complaints, grievance escalation and dispute evidence.
7. **Operational safety:** Assess fraud, abuse, marketplace quality, seller verification, product/service restrictions, delivery/provider safety, insurance, worker classification and support processes.
8. **Technical controls:** Translate each legal/business obligation into an owner, system control, data field, API authorization, audit event, operational procedure and test where applicable.
9. **Product improvement:** Identify at least one meaningful improvement opportunity when one exists; prioritize by user benefit, risk reduction, cost and implementation effort. Do not invent cosmetic work just to fill a section.
10. **Release gate:** Identify evidence required before launch, migration, onboarding, payment change or data processing begins. State what remains unverified.

If a task is narrow and some areas are genuinely unaffected, record why they are not applicable rather than repeating a generic legal checklist.

## 3. India legal and regulatory coverage register

For each workflow, assess applicability—not blanket applicability—of the following domains and any successor/amending instruments:

- Company formation, corporate governance, director duties, records and filings.
- Consumer protection, e-commerce marketplace obligations, unfair trade practices, product/service representations, pricing and grievance redressal.
- Digital personal data protection, privacy notices, consent/lawful processing, data-principal rights, children’s data, processors, security safeguards, breach notification, retention and cross-border processing.
- Information technology and cybersecurity obligations, intermediary/platform obligations where applicable, CERT-In directions and incident/log retention requirements.
- GST, invoicing, e-commerce operator provisions, TCS/TDS and income-tax treatment, accounting, reconciliation and record retention.
- Payments, UPI, payment aggregation/settlement, escrow or nodal arrangements, RBI requirements and bank/acquirer contractual rules. Do not design or describe a flow as compliant merely because funds move directly between accounts; validate the actual fund flow and platform role.
- Food safety, FSSAI licensing/registration, labelling, packaged commodities, Legal Metrology and product-specific licences where applicable.
- Drugs, cosmetics, medical devices, tobacco, alcohol, weapons, hazardous goods and other restricted/prohibited product categories; maintain a product/service policy and escalation process.
- Intellectual property, trademarks, copyright, counterfeit goods, seller content licences and takedown process.
- Employment, wages, social security, occupational safety, contract labour, gig/platform worker and state-specific requirements; assess actual working arrangements, not labels alone.
- Motor vehicle, road safety, delivery operations, insurance, local permits and partner/agent safety.
- Advertising, endorsements, dark-pattern restrictions, ranking/sponsored listings and promotional claims.
- Accessibility, language, consumer communications and applicable state/local trade, Shops and Establishments, municipal and police requirements.

This list is a minimum issue-spotting register, not a legal opinion or assertion that every statute applies to every KuraliUpdates activity.

## 4. Data inventory and storage architecture requirements

Maintain a version-controlled data inventory covering at minimum:
- Identity and authentication data (phone, email, OTP metadata, sessions, role and verification status).
- Buyer, seller, provider and delivery-partner profile data.
- Addresses, geolocation, service areas and live delivery location.
- Seller onboarding, KYC/compliance documents, licences, agreements and review notes.
- Product listings, images, stock, price history and seller catalogue data.
- Carts, orders, order items, bargaining messages/offers, delivery proof and booking/job records.
- Payment references, invoices, refunds, commissions, payouts and reconciliation evidence.
- Customer support, complaints, call-back preferences, CRM notes and grievance records.
- Analytics, search history, device/network/security logs and audit trails.
- Children/minor data or sensitive/high-risk data if any workflow could collect it.

For every data category record: purpose, owner domain, system of record, exact database/table/object-store location, hosting region and residency evidence, encryption in transit/at rest, application-level encryption need, key owner/rotation, authorized roles, processor/vendor, retention trigger/period, deletion/backup expiry, legal hold, export/transfer, audit events and incident owner.

Technical requirements:
- Collect only fields needed for a defined purpose; avoid storing full identity documents or exact location history without a justified need and approved retention.
- Never store OTPs, passwords, API secrets or private keys in plaintext or logs. Use appropriate password hashing, short-lived OTP controls, secret manager-backed configuration and rotation.
- Encrypt transport and storage; assess application-layer encryption for especially sensitive documents and restrict decryption to explicitly authorized workflows.
- Separate public seller listing data from private onboarding/KYC/compliance data. Use private object storage or database BLOB access through authenticated, authorized APIs; never public URLs by default.
- Enforce server-side authorization on every read/write, including record ownership and admin purpose. UI hiding is not access control.
- Use least privilege, separate operational/admin roles, audit privileged access and protect audit trails from alteration.
- Define retention and deletion across primary DB, object storage, search indexes, caches, logs, analytics, exports and backups. Deletion from one table is not a complete deletion workflow.
- Document hosting region, subprocessors, support access, backups, disaster recovery, cross-border transfers and contractual safeguards. Never claim India-only storage without provider and service-level evidence.
- Keep production, staging and test data separate. Use synthetic data in tests; do not copy live personal or seller documents into staging.
- Define incident triage, containment, evidence preservation, legally required notifications and customer/regulator communications before launch.
- Provide data correction, access/export, grievance and deletion request workflows where required, with identity verification and audit evidence.

## 5. Governance artefacts required before live scale

Maintain and update:
1. Legal applicability and change register (instrument, authority, status, applicability, effective date, source, owner, control, evidence, review date).
2. Data inventory and data-flow diagrams, including hosting region and processors.
3. Privacy notice, consent/notice records and preference withdrawal flows where applicable.
4. Seller, buyer, provider and delivery-partner terms and policies.
5. Marketplace disclosures, prohibited/restricted goods policy and seller verification standard.
6. Refund, cancellation, grievance, dispute and chargeback procedures.
7. Tax/invoice and payment-flow accounting/reconciliation specification.
8. Security baseline, threat models, access matrix, vulnerability/patch process and incident response plan.
9. Retention/deletion schedule and backup/restore evidence.
10. Vendor/processor register, DPAs/contracts, subprocessor and transfer assessment.
11. Release compliance checklist and evidence links for each material feature.
12. Training, operational SOPs and accountable named role/owner.

No document should state that the company is incorporated, registered, licensed, insured, compliant or approved unless evidence is available and current.

## 6. Legal change monitoring

For every relevant requirement, prefer primary authoritative sources:
- India Code and Gazette of India / e-Gazette for Acts, rules and notifications.
- Relevant ministry and regulator websites (including MeitY, DPIIT, MCA, Department of Consumer Affairs, CBIC, GST Council, RBI, CERT-In, FSSAI, Labour Ministry and state departments as applicable).
- Official state gazette, municipal/local authority and regulator orders.
- Official consultation papers and draft rules for proposals.

Secondary commentary may help interpret but must not replace the primary instrument. Record the exact source URL, title/identifier, publication date, status, effective date, relevant section/rule and date last checked. Flag conflicts or uncertainty for Indian counsel.

Review the register at least monthly during active build/launch, before entering a new state/category/payment model, and immediately after a relevant official notification or material incident. Assign an owner and due date to each change. Do not implement a draft proposal as if it were binding law; design for likely changes only where proportionate and clearly labelled as anticipatory.

## 7. Loophole and risk handling

When a loophole or gap is detected:
- State the issue plainly and the consequence (legal, privacy, security, financial, consumer, operational or reputational).
- Classify severity: **Critical / High / Medium / Low** and likelihood/impact.
- Identify affected users, data, money, APIs, records and jurisdictions.
- Propose immediate containment and a durable fix.
- Name the accountable domain/operational owner and required evidence.
- Add tests, monitoring and an audit/control to prevent recurrence.
- Track it as **Open / Mitigated / Verified closed**. Do not call it closed until evidence demonstrates the control works.

For Critical/High risks involving unlawful processing, exposed credentials, unsafe products, unauthorized access, payment custody, consumer harm or missing mandatory licence/registration, recommend blocking the affected feature or launch until counsel/owner-approved remediation is verified.

## 8. Seller-first, world-class product quality

Continuously evaluate:
- Simple mobile-first onboarding with clear eligibility, progressive disclosure, save/resume, language support and assisted onboarding with explicit callback consent.
- Seller tools for catalogue creation, bulk upload, stock/price control, order management, transparent fees, settlements/reconciliation and performance insights.
- Fair discovery: transparent ranking principles, accurate availability, sponsored placement labelling, anti-counterfeit and quality controls.
- Buyer trust: verified seller identity where appropriate, accurate descriptions, delivery promises, transparent total price, accessible support, complaint tracking and fair refund paths.
- Small-business inclusion: low-bandwidth UX, affordable fees, local-language support, accessible design and practical seller education.
- Resilience: idempotent workflows, reliable notifications, recovery/retry, graceful degradation, observability, backups and disaster recovery.
- Responsible growth: no deceptive patterns, fake reviews, undisclosed ranking manipulation, hidden charges or coercive consent.

For every feature, identify its intended user outcome and a measurable success/safety metric (for example seller activation, listing completion, order success, cancellation, complaint rate, refund time, seller retention, accessibility defects or security incidents).

## 9. Roles, approval and limitations

Engineering owns implementation controls and evidence; product/business owns workflow and commercial decisions; operations owns SOPs and execution; security/privacy owners own technical safeguards and incident readiness; finance/tax professionals own accounting/tax validation; qualified Indian counsel owns legal interpretation and formal legal opinions.

Escalate material legal uncertainty, regulatory classification, payment fund-flow, employment/gig-worker classification, privacy lawful basis, children’s data, cross-border transfers and mandatory licence questions to qualified professionals before launch.

This standard drives rigorous compliance-by-design and risk reduction. It does not guarantee zero legal loopholes, constitute legal advice, or replace counsel, chartered accountants, company secretaries, auditors, insurers, banks or regulators.

## 10. Required response format for project work

For every material KuraliUpdates response, include the relevant concise sections:
- **Recommendation / action**
- **Compliance and data impact** (including current vs future/proposed status where relevant)
- **Risks or loopholes** (severity and status; say none identified only within reviewed scope)
- **Suggested product/operational improvements**
- **Verification / evidence and next step**

For routine narrow questions, keep this proportionate and state why other domains are unaffected. Never imply a legal review was performed when it was not.
