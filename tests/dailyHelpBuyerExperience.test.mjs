import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const component = readFileSync('src/components/Buyer/DailyHelpHome.tsx', 'utf8');
const guide = readFileSync('docs/DAILY-HELP-BUYER-EXPERIENCE.md', 'utf8');

test('Daily Help buyer discovery is catalogue-backed and interactive', () => {
  for (const phrase of [
    'Search Daily Help services',
    'Filter services by category',
    'service.description',
    'service.pricePerHour',
    'setActiveCategory',
    'setQuery',
  ]) assert.ok(component.includes(phrase), `Missing discovery behavior: ${phrase}`);
});

test('booking review preserves the existing server-authoritative contract', () => {
  for (const phrase of [
    'getDailyHelpAvailableSlots(bookingDate, hours, user.locality)',
    'createDailyHelpBooking({',
    'serviceId: selected.id',
    'scheduledStart,',
    'requestedHours: hours',
    'slotId: selectedSlot.slotId',
    'Your time is confirmed only after booking succeeds',
    'setSelectedSlot(null)',
  ]) assert.ok(component.includes(phrase), `Missing booking invariant: ${phrase}`);
});

test('time choices and OTP lifecycle remain guarded', () => {
  for (const phrase of [
    'Math.ceil(earliest / 15) * 15',
    'windowEnd - first - durationHours * 60',
    "['ARRIVING', 'READY_TO_START'].includes(currentBooking.status)",
    "currentBooking.status === 'IN_PROGRESS'",
    'The service timer starts only after this OTP is verified.',
  ]) assert.ok(component.includes(phrase), `Missing time/OTP guard: ${phrase}`);
});

test('buyer redesign documents unsupported future features honestly', () => {
  assert.match(guide, /Recurring\/subscription household help/);
  assert.match(guide, /Multi-task bundles/);
  assert.match(guide, /visible window is not a reservation\/hold/i);
  assert.match(guide, /Asia\/Kolkata/);
});

test('buyer can review Daily Help bookings and cancel only eligible future work', () => {
  for (const phrase of [
    'Daily Help booking history',
    'cancelDailyHelpBooking',
    'CANCELLED_BY_BUYER',
    'serviceStartedAt',
    'otpVerifiedAt',
    'Cancel booking',
  ]) assert.ok(component.includes(phrase) || (phrase === 'cancelDailyHelpBooking' && readFileSync('src/services/domains/dailyHelpApi.ts', 'utf8').includes(phrase)), `Missing buyer lifecycle behavior: ${phrase}`);
});

test('Daily Help history is compact by default and can be expanded', () => {
  assert.match(component, /showAllBookings \? bookings\.length : 2/);
  assert.match(component, /showAllBookings \? 'Show less' : 'View all'/);
  assert.match(component, /aria-expanded=\{showAllBookings\}/);
});

test('buyer order and cart dock stays compact on mobile', () => {
  const buyerHome = readFileSync('src/components/Buyer/BuyerHome.tsx', 'utf8');
  assert.match(buyerHome, /Keep the order shortcut compact/);
  assert.match(buyerHome, /activeOrders\[0\]\.id/);
  assert.match(buyerHome, /Track ›/);
  assert.doesNotMatch(buyerHome, /showAllActiveOrders/);
});
