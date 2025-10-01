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
  --mock                        Include mock-mode capable test utilities (toggle at runtime via E2E_USE_MOCK=1)
    --force-mock-upgrade          Force rewrite of request-helper with mock version even if file exists (no need for --overwrite)
  --log=info|silent|debug       Verbosity (default info)
```

## 💡 Support / Consulting

Need help integrating **nest-e2e-gen** into your project?  
I can assist with setup, debugging, and best practices for NestJS e2e testing.

**Contact:**  
- **Name:** Shivam Mishra  
- **Email:** shivammishr16@gmail.com  
- **LinkedIn:** [linkedin.com/in/shivammishra16](https://www.linkedin.com/in/shivammishra16/)  
- **Role:** Software Engineer  

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

### Mock Mode (Experimental)
Generate scaffolding with a lightweight mock transport layer instead of spinning up a full Nest application during e2e runs.

Enable at generation time:
```
nest-e2e-gen generate all --mock
```
This modifies the generated `test/utility/request-helper.ts` to detect `E2E_USE_MOCK` at runtime.

Run tests using mocks only (no Nest boot, super fast):
```
E2E_USE_MOCK=1 pnpm test
```
Faster (least destructive) upgrade if you only want to inject mock helper without touching other files:
```
nest-e2e-gen generate tests --mock --force-mock-upgrade
```
This rewrites only `test/utility/request-helper.ts` (if it lacked mock markers) leaving features/steps intact.

If you see a warning:
```
Mock support requested but existing request-helper has no mock markers. Use --overwrite or --force-mock-upgrade to regenerate.
```
Resolve by rerunning with one of the suggested flags.
E2E_USE_MOCK=1 pnpm test
```

In mock mode you can register endpoint handlers inside custom step definitions or helper files:
```ts
import { requestHelper } from '../utility/request-helper';

beforeAll(() => {
  requestHelper.registerMock('GET', '/users', () => ({ status: 200, body: [{ id: 1, name: 'Mock User'}] }));
});
```

Fallback behavior: if no mock registered, a generic 200 with `{ mocked: true, method, path, body }` is returned so assertions can still proceed.

Switch back to real app (ignores mocks):
```
unset E2E_USE_MOCK # or run without the variable
pnpm test
```

Use Cases:
- Ultra-fast feedback while authoring steps
- Offline development when DB not available
- Contract-style testing before controller implementation

Limitations:
- Auth token bootstrap is skipped in mock mode (no `login`); add your own header simulation if needed.
- Middleware/guards/pipes not executed when mocked.

Roadmap Ideas for Mock Mode:
- Pattern-based auto-mocking
- Persisted mock recordings
- Hybrid mode (real for some modules, mock others)

## Roadmap / Ideas
- Optional OpenAPI schema ingestion
- Deterministic mock value strategy plugins
- Pluggable serializers for fixtures (YAML, JSON5)
- Watch mode

## License
MIT

