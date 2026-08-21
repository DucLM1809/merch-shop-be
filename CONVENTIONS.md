# Coding Conventions

Decisions behind these rules live in `docs/adr/0009` – `0012`.

---

## 1. TypeScript

`tsconfig.json` must have:

```json
{
  "strict": true,
  "noImplicitReturns": true,
  "noUnusedLocals": true,
  "noUnusedParameters": true
}
```

- No `any`. Use `unknown` + type guard if the type is truly unknown.
- No `as` casts except at external trust boundaries (parsed JSON, Prisma raw queries). Add a comment naming the boundary.
- All function return types must be explicit when the body is longer than one expression.

---

## 2. Module Architecture

This codebase is a **modular monolith**. Each domain module is self-contained and communicates with others through two channels only:

| Channel | When to use |
|---|---|
| **Facade service** (sync, injected) | Queries / reads across module boundaries |
| **Domain event** (async, `@nestjs/event-emitter`) | Side-effects triggered by a state change |

Direct injection of another module's internal service is **forbidden**. Inject the module's facade (exported from its `index.ts`) or emit an event.

---

## 3. Module Internal Structure

Every domain module follows this layout:

```
src/<module>/
├── index.ts                  ← public API (barrel); only exports facade + public DTOs
├── <module>.module.ts
├── <module>.controller.ts    ← HTTP layer only; no business logic
├── <module>.service.ts       ← business logic; no Prisma calls
├── <module>.repository.ts    ← all Prisma queries; extends BaseRepository<T>
├── dto/
│   └── *.dto.ts              ← class-validator decorated; @Exclude on sensitive fields
├── events/
│   └── *.event.ts            ← one file per domain event
└── exceptions/
    └── *.exception.ts        ← one file per domain exception
```

**Layer rules:**
- Controller calls Service only.
- Service calls Repository and may emit events. Never calls Prisma directly.
- Repository calls Prisma only. Never calls Service.
- Cross-module calls go through `index.ts` barrel.

---

## 4. Module Boundaries

Each module exposes a **barrel** at `src/<module>/index.ts` exporting only:
- The facade service
- Public DTOs / types needed by callers

ESLint enforces this. Importing from `src/<module>/**` (bypassing `index.ts`) is a lint error and CI failure.

