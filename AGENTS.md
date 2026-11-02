# Repository-wide Agent Rules

## Mandatory operating standard

Before every coding, refactoring, review, test or release task, read [docs/ENGINEERING-OPERATING-STANDARD.md](docs/ENGINEERING-OPERATING-STANDARD.md), [docs/CHATGPT-CONTINUATION.md](docs/CHATGPT-CONTINUATION.md), [docs/CURRENT-STATE.md](docs/CURRENT-STATE.md) and the relevant domain documents.

Apply the equivalent rigor of a 30+ year experienced frontend engineer, software architect, product/UI designer, business analyst, security consultant and management consultant. This describes the required professional operating perspective, not a literal claim about employment history.

Every newly created or materially updated Markdown document must link to the Engineering Operating Standard and distinguish verified facts, proposed decisions and unknowns.

## India compliance, data governance and product excellence

Before every material recommendation, design, implementation, test or release, apply [India Compliance, Data Governance and Product Excellence](docs/INDIA-COMPLIANCE-DATA-GOVERNANCE-AND-PRODUCT-EXCELLENCE.md). Assess applicable Indian central/state/local law, regulator directions, data lifecycle and storage, privacy/security, consumer/seller/provider rights, tax/payment flows, operational controls and product-quality improvements. Distinguish in-force requirements from future commencement, notified future-effective rules, drafts and announcements. Use primary official sources for current legal claims and record effective dates. Escalate legal interpretation to qualified Indian counsel and tax matters to qualified professionals; never promise zero legal loopholes or claim legal sign-off without evidence.

For each material task, explicitly identify relevant loopholes/risks, severity, containment, durable fix, owner and verification evidence. Recommend meaningful seller-first product or operational improvements where useful. Keep the assessment proportionate for narrow tasks and state why unaffected areas are not applicable. No live launch or processing of a regulated/high-risk workflow while a Critical/High legal, privacy, security, payment, licence or consumer-harm blocker remains unresolved.

Every new or materially updated governance document must link to both this standard and the Engineering Operating Standard.
 
## Architecture and implementation rules

- Preserve React as the frontend unless the owner explicitly approves a change.
- Preserve the approved target: five frontend portals and one Spring Boot JVM with five enforced backend domain modules.
- Keep backend layers thin and feature/domain-oriented.
- Use DTOs at API boundaries.
- Put transaction boundaries in application/service logic.
- Use Flyway for schema changes; never revive retired V1/V2/V3/V4 address migration compatibility logic.
- Enforce domain ownership; no cross-domain repository/entity writes.
- Do not change payment/refund, authentication, hosting or runtime topology without explicit approval.
- Prefer small, focused changes. Avoid blind bulk moves and unrelated cleanup.
- Inspect the exact source, tests, branch, base SHA, open PRs and CI before coding.
- Define acceptance criteria, security/privacy review, tests and rollback before material changes.
- Never expose secrets, OTPs, tokens, Oracle wallet contents or private documents.
- Never run mutating E2E against real/shared business records; use verified isolated synthetic data.
- Run relevant frontend/backend quality gates and inspect actual results before declaring completion.
- Distinguish source, CI, deployment, migration and runtime evidence. Never overstate success.

## Context discipline

Do not copy long logs or historical debugging into Markdown. Document decisions, contracts, invariants, evidence, open questions and actionable next steps.
