# India Legal, Regulatory and Security Register — Phase 0

**Status:** Preliminary source-backed issue register; not legal sign-off.  **Review date:** 3 November 2026.
**Scope:** KuraliUpdates marketplace (goods), seller onboarding, Daily Help, delivery partners, admin/CRM, payments/refunds, communications and hosting.
**Related standards:** Engineering Operating Standard and India Compliance, Data Governance and Product Excellence.

## 1. Executive risk assessment

KuraliUpdates should be assessed as an e-commerce marketplace, not merely a website directory. Its legal classification, contracting entity, actual fund flows and operational control must be confirmed against contracts and runtime behavior.

**Priority risks:**
1. DPDP Act/Rules phased commencement readiness: no complete data inventory, notices/purpose records, rights workflow, processor contracts, retention/deletion or breach evidence yet.
2. Consumer Protection (E-Commerce) Amendment Rules, 2026 take effect 1 January 2027. Complaint handling, NCH convergence, ranking, sponsored listings, discount history, seller disclosures and annual dark-pattern audit need implementation before then.
3. Oracle wallet/credential exposure and PR #84 remain a security/release gate. Rotate potentially exposed credentials and prove secret-only runtime configuration before merge/deployment.
4. Actual hosting/database/document/backup regions and processor access are not evidenced. Do not claim India-only storage.
5. Seller-direct payment/refund needs legal/tax review of actual fund flow, payment aggregation/custody and GST treatment. Direct transfer alone does not settle classification.
6. Social Security Code, 2020 is stated by the Labour Ministry to have been enforced on 21 November 2025 and includes gig/platform workers. Delivery and Daily Help models require Punjab-specific applicability review.

This is a source-backed issue register, not legal sign-off. Counsel, CA/CS and security specialists must validate actual entity, contracts, funds and locations.

## 2. Primary-source legal register

| Instrument | Status at 3 Nov 2026 | KuraliUpdates impact / control |
|---|---|---|
| DPDP Act 2023; G.S.R. 843(E), 13 Nov 2025 | Phased commencement: specified provisions on Gazette publication; sections 6(9) and 27(1)(d) after one year (13 Nov 2026); sections 3–5, 6(1)–(8),(10), 7–17, remaining 27, 28–34, 36–37 and 44(2) after 18 months (13 May 2027). | Map personal data and Data Fiduciary/processor roles; design purpose notices, lawful processing, consent withdrawal where applicable, rights, children safeguards, security, breach response, processor contracts, retention and erasure. The Gazette notification controls dates. |
| DPDP Rules 2025, G.S.R. 846(E), corrigendum G.S.R. 892(E) | Phased: Rules 1,2,17–21 on publication; Rule 4 after one year (13 Nov 2026); Rules 3,5–16,22,23 after 18 months (13 May 2027), subject to exact Gazette text/corrigendum. | Build rule-by-rule implementation matrix; verify exact official text and corrigendum before coding. Do not assume every rule is already in force. |
| Consumer Protection Act 2019; E-Commerce Rules 2020/2021 and 2026 amendment | Existing framework applies; 2026 amendment notified and effective 1 Jan 2027. | Legal entity/address/contact/grievance details; complaint acknowledgment within 48 hours and redressal within one month; copy of complaint; NCH convergence; truthful ranking; sponsored labels; prior 30-day lowest price; annual dark-pattern audit/certificate; specified consumer-data consent; seller/product, delivery, payment, refund/warranty disclosures; importer/country-of-origin details. Verify Gazette text. |
| Dark Patterns Guidelines 2023 | Current; 2026 amendment expressly requires yearly self-audit and visible certificate from 1 Jan 2027. | Audit checkout, consent, cancellation, bargaining, urgency/scarcity, hidden fees and refund flows; remove deceptive or obstructive patterns. |
| IT Act 2000; CERT-In directions under section 70B dated 28 Apr 2022 | Current directions; applicability/exemptions and exact operational requirements need counsel/security confirmation. | Covered entities must report specified incidents within six hours; directions include secure ICT logs for rolling 180 days within Indian jurisdiction and time synchronization. Establish incident runbook, POC, evidence preservation and provider escalation. |
| Code on Social Security 2020 | Labour Ministry letter dated 29 Jan 2026 states enforced 21 Nov 2025 and includes gig/platform workers; central/state rule and scheme-making remains relevant. | Assess aggregator duties and schemes for delivery and Daily Help; worker classification depends on actual arrangements, not labels. Review Punjab rules/schemes, registration/contributions, safety and insurance. |
| GST Act 2017 sections 9(5), 24(ix), 52 and notifications | Current; applicability depends on supply, operator role and whether consideration is collected by operator; notified services/exceptions matter. | CA must map goods, commission, platform/delivery fees, Daily Help, seller-direct transfer, TCS, registration, invoicing and reconciliation. Section 52 text links TCS to consideration collected by operator; do not infer blanket exemption from direct-pay design. |
| Food Safety and Standards Act 2006; FSS Licensing and Registration Regulations 2011 and amendments | FSSAI lists amendments dated 10 Mar and 23 Jun 2026. Section 31 requires FBO licensing/registration; category depends on actual activity. | Decide if platform itself is an e-commerce FBO, storage/warehouse/transport FBO or only marketplace. Validate applicable seller licence/registration and expiry; define traceability, recall, food complaint and handling controls. Review 2026 amendments. |
| RBI Payment Aggregator/Payment Gateway framework and PSS Act 2007 | Applies to regulated aggregation; exact marketplace boundary depends on actual funds flow and activity. | Preserve seller-direct payment only if customer pays seller and platform does not receive, pool, control or settle funds. Obtain bank/payment-partner legal confirmation. No wallet/escrow/split settlement/pooled account without approved structure. |
| Legal Metrology (Packaged Commodities) Rules 2011 and product-specific laws | Current, amended from time to time. | For applicable pre-packaged goods, collect/display mandatory declarations such as MRP, net quantity, manufacturer/packer/importer, consumer care and origin/date details as applicable. |
| Companies Act 2013 and MCA rules | Applies according to actual incorporation/status. | Confirm Kura Ventures Private Limited incorporation, registered office, directors, statutory filings, books and authority. Do not represent planned entity as incorporated without MCA evidence. |

