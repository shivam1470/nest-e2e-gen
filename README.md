# nest-e2e-gen

Generate end-to-end testing scaffolding for NestJS projects from real source code (DTOs + Controllers):

- DTO payload JSONs
- Payload export index (typed factories)
- Generated API endpoint modules (apiSpec)
- Gherkin feature files
- Jest-Cucumber step specs
- Cleanup & orchestration

## Install

Local monorepo (path usage):
```
# From a consumer project
pnpm add -D nest-e2e-gen
```

## Quick Start
```
# Inside your NestJS project root
yarn nest-e2e-gen generate all
# or
npx nest-e2e-gen generate all
```
Outputs (defaults):
```
 test/
   generated-payloads/         # *.json + index.ts
   generated-apis/             # <module>.ts + index.ts (apiSpec)
   features/                   # <module>/<endpoint>.feature
   steps/                      # <module>/<endpoint>.e2e-spec.ts
```

## CLI
```
nest-e2e-gen <group> <target> [--flags]

Groups:
  generate <dto|json-index|apis|tests|all>
  clean

Common Flags:
  --project-root=path           (default: cwd)
  --src=src                     Source directory
  --out-payloads=path           Default: test/generated-payloads
  --out-apis=path               Default: test/generated-apis
  --out-features=path           Default: test/features
  --out-steps=path              Default: test/steps
  --filter=users,auth           Restrict modules by top-level folder name
  --clean                       Clean before generation (only meaningful with generate all)
  --overwrite                   Overwrite existing feature/step/payload files
  --dry-run                     Print actions only
  --log=info|silent|debug       Verbosity (default info)
```

### Examples
Generate everything (fresh):
```
nest-e2e-gen generate all --clean
```
Only DTO payloads JSON:
```
nest-e2e-gen generate dto
```
Regenerate API modules & steps for users and auth only:
```
nest-e2e-gen generate apis --filter=users,auth
nest-e2e-gen generate tests --filter=users,auth --overwrite
```
Clean outputs:
```
nest-e2e-gen clean
```

## Programmatic Usage
```ts
import { generateAll } from 'nest-e2e-gen';

await generateAll({
  projectRoot: process.cwd(),
  filter: 'users,auth',
  clean: true,
  logLevel: 'info'
});
```

## Generation Order (all)
1. DTO payload JSONs
2. JSON index (payload exports)
3. API modules (controllers → endpoints + apiSpec index)
4. Test scaffolding (features + step specs)

## Integration Pattern (Monorepo)
In a consumer `package.json` (e.g. `hrms-api`):
```json
{
  "scripts": {
    "gen:clean": "nest-e2e-gen clean",
    "gen:all": "nest-e2e-gen generate all --log=info",
    "gen:rebuild": "pnpm run gen:clean && pnpm run gen:all"
  }
}
```

## Notes
- `--filter` matches the first path segment under `src` (e.g. `src/users/dto/...`).
- Payload factory names are derived from DTO class names + `DtoPayload` suffix.
- Endpoint `extra` array is built from `:param` segments; dependency payloads for path params are auto-created if factories exist.

## Roadmap / Ideas
- Optional OpenAPI schema ingestion
- Deterministic mock value strategy plugins
- Pluggable serializers for fixtures (YAML, JSON5)
- Watch mode

## License
MIT
