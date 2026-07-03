# Graph Report - merch-shop-BE  (2026-07-02)

## Corpus Check
- 94 files · ~7,539 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 483 nodes · 1091 edges · 21 communities (17 shown, 4 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 15 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `7076f4fa`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Auth & Commerce Modules|Auth & Commerce Modules]]
- [[_COMMUNITY_Architecture Decision Records|Architecture Decision Records]]
- [[_COMMUNITY_Dev Dependencies & Test Setup|Dev Dependencies & Test Setup]]
- [[_COMMUNITY_Skill Framework & Design Patterns|Skill Framework & Design Patterns]]
- [[_COMMUNITY_Fulfillment & Supplier Port|Fulfillment & Supplier Port]]
- [[_COMMUNITY_Issue Triage & Workflow Skills|Issue Triage & Workflow Skills]]
- [[_COMMUNITY_Catalog & Characters API|Catalog & Characters API]]
- [[_COMMUNITY_Products & DTOs|Products & DTOs]]
- [[_COMMUNITY_TypeScript Config|TypeScript Config]]
- [[_COMMUNITY_Games API|Games API]]
- [[_COMMUNITY_Publishers API|Publishers API]]
- [[_COMMUNITY_Teams API|Teams API]]
- [[_COMMUNITY_Runtime Dependencies|Runtime Dependencies]]
- [[_COMMUNITY_SKUs API|SKUs API]]
- [[_COMMUNITY_Build & Migration Scripts|Build & Migration Scripts]]
- [[_COMMUNITY_Skill Writing Vocabulary|Skill Writing Vocabulary]]
- [[_COMMUNITY_NestJS CLI Config|NestJS CLI Config]]
- [[_COMMUNITY_HITL Diagnostics Script|HITL Diagnostics Script]]
- [[_COMMUNITY_Beads Issue Tracker|Beads Issue Tracker]]
- [[_COMMUNITY_Order DTOs|Order DTOs]]
- [[_COMMUNITY_Docker Compose|Docker Compose]]

## God Nodes (most connected - your core abstractions)
1. `PrismaService` - 45 edges
2. `BaseRepository` - 22 edges
3. `DomainException` - 20 edges
4. `ProductsService` - 18 edges
5. `CartRepository` - 18 edges
6. `SkusRepository` - 16 edges
7. `AccountService` - 15 edges
8. `AdminGuard` - 14 edges
9. `ClerkGuard` - 14 edges
10. `CartService` - 14 edges

## Surprising Connections (you probably didn't know these)
- `Triage Skill` --conceptually_related_to--> `Issue Tracker Agent Guide`  [INFERRED]
  .claude/skills/triage/SKILL.md → docs/agents/issue-tracker.md
- `Docker Compose Config` --conceptually_related_to--> `Docker Compose Test Config`  [INFERRED]
  docker-compose.yml → docker-compose.test.yml
- `ADR-0002: Orthogonal Product Facets` --rationale_for--> `Facet (Domain Entity)`  [EXTRACTED]
  docs/adr/0002-orthogonal-product-facets.md → CONTEXT.md
- `ADR-0002: Orthogonal Product Facets` --rationale_for--> `Product (Domain Entity)`  [EXTRACTED]
  docs/adr/0002-orthogonal-product-facets.md → CONTEXT.md
- `ADR-0007: REST Over GraphQL` --rationale_for--> `Product (Domain Entity)`  [EXTRACTED]
  docs/adr/0007-rest-over-graphql.md → CONTEXT.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Idea to Ship Skill Pipeline** — grill_with_docs_skill, prototype_skill, handoff_skill, improve_codebase_architecture_skill, ask_matt_skill [EXTRACTED 1.00]
- **Deep Module Design System** — codebase_design_skill, codebase_design_deepening, codebase_design_design_it_twice [EXTRACTED 1.00]
- **Domain Modeling Artifact System** — domain_modeling_skill, domain_modeling_adr_format, domain_modeling_context_format [EXTRACTED 1.00]
- **Engineering Skills Bootstrap Configuration** — setup_matt_pocock_skills_skill, setup_matt_pocock_skills_issue_tracker_github, setup_matt_pocock_skills_issue_tracker_gitlab, setup_matt_pocock_skills_issue_tracker_local, setup_matt_pocock_skills_triage_labels, setup_matt_pocock_skills_domain [EXTRACTED 1.00]
- **Red-Green-Refactor TDD Cycle** — tdd_skill, tdd_tests, tdd_mocking, tdd_refactoring [EXTRACTED 1.00]
- **Issue Lifecycle: PRD to Agent Handoff** — to_prd_skill, to_issues_skill, triage_agent_brief, canonical_triage_roles [INFERRED 0.75]
- **Triage Workflow: Skill, Labels, Tracker** — triage_skill, agents_triage_labels, agents_issue_tracker [EXTRACTED 1.00]
- **Product Catalog Hierarchy: Publisher → Game → Product** — merch_shop_be_context_publisher, merch_shop_be_context_game, merch_shop_be_context_product [EXTRACTED 1.00]
- **Guest Checkout Flow: Guest + Cart + Order** — merch_shop_be_context_guest, merch_shop_be_context_cart, merch_shop_be_context_order [EXTRACTED 1.00]

## Communities (21 total, 4 thin omitted)

### Community 0 - "Auth & Commerce Modules"
Cohesion: 0.08
Nodes (3): AccountController, AccountService, CartRepository

