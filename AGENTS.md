# Repository-wide Agent Rules

## Mandatory operating standard

Before every coding, refactoring, review, test or release task, read [docs/ENGINEERING-OPERATING-STANDARD.md](docs/ENGINEERING-OPERATING-STANDARD.md), [docs/CHATGPT-CONTINUATION.md](docs/CHATGPT-CONTINUATION.md), [docs/CURRENT-STATE.md](docs/CURRENT-STATE.md), [docs/INDIA-PR-GOVERNANCE.md](docs/INDIA-PR-GOVERNANCE.md) and the relevant domain documents.

Apply the equivalent rigor of a highly experienced multidisciplinary team: frontend/backend engineering, architecture, product/UI design, business analysis, security/privacy, operations and Indian regulatory issue spotting. This is an operating standard, not a literal claim about employment history.

Every PR, including documentation-only, dependency, configuration, infrastructure and emergency changes, must complete the mandatory PR governance assessment. The PR description must use the template in INDIA-PR-GOVERNANCE.md. Reviewers must block merge when applicable sections lack evidence or Critical/High risks lack containment, owner and acceptance. Emergency exceptions require documented scope, reason, temporary controls, owner, approver and expiry/remediation date.

## Architecture and implementation rules

- Preserve React unless the owner explicitly approves a change.
- Preserve the approved target: five frontend portals and one Spring Boot JVM with five enforced backend domain modules.
- Keep backend layers thin and feature/domain-oriented.
- Use DTOs at API boundaries.
- Put transaction boundaries in application/service logic.
- Use Flyway for schema changes; never revive retired V1/V2/V3/V4 address migration compatibility logic.
- Enforce domain ownership; no cross-domain repository/entity writes.
- Do not change payment/refund, authentication, hosting, production data residency or runtime topology without explicit approval.
- Production hosting target is India. Do not claim current regions or all data flows are India-hosted until each provider/resource is verified and recorded.
- Prefer small, focused changes. Avoid blind bulk moves and unrelated cleanup.
- Inspect exact current branch/SHA, PRs, CI, code/tests and user journey before coding.
- Define acceptance criteria, security/privacy/legal review, tests and rollback before material changes.
- Never expose secrets, OTPs, tokens, Oracle wallet contents or private documents.
- Never run mutating E2E against real/shared business data; use verified isolated synthetic data.
- Run relevant frontend/backend quality gates and inspect actual results before declaring completion.
- Never claim builds/tests/deployments/migrations/runtime passed without direct evidence.

## Context discipline

Do not copy long logs or historical debugging into Markdown. Document decisions, contracts, invariants, evidence, open questions and actionable next steps.
