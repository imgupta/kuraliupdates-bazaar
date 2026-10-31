# Customer order tracking sponsorship slot

The buyer order-tracking screen supports one optional, first-party sponsored card. It is deliberately not mounted in the storefront, checkout, account, or any other role portal.

## Configure a campaign

Set these variables on the Buyer Vercel project only:

- `VITE_TRACKING_SPONSOR_TITLE` — sponsor/business name (required)
- `VITE_TRACKING_SPONSOR_DESCRIPTION` — short offer or message (required)
- `VITE_TRACKING_SPONSOR_IMAGE` — optional HTTPS image URL
- `VITE_TRACKING_SPONSOR_URL` — optional HTTP(S) destination URL

The card is not rendered unless both title and description are configured. The destination is validated to HTTP(S), opens in a new tab, and uses `noopener noreferrer`. No third-party ad script, cookie, tracking pixel, or external SDK is loaded.

## Commercial and operational notes

This is a controlled placement for direct-sold local sponsorships, not a complete ad-management or billing system. Campaign scheduling, impression/click analytics, invoicing, advertiser self-service, and admin campaign controls require a follow-up backend/admin feature. Do not place customer/order identifiers or delivery OTPs in campaign URLs or analytics.

Keep sponsor copy clearly labelled as **Sponsored**. The sponsor card is below order progress and delivery information, and never appears above the order status, in the map, or beside the handover code.
