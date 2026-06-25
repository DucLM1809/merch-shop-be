# Drop-ship fulfillment — no warehouse inventory

All orders are fulfilled via drop-ship: a third-party supplier receives the order and ships directly to the buyer. We hold no physical inventory.

This means SKU availability is a boolean flag, not a stock count. There is no inventory management surface in this system. If a supplier marks a SKU unavailable, we flip the flag; we never decrement quantities.

## Consequences

Stock-level features (low-stock warnings, pre-order queues, backorder) are out of scope. The Order model forwards line items to the supplier API — it does not manage picking, packing, or warehouse location.
