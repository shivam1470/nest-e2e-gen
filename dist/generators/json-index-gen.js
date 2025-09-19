"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateJsonIndex = generateJsonIndex;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
function log(level, cfg, ...args) { if (cfg.logLevel === 'silent')
    return; if (cfg.logLevel === 'info' && level === 'debug')
    return; console.log('[json-index]', ...args); }
function walk(dir) { const out = []; if (!fs_1.default.existsSync(dir))
    return out; const entries = fs_1.default.readdirSync(dir, { withFileTypes: true }); entries.forEach(e => { const full = path_1.default.join(dir, e.name); if (e.isDirectory())
    out.push(...walk(full));
else if (e.isFile() && e.name.endsWith('.json'))
    out.push(full); }); return out; }
function toPascalCase(base) { return base.replace(/[-_.](\w)/g, (_, c) => c.toUpperCase()).replace(/^(\w)/, c => c.toUpperCase()); }
async function generateJsonIndex(userCfg = {}) {
    const cfg = {
        projectRoot: userCfg.projectRoot || process.cwd(),
        outPayloads: userCfg.outPayloads || 'test/generated-payloads',
        indexFile: userCfg.indexFile || 'index.ts',
        exportSuffix: userCfg.exportSuffix || 'DtoPayload',
        dryRun: userCfg.dryRun ?? false,
        logLevel: userCfg.logLevel || 'info'
    };
    const rootDir = path_1.default.resolve(cfg.projectRoot, cfg.outPayloads);
    const files = walk(rootDir).sort();
    const lines = [];
    const exports = [];
    files.forEach(abs => { const rel = './' + path_1.default.relative(rootDir, abs).replace(/\\/g, '/'); const base = path_1.default.basename(abs, '.json'); const varName = toPascalCase(base) + cfg.exportSuffix; try {
        JSON.parse(fs_1.default.readFileSync(abs, 'utf-8'));
    }
    catch {
        log('info', cfg, `Skip invalid JSON: ${rel}`);
        return;
    } lines.push(`import ${varName} from '${rel}';`); exports.push(varName); });
    const content = `${lines.join('\n')}\n\nexport {\n  ${exports.join(',\n  ')}\n};\n`;
    const outPath = path_1.default.join(rootDir, cfg.indexFile);
    if (cfg.dryRun) {
        log('info', cfg, `(dry-run) Would write ${outPath}`);
        return;
    }
    fs_1.default.writeFileSync(outPath, content, 'utf-8');
    log('info', cfg, `Index written: ${outPath}`);
}