**Escape hatch**: a barrel import can itself introduce a module-load cycle (e.g. importing `account`'s barrel pulls in `AccountController`, which imports guards from `auth`, which needs `AccountService` — a cycle). When that happens, import the specific file directly instead of the barrel, and pair it with both: a comment explaining which cycle is being avoided, and `// eslint-disable-next-line no-restricted-imports` on the import line so the boundary rule still catches *accidental* deep imports elsewhere. See `src/auth/auth.service.ts` for the reference example.

---

## 5. Error Handling

### Domain exceptions

Services throw typed domain exceptions. Never throw `HttpException` inside a service.

```ts
// src/catalog/exceptions/product-not-found.exception.ts
export class ProductNotFoundException extends Error {
  static readonly CODE = 'PRODUCT_NOT_FOUND';
  constructor(id: string) {
    super(`Product ${id} not found`);
    this.name = ProductNotFoundException.CODE;
  }
}
```

### Global filter

`AllExceptionsFilter` (in `common/`) translates exceptions to HTTP responses. It maps known domain exceptions by name → status code. Unknown exceptions become 500.

### Error response shape

All error responses:

```json
{
  "success": false,
  "code": "PRODUCT_NOT_FOUND",
  "message": "Product abc not found",
  "timestamp": "2026-06-25T10:00:00.000Z"
}
```

`code` is the exception's static `CODE` constant. Frontend keys on `code`, not status.

---

## 6. Success Response Shape

All success responses are wrapped by `ResponseInterceptor` (global, in `common/`). Controllers return raw data; the interceptor wraps it.

Single resource:
```json
{ "success": true, "data": { ... } }
```

List / paginated:
```json
{ "success": true, "data": [...], "meta": { "total": 42, "page": 1, "limit": 20 } }
```

Controllers never construct this envelope manually. List endpoints must use `PaginationQueryDto` from `common/`.

---

## 7. Security

All of the following are global defaults. Per-route opt-outs require an explicit comment explaining why.

| Measure | How |
|---|---|
| Payload size limit | `express.json({ limit: '10kb' })` in `main.ts` (Stripe webhook route keeps raw body) |
| Sensitive field stripping | `@Exclude()` on entity class fields + global `ClassSerializerInterceptor` |
| Audit log | Global `AuditInterceptor` logs `{ userId, method, path, timestamp }` on every mutating request (`POST/PUT/PATCH/DELETE`) |
| Input validation | Global `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true })` — already in place |
| Rate limiting | `ThrottlerModule` — already in place; tighten per-route with `@Throttle()` for sensitive endpoints |
| Headers | `helmet()` — already in place |

---

## 8. Caching

Use Redis via `@nestjs/cache-manager`.

**Must cache** (mandatory `@CacheKey` + `@CacheTTL`): all `GET` handlers in the `catalog` module.

**May cache**: other read-heavy endpoints at the team's discretion.

**Must invalidate**: repository write methods (`create`, `update`, `delete`) must call `cacheManager.del(key)` for any key they affect.

Default TTL: **300 seconds** unless a route overrides with `@CacheTTL`.

---

## 9. Database / Prisma

**Always specify `select`** on Prisma queries. Never fetch a full record when a subset suffices.

```ts
// ✅
prisma.product.findMany({ select: { id: true, name: true, slug: true } });

// ❌
prisma.product.findMany();
```

**No N+1 queries.** Never query inside a loop. Use `findMany({ where: { id: { in: ids } } })` or Prisma `include`.

**Pagination**: `skip`/`take` (offset) is the default. For tables expected to grow large, prefer cursor-based pagination (`cursor` + `take`).

All Prisma calls live in the repository layer only.

---

## 10. Domain Events

One file per event in `<module>/events/`. Event class carries a static name constant.

```ts
// src/commerce/events/order-placed.event.ts
export class OrderPlacedEvent {
  static readonly NAME = 'order.placed';
  constructor(
    readonly orderId: string,
    readonly buyerId: string,
  ) {}
}

// emit
this.eventEmitter.emit(OrderPlacedEvent.NAME, new OrderPlacedEvent(id, buyerId));

// handle
@OnEvent(OrderPlacedEvent.NAME)
handleOrderPlaced(event: OrderPlacedEvent) { ... }
```

**Naming pattern**: `<module>.<past-tense-verb>` (e.g. `order.placed`, `payment.completed`, `order.fulfilled`).

Event handlers must be **idempotent** — the same event may be delivered more than once during restarts.

---

## 11. Common Module (`src/common/`)

The shared module. Nothing domain-specific lives here.

| Export | Purpose |
|---|---|
| `BaseRepository<T>` | Generic `findById`, `findAll`, `create`, `update`, `delete` backed by Prisma |
| `PaginationQueryDto` | `page`, `limit` query params with class-validator |
| `PaginationMeta` | `{ total, page, limit }` type |
| `ResponseInterceptor` | Wraps all responses in success envelope |
| `AllExceptionsFilter` | Translates domain exceptions → HTTP + error envelope |
| `AuditInterceptor` | Logs mutating requests |

Modules extend `BaseRepository` and override only what's custom.

---

## 12. Testing

This codebase favors **integration tests as the default**, with **unit tests reserved for real branching logic** — algorithms, state transitions, and edge-case-heavy pure functions that are cheap to isolate and expensive to exercise indirectly through HTTP + DB round trips.

**Write a unit spec (`*.spec.ts` under `src/`)** for a service or util when it has:
- Non-trivial conditional branching (multiple failure/success paths through one method)
- A state machine or ordering invariant (e.g. Order status transitions, token lifecycle)
- Security-sensitive logic (hashing, lockout backoff, signature/webhook verification)
- Pure logic with several edge cases that are awkward to hit via a live DB (empty inputs, boundary values)

**Rely on integration tests alone** (`*.integration.spec.ts` under `test/integration/`) for modules that are mostly CRUD passthrough with no meaningful branching — the Controller → Service → Repository → Prisma path is what needs verifying there, not isolated logic.

When a module gains branching logic it didn't have before (e.g. a merge/conflict rule, a new guard condition), add the unit spec in the same change — don't let coverage drift from the module's actual risk.

---

## 13. DRY Rules

- One `PaginationQueryDto` in `common/` — never redeclare it per module.
- One `AllExceptionsFilter` — never add a second global filter.
- Repository base handles generic CRUD — only override when Prisma query differs structurally.
- DTOs are not reused across modules. Each module owns its own DTO shape even if structurally similar (avoids accidental coupling through shared types).
