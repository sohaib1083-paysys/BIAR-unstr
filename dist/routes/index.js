"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerRoutes = registerRoutes;
const health_router_1 = require("./health.router");
const documents_router_1 = require("./documents.router");
const search_router_1 = require("./search.router");
const document_processing_routes_1 = __importDefault(require("../document-processing.routes"));
const schemas_1 = require("../schemas");
async function registerRoutes(fastify) {
    const config = schemas_1.ConfigSchema.parse({
        PORT: process.env.PORT || '5000',
        NODE_ENV: process.env.NODE_ENV || 'dev',
        COUCHDB_URL: process.env.COUCHDB_URL || 'http://admin:password@localhost:5984',
        TIKA_URL: process.env.TIKA_URL || 'http://localhost:9998',
        SOLR_URL: process.env.SOLR_URL || 'http://localhost:8983/solr/biar_docs',
    });
    await fastify.register(health_router_1.healthRoutes, { prefix: '/api/health' });
    await fastify.register(documents_router_1.documentsRoutes, { prefix: '/api/documents' });
    await fastify.register(search_router_1.searchRoutes, { prefix: '/api/search' });
    await fastify.register(document_processing_routes_1.default, { prefix: '/api', config });
}
//# sourceMappingURL=index.js.map