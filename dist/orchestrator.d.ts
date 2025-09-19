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
    logLevel?: 'silent' | 'info' | 'debug';
}
export declare function generateAll(cfg?: AllGenCfg): Promise<void>;
