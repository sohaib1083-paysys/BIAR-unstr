import { Config } from './schemas';
interface ProcessingResult {
    documentId: string;
    success: boolean;
    extractedText?: string;
    metadata?: any;
    error?: string;
    timestamp: string;
}
export declare class DocumentProcessingService {
    private cronJob;
    private serviceClient;
    private logger;
    private config;
    private isProcessing;
    constructor(config: Config);
    start(): void;
    stop(): void;
    private processDocuments;
    private getPendingDocuments;
    processSingleDocument(doc: any): Promise<ProcessingResult>;
    private indexDocumentInSolr;
    private sendToNifi;
    private verifyOzoneStorage;
    private updateDocumentStatus;
    manualTrigger(): Promise<ProcessingResult[]>;
    getProcessingStats(): Promise<any>;
}
export {};
//# sourceMappingURL=document-processing.service.d.ts.map