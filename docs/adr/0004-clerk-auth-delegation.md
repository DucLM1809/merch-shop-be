# Authentication delegated entirely to Clerk

> **Superseded by [ADR-0013](./0013-self-owned-authentication.md).** Kept below for historical record; the BE now owns authentication directly and no longer integrates with Clerk.
>
> Footnote on the paragraph below: guest sessions were never actually routed through Clerk's anonymous sessions as this ADR originally claimed — the implementation always used a self-issued `cart_session` cookie (see [ADR-0006](./0006-server-side-guest-cart.md)). The text is left as originally written rather than silently corrected.

The BE has no login, registration, or session management endpoints. All authentication is handled by Clerk on the FE side. The BE only verifies JWTs issued by Clerk using Clerk's JWKS endpoint. A single NestJS guard extracts the `userId` from the verified token and attaches it to the request context.

This was chosen because the FE already uses Clerk, making a second auth system redundant. Guest sessions are also managed by Clerk (anonymous sessions), keeping the same verification path for both authenticated and guest Buyers.

## Consequences

There are no `/auth/login`, `/auth/register`, or `/auth/refresh` endpoints in this service. A future reader looking for auth logic will not find it here — it lives in Clerk's hosted service.
