# Quick Start

Follow these steps to integrate `nest-e2e-gen` into a NestJS project.

## 1. Install
```bash
pnpm add -D nest-e2e-gen
# or
npm i -D nest-e2e-gen
```

## 2. Basic Generate Command
```bash
npx nest-e2e-gen generate \
  --root ./src \
  --out ./test/generated \
  --features ./test/features
```

Flags:
- `--root` (required): Root of your NestJS source containing modules/controllers.
- `--out`: Directory where generated TypeScript helpers/payloads go.
- `--features`: Directory for `.feature` files (BDD). If omitted, feature generation can be skipped.

## 3. Run Generation
Add a script:
```jsonc
{
  "scripts": {
    "e2e:gen": "nest-e2e-gen generate --root src --out test/generated --features test/features"
  }
}
```
Run it:
```bash
pnpm e2e:gen
```

## 4. Execute Tests
If using cucumber-style steps ensure jest + jest-cucumber setup. A common script:
```bash
pnpm test:e2e
```

## 5. Mock Mode (Optional)
Set environment variable to avoid real HTTP calls:
```bash
E2E_USE_MOCK=1 pnpm test:e2e
```

## 6. Regenerate When DTOs Change
Re-run the generation script. Consider a pretest hook:
```jsonc
{
  "scripts": {
    "pretest:e2e": "pnpm e2e:gen"
  }
}
```

Proceed to the [CLI Reference](./cli) for all commands & flags.
