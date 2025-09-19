"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateAll = generateAll;
const dto_gen_1 = require("./generators/dto-gen");
const json_index_gen_1 = require("./generators/json-index-gen");
const api_gen_1 = require("./generators/api-gen");
const test_gen_1 = require("./generators/test-gen");
const clean_gen_1 = require("./generators/clean-gen");
async function generateAll(cfg = {}) {
    const start = Date.now();
    if (cfg.clean)
        await (0, clean_gen_1.cleanGenerated)(cfg);
    await (0, dto_gen_1.generateDtoPayloads)(cfg);
    await (0, json_index_gen_1.generateJsonIndex)(cfg);
    await (0, api_gen_1.generateApis)(cfg);
    await (0, test_gen_1.generateTestScaffolding)(cfg);
    const ms = Date.now() - start;
    if (cfg.logLevel !== 'silent')
        console.log(`[all] Completed in ${ms}ms`);
}
