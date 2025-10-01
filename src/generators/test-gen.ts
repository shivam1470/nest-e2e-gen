import * as fs from 'fs';
import * as path from 'path';

export interface TestGenCfg { projectRoot?: string; apiSpecDir?: string; baseTestDir?: string; overwrite?: boolean; dryRun?: boolean; logLevel?: 'silent'|'info'|'debug'; filter?: string; enableMock?: boolean; forceMockUpgrade?: boolean; }
interface InternalCfg extends Required<Omit<TestGenCfg,'filter'>> { filter: string; enableMock: boolean; forceMockUpgrade: boolean; }

function log(level:'info'|'debug', cfg:InternalCfg, ...args:any[]){ if(cfg.logLevel==='silent') return; if(cfg.logLevel==='info'&&level==='debug') return; console.log('[test-gen]', ...args); }
const toKebabCase=(s:string)=> s.replace(/([a-z])([A-Z])/g,'$1-$2').toLowerCase();
function ensureDir(d:string){ if(!fs.existsSync(d)) fs.mkdirSync(d,{recursive:true}); }

interface ApiEndpointEntry { endpoint:string; method:string; path:string; payload?:()=>any; extra?: Array<{ insertAfter:string; valueKey:string; payload?:()=>any }>; }
interface ApiModuleSpec { [endpoint: string]: ApiEndpointEntry; }
interface ApiSpecRoot { [module: string]: ApiModuleSpec; }

