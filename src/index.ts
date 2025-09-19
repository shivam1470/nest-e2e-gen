export * from './generators/dto-gen';
export * from './generators/json-index-gen';
export * from './generators/api-gen';
export * from './generators/test-gen';
export * from './generators/clean-gen';
export * from './orchestrator';

// Backward-compatible namespace style (legacy)
import * as DtoGeneratorNS from './generators/dto-gen';
import * as JsonToTsGeneratorNS from './generators/json-index-gen';
import * as ControllerParserNS from './generators/api-gen';
import * as FeatureGeneratorNS from './generators/test-gen';

export const DtoGenerator = DtoGeneratorNS;
export const JsonToTsGenerator = JsonToTsGeneratorNS;
export const ControllerParser = ControllerParserNS;
export const FeatureGenerator = FeatureGeneratorNS;
