# Multi-publisher marketplace from day one

The shop sells licensed merchandise across multiple game publishers (Riot, Valve, Blizzard, etc.), not a single-publisher storefront. We model a `Publisher → Game → Product` hierarchy at the data level even though the MVP may launch with only one publisher. Retrofitting a publisher layer onto a single-game model after launch would require a schema migration and rewrite of all catalog queries.

## Considered Options

- Single-publisher (Riot-only), extend later
- Multi-publisher from day one ✓

## Consequences

All product catalog queries must filter by Publisher when scoping to a specific brand context. The URL and navigation structure should expose the Publisher dimension (e.g. `/riot/league-of-legends/...`).
