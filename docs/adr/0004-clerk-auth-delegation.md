# Authentication delegated entirely to Clerk

The BE has no login, registration, or session management endpoints. All authentication is handled by Clerk on the FE side. The BE only verifies JWTs issued by Clerk using Clerk's JWKS endpoint. A single NestJS guard extracts the `userId` from the verified token and attaches it to the request context.

This was chosen because the FE already uses Clerk, making a second auth system redundant. Guest sessions are also managed by Clerk (anonymous sessions), keeping the same verification path for both authenticated and guest Buyers.

## Consequences

There are no `/auth/login`, `/auth/register`, or `/auth/refresh` endpoints in this service. A future reader looking for auth logic will not find it here — it lives in Clerk's hosted service.
