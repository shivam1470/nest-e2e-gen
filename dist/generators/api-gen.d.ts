export interface ApiGenCfg {
    projectRoot?: string;
    tsconfigPath?: string;
    controllersGlob?: string;
    outApis?: string;
    outPayloads?: string;
    cleanOutput?: boolean;
    logLevel?: 'silent' | 'info' | 'debug';
    srcDir?: string;
    filter?: string;
}
export declare function generateApis(userCfg?: ApiGenCfg): Promise<void>;
