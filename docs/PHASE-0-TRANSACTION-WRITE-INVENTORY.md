# Phase 0 — Transaction and write-path inventory

**Audit date:** 2026-11-06  
**Scope:** Static inspection of service-level transaction annotations, repository/JDBC writes, row-lock usage and process-local state. This inventory does not substitute for database concurrency or rollback tests.

## Write-path inventory

| Domain | Transaction boundary observed | Write/consistency behavior | Remaining proof |
|---|---|---|---|
| Authentication/session | AuthService methods use transactions for OTP verification, profile updates, logout/session creation and account checks | Session revocation deletes USER_SESSIONS; account suspension/revocation invalidates existing sessions | Test concurrent logout/redeem and verify account suspension blocks all protected endpoints |
| Buyer addresses | BuyerAddressService has class-level transaction | Clear old default, save selected address and sync legacy USERS address fields in one transaction | Add concurrent set-default test and verify unique/default invariant under two requests |
| OTP | OtpService send/verify are transactional | Cooldown check, OTP hash persistence and consume/attempt updates are grouped | Concurrent resend requests can race unless repository enforces a database-level cooldown invariant; add concurrency test |
| Grocery orders | OrderService placeOrder and multi-seller checkout are transactional | Product rows are locked in deterministic product-ID order; multi-seller checkout wraps seller suborders in one transaction | Add concurrent stock depletion and multi-seller rollback integration tests against Oracle |
| Pickup confirmation | OrderService confirmStorePickup is transactional | Locks the order, validates owner/mode/status/OTP and updates final state | Add replay/concurrent pickup OTP test |
| Delivery claims | DeliveryService claim and combined checkout claim are transactional | Validates authenticated agent ownership/availability and locks order(s) before assigning | Add two-rider same-order race test and combined-checkout all-or-nothing test |
| Delivery tracking | DeliveryTrackingService location update is transactional | Requires active session, matching agent profile and ACTIVE delivery approval | Add concurrent location write test and ensure old location freshness policy |
| Daily Help | DailyHelpService uses transactions around booking, slot, job and lifecycle operations | Booking and slot updates are persisted through service methods | Add concurrent slot booking test, duplicate acceptance test and start/complete replay tests |
| Bargaining | NegotiationChatService methods are transactional | Send/offer paths lock chat lifecycle rows with SELECT ... FOR UPDATE; participant ownership is checked | Add concurrent accept/counter/reject tests and verify cart insertion exactly once |
| Seller inventory/orders | SellerService uses transactions around product, availability, order-status and discount changes | Ownership is resolved from authenticated seller profile | Add cross-seller product/order IDOR tests and state-transition race tests |
| Seller service radius | SellerServiceAreaService uses transactions for configuration/history changes | Current value and append-only history update together | Add concurrent admin update/audit consistency test |
| Seller onboarding | SellerOnboardingLeadService wraps lead creation, verification, callback, submission and admin updates in transactions; OTP send delegates to transactional OtpService | Lead status and audit rows are written together on transactional methods | Add duplicate lead creation race test, verification replay test and status transition matrix |
| Seller registration draft | SellerRegistrationDraftService uses transactions for get/normalize, save and delete | Draft rows are scoped to authenticated user | Add concurrent draft update test and verify no cross-user overwrite |
| E2E cleanup | E2eRunCleanupService is transactional | Pre-validates all tagged orders/bookings/chats before writes; deletes only synthetic run-tagged rows and restores stock once | Add Oracle integration rollback test using mixed synthetic/non-synthetic references |
| Portal handoff | PortalHandoffService create is transactional; consume is REQUIRES_NEW | Stores only SHA-256 digest of a 256-bit code; conditional update makes consume one-time and commits before session/role checks | V31 migration and atomic consume must be verified against Oracle staging before merge |

## State inventory

- Production business state is persisted in Oracle through JPA repositories and JdbcTemplate; the current audit found no other production process-local cache suitable for session, order, booking, negotiation or delivery ownership state.
- Portal handoff was the identified production-relevant process-local map and is replaced in this branch by V31-backed storage.
- E2eOtpCaptureService intentionally uses an in-memory ConcurrentHashMap only for explicitly enabled staging OTP capture. It requires E2E_OTP_CAPTURE_ENV=staging, enabled flag and explicit allowlist; it must remain staging-only and is not a production state store. It is also single-instance and will not share captured OTPs across multiple app instances.
- No @Async, @Scheduled or event-listener workflow was identified in the inspected core controller/service write paths. Re-run a full repository-wide scan before introducing background workers or horizontal scaling.

## Phase 0 exit tests still required

1. Oracle concurrency tests for stock reservation, multi-seller rollback, delivery claim races, Daily Help slot reservation and bargain acceptance.
2. Oracle rollback tests for E2E cleanup and admin configuration/audit writes.
3. OTP resend cooldown concurrency enforcement at the database boundary.
4. Address default uniqueness under concurrent writes.
5. Session logout/revocation and portal handoff concurrent redemption.
6. Full IDOR matrix for buyer/seller/delivery/professional/chat/order identifiers.
7. Backup/restore and schema migration rollback/recovery rehearsal.

