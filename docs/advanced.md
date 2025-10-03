# Advanced Usage

## Partial Controller Generation
Limit surface area during prototyping:
```bash
npx nest-e2e-gen generate --root src --controller Users --controller Auth
```

## Selective Regeneration
If you manually tweak generated files (not recommended), skip `--overwrite` to preserve changes. Prefer customizing downstream utilities instead.

## Custom Test Harness
You can wrap the generated request helper to inject auth tokens or tenancy headers automatically.

Example wrapper:
```ts
// test/helpers/request.ts
import { requestHelper } from '../generated/request-helper';

export function authed() {
  return requestHelper.withHeaders({ Authorization: `Bearer ${process.env.TEST_TOKEN}` });
}
```

## Mock Layer Internals
The mock registry stores entries keyed by method + a normalized route template. Dynamic segments `:id` become regex groups during lookup.

## Negative Scenario Strategy
Generated negative cases aim for validation errors (like string length, missing required fields). Refine by editing the feature file or adding custom steps.

## CI Integration
- Run generation in a deterministic environment.
- Fail build if diff appears after generation (ensures devs commit updates).

```bash
pnpm e2e:gen
if ! git diff --quiet; then
  echo "Generated files out of date" >&2
  exit 1
fi
```
