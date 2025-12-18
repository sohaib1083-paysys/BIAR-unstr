"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchRoutes = searchRoutes;
const handler_factory_1 = require("../utils/handler-factory");
const schemas_1 = require("../schemas");
async function searchRoutes(fastify) {
    const searchHandler = handler_factory_1.HandlerFactory.getSearchHandler();
    fastify.get('/', {
        schema: schemas_1.SearchQuerySchema,
        handler: searchHandler.searchDocuments.bind(searchHandler)
    });
}
//# sourceMappingURL=search.router.js.map