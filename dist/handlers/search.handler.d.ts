import { FastifyRequest, FastifyReply } from 'fastify';
import { ServiceClient } from '../services';
export declare class SearchHandler {
    private serviceClient;
    constructor(serviceClient: ServiceClient);
    searchDocuments(request: FastifyRequest<{
        Querystring: {
            q?: string;
            rows?: string;
            start?: string;
        };
    }>, reply: FastifyReply): Promise<void>;
    searchByCase(request: FastifyRequest<{
        Params: {
            caseId: string;
        };
    }>, reply: FastifyReply): Promise<void>;
}
//# sourceMappingURL=search.handler.d.ts.map