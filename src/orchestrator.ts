import { generateDtoPayloads } from './generators/dto-gen';
import { generateJsonIndex } from './generators/json-index-gen';
import { generateApis } from './generators/api-gen';
import { generateTestScaffolding } from './generators/test-gen';
import { cleanGenerated } from './generators/clean-gen';

export interface AllGenCfg {
  projectRoot?: string;
  srcDir?: string;
  outPayloads?: string;
  outApis?: string;
  outFeatures?: string;
  outSteps?: string;
  filter?: string;
  clean?: boolean;
  overwrite?: boolean;
  dryRun?: boolean;
  logLevel?: 'silent'|'info'|'debug';
  enableMock?: boolean; // when true, test scaffolding includes mock toggle utilities
  forceMockUpgrade?: boolean; // force regenerate mock helper even without overwrite
}

export async function generateAll(cfg: AllGenCfg = {}) {
  const start = Date.now();
  if(cfg.clean) await cleanGenerated(cfg);
  await generateDtoPayloads(cfg);
  await generateJsonIndex(cfg);
  await generateApis(cfg);
  await generateTestScaffolding({
    projectRoot: cfg.projectRoot,
    apiSpecDir: cfg.outApis,
    baseTestDir: 'test',
    overwrite: cfg.overwrite,
    dryRun: cfg.dryRun,
    logLevel: cfg.logLevel,
    filter: cfg.filter,
    enableMock: cfg.enableMock,
    forceMockUpgrade: cfg.forceMockUpgrade
  });
  const ms = Date.now() - start;
  if(cfg.logLevel !== 'silent') console.log(`[all] Completed in ${ms}ms`);
}
