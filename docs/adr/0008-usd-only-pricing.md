# SKU prices stored and transacted in USD only

All SKU prices are a single USD decimal value. The shop targets international buyers, but local currency display is delegated to Stripe (which shows equivalent amounts to buyers at checkout). No per-currency price columns exist on the SKU model.

Multi-currency pricing (storing a price per currency per SKU) was deferred because it requires a separate pricing table, currency-aware cart totals, and exchange-rate management — significant complexity with no publisher requirement at launch.

## Consequences

Retrofitting multi-currency pricing requires a schema migration to the SKU pricing model. If a publisher contract requires local-currency pricing, this decision must be revisited.
