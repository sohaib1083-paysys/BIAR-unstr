import { Config } from './schemas';
export declare class ServiceClient {
    private config;
    constructor(config: Config);
    getCouchDBDocument(docId: string): Promise<any>;
    getAllCouchDBDocuments(): Promise<any>;
    extractTextDirectly(docId: string, filename: string): Promise<{
        text: string;
        metadata: any;
    }>;
    extractTextWithTika(fileBuffer: Buffer): Promise<string>;
    extractMetadataWithTika(fileBuffer: Buffer): Promise<any>;
    indexDocumentInSolr(doc: any): Promise<void>;
}
//# sourceMappingURL=services.d.ts.map