# Admin API contract trace

**Scope:** source trace of the current Admin portal's browser-side API calls. This is documentation only; it does not assert that every route has been verified against the running backend. No live requests or staging mutations were made.

## Source anchors

- `src/features/admin/AdminPortal.tsx` — root-admin UI gate, data refresh, 45-second polling, seller/delivery decisions, Daily Help service form, diagnostics.
- `src/services/api.ts` — `adminAuthHeaders` and `bazaarApi` methods below.
- API root: `API_BASE_URL`, from `VITE_API_BASE_URL` or the current default `https://kuraliupdates-bazaar.onrender.com/api/v1`.

## Authentication and UI boundary

- `adminAuthHeaders()` reads `kurali_auth_token` from browser local storage and sends it as `Authorization: Bearer ...` when present, plus `Accept: application/json`.
- Most admin calls still execute without a token at the client level; authorization must be enforced by the backend.
- `AdminPortal.tsx` additionally gates the Admin UI using `isRootAdminEmail(user.email)`. This is a UI restriction, not a replacement for server-side role/permission checks.
- Do not move this flow into a separately deployed portal until the shared session/token contract, role authorization and cross-portal behavior have explicit tests.

## Read endpoints called by Admin

| Client method | HTTP request | UI use / fallback |
|---|---|---|
| `getAdminDiagnostics()` | `GET /admin/diagnostics` | Diagnostics tab; `cache: no-store`; throws on non-2xx and surfaces an error state. |
| `getAdminSellers()` | `GET /admin/sellers` | Store list; logs errors and returns `[]`. |
| `getPendingSellers()` | `GET /admin/sellers/pending` | Seller approvals; logs errors and returns `[]`. |
| `getAdminDeliveryAgents()` | `GET /admin/delivery` | Fleet list; returns parsed array or `[]`; logs errors and returns `[]`. |
| `getPendingDeliveryAgents()` | `GET /admin/delivery/pending` | Available client method; logs errors and returns `[]`. Confirm whether the current Admin UI still calls it before removing or consolidating it. |
| `getAdminBuyers()` | `GET /admin/buyers` | Buyer list; logs errors and returns `[]`. |
| `getAdminAnalytics()` / `getDemandAnalytics()` | `GET /admin/analytics/demand-trends` | Both methods call the same route; first returns `null` on error, second also returns `null`. Candidate for later consolidation after call-site review. |
| `getAdminSearchTrends()` | `GET /admin/analytics/search-trends` | Search-trend view; logs errors and returns `[]`. |
| `getAdminDailyHelpServices()` | `GET /admin/daily-help/services` | Daily Help catalogue; logs errors and returns `[]`. |
| `getAdminDailyHelpHelpers()` | `GET /admin/daily-help/helpers` | Daily Help helper list; logs errors and returns `[]`. |

The UI's `refreshAdminData()` calls sellers, pending sellers, delivery agents, demand analytics, buyers, search trends, Daily Help services and helpers in one `Promise.all`, only when the current user's email passes the root-admin UI gate. It repeats every 45 seconds. Because several read methods convert errors into empty collections or `null`, a failed request can look like a legitimately empty dataset; preserve and surface request status during future API-client extraction.

## State-changing endpoints called by Admin

| Client method | HTTP request | Behavior / notes |
|---|---|---|
| `approveSeller(sellerId)` | `POST /admin/sellers/{sellerId}/approve` | Returns `res.ok`; catches network errors and returns `false`. |
| `rejectSeller(sellerId)` | `POST /admin/sellers/{sellerId}/reject` | Returns `res.ok`; catches network errors and returns `false`. |
| `approveDeliveryAgent(agentId)` | `POST /admin/delivery/{agentId}/approve` | Returns `res.ok`; catches network errors and returns `false`. |
| `rejectDeliveryAgent(agentId)` | `POST /admin/delivery/{agentId}/reject` | Returns `res.ok`; catches network errors and returns `false`. |
| `createAdminDailyHelpService(payload)` | `POST /admin/daily-help/services` | Sends JSON with admin auth headers; parses response best-effort and throws on non-2xx. |
| `updateAdminDailyHelpService(serviceId, payload)` | `PUT /admin/daily-help/services/{serviceId}` | Sends JSON with admin auth headers; parses response best-effort and throws on non-2xx. |

IDs are URL-encoded. The approval methods only report a boolean and discard backend response details, so the UI cannot distinguish validation, authorization, conflict or server errors. Do not change this contract during portal extraction without a separately tested compatibility plan.

## Current risks and follow-up

1. **Backend authorization is the security boundary.** Verify controller/service authorization for each `/admin/**` route; the frontend email gate alone is insufficient.
2. **Error/empty-state ambiguity.** Several read calls swallow non-2xx and network errors into `[]`/`null`. Introduce a typed result/error contract only with UI regression coverage.
3. **Duplicate analytics method.** `getAdminAnalytics()` and `getDemandAnalytics()` share the same endpoint; inventory all call sites before consolidation.
4. **Refresh fan-out.** A single rejected promise can abort the `Promise.all` refresh; most current methods catch errors internally, but diagnostics is handled separately. Consider per-section loading/error state as a separate UI change.
5. **Sensitive diagnostics.** Keep diagnostics authenticated, avoid caching, and do not log tokens, secrets, connection strings or raw database identity details.
6. **No live mutation verification here.** Approval and service-write endpoints are documented from source only; do not invoke them against the shared staging environment as a smoke test.

## Extraction gate

Before moving Admin into an independent deployable:
- Reconcile this trace with the full endpoint inventory and Admin component call sites.
- Verify all backend `/admin/**` handlers, authorization rules, request DTOs, response shapes and transaction boundaries.
- Add mocked tests for success, authorization failure, validation failure, server failure and network failure for every state-changing action.
- Add read-only browser smoke coverage for loading, refresh and empty/error states.
- Preserve root-admin authorization and the shared session contract across portal boundaries.
- Keep runtime extraction separate from documentation and contract changes.
