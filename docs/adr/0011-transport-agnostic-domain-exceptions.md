# Transport-agnostic domain exceptions translated by global filter

Services throw typed domain exceptions (e.g. `ProductNotFoundException`) rather than NestJS `HttpException`. A single `AllExceptionsFilter` translates them to HTTP status codes and the unified error envelope.

This keeps domain logic decoupled from the HTTP transport layer. Services become trivially testable without bootstrapping an HTTP context, and the same exceptions work unchanged if a route is later exposed via WebSocket or gRPC. The filter is the single place in the codebase that knows about HTTP status codes for domain errors.

The trade-off is one extra indirection (exception class → filter → HTTP response). The alternative — throwing `HttpException` directly in services — is simpler but ties every service to the HTTP transport permanently.
