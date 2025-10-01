#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const dto_gen_1 = require("./generators/dto-gen");
const json_index_gen_1 = require("./generators/json-index-gen");
const api_gen_1 = require("./generators/api-gen");
const test_gen_1 = require("./generators/test-gen");
const clean_gen_1 = require("./generators/clean-gen");
const orchestrator_1 = require("./orchestrator");
const child_process_1 = require("child_process");
function parseArgs(argv) {
    const args = argv.slice(2);
    const command = [];
    const flags = {};
    args.forEach(a => {
        if (a.startsWith('--')) {
            const [k, v] = a.substring(2).split('=');
            flags[k] = v === undefined ? true : v;
        }
        else {
            command.push(a);
        }
    });
    return { command, flags };
}
function toBool(v) { if (v === true)
    return true; if (typeof v === 'string')
    return ['1', 'true', 'yes', 'on'].includes(v.toLowerCase()); return false; }
function usage() {
    console.log(`nest-e2e-gen <group> <target> [--flags]\n\nGroups:\n  generate <dto|json-index|apis|tests|all>  Run specific generator or all in sequence\n  clean                                    Remove generated folders\n  run tests                                 Generate all then run jest\n\nCommon Flags:\n  --project-root=path            (default: cwd)\n  --src=src                      Source directory\n  --out-payloads=path            JSON dto payload directory (default: test/generated-payloads)\n  --out-apis=path                Generated api modules directory (default: test/generated-apis)\n  --out-features=path            Features directory (default: test/features)\n  --out-steps=path               Steps directory (default: test/steps)\n  --filter=users,auth            Comma list of module folders to include\n  --clean                        Clean before generation (with generate all)\n  --overwrite                    Overwrite existing generated files\n  --dry-run                      Show actions without writing\n  --mock                         Generate test utilities with mock toggle scaffolding (env: E2E_USE_MOCK=1)\n  --force-mock-upgrade           Force rewrite of request-helper with mock support (even if exists)\n  --log=info|silent|debug        Log verbosity\n  --jest-config=path             Custom jest config (default: jest-e2e.json or package jest)\n`);
}
async function main() {
    const { command, flags } = parseArgs(process.argv);
    if (command.length === 0) {
        usage();
        return;
    }
    const [group, target] = command;
    const cfg = {
        projectRoot: flags['project-root'] || process.cwd(),
        srcDir: flags['src'] || 'src',
        outPayloads: flags['out-payloads'] || 'test/generated-payloads',
        outApis: flags['out-apis'] || 'test/generated-apis',
        outFeatures: flags['out-features'] || 'test/features',
        outSteps: flags['out-steps'] || 'test/steps',
        filter: flags['filter'] || '',
        clean: toBool(flags['clean']),
        overwrite: toBool(flags['overwrite']),
        dryRun: toBool(flags['dry-run']),
        logLevel: (flags['log'] || 'info'),
        enableMock: toBool(flags['mock']),
        forceMockUpgrade: toBool(flags['force-mock-upgrade'])
    };
    try {
        if (group === 'clean') {
            await (0, clean_gen_1.cleanGenerated)(cfg);
            return;
        }
        if (group === 'run' && target === 'tests') {
            await (0, orchestrator_1.generateAll)(cfg);
            const jestConfig = flags['jest-config'] || 'jest-e2e.json';
            let jestEntry = null;
            try {
                jestEntry = require.resolve('jest', { paths: [cfg.projectRoot] });
            }
            catch { }
            if (!jestEntry) {
                // fallback older structure
                try {
                    jestEntry = require.resolve('jest/bin/jest', { paths: [cfg.projectRoot] });
                }
                catch { }
            }
            if (!jestEntry) {
                // final fallback: use npx jest
                const resNPX = (0, child_process_1.spawnSync)('npx', ['jest', '--config', jestConfig], { stdio: 'inherit', cwd: cfg.projectRoot, shell: true });
                process.exitCode = resNPX.status || 0;
                return;
            }
            const args = ['--config', jestConfig];
            const res = (0, child_process_1.spawnSync)(process.execPath, [jestEntry, ...args], { stdio: 'inherit', cwd: cfg.projectRoot });
            process.exitCode = res.status || 0;
            return;
        }
        if (group === 'generate') {
            switch (target) {
                case 'dto':
                    await (0, dto_gen_1.generateDtoPayloads)(cfg);
                    return;
                case 'json-index':
                    await (0, json_index_gen_1.generateJsonIndex)(cfg);
                    return;
                case 'apis':
                    await (0, api_gen_1.generateApis)(cfg);
                    return;
                case 'tests':
                    await (0, test_gen_1.generateTestScaffolding)(cfg);
                    return;
                case 'all':
                    await (0, orchestrator_1.generateAll)(cfg);
                    return;
                default:
                    usage();
            }
            return;
        }
        usage();
    }
    catch (e) {
        console.error('[nest-e2e-gen] Error:', e.message);
        process.exitCode = 1;
    }
}
main();