### Community 1 - "Architecture Decision Records"
Cohesion: 0.09
Nodes (33): ADR-0001: Multi-Publisher Marketplace, ADR-0002: Orthogonal Product Facets, ADR-0003: Drop-Ship Fulfillment, ADR-0004: Clerk Auth Delegation, ADR-0005: Stripe Payment Gateway, ADR-0006: Server-Side Guest Cart, ADR-0007: REST Over GraphQL, ADR-0008: USD-Only Pricing (+25 more)

### Community 2 - "Dev Dependencies & Test Setup"
Cohesion: 0.20
Nodes (10): AccountModule, AuthModule, CatalogModule, CommerceModule, FulfillmentModule, NotificationsModule, PaymentsController, PaymentsModule (+2 more)

### Community 3 - "Skill Framework & Design Patterns"
Cohesion: 0.13
Nodes (24): Ask Matt Skill Router, Codebase Design Deepening Guide, Design It Twice Pattern, Codebase Design Skill, Architectural Decision Record, Deep Module Design Principle, Tight Feedback Loop (Bug Diagnosis Core Skill), Idea to Ship Main Flow (+16 more)

### Community 4 - "Fulfillment & Supplier Port"
Cohesion: 0.11
Nodes (3): FilterOrdersDto, OrdersController, OrdersRepository

### Community 5 - "Issue Triage & Workflow Skills"
Cohesion: 0.10
Nodes (22): Five Canonical Triage Roles, Domain Docs Consumer Rules, Issue Tracker: GitHub Conventions, Issue Tracker: GitLab Conventions, Issue Tracker: Local Markdown Conventions, Setup Matt Pocock Skills, Triage Label Vocabulary Mapping, TDD Mocking Guidelines (+14 more)

### Community 6 - "Catalog & Characters API"
Cohesion: 0.16
Nodes (3): CharactersController, CharactersService, CreateCharacterDto

### Community 7 - "Products & DTOs"
Cohesion: 0.05
Nodes (12): CharactersRepository, CreateProductDto, FilterProductsDto, GamesRepository, PrismaService, ProductsController, ProductsRepository, ProductsService (+4 more)

### Community 8 - "TypeScript Config"
Cohesion: 0.07
Nodes (18): CommonModule, PaginationQueryDto, CharacterNotFoundException, DomainException, GameNotFoundException, OrderNotFoundException, ProductNotFoundException, PublisherNotFoundException (+10 more)

### Community 9 - "Games API"
Cohesion: 0.17
Nodes (3): CreateGameDto, GamesController, GamesService

### Community 10 - "Publishers API"
Cohesion: 0.16
Nodes (3): CreatePublisherDto, PublishersController, PublishersService

### Community 11 - "Teams API"
Cohesion: 0.17
Nodes (3): CreateTeamDto, TeamsController, TeamsService

### Community 12 - "Runtime Dependencies"
Cohesion: 0.11
Nodes (11): AdminGuard, ClerkGuard, AuthUser, CurrentUser, OptionalClerkGuard, CartController, CartService, CartSession (+3 more)

### Community 13 - "SKUs API"
Cohesion: 0.18
Nodes (4): BulkAvailabilityDto, CreateSkuDto, SkusController, SkusService

### Community 14 - "Build & Migration Scripts"
Cohesion: 0.10
Nodes (18): CATALOG_READ_PORT, CatalogReadPort, CatalogReadService, MockSupplierService, SUPPLIER_PORT, SupplierOrder, SupplierPort, SupplierResult (+10 more)

### Community 15 - "Skill Writing Vocabulary"
Cohesion: 0.33
Nodes (9): Completion Criterion, Context Load, Writing Great Skills Glossary, Information Hierarchy, Leading Word, Predictability (Skill Root Virtue), Premature Completion (Failure Mode), Progressive Disclosure (+1 more)

### Community 18 - "Beads Issue Tracker"
Cohesion: 0.67
Nodes (3): Beads Configuration, Beads Issue Tracker README, Beads Dolt Database Backend

## Knowledge Gaps
- **32 isolated node(s):** `ShippingAddressDto`, `CreateOrderDto`, `MUTATING`, `mockPrisma`, `mockOrders` (+27 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `PrismaService` connect `Products & DTOs` to `Auth & Commerce Modules`, `Dev Dependencies & Test Setup`, `Fulfillment & Supplier Port`, `Catalog & Characters API`, `Runtime Dependencies`, `SKUs API`, `Build & Migration Scripts`?**
  _High betweenness centrality (0.075) - this node is a cross-community bridge._
- **Why does `CartRepository` connect `Auth & Commerce Modules` to `Dev Dependencies & Test Setup`, `Runtime Dependencies`, `Products & DTOs`?**
  _High betweenness centrality (0.041) - this node is a cross-community bridge._
- **Why does `BaseRepository` connect `Products & DTOs` to `Auth & Commerce Modules`, `TypeScript Config`, `Fulfillment & Supplier Port`?**
  _High betweenness centrality (0.038) - this node is a cross-community bridge._
- **What connects `ShippingAddressDto`, `CreateOrderDto`, `MUTATING` to the rest of the system?**
  _32 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Auth & Commerce Modules` be split into smaller, more focused modules?**
  _Cohesion score 0.07692307692307693 - nodes in this community are weakly interconnected._
- **Should `Architecture Decision Records` be split into smaller, more focused modules?**
  _Cohesion score 0.0946969696969697 - nodes in this community are weakly interconnected._
- **Should `Skill Framework & Design Patterns` be split into smaller, more focused modules?**
  _Cohesion score 0.13043478260869565 - nodes in this community are weakly interconnected._