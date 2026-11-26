# Daily Help buyer launch readiness

## Scope

This change hardens the existing Daily Help buyer journey after the buyer discovery/booking redesign. It does not introduce a new booking API or change the professional/admin workflows, payment model, database schema, or OTP lifecycle.

## Source audit

The current backend already provides the required core API contract:

- Public read-only active service catalogue and availability discovery.
- Authenticated BUYER booking creation; buyer name and phone are taken from the authenticated account, not trusted from the request.
- Server-side service-active, professional-verified/available, selected-window, India-local future-time, 15-minute start, booking-overlap and turnaround-buffer checks.
- Per-professional pessimistic locking while validating and creating a booking.
- Authenticated buyer-owned booking history, booking detail and eligible future-booking cancellation.
- Buyer-held start OTP and professional-owned lifecycle transitions.

The buyer UI had not exposed the existing history/cancellation capability. The new UI surfaces booking history and cancellation only while the booking is still eligible. Cancellation is revalidated by the backend under a booking row lock.

## Changes in this release

### Backend validation

- Removed the DTO's JVM-default-timezone `@FutureOrPresent` check for `LocalDateTime`. The service remains the authoritative future-time validator using `Asia/Kolkata`, avoiding disagreement between Render's host timezone and the marketplace timezone.
- Enforce the configured service minimum duration in the booking service, not only in the browser.
- Enforce 15-minute duration increments server-side.
- Bound public availability queries to 1–12 hours and 15-minute increments.
- Use the India-local date consistently when checking same-day professional availability windows.

### Buyer portal

- Show recent Daily Help bookings with service, scheduled time, duration, estimated total and current status.
- Show cancellation only for future `PROFESSIONAL_ASSIGNED`, `ARRIVING` or `READY_TO_START` bookings that have not started or verified the start OTP.
- Confirm cancellation before submitting; backend ownership and lifecycle checks remain authoritative.
- Refresh the booking record after cancellation errors so the buyer sees the server's actual state.
- Show the active booking's scheduled time, address and price snapshot.
- Make catalogue and availability request failures visible instead of silently presenting them as empty results.
- Add retry for booking-history load failures.
- Include a duration choice for service minimums beyond the original 1/1.5/2/3-hour buttons (up to the API's 12-hour limit).

## Security and money boundaries

- No payment, wallet, escrow, platform custody, commission settlement, or refund behavior was added.
- No buyer-provided phone/name is trusted for identity.
- No professional verification, OTP, or booking status guard was weakened.
- A displayed availability window is discovery data, not a reservation. The booking transaction rechecks availability and conflicts.
- No fabricated ratings, trust badges, response-time guarantees or recurring-booking claims are introduced.

## Required launch acceptance

CI is necessary but not sufficient. Before enabling buyer traffic, the release owner must verify:

1. Oracle schema is current and the backend reports API and database health as UP.
2. An authenticated staging buyer can browse the real active catalogue, see only verified/available professionals in the intended locality, create a booking, see the booking in history, and cancel an eligible future booking.
3. A staging professional can move the same booking through ARRIVING, READY_TO_START, start-OTP verification, IN_PROGRESS and completion; the buyer sees only the buyer-held OTP at the permitted states.
4. A second buyer cannot take an overlapping time for the same professional; test both sequential conflict and concurrent requests against isolated Oracle data.
5. Wrong-owner, wrong-role, anonymous and expired-session requests are rejected; cancellation after start/OTP verification is rejected.
6. Admin has approved the actual professionals, confirmed their service area and operating hours, configured the turnaround buffer, and populated accurate service names, descriptions, minimum hours, hourly rates and images.
7. Buyer-facing support/contact, cancellation policy, service scope/inclusions, provider conduct/escalation and the real payment/collection arrangement are reviewed and published before public promotion.
8. Mobile Safari and desktop staging acceptance is performed with real authenticated sessions. CI screenshots or mocked tests are not a substitute.

## Known launch blockers outside this PR

- CI's backend unit tests and staging smoke/E2E jobs do not prove Oracle multi-session contention, migration recovery, or the complete real-world Daily Help lifecycle unless the dedicated transactional staging suite is explicitly enabled and passes against isolated synthetic data.
- Real provider supply, admin approval, service catalogue accuracy, local coverage and support operations require business-owner confirmation.
- Legal, consumer-protection, tax, worker classification, insurance and privacy obligations require qualified review for the actual operating model.
- Production deployment and buyer launch are separate release decisions. Do not describe this PR as a public launch approval.
