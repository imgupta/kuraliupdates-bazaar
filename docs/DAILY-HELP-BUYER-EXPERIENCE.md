# Daily Help buyer experience

## Product direction

Daily Help is a local, task-first household-help booking experience. The buyer should understand the available task, hourly price, duration, date, local professional window and estimated total before confirming a booking.

This release improves the buyer presentation and interaction without changing provider operations, API payloads, database schema, marketplace settlement, professional verification, booking eligibility, or OTP lifecycle.

## Buyer journey

1. **Discover:** A warm, mobile-first landing area explains the service, shows the buyer locality when available, and offers catalogue-backed search and category filters.
2. **Choose a task:** Service cards show the configured service image (when present), category, name, description and hourly price. No fabricated rating, savings, response-time, trust, or verification claims are shown.
3. **Configure:** The buyer selects a supported duration and India-local date. The duration choices remain hourly and respect the service's configured minimum hours.
4. **Find availability:** The buyer sees windows returned by the availability API. Selecting a window reveals valid 15-minute start-time choices that fit the requested duration and current India-local time.
5. **Review:** The buyer sees the selected professional, date, start/finish time and estimated total before confirming.
6. **Confirm:** The existing buyer API submits the service, buyer profile snapshot, address, locality, scheduled start, requested hours and slot ID. The backend remains authoritative and revalidates eligibility and conflicts. A visible window is not a reservation/hold.
7. **Track:** The buyer sees the existing booking state, assigned professional when available, start OTP only at ARRIVING/READY_TO_START, and the elapsed service timer only after IN_PROGRESS. Completion OTP remains gated by the existing backend response.

## UX and accessibility

- Responsive layout, mobile bottom-sheet booking flow and desktop dialog presentation.
- Search input has an accessible label; category controls expose pressed state.
- Booking dialog exposes dialog semantics, modal state and a labelled heading.
- Date, duration and time controls are keyboard-operable buttons/native inputs.
- Loading, empty availability, API failure, and booking-conflict states are explicit.
- Availability errors have a retry action. Booking conflicts refresh availability and clear the stale selected window.
- No unverified "Trusted" badge or fabricated professional rating is displayed.

## Deliberately out of scope

- Recurring/subscription household help.
- Multi-task bundles or multiple service lines in one booking.
- Professional favourites, chat, worker preference filters, background checks or badges not supported by verified data.
- Cancellation/refund policy changes.
- Backend, Oracle/Flyway, authentication, authorization, pricing, booking conflict, payment, or OTP changes.
- Any claim that selecting a slot reserves it.

These capabilities require separate product, backend, operational and legal design. The current booking contract supports one service per booking and an availability discovery request followed by server-side booking revalidation.

## Acceptance checklist

- [ ] Search matches service name, category and description.
- [ ] Category chips filter the active catalogue.
- [ ] Service cards display configured hourly price and description only.
- [ ] Date and duration changes trigger a fresh availability lookup.
- [ ] Start times are 15-minute increments, fit the slot and duration, and exclude past times for today.
- [ ] A buyer cannot confirm without a selected valid slot/time.
- [ ] Booking payload remains compatible with the existing buyer API.
- [ ] Booking failure refreshes availability and clears stale selection.
- [ ] OTP visibility and service timer remain tied to the existing booking statuses.
- [ ] Frontend typecheck, build, Daily Help regression tests, backend tests and browser E2E complete on the PR head.
- [ ] Manual mobile and desktop staging acceptance is recorded separately; CI alone does not prove visual quality or live booking success.

## Operational notes

The backend's Asia/Kolkata date/time semantics remain unchanged. A visible slot is discovery data only; competing buyers can see the same window and the booking transaction decides the winner. HTTP 409/conflict responses must be treated as a request to choose another available time. Never bypass professional verification or booking conflict checks to make availability appear.
