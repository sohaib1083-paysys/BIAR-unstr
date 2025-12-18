import { FastifyRequest, FastifyReply } from 'fastify';
import { ServiceClient } from '../services';
export declare class DocumentHandler {
    private serviceClient;
    constructor(serviceClient: ServiceClient);
    getAllDocuments(_request: FastifyRequest, reply: FastifyReply): Promise<void>;
    getDocumentById(request: FastifyRequest<{
        Params: {
            id: string;
        };
    }>, reply: FastifyReply): Promise<void>;
    getDocumentAttachments(request: FastifyRequest<{
        Params: {
            id: string;
        };
    }>, reply: FastifyReply): Promise<void>;
    extractText(request: FastifyRequest<{
        Params: {
            id: string;
            filename: string;
        };
    }>, reply: FastifyReply): Promise<void>;
}
//# sourceMappingURL=document.handler.d.ts.map