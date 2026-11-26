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
    'minute + durationHours * 60',
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
