"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.documentsRoutes = documentsRoutes;
const handler_factory_1 = require("../utils/handler-factory");
const schemas_1 = require("../schemas");
async function documentsRoutes(fastify) {
    const documentHandler = handler_factory_1.HandlerFactory.getDocumentHandler();
    fastify.get('/', {
        handler: documentHandler.getAllDocuments.bind(documentHandler)
    });
    fastify.get('/:id', {
        schema: schemas_1.DocumentParamsSchema,
        handler: documentHandler.getDocumentById.bind(documentHandler)
    });
    fastify.get('/:id/attachments', {
        schema: schemas_1.DocumentParamsSchema,
        handler: documentHandler.getDocumentAttachments.bind(documentHandler)
    });
    fastify.post('/:id/extract/:filename', {
        schema: schemas_1.ExtractParamsSchema,
        handler: documentHandler.extractText.bind(documentHandler)
    });
}
//# sourceMappingURL=documents.router.js.map