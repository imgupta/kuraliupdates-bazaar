# Multi-seller combined delivery (staging rollout notes)

## Checkout
Authenticated buyers call `POST /buyers/orders/checkout` with delivery address/locality, COD payment method, buyer destination coordinates/place ID, and product IDs with quantities. Seller ownership, product prices, accepted bargaining offers, stock and seller limits are resolved by the backend. The API creates seller-owned suborders under one checkout group in one transaction.

## Seller locations
Root admin records and verifies seller latitude/longitude through `POST /admin/sellers/{sellerId}/location`. Combined rider routing refuses unverified or missing seller coordinates.

## Store pickup

Buyers may select `STORE_PICKUP` for a multi-seller checkout when `STORE_PICKUP_ENABLED=1`. The checkout creates one seller-owned order per store, removes all delivery charges, and snapshots a zero rider payout. Store-pickup orders are excluded from rider job feeds and cannot be claimed by riders. Once a seller marks an order `READY_FOR_PICKUP`, the buyer can show the order OTP and confirm collection through `POST /buyers/orders/{orderId}/confirm-pickup` with `{ "otp": "1234" }`. The buyer must own the order and the OTP must match.

## Customer delivery charge

For a delivery checkout, the configured customer base fee is applied once to the grouped checkout. If Google Routes can calculate the verified seller-to-buyer road route, the configured per-kilometre amount is added. If road routing is unavailable, the checkout charges only the configured base fee; it never substitutes straight-line or client-supplied distance. The full fee is stored in the first seller order and zero in the remaining suborders, preserving the total checkout charge without double charging.

## Combined rider claim
When every seller suborder is `READY_FOR_PICKUP`, an active rider can call `POST /delivery/jobs/checkout/{checkoutGroupId}/claim?agentId=...`. The backend locks all suborders, requests an optimized driving route from Google Routes, checks the configured maximum road distance, then assigns all orders with one shared OTP. Existing individual order claims remain the fallback when the route cannot be validated or exceeds the configured limit.

Set `google.maps.routes.api-key` (environment variable `GOOGLE_MAPS_ROUTES_API_KEY` when relaxed Spring environment binding is used) on the backend. Without a valid Routes API key, combined claims fail closed and individual jobs remain available.

## Completion and payout

Rider payout is snapshotted when an individual or combined delivery is claimed. Combined checkout payout is stored once on the first seller order and zero on the remaining orders. Later admin rate changes do not change an already claimed delivery's payout. Legacy pre-snapshot jobs retain a compatibility calculation when completed.
For a combined claim, verifying the shared OTP on any order completes the entire group in one transaction and credits one trip payout. For separately claimed orders, OTP completion affects only that order. Rider base and per-kilometre payout rates are read from `DELIVERY_CONFIGURATION`.

## Remaining rollout gates
- Configure and verify the Google Routes API key and Maps Routes API billing/quota.
- Run backend tests and the guarded synthetic multi-seller lifecycle after fixture preflight is clean.
- Store-pickup checkout mode and immutable per-order rider-payout snapshots are not part of this patch yet.
- No staging database mutation or deployment is performed by this change.
