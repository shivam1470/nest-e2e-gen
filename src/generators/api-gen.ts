import { Decorator, MethodDeclaration, ClassDeclaration } from 'ts-morph';
import { getTsMorphProject } from '../utils/project-cache';
import * as path from 'path';
import * as fs from 'fs';

export interface ApiGenCfg { projectRoot?: string; tsconfigPath?: string; controllersGlob?: string; outApis?: string; outPayloads?: string; cleanOutput?: boolean; logLevel?: 'silent'|'info'|'debug'; srcDir?: string; filter?: string; }
interface InternalCfg extends Required<Omit<ApiGenCfg,'filter'>> { filter: string; }

function log(level:'info'|'debug', cfg:InternalCfg, ...args:any[]){ if(cfg.logLevel==='silent') return; if(cfg.logLevel==='info'&&level==='debug') return; console.log('[api-gen]', ...args); }
function getHttpMethod(d: Decorator){ const n=d.getName(); if(['Get','Post','Put','Delete','Patch'].includes(n)) return n.toUpperCase(); }
function detectControllerClass(classes: ClassDeclaration[]){ return classes.find(c=>c.getDecorator('Controller')); }
function normalizeBasePath(classDecl: ClassDeclaration){ const dec=classDecl.getDecorator('Controller'); const arg0 = dec?.getArguments()[0]; if(!arg0) return ''; const raw = arg0.getText().replace(/['"`]/g,''); return raw.replace(/^\//,'').replace(/\/$/,''); }
const camelCase=(s:string)=> s.charAt(0).toLowerCase()+s.slice(1);
const toKebabCase=(s:string)=> s.replace(/([a-z0-9])([A-Z])/g,'$1-$2').replace(/([A-Z])([A-Z][a-z])/g,'$1-$2').toLowerCase();
function deriveNames(classDecl: ClassDeclaration){ const className = classDecl.getName()||'Controller'; const base = className.endsWith('Controller')?className.slice(0,-'Controller'.length):className; return { variable: camelCase(base)+'Api', fileBase: toKebabCase(base) }; }
function getBodyPayloadFactoryName(m: MethodDeclaration){
  const param = m.getParameters().find(p=>p.getDecorator('Body'));
  if(!param) return;
  const sym = param.getType().getSymbol();
  if(!sym) return;
  // If the type name already ends with Dto, do not append another Dto before Payload
  const name = sym.getName();
  return name.endsWith('Dto') ? name + 'Payload' : name + 'DtoPayload';
}
function extractPathParams(p:string){ return [...p.matchAll(/:([a-zA-Z0-9_]+)/g)].map(m=>m[1]); }
function buildExtras(full:string){ const seg=full.split('/').filter(Boolean); return extractPathParams(full).map(param=>{ const idx = seg.findIndex(s=>s===`:${param}`); return { insertAfter: idx>0?seg[idx-1]:'', valueKey: param }; }); }
function sanitize(base:string, sub:string){ const raw = `/${base}/${sub}`.replace(/\/+/g,'/'); return raw.replace(/\/+/g,'/').replace(/\/+$/,'')||'/'; }

interface ExtraParamSpec { insertAfter: string; valueKey: string; }
interface EndpointSpec { endpoint: string; method: string; path: string; payloadFactoryName?: string; extras: ExtraParamSpec[]; }
interface GeneratedApiModule { variableName: string; fileBaseName: string; endpoints: Record<string, EndpointSpec>; }

function generateModuleSource(mod: GeneratedApiModule, cfg: InternalCfg): string {
  const payloadFactories = new Set<string>();
  Object.values(mod.endpoints).forEach(e=>{ if(e.payloadFactoryName) payloadFactories.add(e.payloadFactoryName); });
  let relPayloadImportBase = path.relative(path.resolve(cfg.projectRoot, cfg.outApis), path.resolve(cfg.projectRoot, cfg.outPayloads)).replace(/\\/g,'/');
  if(!relPayloadImportBase.startsWith('.')) relPayloadImportBase = './'+relPayloadImportBase;
  let src = `import { TApiModule } from '../utility/type';\n`;
  if(payloadFactories.size){ src += `import { ${Array.from(payloadFactories).join(', ')} } from '${relPayloadImportBase}';\n`; }
  src+='\n';
  const entries = Object.entries(mod.endpoints).map(([k,e])=>{
    const lines:string[]=[]; lines.push(`  "${k}": {`); lines.push(`    endpoint: "${e.endpoint}",`); lines.push(`    method: "${e.method}",`); lines.push(`    path: "${e.path}",`); if(e.payloadFactoryName) lines.push(`    payload: () => ${e.payloadFactoryName},`); if(e.extras.length){ const block = e.extras.map(ex=>`      { insertAfter: '${ex.insertAfter}', valueKey: '${ex.valueKey}' }`).join(',\n'); lines.push('    extra: ['); lines.push(block); lines.push('    ],'); } lines.push('  }'); return lines.join('\n');
  }).join(',\n\n');
  src += `export const ${mod.variableName}: TApiModule = {\n${entries}\n};\n`;
  return src;
}

function buildIndex(mods: GeneratedApiModule[]): string {
  let imports=''; let spec='export const apiSpec = {\n';
  mods.forEach(m=>{ imports += `import { ${m.variableName} } from './${m.fileBaseName}';\n`; spec += `  ${m.variableName.replace(/Api$/,'')}: ${m.variableName},\n`; });
  spec+='};\n';
  return `${imports}\n${spec}`;
}

export async function generateApis(userCfg: ApiGenCfg = {}) {
  const cfg: InternalCfg = {
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

  const project = getTsMorphProject(cfg.tsconfigPath);
  const controllers = project.getSourceFiles(cfg.controllersGlob);
  const filterSet = new Set(cfg.filter.split(',').map(s=>s.trim()).filter(Boolean));
  const generated: GeneratedApiModule[] = [];
  controllers.forEach(sf=>{
    try {
      const cls = detectControllerClass(sf.getClasses()); if(!cls) return;
      const relToSrc = path.relative(path.resolve(cfg.projectRoot, cfg.srcDir), sf.getDirectoryPath());
      const featureFolder = relToSrc.split(path.sep)[0];
      if(filterSet.size && !filterSet.has(featureFolder)) return;
      const { variable, fileBase } = deriveNames(cls);
      const base = normalizeBasePath(cls);
      const endpoints: Record<string, EndpointSpec> = {};
      cls.getMethods().forEach(m=>{ const dec = m.getDecorators().find(d=>getHttpMethod(d)); if(!dec) return; const method = getHttpMethod(dec)!; const arg0 = dec.getArguments()[0]; const sub = arg0?arg0.getText().replace(/['"`]/g,''):''; const full = sanitize(base, sub); const spec: EndpointSpec = { endpoint: m.getName(), method, path: full, payloadFactoryName: getBodyPayloadFactoryName(m), extras: buildExtras(full) }; if(endpoints[spec.endpoint]) { log('debug', cfg, `Duplicate endpoint ${spec.endpoint}`); return; } endpoints[spec.endpoint] = spec; });
      const mod: GeneratedApiModule = { variableName: variable, fileBaseName: fileBase, endpoints };
      const outDir = path.resolve(cfg.projectRoot, cfg.outApis);
      fs.mkdirSync(outDir,{recursive:true});
      const moduleSource = generateModuleSource(mod, cfg);
      const outFile = path.join(outDir, `${fileBase}.ts`);
      fs.writeFileSync(outFile, moduleSource, 'utf-8');
      generated.push(mod);
      log('info', cfg, `Generated ${outFile}`);
    } catch(e:any){ log('info', cfg, `Error ${sf.getBaseName()}: ${e.message}`); }
  });
  if(cfg.cleanOutput){
    // remove orphaned .ts (excluding index.ts)
    const dir = path.resolve(cfg.projectRoot, cfg.outApis);
    const files = fs.existsSync(dir)? fs.readdirSync(dir):[];
    const keep = new Set(generated.map(g=>g.fileBaseName));
    files.filter(f=>f.endsWith('.ts')&&f!=='index.ts').forEach(f=>{ const base=f.replace(/\.ts$/,''); if(!keep.has(base)) fs.unlinkSync(path.join(dir,f)); });
  }
  const indexContent = buildIndex(generated);
  const indexPath = path.resolve(cfg.projectRoot, cfg.outApis, 'index.ts');
  fs.writeFileSync(indexPath, indexContent, 'utf-8');
  log('info', cfg, 'Index updated');
}
