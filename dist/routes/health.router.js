"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.healthRoutes = healthRoutes;
const handler_factory_1 = require("../utils/handler-factory");
async function healthRoutes(fastify) {
    const healthHandler = handler_factory_1.HandlerFactory.getHealthHandler();
    fastify.get('/', {
        handler: healthHandler.checkHealth.bind(healthHandler)
    });
}
//# sourceMappingURL=health.router.js.map