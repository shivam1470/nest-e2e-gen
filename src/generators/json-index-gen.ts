import fs from 'fs';
import path from 'path';

export interface JsonIndexCfg { projectRoot?: string; outPayloads?: string; indexFile?: string; exportSuffix?: string; dryRun?: boolean; logLevel?: 'silent'|'info'|'debug'; }
interface InternalCfg extends Required<JsonIndexCfg> {}

function log(level:'info'|'debug', cfg:InternalCfg, ...args:any[]){ if(cfg.logLevel==='silent') return; if(cfg.logLevel==='info'&&level==='debug') return; console.log('[json-index]', ...args); }

function walk(dir:string): string[]{ const out:string[]=[]; if(!fs.existsSync(dir)) return out; const entries = fs.readdirSync(dir,{withFileTypes:true}); entries.forEach(e=>{ const full = path.join(dir,e.name); if(e.isDirectory()) out.push(...walk(full)); else if(e.isFile() && e.name.endsWith('.json')) out.push(full); }); return out; }
function toPascalCase(base:string){ return base.replace(/[-_.](\w)/g,(_,c)=>c.toUpperCase()).replace(/^(\w)/,c=>c.toUpperCase()); }

export async function generateJsonIndex(userCfg: JsonIndexCfg = {}){
  const cfg: InternalCfg = {
    projectRoot: userCfg.projectRoot || process.cwd(),
    outPayloads: userCfg.outPayloads || 'test/generated-payloads',
    indexFile: userCfg.indexFile || 'index.ts',
    exportSuffix: userCfg.exportSuffix || 'DtoPayload',
    dryRun: userCfg.dryRun ?? false,
    logLevel: userCfg.logLevel || 'info'
  };
  const rootDir = path.resolve(cfg.projectRoot, cfg.outPayloads);
  const files = walk(rootDir).sort();
  const lines:string[]=[]; const exports:string[]=[];
  files.forEach(abs=>{ const rel = './'+path.relative(rootDir, abs).replace(/\\/g,'/'); const base = path.basename(abs,'.json'); const varName = toPascalCase(base)+cfg.exportSuffix; try { JSON.parse(fs.readFileSync(abs,'utf-8')); } catch { log('info', cfg, `Skip invalid JSON: ${rel}`); return; } lines.push(`import ${varName} from '${rel}';`); exports.push(varName); });
  const content = `${lines.join('\n')}\n\nexport {\n  ${exports.join(',\n  ')}\n};\n`;
  const outPath = path.join(rootDir, cfg.indexFile);
  if(cfg.dryRun) { log('info', cfg, `(dry-run) Would write ${outPath}`); return; }
  fs.writeFileSync(outPath, content, 'utf-8');
  log('info', cfg, `Index written: ${outPath}`);
}
