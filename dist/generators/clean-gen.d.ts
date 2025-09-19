export interface CleanCfg {
    projectRoot?: string;
    logLevel?: 'silent' | 'info' | 'debug';
    outPayloads?: string;
    outApis?: string;
    outFeatures?: string;
    outSteps?: string;
}
export declare function cleanGenerated(userCfg?: CleanCfg): Promise<void>;
