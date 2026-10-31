# Multi-seller combined delivery (staging rollout notes)

## Checkout
Authenticated buyers call `POST /buyers/orders/checkout` with delivery address/locality, COD payment method, buyer destination coordinates/place ID, and product IDs with quantities. Seller ownership, product prices, accepted bargaining offers, stock and seller limits are resolved by the backend. The API creates seller-owned suborders under one checkout group in one transaction.

## Seller locations
Root admin records and verifies seller latitude/longitude through `POST /admin/sellers/{sellerId}/location`. Combined rider routing refuses unverified or missing seller coordinates.

## Combined rider claim
When every seller suborder is `READY_FOR_PICKUP`, an active rider can call `POST /delivery/jobs/checkout/{checkoutGroupId}/claim?agentId=...`. The backend locks all suborders, requests an optimized driving route from Google Routes, checks the configured maximum road distance, then assigns all orders with one shared OTP. Existing individual order claims remain the fallback when the route cannot be validated or exceeds the configured limit.

Set `google.maps.routes.api-key` (environment variable `GOOGLE_MAPS_ROUTES_API_KEY` when relaxed Spring environment binding is used) on the backend. Without a valid Routes API key, combined claims fail closed and individual jobs remain available.

## Completion and payout
For a combined claim, verifying the shared OTP on any order completes the entire group in one transaction and credits one trip payout. For separately claimed orders, OTP completion affects only that order. Rider base and per-kilometre payout rates are read from `DELIVERY_CONFIGURATION`.

## Remaining rollout gates
- Configure and verify the Google Routes API key and Maps Routes API billing/quota.
- Run backend tests and the guarded synthetic multi-seller lifecycle after fixture preflight is clean.
- Store-pickup checkout mode and immutable per-order rider-payout snapshots are not part of this patch yet.
- No staging database mutation or deployment is performed by this change.
