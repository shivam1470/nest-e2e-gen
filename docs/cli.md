# CLI Reference

The `nest-e2e-gen` CLI exposes generator commands.

## Basic Syntax
```bash
npx nest-e2e-gen <command> [options]
```

## Commands
### generate
Generate payload helpers, request utilities, and optional cucumber feature files.

```bash
npx nest-e2e-gen generate --root src --out test/generated --features test/features
```

Options:
- `--root <path>`: Root source directory (required)
- `--out <dir>`: Output directory for generated TS utilities (default: `test/generated`)
- `--features <dir>`: Output directory for `.feature` files (optional)
- `--overwrite`: Overwrite existing generated files
- `--no-features`: Skip feature file generation
- `--controller <Name>`: Limit to specific controller (repeatable)
- `--quiet`: Suppress non-error logs

### help
Display usage help.

```bash
npx nest-e2e-gen help
```

## Environment Variables
- `E2E_USE_MOCK=1` – Run tests against in-memory mock layer.

## Exit Codes
- `0`: Success
- `1`: General error
- `2`: Invalid arguments / missing required flag

## Examples
Only generate for a single controller:
```bash
npx nest-e2e-gen generate --root src --controller Users --out test/generated
```

Skip feature files:
```bash
npx nest-e2e-gen generate --root src --out test/generated --no-features
```