function buildFeature(module:string, endpointKey:string, ep:ApiEndpointEntry, fileBase?:string){
  // fileBase pattern method-entity-action-{positive|negative}
  const isPositive = fileBase?.endsWith('-positive');
  let expected = ep.method==='POST'?201:200;
  if(module==='auth' && endpointKey==='login') expected = 200;
  const titleAction = toKebabCase(endpointKey).replace(/-/g,' ');
  if(isPositive){
    return `Feature: ${ep.method} ${module} ${titleAction} positive\n\n  Scenario: Successful ${ep.method} ${ep.path}\n    Given a valid payload for ${endpointKey}\n    When the client sends a ${ep.method} request to "${ep.path}"\n    Then the response status should be ${expected}\n    And the response should contain expected data\n`;
  }
  return `Feature: ${ep.method} ${module} ${titleAction} negative\n\n  Scenario: Validation failure ${ep.method} ${ep.path}\n    Given an invalid payload for ${endpointKey}\n    When the client sends a ${ep.method} request to "${ep.path}"\n    Then the response status should be 400\n    And the response should contain an error message\n`;
}
function buildStep(module:string, endpointKey:string, ep:ApiEndpointEntry, moduleEndpoints:ApiModuleSpec, fileBase?:string){
  const isPositive = fileBase?.endsWith('-positive');
  const isValidationNeg = !isPositive; // only two states now
  // Always import requestHelper directly
  // Detect all path params for multi-seeding
  const paramTokens = Array.from(new Set((ep.path.match(/:(\w+)/g) || []).map(p=>p.slice(1))));
  // Map param name to module for seeding (heuristic)
  const seedParamModuleMap: Record<string,string> = {
    userId: 'users',
    leaveId: 'leaves',
    attendanceId: 'attendance',
    departmentId: 'departments',
    payrollId: 'payroll',
    reportId: 'payroll',
    calculationId: 'payroll'
  };
  const externalSeedModules = new Set<string>();
  paramTokens.forEach(t=>{ if(t!=='id' && seedParamModuleMap[t]) externalSeedModules.add(seedParamModuleMap[t]); });
  const importSet = new Set<string>();
  importSet.add(`import { defineFeature, loadFeature } from 'jest-cucumber';`);
  importSet.add(`import { requestHelper } from '../../utility/request-helper';`);
  // ensure base module api import only once
  importSet.add(`import { ${module}Api } from '../../generated-apis/${module}';`);
  externalSeedModules.forEach(m=> {
    if(m===module) return; // avoid duplicate self import
    const line = `import { ${m}Api } from '../../generated-apis/${m}';`;
    importSet.add(line);
  });
  importSet.add(`import { sendRequest } from '../../utility/request-dispatcher';`);
  const baseImports = Array.from(importSet).join('\n')+'\n';
  const shouldSkipInit = module==='auth' && endpointKey==='register';
  const beforeAllBlock = shouldSkipInit ? '' : `beforeAll(async () => { if(requestHelper.init) { await requestHelper.init(); } });\n`;
  // Load the feature file using the same naming convention used during generation (method-module-action-outcome)
  const featureRef = fileBase ? fileBase : toKebabCase(endpointKey);
  const featureLoad = `const feature = loadFeature(__dirname + '/../../features/${module}/`+featureRef+`.feature');`;
  // Auto-register for auth/login scenario using its payload user (so login passes without manual pre-seed)
  let preLoginRegister = '';
  if(module==='auth' && endpointKey==='login'){
    preLoginRegister = `      // ensure login user exists\n      try {\n        const regPayload = ${module}Api.register?.payload ? ${module}Api.register.payload() : null;\n        if(regPayload){ await sendRequest('POST', '/auth/register', regPayload); }\n      } catch { /* ignore duplicate */ }\n`;
  }
  let extraVarDecl=''; let extraSetup=''; let pathAdjust='';
  if(ep.extra && ep.extra.length){
    ep.extra.forEach((ex,idx)=>{
      const varName = `${ex.valueKey}Id`;
      extraVarDecl += `    let ${varName};\n`;
      extraSetup += `      if (${module}Api.${endpointKey}.extra[${idx}].payload) {\n        const payloadDep = ${module}Api.${endpointKey}.extra[${idx}].payload();\n        const depRes = await requestHelper.post('/${ex.insertAfter}', payloadDep);\n        ${varName} = depRes.body?.${ex.valueKey};\n      }\n`;
      pathAdjust += `      finalPath = finalPath.replace(':${ex.valueKey}', ${varName});\n`;
    });
  }
  // Auto-seed logic for id-based non-POST endpoints (primary id only)
  const hasIdParam = /:\w+/.test(ep.path);
  let autoSeedBlock='';
  if(hasIdParam && ep.method !== 'POST'){
    const createEp = moduleEndpoints['create'];
    if(createEp && createEp.method==='POST' && createEp.payload){
      const firstParamMatch = ep.path.match(/:(\w+)/);
      const idParam = firstParamMatch? firstParamMatch[1] : 'id';
      const varName = idParam==='id' ? 'idVar' : `${idParam}Id`;
      if(!extraVarDecl.includes(`let ${varName}`)){
        extraVarDecl += `    let ${varName};\n`;
        pathAdjust += `      finalPath = finalPath.replace(':${idParam}', ${varName});\n`;
      }
      autoSeedBlock = `      // Auto-seed entity for ${endpointKey}\n      {\n        const createPayload = ${module}Api.create.payload ? ${module}Api.create.payload() : {};\n        const createRes = await sendRequest('POST', ${module}Api.create.path, createPayload);\n        ${varName} = createRes.body?.id || createRes.body?.uuid || createRes.body?.${idParam} || createRes.body?.user?.id;\n      }\n`;
    }
  }
  // Multi-param seeding & fallback assignment
  let multiSeedBlock = '';
  if(paramTokens.length > 1){
    // Simplify: for payroll complex multi-param endpoints use numeric fallbacks only
    if(module==='payroll'){
      let num = 1;
      paramTokens.filter(p=>p!=='id').forEach(p=>{
        const varName = `${p}Var`;
        if(!extraVarDecl.includes(`let ${varName}`)) extraVarDecl += `    let ${varName};\n`;
        multiSeedBlock += `      if(!${varName}) { ${varName} = ${++num}; }\n`;
        pathAdjust += `      if(${varName}) finalPath = finalPath.replace(':${p}', ${varName});\n`;
      });
    } else {
      let autoCounter = 1;
      paramTokens.filter(p=>p!=='id').forEach(p=>{
        const seedModule = seedParamModuleMap[p];
        const varName = `${p}Var`;
        if(!extraVarDecl.includes(`let ${varName}`)) extraVarDecl += `    let ${varName};\n`;
        if(seedModule){
          multiSeedBlock += `      try { if (${seedModule}Api.create && ${seedModule}Api.create.payload) { const createRes = await sendRequest('POST', ${seedModule}Api.create.path, ${seedModule}Api.create.payload()); ${varName} = createRes.body?.id || createRes.body?.uuid || createRes.body?.${p} || createRes.body?.user?.id; } } catch { }\n`;
        }
        multiSeedBlock += `      if(!${varName}) { ${varName} = ${++autoCounter}; }\n`;
        pathAdjust += `      if(${varName}) finalPath = finalPath.replace(':${p}', ${varName});\n`;
      });
    }
  }
  let payloadLine = '';
  if(!(ep.method==='GET'||ep.method==='DELETE')){
    if(module==='auth' && endpointKey==='register'){
      payloadLine = `      payload = ${module}Api.${endpointKey}.payload?.();\n      if(payload && payload.email){ const uniq = Date.now() + '-' + Math.random().toString(36).slice(2,8); payload.email = payload.email.replace('@', '+'+uniq+'@'); }`;
    } else {
      payloadLine = `      payload = ${module}Api.${endpointKey}.payload?.();`;
    }
  }
  // Attendance checkOut needs a prior check-in with matching date
  if(module==='attendance' && endpointKey==='checkOut'){
    // ensure date consistency by reading payload after assignment
    const pre = `      // ensure prior check-in exists for checkOut\n      try {\n        const baseDate = (payload && payload.date) ? payload.date : '2024-06-08';\n        const checkInPayload = { date: baseDate, checkInTime: '09:00:00' };\n        await sendRequest('POST', '/attendance/check-in', checkInPayload);\n      } catch { /* ignore */ }`;
    payloadLine = (payloadLine? payloadLine+'\n' : '') + pre;
  }
  let expected = (module==='auth' && endpointKey==='login') ? 200 : (ep.method==='POST'?201:200);
  if(isValidationNeg){
    expected = 400;
  }
  let invalidMutation='';
  if(isValidationNeg){
    // Remove first property from payload to trigger validation failure
    invalidMutation = `      // Invalidate payload by removing a required field\n      if(payload && typeof payload === 'object'){\n        const keys = Object.keys(payload);\n        if(keys.length){ delete payload[keys[0]]; }\n      }`;
  }
  // Auto mock registration for mock mode (only if requestHelper.registerMock exists at runtime)
  let mockRegistration = '';
  if(ep.method==='POST' || ep.method==='PUT' || ep.method==='DELETE' || ep.method==='GET'){
    const method = ep.method;
    if(isPositive){
      if(module==='auth' && endpointKey==='login'){
        mockRegistration = `      if((requestHelper as any).registerMock){ (requestHelper as any).registerMock('${method}', '${ep.path}', (body:any)=>({ status: 200, body: { access_token: 'mock-token', user: { id:1, email: body?.email } } })); }`;
      } else {
        mockRegistration = `      if((requestHelper as any).registerMock){ (requestHelper as any).registerMock('${method}', '${ep.path}', (body:any)=>({ status: ${expected}, body: { id: 1, ...body, mocked: true } })); }`;
      }
    } else if(isValidationNeg) {
      // Validation negative (400)
      if(method==='POST' || method==='PUT'){
        mockRegistration = `      if((requestHelper as any).registerMock){ (requestHelper as any).registerMock('${method}', '${ep.path}', (_body:any)=>({ status: 400, body: { error: 'Invalid payload (auto-mock)' } })); }`;
      }
    }
  }
  const bodyGiven = (mockRegistration + "\n" + preLoginRegister + extraSetup + autoSeedBlock + multiSeedBlock + payloadLine + (invalidMutation?"\n"+invalidMutation:'')).trimEnd();
  let stepTemplate = `${baseImports}
${beforeAllBlock}
${featureLoad}

defineFeature(feature, (test) => {
  test('${isPositive?`Successful`:`Validation failure`} ${ep.method} ${ep.path}', ({ given, when, then, and }) => {
    let response;
    let payload;
${extraVarDecl}    given('${isPositive?`a valid`:`an invalid`} payload for ${endpointKey}', async () => {
${bodyGiven ? bodyGiven+'\n' : ''}    });

    when(\`the client sends a ${ep.method} request to \"${ep.path}\"\`, async () => {
      let finalPath = '${ep.path}';
${pathAdjust}      // Generic fallback: replace any remaining :param with incremental integers
      {
        let autoCounter = 1;
  const residualParams = finalPath.match(/:(\w+)/g) || [];
        residualParams.forEach(pTok => {
          const val = autoCounter++;
          finalPath = finalPath.replace(pTok, String(val));
        });
      }
      response = await sendRequest('${ep.method}', finalPath${ep.method==='GET'||ep.method==='DELETE'?'':', payload'});
    });

    then('the response status should be ${expected}', () => {
      expect(response.status).toBe(${expected});
    });

    ${isPositive?`and('the response should contain expected data', () => {
      expect(response.body).toBeDefined();
    });`:`and('the response should contain an error message', () => {
      expect(response.body).toBeDefined();
      expect(JSON.stringify(response.body).toLowerCase()).toMatch(/error|invalid|fail/);
    });`}
  });
});
`;
  // Strong import dedupe: keep first occurrence only
  const lines = stepTemplate.split('\n');
  const seen = new Set<string>();
  for(let i=0;i<lines.length;i++){
    const line = lines[i];
    if(line.startsWith('import ')){
      if(seen.has(line)) { lines[i] = ''; continue; }
      seen.add(line);
    }
  }
  stepTemplate = lines.filter(l=>l.trim().length>0).join('\n') + '\n';
  return stepTemplate;
}

