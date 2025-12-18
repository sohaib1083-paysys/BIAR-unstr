"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = documentProcessingRoutes;
const document_processing_service_1 = require("./document-processing.service");
const services_1 = require("./services");
const frms_coe_lib_1 = require("@tazama-lf/frms-coe-lib");
const config_1 = require("@tazama-lf/frms-coe-lib/lib/config");
async function documentProcessingRoutes(fastify, options) {
    const { config } = options;
    const processorConfig = (0, config_1.validateProcessorConfig)();
    const logger = new frms_coe_lib_1.LoggerService(processorConfig);
    const documentProcessor = new document_processing_service_1.DocumentProcessingService(config);
    documentProcessor.start();
    fastify.post('/process/trigger', async (_request, reply) => {
        try {
            logger.log('Manual processing trigger requested', 'POST /process/trigger');
            const results = await documentProcessor.manualTrigger();
            return reply.status(200).send({
                success: true,
                message: 'Manual processing completed',
                results,
                processedCount: results.length,
                successCount: results.filter(r => r.success).length,
                errorCount: results.filter(r => !r.success).length
            });
        }
        catch (error) {
            logger.error(`Manual trigger failed: ${error.message}`, error, 'POST /process/trigger');
            return reply.status(500).send({
                success: false,
                message: 'Manual processing failed',
                error: error.message
            });
        }
    });
    fastify.get('/process/stats', async (_request, reply) => {
        try {
            const stats = await documentProcessor.getProcessingStats();
            return reply.status(200).send({
                success: true,
                data: stats
            });
        }
        catch (error) {
            logger.error(`Failed to get processing stats: ${error.message}`, error, 'GET /process/stats');
            return reply.status(500).send({
                success: false,
                message: 'Failed to get processing statistics',
                error: error.message
            });
        }
    });
    fastify.post('/process/stop', async (_request, reply) => {
        try {
            documentProcessor.stop();
            logger.log('Document processing service stopped', 'POST /process/stop');
            return reply.status(200).send({
                success: true,
                message: 'Document processing service stopped'
            });
        }
        catch (error) {
            logger.error(`Failed to stop processing service: ${error.message}`, error, 'POST /process/stop');
            return reply.status(500).send({
                success: false,
                message: 'Failed to stop processing service',
                error: error.message
            });
        }
    });
    fastify.post('/process/start', async (_request, reply) => {
        try {
            documentProcessor.start();
            logger.log('Document processing service started', 'POST /process/start');
            return reply.status(200).send({
                success: true,
                message: 'Document processing service started'
            });
        }
        catch (error) {
            logger.error(`Failed to start processing service: ${error.message}`, error, 'POST /process/start');
            return reply.status(500).send({
                success: false,
                message: 'Failed to start processing service',
                error: error.message
            });
        }
    });
    fastify.get('/process/health', async (_request, reply) => {
        try {
            const stats = await documentProcessor.getProcessingStats();
            return reply.status(200).send({
                success: true,
                message: 'Document processing service is healthy',
                status: 'running',
                lastCheck: new Date().toISOString(),
                stats
            });
        }
        catch (error) {
            logger.error(`Processing service health check failed: ${error.message}`, error, 'GET /process/health');
            return reply.status(503).send({
                success: false,
                message: 'Document processing service is unhealthy',
                status: 'error',
                error: error.message
            });
        }
    });
    fastify.post('/process/document/:docId', {
        schema: {
            params: {
                type: 'object',
                properties: {
                    docId: { type: 'string' }
                },
                required: ['docId']
            }
        }
    }, async (request, reply) => {
        try {
            const { docId } = request.params;
            logger.log(`Processing single document: ${docId}`, 'POST /process/document/:docId');
            const serviceClient = new services_1.ServiceClient(config);
            const allDocs = await serviceClient.getAllCouchDBDocuments();
            const doc = allDocs.rows.find((row) => row.doc._id === docId)?.doc;
            if (!doc) {
                return reply.status(404).send({
                    success: false,
                    message: `Document ${docId} not found`
                });
            }
            if (!doc._attachments || Object.keys(doc._attachments).length === 0) {
                return reply.status(400).send({
                    success: false,
                    message: `Document ${docId} has no attachments`
                });
            }
            const result = await documentProcessor.processSingleDocument(doc);
            return reply.status(200).send({
                success: true,
                message: `Document ${docId} processed successfully`,
                result
            });
        }
        catch (error) {
            logger.error(`Failed to process document: ${error.message}`, error, 'POST /process/document/:docId');
            return reply.status(500).send({
                success: false,
                message: 'Failed to process document',
                error: error.message
            });
        }
    });
}
//# sourceMappingURL=document-processing.routes.js.map