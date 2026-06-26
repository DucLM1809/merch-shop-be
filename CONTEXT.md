# Merch Shop

An official licensed e-commerce storefront selling branded physical goods for esport titles across multiple game publishers.

## Language

### Catalog

**Publisher**:
A game company that holds the license for one or more esport titles (e.g. Riot Games, Valve).
_Avoid_: Brand, vendor, licensor

**Game**:
A specific esport title owned by a Publisher (e.g. League of Legends, CS2).
_Avoid_: Title, franchise

**Team**:
A professional esport organization that competes in a Game (e.g. T1, Cloud9).
_Avoid_: Club, org

**Character**:
An in-game figure associated with a Game, used as a product facet. Covers what individual games call champions, agents, heroes, legends, etc.
_Avoid_: Champion, hero, agent, skin

**Product**:
A purchasable item type carrying at least one facet (Game, Team, or Character) and one or more SKUs.
_Avoid_: Item, listing, good

**SKU**:
A single purchasable variant of a Product with its own price and availability (e.g. "Faker T-Shirt / Black / L").
_Avoid_: Variant, option

**Facet**:
An orthogonal classification dimension applied to Products: Game, Team, or Character. A Product may carry any combination of these three.
_Avoid_: Category, tag, filter

### Commerce

**Cart**:
A session-scoped collection of SKUs a Buyer intends to purchase. Persists across page loads for authenticated Buyers; session-only for guests.
_Avoid_: Basket, bag

**Order**:
A confirmed purchase of one or more SKUs. Belongs to a Buyer (guest or authenticated).
_Avoid_: Purchase, transaction

**Buyer**:
A person who places an Order. May be a Guest or an authenticated Account holder.
_Avoid_: Customer, user, shopper

**Guest**:
A Buyer who completes a purchase without creating an Account.
_Avoid_: Anonymous user, visitor

**Account**:
An authenticated identity linked to a Buyer, enabling order history, saved addresses, and a persistent Cart.
_Avoid_: User, profile, member

**Admin**:
An Account with elevated privileges to manage live catalog entities (Characters, Products, SKUs) and monitor and act on Orders. Publishers, Games, and Teams are managed via seed data, not by Admins at runtime. Not a separate identity — an Account with a role flag.
_Avoid_: Superuser, staff, operator

**Order Status**:
The lifecycle stage of an Order. Stages in order: PENDING (payment captured, not yet confirmed), CONFIRMED (payment verified, awaiting forwarding to Supplier), FORWARDED (Order sent to Supplier, `supplierReference` set), CANCELLED (Order will not be fulfilled). An Order with no `supplierReference` in CONFIRMED status is considered stuck and eligible for retry.
_Avoid_: State, phase, stage

### Fulfillment

**Drop-ship**:
Fulfillment model where Orders are forwarded to a Supplier who handles production and shipping directly to the Buyer. No warehouse inventory is held.
_Avoid_: Print-on-demand (internal synonym only), fulfillment partner

**Supplier**:
The third-party company that receives forwarded Orders and ships physical goods to Buyers. Abstracted behind a port interface; the concrete provider is not fixed.
_Avoid_: Vendor, fulfillment partner, print partner

**Availability**:
A boolean flag on a SKU indicating whether it can be added to a Cart and purchased. Not a stock count.
_Avoid_: Stock, inventory, quantity
