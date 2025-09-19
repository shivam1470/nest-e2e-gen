export interface DtoGenConfig {
    projectRoot?: string;
    tsconfigPath?: string;
    srcDir?: string;
    dtoGlob?: string;
    outPayloads?: string;
    overwrite?: boolean;
    dryRun?: boolean;
    logLevel?: 'silent' | 'info' | 'debug';
    filter?: string;
}
export declare function generateDtoPayloads(userCfg?: DtoGenConfig): Promise<void>;
