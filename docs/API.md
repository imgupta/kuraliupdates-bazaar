# API Contract

Keep this file contract-level only. Detailed implementation belongs in code.

## Base
`/api/v1`

## Rules
- JSON request/response bodies.
- DTOs define public contracts.
- Validation errors use the common error shape.
- Authentication uses the configured bearer/session mechanism.
- Controllers do not expose persistence entities.

## Core areas
- Auth: registration, OTP, sign-in, current user
- Buyer: profile and addresses
- Orders: create/read/status
- Tracking: rider location and order tracking

When an endpoint changes, update this summary and the DTO/tests; do not paste full controller code here.
