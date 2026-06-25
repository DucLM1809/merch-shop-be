# Custom unified error response shape

All error responses use `{ success: false, code: string, message: string, timestamp: string }` rather than the NestJS default `{ statusCode, message, error }`.

The `code` field is a stable string constant (e.g. `PRODUCT_NOT_FOUND`) the frontend can switch on. HTTP status codes alone are ambiguous — two different 404s can mean different things to the UI. The timestamp aids log correlation. This shape is symmetric with the success envelope (`{ success: true, data, meta? }`), so clients have one consistent parsing contract.

RFC 7807 Problem Details was considered but rejected as too verbose for a single-context API with a dedicated frontend.
