# Graph Report - merch-shop-be  (2026-08-19)

## Corpus Check
- 117 files · ~11,142 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 772 nodes · 1669 edges · 45 communities (37 shown, 8 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 3 edges (avg confidence: 0.83)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `68a3fcf3`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Auth & Commerce Modules
- Architecture Decision Records
- CartRepository
- Skill Framework & Design Patterns
- Fulfillment & Supplier Port
- Issue Triage & Workflow Skills
- Catalog & Characters API
- Products & DTOs
- TypeScript Config
- Games API
- Publishers API
- Teams API
- Runtime Dependencies
- SKUs API
- Build & Migration Scripts
- Skill Writing Vocabulary
- NestJS CLI Config
- HITL Diagnostics Script
- Beads Issue Tracker
- Order DTOs
- auth.service.ts
- AccountService
- Docker Compose
- AccountRepository
- AccountController
- publishers.service.ts
- PublishersRepository
- PublishersController
- .register
- RefreshTokenRepository
- CreateOrderDto
- orders.service.spec.ts
- PrismaExceptionFilter
- OrderPlacedEvent
- PrismaService
- common.module.ts
- BaseRepository
- common/index.ts
- LocalhostBypassThrottlerGuard
- PaginationQueryDto
- .remove
- LoginDto
- game-not-found.exception.ts

## God Nodes (most connected - your core abstractions)
1. `PrismaService` - 34 edges
2. `BaseRepository` - 28 edges
3. `DomainException` - 27 edges
4. `CartRepository` - 20 edges
5. `AccountService` - 19 edges
6. `ProductsService` - 19 edges
7. `SkusRepository` - 19 edges
8. `AccountRepository` - 17 edges
9. `OrdersRepository` - 17 edges
10. `OrdersService` - 17 edges

## Surprising Connections (you probably didn't know these)
- `Docker Compose Config` --conceptually_related_to--> `Docker Compose Test Config`  [INFERRED]
  docker-compose.yml → docker-compose.test.yml
- `ADR-0002: Orthogonal Product Facets` --rationale_for--> `Facet (Domain Entity)`  [EXTRACTED]
  docs/adr/0002-orthogonal-product-facets.md → CONTEXT.md
- `ADR-0002: Orthogonal Product Facets` --rationale_for--> `Product (Domain Entity)`  [EXTRACTED]
  docs/adr/0002-orthogonal-product-facets.md → CONTEXT.md
- `ADR-0007: REST Over GraphQL` --rationale_for--> `Product (Domain Entity)`  [EXTRACTED]
  docs/adr/0007-rest-over-graphql.md → CONTEXT.md
- `ADR-0008: USD-Only Pricing` --rationale_for--> `SKU (Domain Entity)`  [EXTRACTED]
  docs/adr/0008-usd-only-pricing.md → CONTEXT.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Product Catalog Hierarchy: Publisher → Game → Product** — merch_shop_be_context_publisher, merch_shop_be_context_game, merch_shop_be_context_product [EXTRACTED 1.00]
- **Guest Checkout Flow: Guest + Cart + Order** — merch_shop_be_context_guest, merch_shop_be_context_cart, merch_shop_be_context_order [EXTRACTED 1.00]

## Communities (45 total, 8 thin omitted)

### Community 0 - "Auth & Commerce Modules"
Cohesion: 0.11
Nodes (17): CreateProductDto, ApiProperty, ApiPropertyOptional, IsArray, IsOptional, IsString, ProductsController, ApiBearerAuth (+9 more)

### Community 1 - "Architecture Decision Records"
Cohesion: 0.10
Nodes (30): ADR-0001: Multi-Publisher Marketplace, ADR-0002: Orthogonal Product Facets, ADR-0003: Drop-Ship Fulfillment, ADR-0004: Clerk Auth Delegation, ADR-0005: Stripe Payment Gateway, ADR-0006: Server-Side Guest Cart, ADR-0007: REST Over GraphQL, ADR-0008: USD-Only Pricing (+22 more)

### Community 2 - "CartRepository"
Cohesion: 0.07
Nodes (28): AuthUser, CurrentUser, CartController, ApiBearerAuth, ApiTags, Body, Controller, Delete (+20 more)

### Community 3 - "Skill Framework & Design Patterns"
Cohesion: 0.12
Nodes (8): CharacterNotFoundException, ProductNotFoundException, PublisherNotFoundException, SkuNotFoundException, TeamNotFoundException, SkuNotFoundException, SkuUnavailableException, DomainException

### Community 4 - "Fulfillment & Supplier Port"
Cohesion: 0.07
Nodes (26): IsIn, IsNumber, BulkAvailabilityDto, IsBoolean, IsString, CreateSkuDto, ApiProperty, ApiPropertyOptional (+18 more)

### Community 5 - "Issue Triage & Workflow Skills"
Cohesion: 0.11
Nodes (18): CharactersController, ApiBearerAuth, ApiTags, Body, Controller, Delete, Get, Param (+10 more)

### Community 6 - "Catalog & Characters API"
Cohesion: 0.10
Nodes (24): Res, AuthController, ApiTags, Body, Controller, HttpCode, Post, Req (+16 more)

### Community 7 - "Products & DTOs"
Cohesion: 0.22
Nodes (7): AuthGuard, Injectable, AuthModule, Global, Module, OptionalAuthGuard, Injectable

### Community 8 - "TypeScript Config"
Cohesion: 0.15
Nodes (10): CreateGameDto, ApiProperty, ApiPropertyOptional, IsOptional, IsString, IsUrl, GamesRepository, Injectable (+2 more)

### Community 9 - "Games API"
Cohesion: 0.11
Nodes (18): CreateTeamDto, ApiProperty, ApiPropertyOptional, IsOptional, IsString, IsUrl, TeamsController, ApiBearerAuth (+10 more)

### Community 10 - "Publishers API"
Cohesion: 0.14
Nodes (12): Headers, PaymentsController, ApiBearerAuth, ApiTags, Body, Controller, Post, Req (+4 more)

### Community 11 - "Teams API"
Cohesion: 0.08
Nodes (19): OrderNotFoundException, ConfirmedPaymentIntent, mockCartService, mockNotifications, mockRepo, mockSupplier, Inject, MockSupplierService (+11 more)

### Community 12 - "Runtime Dependencies"
Cohesion: 0.11
Nodes (17): CreatePublisherDto, ApiProperty, ApiPropertyOptional, IsOptional, IsString, IsUrl, PublishersController, ApiBearerAuth (+9 more)

### Community 13 - "SKUs API"
Cohesion: 0.09
Nodes (15): IsEnum, FilterOrdersDto, IsOptional, OrdersController, ApiBearerAuth, ApiTags, Controller, Get (+7 more)

### Community 14 - "Build & Migration Scripts"
Cohesion: 0.67
Nodes (3): AppModule, Module, bootstrap()

### Community 15 - "Skill Writing Vocabulary"
Cohesion: 0.21
Nodes (12): CatalogModule, Module, CommerceModule, Module, FulfillmentModule, Module, NotificationsModule, Module (+4 more)

### Community 16 - "NestJS CLI Config"
Cohesion: 0.21
Nodes (8): CATALOG_READ_PORT, CatalogReadPort, OrdersService, Injectable, mockCatalogRead, mockOrders, mockPrisma, Inject

### Community 17 - "HITL Diagnostics Script"
Cohesion: 0.15
Nodes (12): GamesController, ApiBearerAuth, ApiTags, Body, Controller, Delete, Get, Param (+4 more)

### Community 18 - "Beads Issue Tracker"
Cohesion: 0.67
Nodes (3): Beads Configuration, Beads Issue Tracker README, Beads Dolt Database Backend

### Community 19 - "Order DTOs"
Cohesion: 0.14
Nodes (7): AuthService, Inject, Injectable, RefreshTokenRepository, Injectable, generateOpaqueToken(), hashToken()

### Community 20 - "auth.service.ts"
Cohesion: 0.18
Nodes (7): AccountTokenRepository, Injectable, AuthTokens, EmailAlreadyRegisteredException, InvalidCredentialsException, InvalidOrExpiredTokenException, computeLockoutUntil()

### Community 21 - "AccountService"
Cohesion: 0.23
Nodes (8): Exclude, Expose, AccountModule, Global, Module, AccountService, Injectable, AccountResponseDto

### Community 25 - "AccountController"
Cohesion: 0.20
Nodes (6): AccountController, Controller, Delete, Get, Param, UseGuards

### Community 26 - "publishers.service.ts"
Cohesion: 0.20
Nodes (4): CatalogReadService, Injectable, SkusRepository, Injectable

### Community 27 - "PublishersRepository"
Cohesion: 0.16
Nodes (4): PublishersRepository, Injectable, PublishersService, Injectable

### Community 28 - "PublishersController"
Cohesion: 0.17
Nodes (6): AdminGuard, Injectable, TeamsRepository, Injectable, TeamsService, Injectable

### Community 30 - "RefreshTokenRepository"
Cohesion: 0.26
Nodes (8): FilterProductsDto, ApiPropertyOptional, IsBoolean, IsOptional, IsString, ProductsService, Injectable, Transform

### Community 31 - "CreateOrderDto"
Cohesion: 0.38
Nodes (6): CreateOrderDto, ShippingAddressDto, ApiProperty, IsEmail, IsObject, IsString

### Community 32 - "orders.service.spec.ts"
Cohesion: 0.18
Nodes (4): CharactersRepository, Injectable, CharactersService, Injectable

### Community 36 - "common.module.ts"
Cohesion: 0.18
Nodes (8): CommonModule, Global, Module, AllExceptionsFilter, Catch, AuditInterceptor, MUTATING, Injectable

### Community 37 - "BaseRepository"
Cohesion: 0.15
Nodes (3): ProductsRepository, Injectable, BaseRepository

### Community 38 - "common/index.ts"
Cohesion: 0.38
Nodes (4): ResponseInterceptor, Injectable, PagedResult, PaginationMeta

### Community 39 - "LocalhostBypassThrottlerGuard"
Cohesion: 0.29
Nodes (5): InjectThrottlerOptions, InjectThrottlerStorage, LocalhostBypassThrottlerGuard, LOOPBACK_IPS, Injectable

### Community 40 - "PaginationQueryDto"
Cohesion: 0.25
Nodes (6): Max, PaginationQueryDto, IsInt, IsOptional, Min, Type

### Community 42 - "LoginDto"
Cohesion: 0.40
Nodes (4): LoginDto, ApiProperty, IsEmail, IsString

## Knowledge Gaps
- **21 isolated node(s):** `AuthTokens`, `mockRepo`, `mockCartService`, `mockSupplier`, `mockNotifications` (+16 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **8 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `BaseRepository` connect `BaseRepository` to `orders.service.spec.ts`, `CartRepository`, `PrismaService`, `common/index.ts`, `TypeScript Config`, `base.repository.ts`, `SKUs API`, `Order DTOs`, `auth.service.ts`, `AccountService`, `AccountRepository`, `publishers.service.ts`, `PublishersRepository`, `PublishersController`, `RefreshTokenRepository`?**
  _High betweenness centrality (0.120) - this node is a cross-community bridge._
- **Why does `CartRepository` connect `CartRepository` to `PrismaService`, `BaseRepository`, `Skill Writing Vocabulary`?**
  _High betweenness centrality (0.039) - this node is a cross-community bridge._
- **Why does `SkusController` connect `Fulfillment & Supplier Port` to `RefreshTokenRepository`?**
  _High betweenness centrality (0.035) - this node is a cross-community bridge._
- **What connects `AuthTokens`, `mockRepo`, `mockCartService` to the rest of the system?**
  _21 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Auth & Commerce Modules` be split into smaller, more focused modules?**
  _Cohesion score 0.11333333333333333 - nodes in this community are weakly interconnected._
- **Should `Architecture Decision Records` be split into smaller, more focused modules?**
  _Cohesion score 0.10344827586206896 - nodes in this community are weakly interconnected._
- **Should `CartRepository` be split into smaller, more focused modules?**
  _Cohesion score 0.06810035842293907 - nodes in this community are weakly interconnected._