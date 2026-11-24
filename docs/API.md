# API contract index

Base path: `/api/v1`. Backend controllers and DTOs are authoritative; update this index when public contracts or authorization rules change.

## Conventions
- JSON for ordinary requests/responses; multipart form-data for seller document uploads.
- Authenticated browser endpoints use the configured session-cookie mechanism with CSRF protection; non-browser clients must follow the supported authentication contract. Do not assume a bearer token is accepted unless the endpoint/client contract explicitly says so.
- Validate input at the boundary and enforce role/record ownership in services.
- Return DTOs, never persistence entities.
- Errors must not expose stack traces, SQL, secrets or private document content.

## Domain areas
| Domain | Responsibilities |
|---|---|
| Authentication | OTP registration/verification, sign-in, current identity |
| Buyer | Profile, saved addresses, catalogue, cart and checkout |
| Seller | Profile, products, orders, onboarding documents and compliance status |
| Admin | Seller review/approval, document verification and operational configuration |
| Orders | Checkout groups, seller suborders, order state and pickup/delivery |
| Bargaining | Negotiation chat, accepted-offer validation and negotiated item price |
| Delivery | Agent profile, available jobs, claim, OTP, location and payout |
| Daily Help | Service catalogue, provider profile, slots, booking and job lifecycle |
| Tracking | Order/rider tracking and location reads |

## Full workflow reference

See [All flows end-to-end](ALL-FLOWS-END-TO-END.md) for role journeys, endpoint families, security/ownership boundaries, transaction rules, Oracle entity map, class diagram, sequence diagrams and E2E acceptance matrix. See [Daily Help end-to-end design](DAILY-HELP-END-TO-END.md) for the detailed Daily Help contract and lifecycle.

## Seller documents
Seller-owned upload/list operations are implemented under `/sellers/me/documents`; admin review/download/verification operations are role-restricted. Confirm exact controller mappings and DTOs in source before integrating. Never expose private file URLs.

## Contract change checklist
Update DTO validation, service/controller tests (including role and ownership boundaries), frontend domain client and contract tests. Update this index only for externally observable contract/security changes.
