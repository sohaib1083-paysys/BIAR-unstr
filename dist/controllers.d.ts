import { ServiceClient } from './services';
import { Config } from './schemas';
export declare class DocumentController {
    private fastify;
    private serviceClient;
    private config;
    constructor(fastify: any, serviceClient: ServiceClient, config: Config);
    registerRoutes(): Promise<void>;
    private healthCheck;
    private getAllDocuments;
    private getDocument;
    private downloadFile;
    private extractAndIndex;
    private searchDocuments;
    private searchByCase;
}
//# sourceMappingURL=controllers.d.ts.map