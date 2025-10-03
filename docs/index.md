# nest-e2e-gen

Generate rich end-to-end (E2E) test scaffolding & realistic payloads directly from your NestJS controllers and DTOs.

> This site is a work-in-progress documentation portal. Expect iterative enhancements.

## Why
- Stop manually hand-crafting large test payloads.
- Keep tests aligned automatically with DTO & Swagger decorator changes.
- Enable fast BDD-style feature coverage generation.
- Support both real HTTP mode & in-memory mock mode.

## Key Features
- DTO introspection (via ts-morph) → Type-safe sample payloads.
- Swagger decorator parsing → Auto API metadata mapping.
- Scenario generation for positive & negative cases.
- Mock mode with pattern-based route matching.
- Extensible generator architecture.

## Quick Glance
```bash
npx nest-e2e-gen generate \
  --root ./src \
  --out ./test/generated
```

## Next
Read the [Quick Start](./getting-started) to set up in your project.
