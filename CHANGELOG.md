# Changelog

All notable changes to this project will be documented in this file.

## [0.3.8] - 2025-09-19
### Fixed
- Release script: robust CHANGELOG section extraction (previous awk pattern caused syntax error when building release notes).

### Changed
- Documentation: Clarify optimization via single cached ts-morph Project instance to reduce repeated parsing overhead during generation.

### Notes
- Patch release to enable successful npm publish after 0.3.7 version duplication error.

## [0.3.7] - 2025-09-19
### Removed
- Final removal of lingering `src/dto-generator` legacy folder accidentally still present after 0.3.6 cleanup.

### Notes
- No code path changes; aligns source tree with 0.3.6 intent.

## [0.3.6] - 2025-09-19
### Removed
- Purged legacy source & build artifacts: `src/{controller-parser,dto-generator,json-to-ts-generator}` and corresponding `dist/*` folders (`controller-parser`, `dto-generator`, `json-to-ts-generator`, `feature-generator`). These were superseded by consolidated generators under `src/generators/*`.

### Changed
- Slimmed published package by removing unused placeholder utility files (`request-helper.ts`, `request-dispatcher.ts`) in favor of on-demand generation inside `test/utility`.

### Notes
- No runtime API changes; only dead code elimination. Consumers using public exports remain unaffected.

## [0.3.0] - 2025-09-18
### Added
- Unified CLI command structure: `nest-e2e-gen generate <dto|json-index|apis|tests|all>` and `clean`.
- Orchestrator `generateAll` performing full pipeline (payloads → json index → apis → tests).
- Configurable output directories via flags (`--out-payloads`, `--out-apis`, `--out-features`, `--out-steps`).
- Module filtering with `--filter=module1,module2`.
- Cleanup command (`clean`) plus `--clean` pre-generation option.
- Overwrite / dry-run and log verbosity flags.
- Programmatic API exports for each generator and orchestrator.
- README documentation overhaul.

### Changed
- Replaced legacy ad-hoc feature generator with structured test scaffolding generator.
- Refactored internal file structure under `src/generators/*`.

### Removed
- Obsolete legacy `feature-generator` directory (superseded by `test-gen`).

### Notes
- No breaking changes for external users prior to 0.3.0 (pre-1.0). Legacy commands removed; upgrade by switching to new CLI syntax.

## [0.2.x]
Initial iterations: DTO payload generation, controller parsing prototype, early feature file writer.

---
Semantic versioning will be followed (pre-1.0 minor = feature, patch = fixes).