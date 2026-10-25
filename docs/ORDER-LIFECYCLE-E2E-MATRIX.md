# Order lifecycle E2E coverage matrix

**Status:** coverage contract for guarded staging lifecycle tests. The API-backed lifecycle suite remains opt-in until dedicated synthetic fixtures and the V15 run-tag migration are verified in the single staging environment.  
**Owner goal:** prove one order from buyer checkout through seller processing and delivery completion, then reconcile inventory and every relevant order-history view.  
**Primary workflow:** `.github/workflows/e2e-login.yml`  
**Browser suite:** `e2e/order-daily-help-lifecycle.spec.ts` (guarded staging-only lifecycle tests; requires the V15 run-tag migration and dedicated synthetic fixtures)

## Flow OL-001 — one complete order, end to end

Use a dedicated synthetic buyer, approved synthetic seller, active synthetic delivery agent, and one uniquely named synthetic product. The product must have known initial stock **S**, price **P**, and enough stock for the test quantity **Q**. Prefer COD for the first lifecycle flow so a real payment is never initiated. Keep the test order identifier and product identifier as run-scoped values; never hard-code IDs from a real customer or seller.

1. **Preflight and baseline**
   - Verify the target is exactly the designated staging frontend and API.
   - Verify the transaction database is isolated from any non-test/customer records, and the run's test identities and product are explicitly allowlisted.
   - Read seller inventory and record product ID, seller ID, unit price, initial stock S, and current product/order history counts.
   - Confirm Q is positive and no greater than S. If isolation or baseline cannot be proven, abort before creating any record.
2. **Buyer discovers and checks out**
   - Sign in as the dedicated buyer using the staging OTP capture endpoint.
   - Find the uniquely named test product and verify seller, price P, and available stock S.
   - Add Q to cart; verify line subtotal, discount, delivery fee, and final total against the displayed checkout calculation.
   - Submit a synthetic Kurali delivery address and choose COD. Submit exactly once; retain the returned/displayed order ID.
   - Assert the order appears once in buyer order history / My Account, with the same item, quantity, amount, address, payment method, and initial status. Reload and revisit history to check persistence and no duplicate order.
3. **Seller receives and fulfils**
   - Sign in as the dedicated seller.
   - Assert the order appears once in incoming orders, with matching order ID, buyer, item/amount, and initial status.
   - Accept the order; verify status advances to `ACCEPTED_BY_SELLER` and remains unchanged on refresh.
   - Mark ready for pickup; verify status advances to `READY_FOR_PICKUP`.
   - Check seller inventory after order placement and after fulfilment. Record actual behavior: if stock is reserved/decremented at placement, the available stock must be S-Q exactly once; if the documented domain contract decrements at a later transition, assert that transition instead. In all cases, stock must never go negative or decrement twice. If no authoritative inventory timing contract exists, report it as a product decision/blocker rather than silently assuming one.
4. **Delivery agent claims and completes**
   - Sign in as the dedicated active delivery agent.
   - Assert the ready order appears once in available pickup orders and is not duplicated in active/completed lists.
   - Claim the order; verify it disappears from available jobs and appears once in this agent's active trips with the same order ID.
   - Verify the delivery address, buyer name, pickup seller, route/map, and customer handover OTP controls are present.
   - Use only a run-scoped synthetic delivery OTP delivered through a safe staging-only capture mechanism. Never read a real customer's OTP or log it.
   - Verify an invalid/malformed OTP does not complete the order. Enter the valid test OTP once; assert the API/UI reports success and the order reaches `DELIVERED`.
   - Reload and verify the order is absent from active trips and present exactly once in completed deliveries.
