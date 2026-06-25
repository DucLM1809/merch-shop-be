# Modular monolith with hybrid cross-module communication

Modules communicate via two channels only: synchronous facade injection for queries, and `@nestjs/event-emitter` domain events for side-effects. Direct injection of another module's internal service is forbidden.

We chose this over unstructured DI (which degrades into a ball of mud as modules grow) and over pure events (which make synchronous reads awkward and hard to trace). The hybrid keeps reads simple and debuggable while decoupling the side-effect chain (Order → Fulfillment → Notifications) without callback nesting.

`@nestjs/event-emitter` is in-process and requires no infrastructure. If the system is later split into separate services, events become the natural seam to replace with a broker.

## Considered Options

- **Unstructured DI** — any module imports any service. Rejected: produces hidden coupling that defeats the modular boundary.
- **Pure domain events** — all cross-module calls are async events. Rejected: synchronous reads (e.g. catalog lookup during checkout) become awkward and lose type safety.
- **External broker (Redis pub/sub)** — durable events with infrastructure. Rejected: premature for a monolith; adds ops overhead without benefit at this scale.
