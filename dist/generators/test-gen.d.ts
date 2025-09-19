export interface TestGenCfg {
    projectRoot?: string;
    apiSpecDir?: string;
    baseTestDir?: string;
    overwrite?: boolean;
    dryRun?: boolean;
    logLevel?: 'silent' | 'info' | 'debug';
    filter?: string;
}
export declare function generateTestScaffolding(userCfg?: TestGenCfg): Promise<void>;
