# Graph Report - merch-shop-be  (2026-08-19)

## Corpus Check
- 116 files · ~11,001 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 764 nodes · 1657 edges · 35 communities (28 shown, 7 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 3 edges (avg confidence: 0.83)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `bc2b9b6a`
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
- AccountTokenRepository
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

## Communities (35 total, 7 thin omitted)

### Community 0 - "Auth & Commerce Modules"
Cohesion: 0.05
Nodes (38): AuthUser, CurrentUser, CreateProductDto, ApiProperty, ApiPropertyOptional, IsArray, IsOptional, IsString (+30 more)

### Community 1 - "Architecture Decision Records"
Cohesion: 0.10
Nodes (30): ADR-0001: Multi-Publisher Marketplace, ADR-0002: Orthogonal Product Facets, ADR-0003: Drop-Ship Fulfillment, ADR-0004: Clerk Auth Delegation, ADR-0005: Stripe Payment Gateway, ADR-0006: Server-Side Guest Cart, ADR-0007: REST Over GraphQL, ADR-0008: USD-Only Pricing (+22 more)

### Community 2 - "CartRepository"
Cohesion: 0.07
Nodes (26): CartController, ApiBearerAuth, ApiTags, Body, Controller, Delete, Get, Param (+18 more)

### Community 3 - "Skill Framework & Design Patterns"
Cohesion: 0.06
Nodes (26): Max, GameNotFoundException, ProductNotFoundException, SkuNotFoundException, TeamNotFoundException, OrderNotFoundException, SkuNotFoundException, SkuUnavailableException (+18 more)

### Community 4 - "Fulfillment & Supplier Port"
Cohesion: 0.06
Nodes (28): IsIn, IsNumber, BulkAvailabilityDto, IsBoolean, IsString, CreateSkuDto, ApiProperty, ApiPropertyOptional (+20 more)

### Community 5 - "Issue Triage & Workflow Skills"
Cohesion: 0.07
Nodes (25): CharactersController, ApiBearerAuth, ApiTags, Body, Controller, Delete, Get, Param (+17 more)

### Community 6 - "Catalog & Characters API"
Cohesion: 0.08
Nodes (28): Res, AuthController, ApiTags, Body, Controller, HttpCode, Post, Req (+20 more)

### Community 7 - "Products & DTOs"
Cohesion: 0.10
Nodes (14): AdminGuard, Injectable, AuthGuard, Injectable, AuthModule, Global, Module, OptionalAuthGuard (+6 more)

### Community 8 - "TypeScript Config"
Cohesion: 0.08
Nodes (22): CreateGameDto, ApiProperty, ApiPropertyOptional, IsOptional, IsString, IsUrl, GamesController, ApiBearerAuth (+14 more)

### Community 9 - "Games API"
Cohesion: 0.08
Nodes (22): CreateTeamDto, ApiProperty, ApiPropertyOptional, IsOptional, IsString, IsUrl, TeamsController, ApiBearerAuth (+14 more)

### Community 10 - "Publishers API"
Cohesion: 0.11
Nodes (15): Headers, PaymentsController, ApiBearerAuth, ApiTags, Body, Controller, Post, Req (+7 more)

### Community 11 - "Teams API"
Cohesion: 0.14
Nodes (8): LogNotificationAdapter, Injectable, NOTIFICATION_PORT, NotificationPort, NotificationsModule, Module, ResendAdapter, Injectable

### Community 12 - "Runtime Dependencies"
Cohesion: 0.15
Nodes (12): CreatePublisherDto, ApiProperty, ApiPropertyOptional, IsOptional, IsString, IsUrl, ApiBearerAuth, Body (+4 more)

### Community 13 - "SKUs API"
Cohesion: 0.13
Nodes (3): OrdersRepository, Injectable, Inject

### Community 14 - "Build & Migration Scripts"
Cohesion: 0.60
Nodes (3): AppModule, Module, bootstrap()

### Community 15 - "Skill Writing Vocabulary"
Cohesion: 0.23
Nodes (8): IsEnum, CommerceModule, Module, ConfirmedPaymentIntent, FilterOrdersDto, IsOptional, OrdersService, Injectable

### Community 16 - "NestJS CLI Config"
Cohesion: 0.25
Nodes (9): CatalogModule, Module, CATALOG_READ_PORT, CatalogReadPort, CatalogReadService, Injectable, mockCatalogRead, mockOrders (+1 more)

### Community 17 - "HITL Diagnostics Script"
Cohesion: 0.25
Nodes (8): FulfillmentModule, Module, MockSupplierService, Injectable, SUPPLIER_PORT, SupplierOrder, SupplierPort, SupplierResult

### Community 18 - "Beads Issue Tracker"
Cohesion: 0.67
Nodes (3): Beads Configuration, Beads Issue Tracker README, Beads Dolt Database Backend

### Community 19 - "Order DTOs"
Cohesion: 0.24
Nodes (4): AuthService, Injectable, generateOpaqueToken(), hashToken()

### Community 20 - "auth.service.ts"
Cohesion: 0.24
Nodes (5): AuthTokens, EmailAlreadyRegisteredException, InvalidCredentialsException, InvalidOrExpiredTokenException, computeLockoutUntil()

### Community 21 - "AccountService"
Cohesion: 0.24
Nodes (8): Exclude, Expose, AccountModule, Global, Module, AccountService, Injectable, AccountResponseDto

### Community 25 - "AccountController"
Cohesion: 0.20
Nodes (6): AccountController, Controller, Delete, Get, Param, UseGuards

### Community 26 - "publishers.service.ts"
Cohesion: 0.31
Nodes (3): PublisherNotFoundException, PublishersService, Injectable

### Community 28 - "PublishersController"
Cohesion: 0.29
Nodes (5): PublishersController, ApiTags, Controller, Get, Param

### Community 30 - "RefreshTokenRepository"
Cohesion: 0.29
Nodes (3): Inject, RefreshTokenRepository, Injectable

### Community 31 - "CreateOrderDto"
Cohesion: 0.38
Nodes (6): CreateOrderDto, ShippingAddressDto, ApiProperty, IsEmail, IsObject, IsString

### Community 32 - "orders.service.spec.ts"
Cohesion: 0.40
Nodes (4): mockCartService, mockNotifications, mockRepo, mockSupplier

## Knowledge Gaps
- **21 isolated node(s):** `AuthTokens`, `mockRepo`, `mockCartService`, `mockSupplier`, `mockNotifications` (+16 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **7 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `BaseRepository` connect `Products & DTOs` to `Auth & Commerce Modules`, `CartRepository`, `Skill Framework & Design Patterns`, `Fulfillment & Supplier Port`, `Issue Triage & Workflow Skills`, `TypeScript Config`, `Games API`, `SKUs API`, `Skill Writing Vocabulary`, `AccountTokenRepository`, `AccountRepository`, `PublishersRepository`, `RefreshTokenRepository`?**
  _High betweenness centrality (0.121) - this node is a cross-community bridge._
- **Why does `CartRepository` connect `CartRepository` to `Skill Writing Vocabulary`, `Products & DTOs`?**
  _High betweenness centrality (0.039) - this node is a cross-community bridge._
- **Why does `SkusController` connect `Fulfillment & Supplier Port` to `NestJS CLI Config`?**
  _High betweenness centrality (0.035) - this node is a cross-community bridge._
- **What connects `AuthTokens`, `mockRepo`, `mockCartService` to the rest of the system?**
  _21 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Auth & Commerce Modules` be split into smaller, more focused modules?**
  _Cohesion score 0.05093167701863354 - nodes in this community are weakly interconnected._
- **Should `Architecture Decision Records` be split into smaller, more focused modules?**
  _Cohesion score 0.10344827586206896 - nodes in this community are weakly interconnected._
- **Should `CartRepository` be split into smaller, more focused modules?**
  _Cohesion score 0.07138535995160314 - nodes in this community are weakly interconnected._