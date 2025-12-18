"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fastify_1 = __importDefault(require("fastify"));
const cors_1 = __importDefault(require("@fastify/cors"));
const swagger_1 = __importDefault(require("@fastify/swagger"));
const swagger_ui_1 = __importDefault(require("@fastify/swagger-ui"));
const frms_coe_lib_1 = require("@tazama-lf/frms-coe-lib");
const config_1 = require("@tazama-lf/frms-coe-lib/lib/config");
const schemas_1 = require("./schemas");
const services_1 = require("./services");
const handler_factory_1 = require("./utils/handler-factory");
const routes_1 = require("./routes");
async function createServer() {
    const config = schemas_1.ConfigSchema.parse({
        PORT: process.env.PORT || '5000',
        NODE_ENV: process.env.NODE_ENV || 'dev',
        COUCHDB_URL: process.env.COUCHDB_URL || 'http://admin:password@localhost:5984',
        TIKA_URL: process.env.TIKA_URL || 'http://localhost:9998',
        SOLR_URL: process.env.SOLR_URL || 'http://localhost:8983/solr/biar_docs',
    });
    process.env.FUNCTION_NAME = process.env.FUNCTION_NAME || 'biar-api';
    const processorConfig = (0, config_1.validateProcessorConfig)();
    const logger = new frms_coe_lib_1.LoggerService(processorConfig);
    const fastify = (0, fastify_1.default)({
        logger: false,
    });
    await fastify.register(cors_1.default, {
        origin: config.NODE_ENV === 'production' ? false : true,
    });
    await fastify.register(swagger_1.default, {
        swagger: {
            info: {
                title: 'BIAR Document Processing API',
                description: 'API for document management, text extraction, and search',
                version: '1.0.0',
            },
            host: `localhost:${config.PORT}`,
            schemes: ['http'],
            consumes: ['application/json'],
            produces: ['application/json'],
        },
    });
    await fastify.register(swagger_ui_1.default, {
        routePrefix: '/docs',
    });
    const serviceClient = new services_1.ServiceClient(config);
    handler_factory_1.HandlerFactory.initialize(serviceClient, config);
    await (0, routes_1.registerRoutes)(fastify);
    fastify.setErrorHandler(async (error, _request, reply) => {
        logger.error(`Request error: ${error.message}`, error, 'setErrorHandler');
        reply.status(500).send({
            success: false,
            error: 'Internal Server Error',
            message: config.NODE_ENV === 'dev' ? error.message : undefined,
            timestamp: new Date().toISOString(),
        });
    });
    fastify.setNotFoundHandler(async (request, reply) => {
        reply.status(404).send({
            success: false,
            error: 'Not Found',
            path: request.url,
            timestamp: new Date().toISOString(),
        });
    });
    const signals = ['SIGINT', 'SIGTERM'];
    signals.forEach((signal) => {
        process.on(signal, async () => {
            logger.log(`Received ${signal}, shutting down gracefully`, 'gracefulShutdown');
            try {
                await fastify.close();
                process.exit(0);
            }
            catch (err) {
                logger.error(`Error during shutdown: ${err.message}`, err, 'gracefulShutdown');
                process.exit(1);
            }
        });
    });
    try {
        await fastify.listen({
            port: parseInt(config.PORT),
            host: '0.0.0.0'
        });
        logger.log(`Server running on http://localhost:${config.PORT}`, 'serverStartup');
        logger.log(`API Documentation: http://localhost:${config.PORT}/docs`, 'serverStartup');
        logger.log(`Environment: ${config.NODE_ENV}`, 'serverStartup');
    }
    catch (err) {
        logger.error(`Error starting server: ${err.message}`, err, 'serverStartup');
        process.exit(1);
    }
}
createServer().catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
});
//# sourceMappingURL=server.js.map