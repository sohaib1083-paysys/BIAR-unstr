import { FastifyRequest, FastifyReply } from 'fastify';
import { ServiceClient } from '../services';
import { Config } from '../schemas';
export declare class HealthHandler {
    private serviceClient;
    private config;
    constructor(serviceClient: ServiceClient, config: Config);
    checkHealth(_request: FastifyRequest, reply: FastifyReply): Promise<void>;
}
//# sourceMappingURL=health.handler.d.ts.map