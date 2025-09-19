import * as fs from 'fs';
import * as path from 'path';

export interface CleanCfg { projectRoot?: string; logLevel?: 'silent'|'info'|'debug'; outPayloads?: string; outApis?: string; outFeatures?: string; outSteps?: string; }
interface InternalCfg extends Required<CleanCfg> {}

function log(level:'info'|'debug', cfg:InternalCfg, ...args:any[]){ if(cfg.logLevel==='silent') return; if(cfg.logLevel==='info'&&level==='debug') return; console.log('[clean]', ...args); }

function rimraf(target:string){ if(!fs.existsSync(target)) return; const stat = fs.statSync(target); if(stat.isDirectory()){ fs.readdirSync(target).forEach(e=>rimraf(path.join(target,e))); fs.rmdirSync(target); } else fs.unlinkSync(target); }

export async function cleanGenerated(userCfg: CleanCfg = {}){
  const cfg: InternalCfg = {
    projectRoot: userCfg.projectRoot || process.cwd(),
    logLevel: userCfg.logLevel || 'info',
    outPayloads: userCfg.outPayloads || 'test/generated-payloads',
    outApis: userCfg.outApis || 'test/generated-apis',
    outFeatures: userCfg.outFeatures || 'test/features',
    outSteps: userCfg.outSteps || 'test/steps'
  };
  const dirs = [cfg.outApis, cfg.outPayloads, path.join(cfg.outFeatures), path.join(cfg.outSteps)];
  log('info', cfg, 'Starting cleanup');
  dirs.forEach(d=>{ const abs = path.resolve(cfg.projectRoot, d); if(fs.existsSync(abs)){ log('info', cfg, `Removing ${abs}`); rimraf(abs); } else log('debug', cfg, `Skip ${abs}`); });
  log('info', cfg, 'Cleanup done');
}
