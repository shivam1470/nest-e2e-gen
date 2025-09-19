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
exports.generateDtoPayloads = generateDtoPayloads;
const ts_morph_1 = require("ts-morph");
const project_cache_1 = require("../utils/project-cache");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
function log(level, cfg, ...args) { if (cfg.logLevel === 'silent')
    return; if (cfg.logLevel === 'info' && level === 'debug')
    return; console.log('[dto-gen]', ...args); }
const toKebabCase = (s) => s.replace(/([a-z0-9])([A-Z])/g, '$1-$2').replace(/([A-Z])([A-Z][a-z])/g, '$1-$2').toLowerCase();
function baseMockValue(typeText) { const t = typeText.toLowerCase(); if (t.includes('string'))
    return 'string'; if (t.includes('number'))
    return 123; if (t.includes('boolean'))
    return true; if (t.includes('date'))
    return '2020-01-01T00:00:00.000Z'; if (t.includes('uuid'))
    return '00000000-0000-0000-0000-000000000000'; if (t.includes('array'))
    return []; if (t.includes('record') || t.includes('{'))
    return {}; return 'sample'; }
function extractDecoratorInfo(prop) {
    let exampleLiteral;
    let enumValue;
    prop.getDecorators().forEach(d => {
        const name = d.getName();
        if (name !== 'ApiProperty' && name !== 'ApiPropertyOptional')
            return;
        const arg = d.getArguments()[0];
        if (!arg || arg.getKind() !== ts_morph_1.SyntaxKind.ObjectLiteralExpression)
            return;
        const obj = arg.asKind(ts_morph_1.SyntaxKind.ObjectLiteralExpression);
        const exampleProp = obj.getProperty('example');
        if (exampleProp?.getKind() === ts_morph_1.SyntaxKind.PropertyAssignment) {
            const init = exampleProp.getInitializer?.();
            if (init) {
                const kind = init.getKind();
                if ([ts_morph_1.SyntaxKind.StringLiteral, ts_morph_1.SyntaxKind.NumericLiteral, ts_morph_1.SyntaxKind.TrueKeyword, ts_morph_1.SyntaxKind.FalseKeyword].includes(kind)) {
                    exampleLiteral = init.getText().replace(/^['"`](.*)['"`]$/, '$1');
                }
            }
        }
        if (!exampleLiteral) {
            const enumProp = obj.getProperty('enum');
            if (enumProp?.getKind() === ts_morph_1.SyntaxKind.PropertyAssignment) {
                const init = enumProp.getInitializer?.();
                if (init) {
                    const enumType = prop.getType();
                    const decl = enumType.getSymbol()?.getDeclarations()?.[0];
                    if (decl && decl.getKind() === ts_morph_1.SyntaxKind.EnumDeclaration) {
                        const members = decl.getMembers?.();
                        if (members && members.length) {
                            const first = members[0];
                            const valInit = first.getInitializer();
                            enumValue = valInit ? valInit.getText().replace(/^['"`](.*)['"`]$/, '$1') : first.getName();
                        }
                    }
                }
            }
        }
    });
    return { exampleLiteral, enumValue };
}
function buildPayload(cls) { const result = {}; cls.getProperties().sort((a, b) => a.getName().localeCompare(b.getName())).forEach(p => { const { exampleLiteral, enumValue } = extractDecoratorInfo(p); const typeText = p.getType().getText(); const value = exampleLiteral ?? enumValue ?? baseMockValue(typeText); result[p.getName()] = value; }); return result; }
async function generateDtoPayloads(userCfg = {}) {
    const cfg = {
        projectRoot: userCfg.projectRoot || process.cwd(),
        tsconfigPath: userCfg.tsconfigPath || path.resolve(userCfg.projectRoot || process.cwd(), 'tsconfig.json'),
        srcDir: userCfg.srcDir || 'src',
        dtoGlob: userCfg.dtoGlob || 'src/**/dto/*.dto.ts',
        outPayloads: userCfg.outPayloads || 'test/generated-payloads',
        overwrite: userCfg.overwrite ?? false,
        dryRun: userCfg.dryRun ?? false,
        logLevel: userCfg.logLevel || 'info',
        filter: userCfg.filter || ''
    };
    const project = (0, project_cache_1.getTsMorphProject)(cfg.tsconfigPath);
    const dtoFiles = project.getSourceFiles(cfg.dtoGlob);
    const filterSet = new Set(cfg.filter.split(',').map(s => s.trim()).filter(Boolean));
    dtoFiles.forEach(file => {
        const relToSrc = path.relative(path.resolve(cfg.projectRoot, cfg.srcDir), file.getDirectoryPath());
        const featureFolder = relToSrc.split(path.sep)[0];
        if (filterSet.size && !filterSet.has(featureFolder))
            return;
        const outDir = path.resolve(cfg.projectRoot, cfg.outPayloads, featureFolder);
        if (!fs.existsSync(outDir) && !cfg.dryRun)
            fs.mkdirSync(outDir, { recursive: true });
        file.getClasses().forEach(cls => { const name = cls.getName(); if (!name)
            return; const payload = buildPayload(cls); const fileName = `${toKebabCase(name.replace(/Dto$/, ''))}.json`; const outPath = path.join(outDir, fileName); if (!cfg.overwrite && fs.existsSync(outPath)) {
            log('debug', cfg, `Skip (exists): ${outPath}`);
            return;
        } const content = JSON.stringify(payload, null, 2) + '\n'; if (cfg.dryRun)
            log('info', cfg, `(dry-run) Would write ${outPath}`);
        else {
            fs.writeFileSync(outPath, content, 'utf-8');
            log('info', cfg, `Wrote: ${outPath}`);
        } });
    });
    log('info', cfg, 'DTO payload generation complete.');
}
