"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateApis = generateApis;
const project_cache_1 = require("../utils/project-cache");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
function log(level, cfg, ...args) { if (cfg.logLevel === 'silent')
    return; if (cfg.logLevel === 'info' && level === 'debug')
    return; console.log('[api-gen]', ...args); }
function getHttpMethod(d) { const n = d.getName(); if (['Get', 'Post', 'Put', 'Delete', 'Patch'].includes(n))
    return n.toUpperCase(); }
function detectControllerClass(classes) { return classes.find(c => c.getDecorator('Controller')); }
function normalizeBasePath(classDecl) { const dec = classDecl.getDecorator('Controller'); const arg0 = dec?.getArguments()[0]; if (!arg0)
    return ''; const raw = arg0.getText().replace(/['"`]/g, ''); return raw.replace(/^\//, '').replace(/\/$/, ''); }
const camelCase = (s) => s.charAt(0).toLowerCase() + s.slice(1);
const toKebabCase = (s) => s.replace(/([a-z0-9])([A-Z])/g, '$1-$2').replace(/([A-Z])([A-Z][a-z])/g, '$1-$2').toLowerCase();
function deriveNames(classDecl) { const className = classDecl.getName() || 'Controller'; const base = className.endsWith('Controller') ? className.slice(0, -'Controller'.length) : className; return { variable: camelCase(base) + 'Api', fileBase: toKebabCase(base) }; }
function getBodyPayloadFactoryName(m) {
    const param = m.getParameters().find(p => p.getDecorator('Body'));
    if (!param)
        return;
    const sym = param.getType().getSymbol();
    if (!sym)
        return;
    // If the type name already ends with Dto, do not append another Dto before Payload
    const name = sym.getName();
    return name.endsWith('Dto') ? name + 'Payload' : name + 'DtoPayload';
}
function extractPathParams(p) { return [...p.matchAll(/:([a-zA-Z0-9_]+)/g)].map(m => m[1]); }
function buildExtras(full) { const seg = full.split('/').filter(Boolean); return extractPathParams(full).map(param => { const idx = seg.findIndex(s => s === `:${param}`); return { insertAfter: idx > 0 ? seg[idx - 1] : '', valueKey: param }; }); }
function sanitize(base, sub) { const raw = `/${base}/${sub}`.replace(/\/+/g, '/'); return raw.replace(/\/+/g, '/').replace(/\/+$/, '') || '/'; }
function generateModuleSource(mod, cfg) {
    const payloadFactories = new Set();
    Object.values(mod.endpoints).forEach(e => { if (e.payloadFactoryName)
        payloadFactories.add(e.payloadFactoryName); });
    let relPayloadImportBase = path.relative(path.resolve(cfg.projectRoot, cfg.outApis), path.resolve(cfg.projectRoot, cfg.outPayloads)).replace(/\\/g, '/');
    if (!relPayloadImportBase.startsWith('.'))
        relPayloadImportBase = './' + relPayloadImportBase;
    let src = `import { TApiModule } from '../utility/type';\n`;
    if (payloadFactories.size) {
        src += `import { ${Array.from(payloadFactories).join(', ')} } from '${relPayloadImportBase}';\n`;
    }
    src += '\n';
    const entries = Object.entries(mod.endpoints).map(([k, e]) => {
        const lines = [];
        lines.push(`  "${k}": {`);
        lines.push(`    endpoint: "${e.endpoint}",`);
        lines.push(`    method: "${e.method}",`);
        lines.push(`    path: "${e.path}",`);
        if (e.payloadFactoryName)
            lines.push(`    payload: () => ${e.payloadFactoryName},`);
        if (e.extras.length) {
            const block = e.extras.map(ex => `      { insertAfter: '${ex.insertAfter}', valueKey: '${ex.valueKey}' }`).join(',\n');
            lines.push('    extra: [');
            lines.push(block);
            lines.push('    ],');
        }
        lines.push('  }');
        return lines.join('\n');
    }).join(',\n\n');
    src += `export const ${mod.variableName}: TApiModule = {\n${entries}\n};\n`;
    return src;
}
function buildIndex(mods) {
    let imports = '';
    let spec = 'export const apiSpec = {\n';
    mods.forEach(m => { imports += `import { ${m.variableName} } from './${m.fileBaseName}';\n`; spec += `  ${m.variableName.replace(/Api$/, '')}: ${m.variableName},\n`; });
    spec += '};\n';
    return `${imports}\n${spec}`;
}
async function generateApis(userCfg = {}) {
    const cfg = {
        projectRoot: userCfg.projectRoot || process.cwd(),
        tsconfigPath: userCfg.tsconfigPath || path.resolve(userCfg.projectRoot || process.cwd(), 'tsconfig.json'),
        controllersGlob: userCfg.controllersGlob || 'src/**/*.controller.ts',
        outApis: userCfg.outApis || 'test/generated-apis',
        outPayloads: userCfg.outPayloads || 'test/generated-payloads',
        cleanOutput: userCfg.cleanOutput ?? false,
        logLevel: userCfg.logLevel || 'info',
        srcDir: userCfg.srcDir || 'src',
        filter: userCfg.filter || ''
    };
    const project = (0, project_cache_1.getTsMorphProject)(cfg.tsconfigPath);
    const controllers = project.getSourceFiles(cfg.controllersGlob);
    const filterSet = new Set(cfg.filter.split(',').map(s => s.trim()).filter(Boolean));
    const generated = [];
    controllers.forEach(sf => {
        try {
            const cls = detectControllerClass(sf.getClasses());
            if (!cls)
                return;
            const relToSrc = path.relative(path.resolve(cfg.projectRoot, cfg.srcDir), sf.getDirectoryPath());
            const featureFolder = relToSrc.split(path.sep)[0];
            if (filterSet.size && !filterSet.has(featureFolder))
                return;
            const { variable, fileBase } = deriveNames(cls);
            const base = normalizeBasePath(cls);
            const endpoints = {};
            cls.getMethods().forEach(m => { const dec = m.getDecorators().find(d => getHttpMethod(d)); if (!dec)
                return; const method = getHttpMethod(dec); const arg0 = dec.getArguments()[0]; const sub = arg0 ? arg0.getText().replace(/['"`]/g, '') : ''; const full = sanitize(base, sub); const spec = { endpoint: m.getName(), method, path: full, payloadFactoryName: getBodyPayloadFactoryName(m), extras: buildExtras(full) }; if (endpoints[spec.endpoint]) {
                log('debug', cfg, `Duplicate endpoint ${spec.endpoint}`);
                return;
            } endpoints[spec.endpoint] = spec; });
            const mod = { variableName: variable, fileBaseName: fileBase, endpoints };
            const outDir = path.resolve(cfg.projectRoot, cfg.outApis);
            fs.mkdirSync(outDir, { recursive: true });
            const moduleSource = generateModuleSource(mod, cfg);
            const outFile = path.join(outDir, `${fileBase}.ts`);
            fs.writeFileSync(outFile, moduleSource, 'utf-8');
            generated.push(mod);
            log('info', cfg, `Generated ${outFile}`);
        }
        catch (e) {
            log('info', cfg, `Error ${sf.getBaseName()}: ${e.message}`);
        }
    });
    if (cfg.cleanOutput) {
        // remove orphaned .ts (excluding index.ts)
        const dir = path.resolve(cfg.projectRoot, cfg.outApis);
        const files = fs.existsSync(dir) ? fs.readdirSync(dir) : [];
        const keep = new Set(generated.map(g => g.fileBaseName));
        files.filter(f => f.endsWith('.ts') && f !== 'index.ts').forEach(f => { const base = f.replace(/\.ts$/, ''); if (!keep.has(base))
            fs.unlinkSync(path.join(dir, f)); });
    }
    const indexContent = buildIndex(generated);
    const indexPath = path.resolve(cfg.projectRoot, cfg.outApis, 'index.ts');
    fs.writeFileSync(indexPath, indexContent, 'utf-8');
    log('info', cfg, 'Index updated');
}