5. **Cross-role reconciliation**
   - Buyer My Account/order history: exactly one matching order, status `DELIVERED`, stable order ID, correct items/quantity/total/payment/address. It remains visible after reload and re-login.
   - Seller order history/completed orders: exactly one matching order and delivered/completed status; it no longer counts as incoming.
   - Delivery history: exactly one completed order assigned to the test agent; no active/available duplicate.
   - Admin order view/diagnostics (if exposed to the admin role): exactly one order with matching buyer, seller, agent, amount, item and terminal status. Admin visibility must be verified against actual UI/API behavior; don't invent a page if none exists.
   - Inventory: product identity is unchanged; stock reflects exactly one deduction of Q according to the approved inventory contract; price and seller ownership remain unchanged.
   - Global order reconciliation: one order ID, one order line for the expected product/quantity, one seller order row, one delivery assignment, no duplicate completion events, and no unrelated records modified.
6. **Evidence and cleanup**
   - Attach screenshot and video for every scenario; retain trace on failure.
   - Save run ID, synthetic identifiers, before/after inventory values, order status snapshots and cross-role assertions as a sanitized test summary.
   - Cleanup deletes only rows tagged to this exact run through `POST /e2e/cleanup/{runId}`. The cleanup preflight aborts before writes if a tagged order references non-synthetic seller/product data, a booking does not point to its run-scoped synthetic service/professional/slot, or an order state makes inventory restoration ambiguous. It restores the quantity reserved by tagged orders, releases only the exact booked synthetic slots, then deletes dependent items/messages before parent rows. Never truncate tables, reset the database, or delete by broad status/date/user queries. If the preflight refuses cleanup, retain the records and report the run ID for manual review.

## Required role-specific order-history assertions

| View | Required assertions |
|---|---|
| Buyer checkout/confirmation | One submission, visible order ID, amount arithmetic correct, no duplicate on reload |
| Buyer My Account / order history | Order persists; item/quantity/total/payment/status agree with source order; delivered status updates |
| Seller incoming orders | Order appears once; status transition is monotonic; no completed order remains incoming |
| Seller inventory | Initial stock, ordered quantity, and final stock reconciled; no negative or double decrement |
| Delivery available jobs | Ready order appears once; only eligible, unassigned order is claimable |
| Delivery active trips | Claimed order assigned to correct agent exactly once; no duplicate card |
| Delivery completed history | Delivered order appears once and is no longer active/available |
| Admin orders/diagnostics | If exposed, order and actor relationships match; no duplicate rows or inconsistent terminal status |
| API/database reconciliation | One canonical order ID; consistent line items, status, seller, buyer, delivery agent, inventory ledger/quantity |

## Additional applicable scenario matrix

Each negative case must assert no unintended mutation. Each retry/idempotency case must verify exactly-once effects.

