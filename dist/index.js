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
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
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
exports.FeatureGenerator = exports.ControllerParser = exports.JsonToTsGenerator = exports.DtoGenerator = void 0;
__exportStar(require("./generators/dto-gen"), exports);
__exportStar(require("./generators/json-index-gen"), exports);
__exportStar(require("./generators/api-gen"), exports);
__exportStar(require("./generators/test-gen"), exports);
__exportStar(require("./generators/clean-gen"), exports);
__exportStar(require("./orchestrator"), exports);
// Backward-compatible namespace style (legacy)
const DtoGeneratorNS = __importStar(require("./generators/dto-gen"));
const JsonToTsGeneratorNS = __importStar(require("./generators/json-index-gen"));
const ControllerParserNS = __importStar(require("./generators/api-gen"));
const FeatureGeneratorNS = __importStar(require("./generators/test-gen"));
exports.DtoGenerator = DtoGeneratorNS;
exports.JsonToTsGenerator = JsonToTsGeneratorNS;
exports.ControllerParser = ControllerParserNS;
exports.FeatureGenerator = FeatureGeneratorNS;
