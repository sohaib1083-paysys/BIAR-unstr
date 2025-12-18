"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SearchQuerySchema = exports.ExtractParamsSchema = exports.DocumentParamsSchema = exports.ConfigSchema = void 0;
const zod_1 = require("zod");
exports.ConfigSchema = zod_1.z.object({
    PORT: zod_1.z.string().default('5000'),
    NODE_ENV: zod_1.z.enum(['dev', 'production', 'test']).default('dev'),
    COUCHDB_URL: zod_1.z.string().default('http://admin:password@localhost:5984'),
    TIKA_URL: zod_1.z.string().default('http://localhost:9998'),
    SOLR_URL: zod_1.z.string().default('http://localhost:8983/solr/biar_docs'),
});
exports.DocumentParamsSchema = {
    params: {
        type: 'object',
        properties: { id: { type: 'string' } },
        required: ['id']
    }
};
exports.ExtractParamsSchema = {
    params: {
        type: 'object',
        properties: {
            id: { type: 'string' },
            filename: { type: 'string' }
        },
        required: ['id', 'filename']
    }
};
exports.SearchQuerySchema = {
    querystring: {
        type: 'object',
        properties: {
            q: { type: 'string', default: '*:*' },
            rows: { type: 'string', default: '10' },
            start: { type: 'string', default: '0' }
        }
    }
};
//# sourceMappingURL=schemas.js.map