## 3. DPDP commencement calendar

Based on Gazette G.S.R. 843(E), 13 November 2025:
- 13 Nov 2025: sections 1(2), 2, 18–26, 35, 38–43 and 44(1),(3) as specified.
- 13 Nov 2026: section 6(9) and section 27(1)(d).
- 13 May 2027: sections 3–5, 6(1)–(8),(10), 7–17, remaining 27, 28–34, 36–37 and 44(2) as specified.
- Rules have a separate phased schedule under Rule 1(2); verify G.S.R. 846(E) and corrigendum G.S.R. 892(E) for each rule.

Phased commencement is not a reason to defer secure design. Complete data mapping, notice design, purpose/consent records, processor agreements, access controls, retention/deletion, rights and breach readiness before live scale. Counsel must confirm exact obligations and later notifications.

## 4. Product and system control mapping

| Workflow | Minimum controls |
|---|---|
| Registration, OTP, sessions | Purpose notice; channel-specific verification; rate limits; secure password/session handling; no OTP/token logging; minimization; retention/deletion. |
| Seller onboarding/CRM | Explicit callback purpose/preference; distinguish service from marketing; restricted notes; access audit; document notice; retention; correction/request route. |
| Seller compliance documents | Private storage; encryption/key management; authenticated APIs; record-level access; malware quarantine; MIME/signature/size validation; download audit; expiry/replacement; retention/deletion and backup expiry. |
| Catalogue/ranking | Seller and licence details; accurate attributes; food/packaged-goods declarations; expiry/best-before where required; truthful ranking; sponsored labels; 30-day price history; prohibited goods/IP controls. |
| Cart/checkout/bargain/orders | Seller identity, total price and fees; no hidden/unrelated charges; immutable accepted-price snapshot; cancellation/refund terms; marketing consent separated; idempotency. |
| Seller-direct payment/refund | No platform custody/pooling without approved structure; show payee; bank reference/order reconciliation; refund SLA/status/evidence; written GST/payment opinion. |
| Delivery tracking | Just-in-time location; purpose and retention limit; least privilege; no indefinite history; secure transport; safety/complaint process. |
| Daily Help | Risk-based provider verification; scope/price/cancellation; worker classification; safety/grievance/incident handling; no unsupported background-check claims. |
| Admin/analytics | Strong admin auth; role separation; least privilege; record ownership; audit; masking; export/retention controls; bulk-access monitoring. |
| Security operations | CERT-In applicability decision; incident runbook; 6-hour reporting capability where covered; log retention/time sync as applicable; backups; vulnerability management; secret rotation. |

