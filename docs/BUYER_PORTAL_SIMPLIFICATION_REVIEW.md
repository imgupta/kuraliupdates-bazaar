# Buyer Portal Simplification Review

**Scope:** Buyer grocery shopping and bargaining flow  
**Implementation branch:** `buyer/simplified-buyer-commerce`  
**Review status:** Implemented changes are in the accompanying PR; remaining observations are recorded below.

## Findings and changes in this PR

| Priority | Finding | Change |
|---|---|---|
| Critical | Opening Bargain immediately created a pending offer, inserted a message and notified the seller. | Opening now creates only a draft conversation. No offer, message, expiry timer or seller notification is created until the buyer presses **Send Offer**. |
| Critical | Opening Bargain also created a pending cart line before the seller agreed. | Draft and pending offers do not add a product to the cart. |
| High | Buyer had to manually add an accepted bargain to the cart. | A newly accepted offer automatically upserts the product at the agreed unit price. The transition guard prevents repeated polling from increasing quantity or re-adding an item the buyer later removes. |
| High | Product cards used a large Add to Cart button and had no direct quantity control. | Replaced it with inline **− / quantity / +** controls. Updates are immediate, no confirmation dialog is shown, and quantity is capped at available stock. |
| Medium | Product cards exposed too many competing actions. | Removed the compare-stores action from the card. Compare remains available from product details; the card keeps the core purchase actions and a single **Make an offer** action. |
| Medium | The cart subtotal used the raw seller price for ordinary items even when the catalogue discount was active. | Subtotal now uses the same effective unit-price calculation as cart lines and seller totals. |
| Medium | Draft conversations could appear in the seller's conversation list before the buyer sent anything. | Seller list hides conversations with no messages. The conversation becomes visible after the buyer explicitly sends a message or offer. |
| Medium | First buyer offer was labelled and notified as a counter-offer. | The first explicit buyer offer now produces a NEW_OFFER notification; later offers remain counter-offers. |

## Intended buyer journey

1. Browse products and see the catalogue price, availability and pack size.
2. Tap **+** to add one unit immediately; tap **−** to reduce it. At zero, the line is removed.
3. Tap **Make an offer** only when interested in negotiating.
4. Choose a suggested discount or enter a custom amount. Suggested amounts only fill the draft field.
5. Tap **Send Offer** to submit. Only this action creates the offer and notifies the seller.
6. On seller acceptance, the agreed price is automatically reflected in the cart. Buyer can still adjust quantity.
7. Checkout continues to use backend stock, ownership, seller and negotiated-price validation.

## Invariants to preserve

- No offer is sent by opening a modal, selecting a preset or typing a price.
- No draft or pending offer is treated as an accepted cart price.
- An accepted bargain is inserted once per acceptance transition, not once per polling cycle.
- A buyer removing an accepted bargain from the cart must not have it silently re-added by polling.
- Product quantity cannot exceed the latest catalogue stock known to the client; backend checkout remains authoritative.
- Normal catalogue purchases remain available if an offer is rejected or expires.
- Existing seller authorization, buyer ownership checks, one-time bargain lifecycle and multi-seller checkout rules remain unchanged.
- Accepted bargain price is a per-unit price and must be revalidated by the backend at checkout.

## Further simplification opportunities identified

These are deliberately not bundled into this PR because they need separate product decisions or broader testing:

1. **Product details parity:** reuse the same quantity stepper in the details modal so quantity does not appear to reset between card and details views.
2. **Search and category hierarchy:** keep search prominent, show a compact category row, and move less-used filters behind one Filters control.
3. **Filter correctness:** make the maximum-price range derive from current catalogue prices rather than relying on a fixed ₹3,000 ceiling; expose a visible sort selector only if users need it.
4. **Cart clarity:** keep one clear subtotal, delivery fee and final payable amount; show seller grouping only when multi-seller checkout is active.
5. **Order tracking:** keep one compact latest-active-order strip and move older active orders behind View all; ensure it never covers checkout or primary navigation.
6. **Bargain history:** present pending, accepted, rejected and expired states in a compact list with one obvious next action for each.
7. **Accessibility and mobile:** retain accessible labels for +/- controls, keyboard operation, touch targets, visible focus and screen-reader quantity announcements.
8. **Performance:** avoid recalculating cart lookup for every card at scale by deriving a product-id-to-quantity map once per render if catalogue size grows substantially.

## Verification required before merge

- Frontend TypeScript/lint and production build.
- Backend unit and integration tests, especially negotiation open/send/respond and cart/order pricing.
- Browser E2E: opening Bargain does not notify seller; preset selection does not send; Send Offer does; acceptance auto-adds exactly once; decrement to zero removes; stock cap works; checkout uses accepted price.
- Regression: seller can still accept/reject/counter, buyer can respond to seller counter-offers, rejected/expired bargains retain catalogue-price purchase, and multi-seller restrictions remain enforced.

No deployment, database migration, DNS or Render configuration change is part of this work.
