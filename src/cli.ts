#!/usr/bin/env node
import { generateDtoPayloads } from './generators/dto-gen';
import { generateJsonIndex } from './generators/json-index-gen';
import { generateApis } from './generators/api-gen';
import { generateTestScaffolding } from './generators/test-gen';
import { cleanGenerated } from './generators/clean-gen';
import { generateAll } from './orchestrator';
import { spawnSync } from 'child_process';

interface ArgMap { [k: string]: string | boolean; }

function parseArgs(argv: string[]): { command: string[]; flags: ArgMap } {
  const args = argv.slice(2);
  const command: string[] = [];
  const flags: ArgMap = {};
  args.forEach(a => {
    if (a.startsWith('--')) {
      const [k, v] = a.substring(2).split('=');
      flags[k] = v === undefined ? true : v;
    } else {
      command.push(a);
    }
  });
  return { command, flags };
}

function toBool(v: any): boolean { if (v === true) return true; if (typeof v === 'string') return ['1','true','yes','on'].includes(v.toLowerCase()); return false; }

function usage() {
  console.log(`nest-e2e-gen <group> <target> [--flags]\n\nGroups:\n  generate <dto|json-index|apis|tests|all>  Run specific generator or all in sequence\n  clean                                    Remove generated folders\n  run tests                                 Generate all then run jest\n\nCommon Flags:\n  --project-root=path            (default: cwd)\n  --src=src                      Source directory\n  --out-payloads=path            JSON dto payload directory (default: test/generated-payloads)\n  --out-apis=path                Generated api modules directory (default: test/generated-apis)\n  --out-features=path            Features directory (default: test/features)\n  --out-steps=path               Steps directory (default: test/steps)\n  --filter=users,auth            Comma list of module folders to include\n  --clean                        Clean before generation (with generate all)\n  --overwrite                    Overwrite existing generated files\n  --dry-run                      Show actions without writing\n  --mock                         Generate test utilities with mock toggle scaffolding (env: E2E_USE_MOCK=1)\n  --force-mock-upgrade           Force rewrite of request-helper with mock support (even if exists)\n  --log=info|silent|debug        Log verbosity\n  --jest-config=path             Custom jest config (default: jest-e2e.json or package jest)\n`);
}

async function main() {
  const { command, flags } = parseArgs(process.argv);
  if (command.length === 0) { usage(); return; }
  const [group, target] = command;

  const cfg: any = {
    projectRoot: (flags['project-root'] as string) || process.cwd(),
    srcDir: (flags['src'] as string) || 'src',
    outPayloads: (flags['out-payloads'] as string) || 'test/generated-payloads',
    outApis: (flags['out-apis'] as string) || 'test/generated-apis',
    outFeatures: (flags['out-features'] as string) || 'test/features',
    outSteps: (flags['out-steps'] as string) || 'test/steps',
    filter: (flags['filter'] as string) || '',
    clean: toBool(flags['clean']),
    overwrite: toBool(flags['overwrite']),
    dryRun: toBool(flags['dry-run']),
    logLevel: ((flags['log'] as string) || 'info') as 'info'|'silent'|'debug',
    enableMock: toBool(flags['mock']),
    forceMockUpgrade: toBool(flags['force-mock-upgrade'])
  };

  try {
    if (group === 'clean') {
      await cleanGenerated(cfg);
      return;
    }
    if (group === 'run' && target === 'tests') {
      await generateAll(cfg);
      const jestConfig = (flags['jest-config'] as string) || 'jest-e2e.json';
      let jestEntry: string | null = null;
      try { jestEntry = require.resolve('jest', { paths: [cfg.projectRoot] }); } catch {}
      if(!jestEntry){
        // fallback older structure
        try { jestEntry = require.resolve('jest/bin/jest', { paths: [cfg.projectRoot] }); } catch {}
      }
      if(!jestEntry){
        // final fallback: use npx jest
        const resNPX = spawnSync('npx', ['jest','--config', jestConfig], { stdio: 'inherit', cwd: cfg.projectRoot, shell: true });
        process.exitCode = resNPX.status || 0; return;
      }
      const args = ['--config', jestConfig];
      const res = spawnSync(process.execPath, [jestEntry, ...args], { stdio: 'inherit', cwd: cfg.projectRoot });
      process.exitCode = res.status || 0;
      return;
    }
    if (group === 'generate') {
      switch (target) {
        case 'dto':
          await generateDtoPayloads(cfg);
          return;
        case 'json-index':
          await generateJsonIndex(cfg);
          return;
        case 'apis':
          await generateApis(cfg);
          return;
        case 'tests':
          await generateTestScaffolding(cfg);
          return;
        case 'all':
          await generateAll(cfg);
          return;
        default:
          usage();
      }
      return;
    }
    usage();
  } catch (e:any) {
    console.error('[nest-e2e-gen] Error:', e.message);
    process.exitCode = 1;
  }
}

main();
