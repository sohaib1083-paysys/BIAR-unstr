import { FastifyInstance } from 'fastify';
import { DocumentProcessingService } from './document-processing.service';
import { Config } from './schemas';
export interface DocumentProcessingRoutes {
    documentProcessor: DocumentProcessingService;
}
export default function documentProcessingRoutes(fastify: FastifyInstance, options: {
    config: Config;
}): Promise<void>;
//# sourceMappingURL=document-processing.routes.d.ts.map