| ID | Scenario | Expected result |
|---|---|---|
| OL-002 | Buyer submits checkout with missing recipient/address | Validation blocks submit; no order created |
| OL-003 | Buyer tries to order quantity greater than available stock | Clear rejection; no order and no stock change |
| OL-004 | Product has zero stock / is unavailable | Cannot be ordered; no order created |
| OL-005 | Stock changes between product display and checkout | Server revalidates stock; no oversell |
| OL-006 | Double-click checkout / retry after slow response | One canonical order and one inventory effect |
| OL-007 | Price or discount changes between listing and checkout | Server-calculated amount is authoritative; no stale-price overcharge |
| OL-008 | Delivery fee/free-delivery threshold boundary | Correct fee at below, exact, and above threshold |
| OL-009 | Valid/invalid/expired coupon | Correct discount; invalid coupon doesn't change order total |
| OL-010 | COD checkout | Order/payment state follows COD contract; no gateway/payment side effect |
| OL-011 | UPI/card payment pending, failed, success | Order/payment status agrees; failed/pending payment is not falsely marked paid (use payment sandbox only) |
| OL-012 | Seller accepts then marks ready | Only allowed transitions; state persists after reload |
| OL-013 | Seller repeats accept/ready action | Idempotent or safely rejected; no duplicate status/event/order rows |
| OL-014 | Unapproved seller attempts inventory/order actions | Actions remain unavailable/forbidden |
| OL-015 | Delivery agent not active/unregistered attempts claim | Claim blocked; order remains available |
| OL-016 | Two agents race to claim one order | Exactly one assignment wins; loser cannot show the order as assigned to itself |
| OL-017 | Delivery agent enters malformed/wrong OTP | Order remains undelivered; no payout/credit completion |
| OL-018 | Delivery agent uses valid OTP | One transition to delivered and one payout/credit effect |
| OL-019 | Delivery OTP resend and cooldown | Cooldown respected; latest valid OTP semantics are correct; no leaked OTP in logs |
| OL-020 | Delivered order is refreshed/revisited | Remains delivered; never returns to active/available |
| OL-021 | Cancel before seller acceptance | Allowed policy transition; inventory reservation is restored exactly once if reserved |
| OL-022 | Cancellation after seller acceptance / ready / delivery claim | Policy enforced per state; inventory and assignment reconcile |
| OL-023 | Concurrent orders compete for last units | Aggregate accepted quantity never exceeds stock |
| OL-024 | Buyer history refresh/re-login | Same order shown once, latest status displayed |
| OL-025 | Seller incoming/completed history refresh | No duplicates; delivered orders excluded from incoming counts |
| OL-026 | Delivery active/completed lists refresh | No duplicate order across buckets; terminal order in completed only |
| OL-027 | Cross-buyer isolation | Buyer A cannot view Buyer B's order/history/address |
| OL-028 | Cross-seller isolation | Seller A cannot view or mutate Seller B's order/inventory |
| OL-029 | Cross-agent isolation | Agent A cannot complete an order assigned to Agent B |
| OL-030 | Admin order visibility and filtering | Correct authorized scope, counts, statuses and unique order rows |
| OL-031 | API failure during order submission | User gets safe error; retry does not create duplicate order |
| OL-032 | API failure during status transition | UI does not claim success; reload reconciles to server state |
| OL-033 | Out-of-order/duplicate status refresh | UI renders the canonical most advanced valid server state |
| OL-034 | Product removal/stock update while in cart | Checkout revalidates and prevents stale/unavailable product order |
| OL-035 | Item totals, discounts, delivery fee and final payable | UI, API order and seller view agree within currency rounding rules |
| OL-036 | COD delivery completion and payment reconciliation | Delivery status and COD payment status remain distinct and consistent |
| OL-037 | Test rerun after partial failure | Run-scoped data is isolated; prior run's records are not reused accidentally |
| OL-038 | Test cleanup | Only current run's tagged synthetic records can be removed; unrelated records unchanged |

## Preconditions before enabling transactional browser flow in CI

- [ ] Confirm a separate test database/schema or equivalent strong isolation boundary. The existing environment is called staging, but that name alone is not proof of data isolation.
- [ ] Create or provision run-scoped synthetic buyer, approved seller, active delivery agent, and a product with known stock.
- [ ] Provide a test-only way to read the synthetic order's delivery OTP without exposing OTPs to normal users, logs, artifacts, or production.
- [ ] Define the authoritative inventory deduction/reservation point, cancellation restoration behavior, and idempotency contract with backend behavior.
- [ ] Confirm buyer My Account order-history UI and seller/delivery/admin history views actually exist and identify their selectors.
- [ ] Implement safe run-scoped cleanup or an explicit retain-for-inspection policy.
- [ ] Add an explicit CI gate (for example `E2E_ORDER_FLOW_ENABLED=true`) that defaults off and fails closed unless every isolation precondition is present.
- [ ] Run the first full lifecycle manually against synthetic isolated data; inspect screenshots/video/trace and before/after reconciliation before enabling it on schedule.

**Important current limitation:** the existing Playwright suite covers site/login/session checks and read-only smoke probes. It does not yet execute OL-001. Do not describe a green current CI run as proof that ordering, inventory reconciliation, or cross-role order history passed. The next implementation step is the safe fixture/isolation gate and then an executable OL-001 flow.
