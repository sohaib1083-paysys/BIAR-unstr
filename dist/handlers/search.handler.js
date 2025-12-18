"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SearchHandler = void 0;
class SearchHandler {
    serviceClient;
    constructor(serviceClient) {
        this.serviceClient = serviceClient;
    }
    async searchDocuments(request, reply) {
        try {
            const query = request.query.q || '*:*';
            const rows = parseInt(request.query.rows || '10');
            const start = parseInt(request.query.start || '0');
            const data = await this.serviceClient.searchInSolr(query, rows, start);
            reply.send({
                success: true,
                query,
                total: data.response.numFound,
                start,
                rows,
                documents: data.response.docs,
                timestamp: new Date().toISOString(),
            });
        }
        catch (error) {
            reply.status(500).send({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                timestamp: new Date().toISOString(),
            });
        }
    }
    async searchByCase(request, reply) {
        try {
            const query = `caseId:"${request.params.caseId}"`;
            const data = await this.serviceClient.searchInSolr(query, 100, 0);
            reply.send({
                success: true,
                caseId: request.params.caseId,
                total: data.response.numFound,
                documents: data.response.docs,
                timestamp: new Date().toISOString(),
            });
        }
        catch (error) {
            reply.status(500).send({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                timestamp: new Date().toISOString(),
            });
        }
    }
}
exports.SearchHandler = SearchHandler;
//# sourceMappingURL=search.handler.js.map