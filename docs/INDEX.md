# Documentation index

Start with these maintained sources:

| Document | Purpose |
|---|---|
| [README](../README.md) | Product, stack, repository map and local setup |
| [Architecture](../ARCHITECTURE.md) | Runtime, boundaries, invariants and security principles |
| [Current state](CURRENT-STATE.md) | Latest implementation status, release caveats and prioritized backlog |
| [Seller registration redesign](SELLER-REGISTRATION-REDESIGN.md) | Approved target UX, radius, multilingual, compliance, APIs, backlog and release gates |
| [Seller onboarding](SELLER-ONBOARDING.md) | Current seller registration, document storage, admin approval and compliance workflow |
| [Assisted seller onboarding CRM](SELLER-ONBOARDING-CRM-IMPLEMENTATION.md) | Consolidated lead capture, dual OTP, callback consent, admin CRM and rollout gates |
| [Deployment](../DEPLOYMENT.md) | Vercel/Render release, environment and rollback gates |
| [API](API.md) | Domain API index and contract maintenance |
| [Database](DATABASE.md) | Flyway migration facts and Oracle operational safety |
| [Development](DEVELOPMENT.md) | Coding practices |
| [E2E testing](../E2E_TESTING.md) | Test modes and safety boundaries |
| [Staging regression](STAGING-REGRESSION-TESTS.md) | Read-only and synthetic workflow regression checklist |
| [Frontend boundaries](FRONTEND-DOMAIN-BOUNDARIES.md) | Domain API/context dependency map |
| [Micro-frontend build strategy](MICROFRONTEND-BUILD-STRATEGY.md) | Existing role portal build/quota strategy |
| [Engineering handoff](CHATGPT-CONTINUATION.md) | Short continuation notes |

## Maintenance rules
- Keep architecture and README concise; put detailed workflow steps in the relevant runbook.
- Keep CURRENT-STATE and CHATGPT-CONTINUATION dated and evidence-based.
- Mark historical checkpoints as historical; never present old CI/deployment status as current.
- Do not duplicate endpoint inventories or long logs across documents.
- Remove or correct superseded statements when source implementation changes.
