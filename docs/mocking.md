# Mocking

`nest-e2e-gen` supports a fast in-memory mock layer for E2E tests so you can validate contract & validation logic without real network I/O.

## Enabling
```bash
E2E_USE_MOCK=1 pnpm test:e2e
```

## What Gets Mocked
- HTTP layer request/response shape.
- Route resolution (supports dynamic params like `/users/:id`).

## What Doesn't
- Actual NestJS controller/provider logic (unless you wire it separately).
- Database interactions.

## How Route Matching Works
When you register a mock for `/users/:id` it is internally converted into a regex: `^/users/([^/]+)$`.
Requests for `/users/123` will match.

## Registering Mocks (Generated Helper)
A simplified shape (actual generated code may differ):
```ts
mockReq('GET', '/users/:id', (ctx) => ({ status: 200, json: { id: ctx.params.id }}));
```

## Overriding Behavior
Later registrations for the exact same method + template override earlier ones.

## Debugging Misses
1. Ensure method case matches (e.g. GET vs get).
2. Confirm you used `:param` format not `{param}`.
3. Log the registry keys (temporary console.log) to inspect.

## Falling Back
If a route is not found, helper returns 404 to surface missing mocks quickly.