## 5. Source-audit observations and unknowns

Source baseline: main at 840842662c03ae026c9ddd996b62b074784359a0 (3 Nov 2026).

Verified source facts:
- One Spring Boot application and one Docker runtime target.
- Controllers include auth, buyer, seller, delivery, tracking, Daily Help, negotiation, admin, seller documents, seller leads, registration drafts and OTP configuration; separate E2E/diagnostics controllers exist.
- AuthController stores portal handoff tokens in process-local ConcurrentHashMap.
- AuthService accesses user/session and Seller, DeliveryAgent and DailyHelpProfessional repositories.
- OrderService directly uses Order, Seller and Product repositories plus JdbcTemplate updates to negotiation rows.
- SellerService directly uses Seller, Product, Order and BillDiscount repositories.
- DeliveryService directly uses DeliveryAgent and Order repositories plus JdbcTemplate.
- DailyHelpService centers on service/professional/booking/slot repositories.
- AdminController accesses repositories across domains and JdbcTemplate.
- SecurityConfig previously inspected: /admin/** requires ADMIN; /buyers/**, /sellers/**, /delivery/** and catch-all are permitAll and rely on session filter/service checks. Full endpoint-by-endpoint tests remain incomplete.
- Migrations visible: Java V14–V22 and SQL V22_1–V30. Source files do not prove execution against Oracle.
- Seller documents use Oracle BLOB/private API source; end-to-end authorization, encryption/key custody, retention/deletion remain unverified.
- Tracked Oracle wallet ZIP and Dockerfile wallet copy were observed; PR #84 requires replacement secrets/configuration validation before merge/deploy. Treat credentials as potentially exposed and rotate.

Not evidenced:
- Render backend region verified Singapore on 3 Nov 2026; frontend static site is CDN-served and no single region is exposed in service details. Oracle database/replicas/backups, logs, email/SMS, document storage and other vendor regions; processors/subprocessors and support access remain unverified. India is the production target, not current backend residency.
- Complete data inventory, lawful purposes/notices/consent, retention/deletion/backup expiry and data-principal request process.
- Live Oracle schema, applied Flyway versions, FK/trigger metadata and restore test.
- Full endpoint authz/record-owner tests; all repository writers, native SQL and transaction participants.
- Scheduler/async/event/WebSocket/external integration inventory and all workflow retry/failure traces.
- Actual incorporation, seller contracts, grievance officer, local licences, FSSAI role, GST position and bank/payment-provider confirmation.
- Punjab-specific labour/scheme, Shops and Establishments, local trade and municipal requirements.

## 6. Hosting region evidence (3 November 2026)\n\nRead-only Render service inspection verified:\n- Backend web service `kuraliupdates-bazaar` (`srv-db0fv9egekts739hfa6g`): `region=singapore`. Current backend is therefore outside India.\n- Frontend static site `kuraliupdates-frontend` (`srv-db5m757lot8c73fer22g`): static-site service; service details expose no single deployment region and it is served through a CDN. Confirm provider cache locations and ensure static bundles contain no user-specific/personal data.\n- Oracle database, replicas, backups, object/document storage, logs, CDN cache behavior, email/SMS providers, support access and disaster recovery: not verified.\n\nThe inspected Render service region choices did not include India. Do not assume Render can be switched in place to an Indian region. Select an India-capable production compute/database/storage provider or architecture, then verify every data flow and contractual/subprocessor term before launch. No hosting setting was changed.\n\n## 7. Priority remediation

| Priority | Action | Closure evidence |
|---|---|---|
| P0 | Rotate exposed Oracle credentials/wallet; validate secret-only runtime; review PR #84 safely. | Rotation evidence, secret inventory, image/source scan, startup proof and approved rollout. |
| P0 | Data inventory, data-flow and provider-region/processor register. | Field/table/object map; provider contracts/configuration; region, subprocessors, backups and access. |
| P0 | Complete endpoint authorization and record ownership matrix. | Automated anonymous/wrong-role/wrong-owner/admin/revoked-session tests. |
| P0 | 2027 e-commerce amendment readiness. | Complaint/NCH process, ranking/sponsored labels, 30-day price history, dark-pattern audit, seller disclosure checklist. |
| P0 | Confirm legal entity, disclosures, grievance officer and seller agreement. | MCA evidence, published disclosures, signed versioned agreement and escalation SOP. |
| P0 | Payment-flow and GST opinion. | Customer-to-seller fund diagram, platform fee/commission/delivery/refunds and written tax treatment. |
| P1 | DPDP control plan to 13 Nov 2026 and 13 May 2027. | Rule-by-rule matrix, notices, purpose records, rights, retention/deletion, processor contracts, breach runbook. |
| P1 | Seller document lifecycle and food applicability. | Licence validation, private document tests, malware quarantine, access audit, expiry/retention/deletion. |
| P1 | Gig/platform worker and Punjab review. | State rules/scheme analysis, worker model, contributions/registration decision, safety/insurance SOP. |
| P1 | Product listing controls. | Category restrictions, Legal Metrology attributes, FSSAI validation, origin/importer fields. |
| P1 | CERT-In operational controls. | Applicability decision, POC, log/time sync, incident simulation and provider escalation. |
| P2 | Domain boundaries and frontend dependency map. | Module tests, API contracts, import boundaries, route/context consumer maps. |

## 8. Official sources reviewed

- Gazette G.S.R. 843(E), DPDP commencement: https://egazette.gov.in/WriteReadData/2025/267647.pdf
- MeitY DPDP Rules and timeline library: https://www.meity.gov.in/documents/act-and-policies/digital-personal-data-protection-rules-2025-gDOxUjMtQWa
- PIB Consumer Protection (E-Commerce) Amendment Rules 2026, 10 Sep 2026: https://www.pib.gov.in/PressReleasePage.aspx?PRID=2308759
- Department of Consumer Affairs rules and dark-pattern guidance: https://consumeraffairs.gov.in/pages/consumer-protection-acts
- CERT-In directions: https://www.cert-in.org.in/Directions70B.jsp
- Labour Ministry letter on Social Security Code, 29 Jan 2026: https://www.labour.gov.in/static/uploads/2026/03/d70bb9f7e87ec48bd64fde40329f9c09.pdf
- CBIC GST Act section 52: https://taxinformation.cbic.gov.in/content-page/explore-act/1000325/1000001
- FSSAI licensing/registration: https://www.fssai.gov.in/business/licensing and https://www.fssai.gov.in/business/registration
- FSSAI licensing/registration amendments 2026: https://www.fssai.gov.in/food-law/regulations/amendments/licensing-registration
- RBI: https://www.rbi.org.in/

## 9. Phase 0 exit criteria — not met

Phase 0 is complete only when every endpoint has method/path/authz/record-owner classification and tests; every table/entity/repository/native SQL writer/transaction/migration has an owner; scheduler/async/event/WebSocket/integrations are inventoried; critical journeys include failure/retry/security/privacy/financial traces; frontend route/build/hosting/import/context/session dependencies are mapped; hosting/data residency/processors/secrets/backups/retention/deletion are evidenced; legal applicability is reviewed by qualified professionals; and Critical/High risks have containment and accountable owners.

**Phase 0 remains open.** This register improves legal discovery but does not close technical, provider, schema, runtime or legal-professional gates. Do not begin broad package moves, production rollout or live seller onboarding while blockers remain unresolved.