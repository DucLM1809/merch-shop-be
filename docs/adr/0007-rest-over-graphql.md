# REST API with query-parameter facet filtering, not GraphQL

The catalog and commerce API is REST with OpenAPI documentation. Facet filtering uses query parameters (`GET /products?gameId=&teamId=&characterId=`).

GraphQL was considered because orthogonal facets map naturally to flexible query construction. It was rejected because the FE has a single, well-known data shape — there is no need for clients to compose ad-hoc queries. REST query parameters handle the filtering surface without the added complexity of a schema, resolvers, and N+1 mitigations.

## Consequences

Facet filter combinations are expressed as nullable query params on `GET /products`. The endpoint must handle any subset of the three facets (`gameId`, `teamId`, `characterId`) being present, absent, or combined.
