export declare class SolrService {
    private static instance;
    private readonly baseUrl;
    private constructor();
    static getInstance(): SolrService;
    indexDocument(document: Record<string, unknown>): Promise<void>;
}
//# sourceMappingURL=SolrService.d.ts.map