# Products use orthogonal facets, not a strict category hierarchy

Products are tagged with up to three independent facets — Game, Team, and Character — rather than placed in a single hierarchical category tree. A product can belong to a Game and a Team and a Character simultaneously, and buyers filter by any combination.

## Considered Options

- Strict hierarchy: Game → Team → Character → Product
- Orthogonal facets: Game + Team + Character as independent dimensions ✓

A hierarchy forces every product into exactly one path. Esport merch frequently crosses boundaries (a collaboration shirt featuring two teams, a crossover character item spanning two games). Facets handle these cases without workarounds.

## Consequences

Filtering UI must support multi-facet selection. Backend queries use AND/OR across facet columns rather than a single `categoryId` foreign key.
