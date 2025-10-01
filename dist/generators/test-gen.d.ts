export interface TestGenCfg {
    projectRoot?: string;
    apiSpecDir?: string;
    baseTestDir?: string;
    overwrite?: boolean;
    dryRun?: boolean;
    logLevel?: 'silent' | 'info' | 'debug';
    filter?: string;
    enableMock?: boolean;
    forceMockUpgrade?: boolean;
}
export declare function generateTestScaffolding(userCfg?: TestGenCfg): Promise<void>;
