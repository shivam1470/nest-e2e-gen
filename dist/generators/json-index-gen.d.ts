export interface JsonIndexCfg {
    projectRoot?: string;
    outPayloads?: string;
    indexFile?: string;
    exportSuffix?: string;
    dryRun?: boolean;
    logLevel?: 'silent' | 'info' | 'debug';
}
export declare function generateJsonIndex(userCfg?: JsonIndexCfg): Promise<void>;
