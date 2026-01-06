export declare class CouchDBService {
    private static instance;
    private readonly baseUrl;
    private constructor();
    static getInstance(): CouchDBService;
    getAllDocs<T>(includeDocs?: boolean): Promise<T[]>;
    getDocument<T>(documentId: string): Promise<T>;
    getAttachment(documentId: string, attachmentName: string): Promise<Buffer>;
    updateStatus(documentId: string, status: string, errorMessage?: string): Promise<void>;
}
//# sourceMappingURL=CouchDBService.d.ts.map