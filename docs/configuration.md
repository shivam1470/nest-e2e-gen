# Configuration

While `nest-e2e-gen` favors explicit CLI flags, you can also centralize defaults.

## Philosophy
- Zero hidden magic.
- Deterministic generation.
- Text-friendly outputs (diffable in PRs).

## Suggested Project Structure
```
/test
  /generated
  /features
```

## Common Flags Recap
| Flag | Description | Recommended |
| ---- | ----------- | ----------- |
| `--root` | Root of NestJS source | Always set |
| `--out` | Generated helpers dir | `test/generated` |
| `--features` | Feature files output | `test/features` |
| `--overwrite` | Overwrite existing | Only in CI or regen step |

## Ignoring Generated Files
Decide whether to commit generated artifacts:
- Commit for review visibility & reproducibility.
- Or add to `.gitignore` and regenerate in CI (ensure caching/test speed acceptable).

## Hooks
Add in `package.json`:
```jsonc
{
  "scripts": {
    "pretest:e2e": "nest-e2e-gen generate --root src --out test/generated --features test/features"
  }
}
```

## Extending Generation
Future roadmap may include a config file (e.g. `e2e-gen.config.ts`). Currently use flags + your own wrapper scripts if necessary.
