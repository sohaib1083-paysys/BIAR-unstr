"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HealthHandler = void 0;
class HealthHandler {
    serviceClient;
    config;
    constructor(serviceClient, config) {
        this.serviceClient = serviceClient;
        this.config = config;
    }
    async checkHealth(_request, reply) {
        try {
            const [couchdbHealth, tikaHealth, solrHealth] = await Promise.all([
                this.serviceClient.checkServiceHealth(`${this.config.COUCHDB_URL}/_up`),
                this.serviceClient.checkServiceHealth(`${this.config.TIKA_URL}/version`),
                this.serviceClient.checkServiceHealth(`${this.config.SOLR_URL}/admin/ping`),
            ]);
            reply.send({
                success: true,
                status: 'healthy',
                timestamp: new Date().toISOString(),
                services: {
                    couchdb: couchdbHealth ? 'healthy' : 'unhealthy',
                    tika: tikaHealth ? 'healthy' : 'unhealthy',
                    solr: solrHealth ? 'healthy' : 'unhealthy',
                },
            });
        }
        catch (error) {
            reply.status(500).send({
                success: false,
                error: 'Health check failed',
                timestamp: new Date().toISOString(),
            });
        }
    }
}
exports.HealthHandler = HealthHandler;
//# sourceMappingURL=health.handler.js.map