export async function generateTestScaffolding(userCfg: TestGenCfg = {}) {
  const cfg: InternalCfg = {
    projectRoot: userCfg.projectRoot || process.cwd(),
    apiSpecDir: userCfg.apiSpecDir || 'test/generated-apis',
    baseTestDir: userCfg.baseTestDir || 'test',
    overwrite: userCfg.overwrite ?? false,
    dryRun: userCfg.dryRun ?? false,
    logLevel: userCfg.logLevel || 'info',
    filter: userCfg.filter || '',
    enableMock: userCfg.enableMock ?? false,
    forceMockUpgrade: userCfg.forceMockUpgrade ?? false
  };
  const apiSpecDir = path.resolve(cfg.projectRoot, cfg.apiSpecDir);
  if(!fs.existsSync(apiSpecDir)) throw new Error(`apiSpec directory not found: ${apiSpecDir}`);
  const apiSpec: ApiSpecRoot = {} as any;
  const files = fs.readdirSync(apiSpecDir).filter(f=>f.endsWith('.ts') && f!=='index.ts');
  let tsNodeRegistered = false;
  // Fallback lightweight parser to extract endpoint method & path from generated api TS file
  function parseApiFile(tsPath:string): ApiModuleSpec | null {
    try {
      const content = fs.readFileSync(tsPath,'utf-8');
      const exportIdx = content.indexOf('export const');
      if(exportIdx === -1) return null;
      const braceStart = content.indexOf('{', exportIdx);
      const braceEnd = content.lastIndexOf('}');
      if(braceStart === -1 || braceEnd === -1 || braceEnd <= braceStart) return null;
      const body = content.slice(braceStart+1, braceEnd);
  // Support quoted or unquoted keys (simple heuristic)
  const endpointRegex = /([A-Za-z0-9_-]+)\s*:\s*{([^}]*?)}/g;
      const endpoints: ApiModuleSpec = {} as any;
      let m: RegExpExecArray | null;
      while((m = endpointRegex.exec(body))){
        const key = m[1];
        const block = m[2];
        const methodMatch = block.match(/method:\s*"(GET|POST|PUT|DELETE|PATCH)"/);
        const pathMatch = block.match(/path:\s*"([^"]+)"/);
        if(methodMatch && pathMatch){
          (endpoints as any)[key] = { endpoint: key, method: methodMatch[1], path: pathMatch[1] };
        }
      }
      return Object.keys(endpoints).length? endpoints : null;
    } catch { return null; }
  }

  files.forEach(f=>{
    const base = f.replace(/\.ts$/,'');
    const filePathJs = path.join(apiSpecDir, base+'.js');
    const filePathTs = path.join(apiSpecDir, f);
    let picked:any = null;
    let loaded = false;
    // Try native require first
    try {
      if(fs.existsSync(filePathJs)){
        const mod = require(filePathJs);
        loaded = true;
        for(const [k,v] of Object.entries(mod)){
          if(!v || typeof v !== 'object' || Array.isArray(v)) continue;
          if(k.endsWith('Api')) { picked = v; break; }
          const endpointObjs = Object.values(v).filter(x=> x && typeof x === 'object' && 'method' in (x as any) && 'path' in (x as any));
          if(endpointObjs.length){ picked = v; break; }
        }
      }
    } catch {}
    // Try ts-node require
    if(!picked){
      try {
        if(!tsNodeRegistered){
          try {
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            require('ts-node').register({ transpileOnly: true, compilerOptions: { module: 'commonjs', resolveJsonModule: true, esModuleInterop: true, allowJs: true } });
            tsNodeRegistered = true;
            log('debug', cfg, 'Registered ts-node for direct TS require');
          } catch(err){ log('debug', cfg, 'Failed to register ts-node', err); }
        }
        if(fs.existsSync(filePathTs)){
          const mod = require(filePathTs);
          loaded = true;
          for(const [k,v] of Object.entries(mod)){
            if(!v || typeof v !== 'object' || Array.isArray(v)) continue;
            if(k.endsWith('Api')) { picked = v; break; }
            const endpointObjs = Object.values(v).filter(x=> x && typeof x === 'object' && 'method' in (x as any) && 'path' in (x as any));
            if(endpointObjs.length){ picked = v; break; }
          }
        }
      } catch(err){ log('debug', cfg, `Require TS failed for ${filePathTs}`, err); }
    }
    // Fallback parse
    if(!picked){
      const parsed = parseApiFile(filePathTs);
      if(parsed){ picked = parsed; log('debug', cfg, `Parsed via fallback: ${filePathTs}`); }
    }
    if(picked) (apiSpec as any)[base] = picked; else log('debug', cfg, 'Skipping module (unable to load or parse):', base);
  });
  const featuresBase = path.resolve(cfg.projectRoot, cfg.baseTestDir,'features');
  const stepsBase = path.resolve(cfg.projectRoot, cfg.baseTestDir,'steps');
  const utilityBase = path.resolve(cfg.projectRoot, cfg.baseTestDir,'utility');
  ensureDir(featuresBase); ensureDir(stepsBase);
  ensureDir(utilityBase);

  // Jest support file scaffolding (only create if missing unless overwrite)
  const jestSupportFiles: Array<{name:string; content:string}> = [
    { name: 'jest-env-setup.ts', content: `// Auto-generated by nest-e2e-gen\nprocess.env.NODE_ENV = process.env.NODE_ENV || 'test';\nprocess.env.DB_DIALECT = process.env.DB_DIALECT || 'sqlite';\nprocess.env.USE_SQLITE_FOR_TESTS = '1';\nprocess.env.JWT_SECRET = process.env.JWT_SECRET || 'test_secret';\n` },
    { name: 'jest-after-env.ts', content: `// Auto-generated by nest-e2e-gen\nimport { closeTestApp } from './utility/test-app';\nafterAll(async () => {\n  await closeTestApp();\n});\n` },
    { name: 'jest-global-setup.ts', content: `// Auto-generated by nest-e2e-gen\nimport { Sequelize } from 'sequelize-typescript';\nmodule.exports = async () => {\n  const sequelize = new Sequelize({ dialect: 'sqlite', storage: ':memory:', logging: false });\n  await sequelize.close();\n};\n` }
  ];
  jestSupportFiles.forEach(f=>{
    const dest = path.resolve(cfg.projectRoot, cfg.baseTestDir, f.name);
    if(!fs.existsSync(dest) || cfg.overwrite){
      fs.writeFileSync(dest, f.content, 'utf-8');
      log('info', cfg, `${fs.existsSync(dest)?'Support overwritten':'Support created'}: ${dest}`);
    }
  });

  // Auto-create utility helpers if they don't exist to support generated step definitions
  const utilFiles: Array<{name:string; content:string; force?: boolean}> = [
    { name: 'type.ts', content: `export interface TApiEndpoint { endpoint: string; method: string; path: string; payload?: () => any; extra?: Array<{ insertAfter: string; valueKey: string; payload?: () => any }>; }\nexport interface TApiModule { [endpoint: string]: TApiEndpoint; }\n` },
    { name: 'test-app.ts', content: `import { INestApplication } from '@nestjs/common';\nimport { Test, TestingModule } from '@nestjs/testing';\nimport { AppModule } from '../../src/app.module';\n\nlet app: INestApplication | undefined;\nexport async function getTestApp(): Promise<INestApplication>{\n  if(app) return app;\n  const moduleFixture: TestingModule = await Test.createTestingModule({ imports: [AppModule] }).compile();\n  app = moduleFixture.createNestApplication();\n  await app.init();\n  return app;\n}\nexport async function closeTestApp(){ if(app){ await app.close(); app = undefined; } }\n` },
  { name: 'request-helper.ts', content: (()=>{ if(!cfg.enableMock) { return `import supertest from 'supertest';\nimport { INestApplication } from '@nestjs/common';\nimport { getTestApp, closeTestApp } from './test-app';\n\nlet app: INestApplication | undefined;\nlet token: string | null = null;\nlet initPromise: Promise<void> | null = null;\n\nasync function ensureApp(){ if(!app){ app = await getTestApp(); } return app; }\nexport function getAuthToken(){ return token; }\n\nasync function init(){\n  if(token) return;\n  if(initPromise) return initPromise;\n  initPromise = (async () => {\n    await ensureApp();\n    const creds = { email: 'admin@example.com', password: 'Test@1234', role: 'admin', name: 'Admin User' };\n    await supertest(app!.getHttpServer()).post('/auth/register').send(creds).catch(()=>undefined);\n    const loginRes = await supertest(app!.getHttpServer()).post('/auth/login').send({ email: creds.email, password: creds.password });\n    if(loginRes.status === 200 || loginRes.status === 201){\n      token = loginRes.body?.access_token || loginRes.body?.token || null;\n    }\n  })();\n  await initPromise;\n}\nasync function close(){ await closeTestApp(); app = undefined; token = null; initPromise = null; }\nfunction authHeaders(){ return token ? { Authorization: \`Bearer \${token}\` } : {}; }\nexport const requestHelper: any = {\n  init,\n  close,\n  getAuthToken,\n  get: async (p:string)=> { await init(); return supertest((await ensureApp()).getHttpServer()).get(p).set(authHeaders()); },\n  post: async (p:string,b:any)=> { await init(); return supertest((await ensureApp()).getHttpServer()).post(p).set(authHeaders()).send(b); },\n  put: async (p:string,b:any)=> { await init(); return supertest((await ensureApp()).getHttpServer()).put(p).set(authHeaders()).send(b); },\n  delete: async (p:string)=> { await init(); return supertest((await ensureApp()).getHttpServer()).delete(p).set(authHeaders()); },\n};\n`; }
    // Mock-enabled variant
    return `import supertest from 'supertest';\nimport { INestApplication } from '@nestjs/common';\nimport { getTestApp, closeTestApp } from './test-app';\n\n// When E2E_USE_MOCK=1 tests will not spin up a real Nest app; instead endpoints are faked.\nconst USE_MOCK = process.env.E2E_USE_MOCK === '1' || process.env.E2E_USE_MOCK === 'true';\n\nlet app: INestApplication | undefined;\nlet token: string | null = null;\nlet initPromise: Promise<void> | null = null;\n\nasync function ensureApp(){ if(USE_MOCK) return undefined as any; if(!app){ app = await getTestApp(); } return app; }\nexport function getAuthToken(){ return token; }\n\n// Simple in-memory mock store (keyed by method+path)\ninterface MockKey { method: string; path: string; }\nconst store: Record<string, any[]> = {};\nfunction key(m:string,p:string){ return m+' '+p; }\nexport function registerMock(m:string,p:string,handler:(body:any)=>{status:number;body:any}){ const k=key(m,p); (store[k]||(store[k]=[])).push(handler); }\n\nasync function init(){\n  if(token) return;\n  if(initPromise) return initPromise;\n  initPromise = (async () => {\n    if(!USE_MOCK){\n      await ensureApp();\n      const creds = { email: 'admin@example.com', password: 'Test@1234', role: 'admin', name: 'Admin User' };\n      await supertest(app!.getHttpServer()).post('/auth/register').send(creds).catch(()=>undefined);\n      const loginRes = await supertest(app!.getHttpServer()).post('/auth/login').send({ email: creds.email, password: creds.password });\n      if(loginRes.status === 200 || loginRes.status === 201){\n        token = loginRes.body?.access_token || loginRes.body?.token || null;\n      }\n    }\n  })();\n  await initPromise;\n}\nasync function close(){ if(!USE_MOCK){ await closeTestApp(); } app = undefined; token = null; initPromise = null; }\nfunction authHeaders(){ return token ? { Authorization: \`Bearer \${token}\` } : {}; }\n\nasync function realReq(method:string,path:string,body?:any){\n  const srv = (await ensureApp()).getHttpServer();\n  const st = supertest(srv);\n  switch(method){\n    case 'GET': return st.get(path).set(authHeaders());\n    case 'POST': return st.post(path).set(authHeaders()).send(body);\n    case 'PUT': return st.put(path).set(authHeaders()).send(body);\n    case 'DELETE': return st.delete(path).set(authHeaders());\n  }\n  throw new Error('Unsupported method '+method);\n}\nasync function mockReq(method:string,path:string,body?:any){\n  // Try exact match first\n  let handlers = store[key(method,path)];\n  // Pattern fallback for colon params\n  if(!handlers){\n    const prefix = method + ' ';\n    for(const [fullKey, arr] of Object.entries(store)){\n      if(!fullKey.startsWith(prefix)) continue;\n      const templatePath = fullKey.slice(prefix.length);\n      if(templatePath === path){ handlers = arr; break; }\n      if(/:[^/]+/.test(templatePath)){\n        const regex = new RegExp('^' + templatePath.replace(/:[^/]+/g,'[^/]+') + '$');\n        if(regex.test(path)){\n          handlers = arr; // don't break to allow later overrides\n        }\n      }\n    }\n  }\n  const h = handlers ? handlers[handlers.length-1] : null;\n  if(!h){ return { status: 200, body: { mocked: true, method, path, body } }; }\n  try { const res = h(body); return { status: res.status, body: res.body }; } catch(e:any){ return { status: 500, body: { error: e.message } }; }\n}\nexport const requestHelper: any = {\n  init,\n  close,\n  getAuthToken,\n  registerMock,\n  get: async (p:string)=> { await init(); return USE_MOCK? mockReq('GET', p): realReq('GET', p); },\n  post: async (p:string,b:any)=> { await init(); return USE_MOCK? mockReq('POST', p, b): realReq('POST', p, b); },\n  put: async (p:string,b:any)=> { await init(); return USE_MOCK? mockReq('PUT', p, b): realReq('PUT', p, b); },\n  delete: async (p:string)=> { await init(); return USE_MOCK? mockReq('DELETE', p): realReq('DELETE', p); },\n};\n`; })() },
    { name: 'request-dispatcher.ts', content: `import { requestHelper } from './request-helper';\nexport async function sendRequest(method: string, path: string, body?: any){\n  switch(method){\n    case 'GET': return requestHelper.get(path);\n    case 'POST': return requestHelper.post(path, body);\n    case 'PUT': return requestHelper.put(path, body);\n    case 'DELETE': return requestHelper.delete(path);\n    default: throw new Error('Unsupported method '+method);\n  }\n}\n` }
  ];
  utilFiles.forEach(f=>{
    const dest = path.join(utilityBase, f.name);
    if(f.name === 'request-helper.ts'){
      if(fs.existsSync(dest) && !cfg.overwrite){
        // Detect if existing file lacks mock markers but enableMock requested
        if(cfg.enableMock){
          const existing = fs.readFileSync(dest,'utf-8');
            const hasMockMarker = /E2E_USE_MOCK/.test(existing) || /registerMock/.test(existing);
            if(!hasMockMarker){
              if(cfg.forceMockUpgrade){
                fs.writeFileSync(dest, f.content, 'utf-8');
                log('info', cfg, `Force mock upgrade applied: ${dest}`);
              } else {
                log('info', cfg, `Mock support requested but existing request-helper has no mock markers. Use --overwrite or --force-mock-upgrade to regenerate.`);
              }
              return; // skip normal write path
            }
        }
      }
    }
    if(!fs.existsSync(dest) || cfg.overwrite || (f.name==='request-helper.ts' && cfg.forceMockUpgrade)){
      if(cfg.dryRun) log('info', cfg, `(dry-run) Would write ${dest}`);
      else {
        fs.writeFileSync(dest, f.content, 'utf-8');
        log('info', cfg, `${fs.existsSync(dest)?'Utility overwritten':'Utility created'}: ${dest}`);
      }
    }
  });
  const filterSet = new Set(cfg.filter.split(',').map(s=>s.trim()).filter(Boolean));
  Object.entries(apiSpec).forEach(([module,endpoints])=>{
    log('debug', cfg, 'Processing module for tests:', module, 'endpoints:', Object.keys(endpoints));
    if(filterSet.size && !filterSet.has(module)) return;
    const featureModuleDir = path.join(featuresBase,module);
    const stepsModuleDir = path.join(stepsBase,module);
    ensureDir(featureModuleDir); ensureDir(stepsModuleDir);
    Object.entries(endpoints).forEach(([endpointKey, ep])=>{
      const methodLower = ep.method.toLowerCase();
      const actionKebab = toKebabCase(endpointKey);
      const base = `${methodLower}-${module}-${actionKebab}`;
      // Positive
      const featureFilePos = path.join(featureModuleDir, `${base}-positive.feature`);
      const stepFilePos = path.join(stepsModuleDir, `${base}-positive.e2e-spec.ts`);
      const featureContentPos = buildFeature(module, endpointKey, ep, `${base}-positive`);
      const stepContentPos = buildStep(module, endpointKey, ep, endpoints as ApiModuleSpec, `${base}-positive`);
      const existsFeaturePos = fs.existsSync(featureFilePos); const existsStepPos = fs.existsSync(stepFilePos);
      if(!cfg.overwrite && existsFeaturePos && existsStepPos){
        log('debug', cfg, `Skip positive (exists): ${featureFilePos}`);
      } else if(cfg.dryRun){
        log('info', cfg, `(dry-run) Would write: ${featureFilePos}`);
        log('info', cfg, `(dry-run) Would write: ${stepFilePos}`);
      } else {
        fs.writeFileSync(featureFilePos, featureContentPos,'utf-8');
        fs.writeFileSync(stepFilePos, stepContentPos,'utf-8');
        log('info', cfg, `Wrote: ${featureFilePos}`);
      }
      // Validation negative for POST & PUT (payload capable)
      if(ep.method==='POST' || ep.method==='PUT'){
        const featureFileNeg = path.join(featureModuleDir, `${base}-negative.feature`);
        const stepFileNeg = path.join(stepsModuleDir, `${base}-negative.e2e-spec.ts`);
        const featureContentNeg = buildFeature(module, endpointKey, ep, `${base}-negative`);
        const stepContentNeg = buildStep(module, endpointKey, ep, endpoints as ApiModuleSpec, `${base}-negative`);
        const existsFeatureNeg = fs.existsSync(featureFileNeg); const existsStepNeg = fs.existsSync(stepFileNeg);
        if(!cfg.overwrite && existsFeatureNeg && existsStepNeg){
          log('debug', cfg, `Skip negative (exists): ${featureFileNeg}`);
        } else if(cfg.dryRun){
          log('info', cfg, `(dry-run) Would write: ${featureFileNeg}`);
          log('info', cfg, `(dry-run) Would write: ${stepFileNeg}`);
        } else {
          fs.writeFileSync(featureFileNeg, featureContentNeg,'utf-8');
          fs.writeFileSync(stepFileNeg, stepContentNeg,'utf-8');
          log('info', cfg, `Wrote: ${featureFileNeg}`);
        }
      }
    });
  });
  log('info', cfg, 'Test scaffolding generation complete.');
}
