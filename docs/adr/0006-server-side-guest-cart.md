# Guest carts are persisted server-side, not client-side

Guest Carts are stored in PostgreSQL with `accountId = null`, identified by a UUID in a server-set cookie. When a Guest authenticates, their Cart merges into their Account's Cart. The Cart model is uniform across Guests and Accounts.

The alternative — holding Guest cart state client-side and sending it as a payload at checkout — was rejected because it loses the cart across browsers and devices and requires the checkout endpoint to reconstruct and validate cart state it has never seen. Server-side storage lets all Cart logic live in one place.

## Consequences

Orphaned Guest carts (abandoned, never purchased) accumulate and must be pruned periodically. Cart rows with `accountId = null` and no activity after a TTL threshold are candidates for deletion.
