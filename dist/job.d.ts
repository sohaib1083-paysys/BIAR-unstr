declare class DocumentProcessor {
    private readonly logger;
    private readonly couchdb;
    private readonly tika;
    private readonly solr;
    private readonly nifi;
    private readonly MAX_FILE_SIZE_MB;
    constructor();
    run(): Promise<void>;
    private getUnprocessedDocuments;
    private processDocument;
}
export { DocumentProcessor };
//# sourceMappingURL=job.d.ts.map