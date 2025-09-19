import { SyntaxKind, ClassDeclaration, PropertyDeclaration } from 'ts-morph';
import { getTsMorphProject } from '../utils/project-cache';
import * as path from 'path';
import * as fs from 'fs';

export interface DtoGenConfig { projectRoot?: string; tsconfigPath?: string; srcDir?: string; dtoGlob?: string; outPayloads?: string; overwrite?: boolean; dryRun?: boolean; logLevel?: 'silent'|'info'|'debug'; filter?: string; }
interface InternalCfg extends Required<Omit<DtoGenConfig, 'filter'>> { filter: string; }

function log(level:'info'|'debug', cfg:InternalCfg, ...args:any[]){ if(cfg.logLevel==='silent') return; if(cfg.logLevel==='info'&&level==='debug') return; console.log('[dto-gen]', ...args); }
const toKebabCase=(s:string)=> s.replace(/([a-z0-9])([A-Z])/g,'$1-$2').replace(/([A-Z])([A-Z][a-z])/g,'$1-$2').toLowerCase();

function baseMockValue(typeText:string):any { const t=typeText.toLowerCase(); if(t.includes('string')) return 'string'; if(t.includes('number')) return 123; if(t.includes('boolean')) return true; if(t.includes('date')) return '2020-01-01T00:00:00.000Z'; if(t.includes('uuid')) return '00000000-0000-0000-0000-000000000000'; if(t.includes('array')) return []; if(t.includes('record')||t.includes('{')) return {}; return 'sample'; }

function extractDecoratorInfo(prop: PropertyDeclaration){ let exampleLiteral: string|undefined; let enumValue: string|undefined; prop.getDecorators().forEach(d=>{ const name = d.getName(); if(name!=='ApiProperty' && name!=='ApiPropertyOptional') return; const arg = d.getArguments()[0]; if(!arg || arg.getKind()!==SyntaxKind.ObjectLiteralExpression) return; const obj = arg.asKind(SyntaxKind.ObjectLiteralExpression)!; const exampleProp = obj.getProperty('example'); if(exampleProp?.getKind()===SyntaxKind.PropertyAssignment){ const init = (exampleProp as any).getInitializer?.(); if(init){ const kind = init.getKind(); if([SyntaxKind.StringLiteral, SyntaxKind.NumericLiteral, SyntaxKind.TrueKeyword, SyntaxKind.FalseKeyword].includes(kind)){ exampleLiteral = init.getText().replace(/^['"`](.*)['"`]$/,'$1'); } } }
 if(!exampleLiteral){ const enumProp = obj.getProperty('enum'); if(enumProp?.getKind()===SyntaxKind.PropertyAssignment){ const init = (enumProp as any).getInitializer?.(); if(init){ const enumType = prop.getType(); const decl = enumType.getSymbol()?.getDeclarations()?.[0]; if(decl && decl.getKind()===SyntaxKind.EnumDeclaration){ const members = (decl as any).getMembers?.(); if(members && members.length){ const first = members[0]; const valInit = first.getInitializer(); enumValue = valInit ? valInit.getText().replace(/^['"`](.*)['"`]$/,'$1') : first.getName(); } } } } }
 });
 return { exampleLiteral, enumValue }; }

function buildPayload(cls: ClassDeclaration){ const result:Record<string,any>={}; cls.getProperties().sort((a,b)=>a.getName().localeCompare(b.getName())).forEach(p=>{ const { exampleLiteral, enumValue } = extractDecoratorInfo(p); const typeText = p.getType().getText(); const value = exampleLiteral??enumValue??baseMockValue(typeText); result[p.getName()] = value; }); return result; }

export async function generateDtoPayloads(userCfg: DtoGenConfig = {}) {
  const cfg: InternalCfg = {
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
  const project = getTsMorphProject(cfg.tsconfigPath);
  const dtoFiles = project.getSourceFiles(cfg.dtoGlob);
  const filterSet = new Set(cfg.filter.split(',').map(s=>s.trim()).filter(Boolean));
  dtoFiles.forEach(file=>{
    const relToSrc = path.relative(path.resolve(cfg.projectRoot, cfg.srcDir), file.getDirectoryPath());
    const featureFolder = relToSrc.split(path.sep)[0];
    if(filterSet.size && !filterSet.has(featureFolder)) return;
    const outDir = path.resolve(cfg.projectRoot, cfg.outPayloads, featureFolder);
    if(!fs.existsSync(outDir) && !cfg.dryRun) fs.mkdirSync(outDir,{recursive:true});
    file.getClasses().forEach(cls=>{ const name = cls.getName(); if(!name) return; const payload = buildPayload(cls); const fileName = `${toKebabCase(name.replace(/Dto$/,''))}.json`; const outPath = path.join(outDir, fileName); if(!cfg.overwrite && fs.existsSync(outPath)){ log('debug', cfg, `Skip (exists): ${outPath}`); return; } const content = JSON.stringify(payload, null, 2)+'\n'; if(cfg.dryRun) log('info', cfg, `(dry-run) Would write ${outPath}`); else { fs.writeFileSync(outPath, content, 'utf-8'); log('info', cfg, `Wrote: ${outPath}`); } });
  });
  log('info', cfg, 'DTO payload generation complete.');
}
