# Self-owned authentication & authorization

The BE now owns authentication end-to-end and no longer delegates to Clerk (supersedes [ADR-0004](./0004-clerk-auth-delegation.md)). `src/auth` exposes `POST /auth/register`, `/login`, `/refresh`, `/logout`, `/forgot-password`, `/reset-password`, and `/verify-email`. Passwords are hashed with argon2id. `Account` gained `passwordHash`, `emailVerifiedAt`, and lockout fields; `clerkUserId` was dropped.

Sessions are a short-lived JWT access token (15 min, `HS256`, `Authorization: Bearer`) paired with an opaque, DB-backed refresh token (30-day sliding window) delivered in an `HttpOnly`/`Secure`(prod)/`SameSite=Strict` cookie scoped to the `/api/auth` path. Refresh rotates on every use; presenting an already-rotated token is treated as a theft signal and revokes every session on the account. `AuthGuard`/`AdminGuard` still do a DB lookup on every request for role and soft-delete status — JWT claims are never trusted for authorization freshness, matching what `ClerkGuard`/`AdminGuard` already did under Clerk.

Repeated failed logins trigger per-account exponential backoff rather than a hard lockout, since a hard lock is itself a denial-of-service vector against a legitimate user. Login and forgot-password give identical responses regardless of whether the account exists, to avoid email enumeration; registration does reveal a taken email, which is normal, low-risk UX. Password-reset and email-verification tokens are single-use, hashed at rest, and short-lived (1h / 24h).

Existing (pre-cutover) accounts have no password on file. This was a hard cutover: a one-off script (`scripts/migrate-existing-accounts.ts`) emailed every such account a password-reset link, and any login attempt against a still-unset password returns the same generic invalid-credentials error as a wrong password — no distinct state is leaked. The first `ADMIN` account is created by `prisma/seed.ts` from `ADMIN_EMAIL`/`ADMIN_PASSWORD`, since there is no longer a Clerk dashboard to do this from.

## Consequences

`@clerk/backend` and the `CLERK_SECRET_KEY`/`CLERK_PUBLISHABLE_KEY` env vars are gone. The JWT `sub` claim is now `Account.id` directly rather than a foreign `clerkUserId`, which removed a layer of account-lookup indirection from `cart`, `orders`, and `account`. MFA was explicitly deferred rather than built now; if it's added later, it slots in alongside the existing password check in `AuthService.login`.
