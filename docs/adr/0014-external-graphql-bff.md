# External GraphQL BFF, not a GraphQL layer on this BE

A GraphQL backend-for-frontend will live in a separate repo and be deployed as its own service. It calls this BE's existing public REST API over HTTP, the same as any other authenticated client — this BE gains no GraphQL of its own and its architecture is otherwise unchanged. [ADR-0007](./0007-rest-over-graphql.md) still holds for this BE: REST remains correct here because the reasoning was about this service's own contract, not about whether GraphQL is useful anywhere in the system.

The trigger is different from what 0007 evaluated: 0007 rejected GraphQL because there was exactly one client with one well-known shape. The BFF exists because that's no longer expected to hold — mobile and web clients (neither built yet) are expected to want different response shapes than a single generic REST contract can serve well, and a BFF lets each client's shape evolve without renegotiating this BE's contract.

Because both consumers are still speculative, the BFF starts as a thin vertical slice rather than a full mapping of the REST surface: NestJS + `@nestjs/graphql` (code-first, matching this codebase's framework), with `products` as the root query plus its directly-nested relations, resolved by hand-written HTTP calls into this BE's REST API (no OpenAPI codegen yet — not worth it for one resource). The slice was chosen because `GET` reads under `src/catalog` carry no guard (only mutations require `AdminGuard`), so it needs no auth story to stand up end-to-end.

Auth through the BFF is explicitly deferred, not solved. This BE's session model — short-lived JWT plus an `HttpOnly`/`SameSite=Strict` refresh cookie scoped to `/api/auth` with per-request DB session lookups (see [ADR-0013](./0013-self-owned-authentication.md)) — is browser-shaped and doesn't map cleanly onto a mobile client. That gets designed when a resource requiring auth is added to the BFF, not before.

## Consequences

Any future reader of ADR-0007 who finds GraphQL in this system should land here: this BE did not reverse that decision, a separate consumer-facing layer was added in front of it. The BFF repo owns its own decisions about schema shape, auth translation, and REST-surface coverage as it grows past the initial slice; none of that is committed to by this ADR.
