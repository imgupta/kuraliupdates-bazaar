# API contract index

Base path: `/api/v1`

This document is an index, not a generated endpoint catalogue. The backend controllers and DTOs are authoritative; update this page when a public contract or authorization rule changes.

## API conventions

- JSON for ordinary requests/responses; multipart form-data for seller document uploads.
- Authenticated endpoints use the configured bearer-token mechanism.
- Validate input at the boundary and enforce ownership/role checks in the service layer.
- Return DTOs, never persistence entities.
- Error response details should not expose stack traces, SQL, secrets or private document content.

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

## Seller document API

The current implementation includes seller-owned upload/list operations under `/sellers/me/documents` and admin review/download/verification operations. Confirm exact controller mappings and DTOs in source before integrating a new client; do not invent endpoint paths or expose private file URLs. Authorization must be checked on every request.

## Contract maintenance

For each API change:
1. Update the request/response DTO and validation.
2. Add service/controller tests for success, invalid input, role and ownership boundaries.
3. Update the relevant frontend domain API client and contract tests.
4. Update this domain index only where the externally observable contract or security boundary changed.
