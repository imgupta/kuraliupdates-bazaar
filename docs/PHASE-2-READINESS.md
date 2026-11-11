# Phase 2 readiness

**Decision: Not ready to start Phase 2 implementation.** This handoff is preparatory only. Phase 1 remains open per [PHASE-1-COMPLETION-REPORT.md](PHASE-1-COMPLETION-REPORT.md); no Phase 2 code is authorized by this document.

## Phase 1 evidence and remaining release gates

- Current audited baseline: `352286ae66438d1bd6063673945e724cbaed28f7` (PR #320 merged).
- Local baseline evidence: backend Maven 342/342; frontend TS regressions 9/9; `.mjs` regressions 25/25 with loopback permission; typecheck, shared build, five role portal builds passed; local mocked Playwright smoke 2/2.
- Detailed residuals are listed in [PHASE-1-REQUIREMENT-MATRIX.md](PHASE-1-REQUIREMENT-MATRIX.md).
- Oracle: no isolated local target, migrations, DB access, concurrency or rollback proof. Requires explicit DBA/owner provisioning approval.
- Staging: no fresh exact-head transactional run or full authenticated role journey verified in this audit. Requires dedicated approved identities, OTP capture readiness and staging owner approval.
- Security: draft PR #317 retains Critical rotation/provisioning/runtime/history-cleanup gates. Open issue #209 retains seller-document retention/access-audit requirements; #210 retains seller onboarding E2E.
- Release: India residency, legal/professional reviews, backup/restore, security review and repository governance sign-off remain separate gates.

## Phase 2 objectives

Use the repository roadmap as authoritative. At a high level, Phase 2 should advance the approved five role portals and one Spring Boot JVM/five enforced domain modules, while preserving existing security, data ownership, payment/refund decisions and India-first production hosting requirement. Avoid architecture changes before the associated Phase 1 release gates and source-backed API/domain boundaries are accepted.

## Dependencies and technical risks

1. Formal Phase 1 owner closure based on exact commit/test/runtime evidence.
2. Critical wallet/credential rotation, secure runtime delivery and history-remediation plan.
3. Dedicated isolated Oracle test target with supported migration/bootstrap/cleanup and concurrency proof.
4. Dedicated synthetic staging identities and safe OTP capture for five-role lifecycle E2E.
5. Complete route/role/owner matrix and PII/retention decisions, including seller documents and public abuse controls.
6. Verified hosting/data-flow regions and qualified India legal/professional review before launch.

Primary technical risks are cross-instance database coordination, data ownership gaps at untested endpoints, incomplete live-session evidence, availability of the Oracle wallet at runtime, and drift between shared staging and deployed commit. Mocks and CI alone cannot discharge these risks.

## Recommended implementation order after Phase 1 closure

1. Resolve the Critical security/credential gate under security owner, DBA and hosting-owner oversight.
2. Establish the isolated Oracle verification substrate and migration/recovery evidence.
3. Close P1-A endpoint × role × ownership coverage and privacy/data-minimization findings.
4. Complete isolated authenticated seller, delivery, Daily Help and buyer journeys with reconciled synthetic state.
5. Close retention, abuse, backup/restore, residency and professional-review gates.
6. Obtain formal Phase 1 closure, then approve Phase 2 scope and acceptance criteria before implementation.

## Proposed Phase 2 PR breakdown

After Phase 1 exit approval, split work into reviewable PRs by bounded domain: (1) shared portal/API contracts and accessibility foundations; (2) buyer catalogue/cart/checkout UX within the approved payment contract; (3) seller onboarding/catalogue workflows; (4) delivery operations/tracking; (5) Daily Help discovery/booking; (6) admin review/audit tooling; (7) operational telemetry/performance. Each PR needs the India PR governance assessment, relevant authorization tests, local suite evidence and a rollback plan. Sequence must be revised against the actual approved roadmap and dependency map before coding.
