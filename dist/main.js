"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const document_processing_service_1 = require("./document-processing.service");
const schemas_1 = require("./schemas");
const frms_coe_lib_1 = require("@tazama-lf/frms-coe-lib");
const config_1 = require("@tazama-lf/frms-coe-lib/lib/config");
async function startDocumentProcessor() {
    const config = schemas_1.ConfigSchema.parse({
        PORT: process.env.PORT || '5000',
        NODE_ENV: process.env.NODE_ENV || 'dev',
        COUCHDB_URL: process.env.COUCHDB_URL || 'http://admin:password@localhost:5984',
        TIKA_URL: process.env.TIKA_URL || 'http://localhost:9998',
        SOLR_URL: process.env.SOLR_URL || 'http://localhost:8983/solr/biar_docs',
    });
    process.env.FUNCTION_NAME = process.env.FUNCTION_NAME || 'biar-document-processor';
    const processorConfig = (0, config_1.validateProcessorConfig)();
    const logger = new frms_coe_lib_1.LoggerService(processorConfig);
    logger.log('Starting BIAR Document Processing Service', 'startDocumentProcessor');
    logger.log(`Environment: ${config.NODE_ENV}`, 'startDocumentProcessor');
    logger.log(`CouchDB: ${config.COUCHDB_URL}`, 'startDocumentProcessor');
    logger.log(`Tika: ${config.TIKA_URL}`, 'startDocumentProcessor');
    logger.log(`Solr: ${config.SOLR_URL}`, 'startDocumentProcessor');
    const documentProcessor = new document_processing_service_1.DocumentProcessingService(config);
    documentProcessor.start();
    logger.log('Document processing cron job started (runs every 5 minutes)', 'startDocumentProcessor');
    logger.log('Processing pipeline: CouchDB → Tika → Solr → NIFI → Ozone', 'startDocumentProcessor');
    const signals = ['SIGINT', 'SIGTERM'];
    signals.forEach((signal) => {
        process.on(signal, async () => {
            logger.log(`Received ${signal}, shutting down gracefully`, 'gracefulShutdown');
            try {
                documentProcessor.stop();
                logger.log('Document processing service stopped', 'gracefulShutdown');
                process.exit(0);
            }
            catch (err) {
                logger.error(`Error during shutdown: ${err.message}`, err, 'gracefulShutdown');
                process.exit(1);
            }
        });
    });
    try {
        logger.log('Running initial document processing check...', 'startDocumentProcessor');
        const initialResults = await documentProcessor.manualTrigger();
        if (initialResults.length > 0) {
            const successCount = initialResults.filter(r => r.success).length;
            const errorCount = initialResults.filter(r => !r.success).length;
            logger.log(`Initial processing completed: ${successCount} success, ${errorCount} errors`, 'startDocumentProcessor');
        }
        else {
            logger.log('No pending documents found for initial processing', 'startDocumentProcessor');
        }
    }
    catch (error) {
        logger.error(`Initial processing failed: ${error.message}`, error, 'startDocumentProcessor');
    }
    try {
        const stats = await documentProcessor.getProcessingStats();
        logger.log(`Current document stats: ${JSON.stringify(stats)}`, 'startDocumentProcessor');
    }
    catch (error) {
        logger.error(`Failed to get initial stats: ${error.message}`, error, 'startDocumentProcessor');
    }
    logger.log('🚀 BIAR Document Processor is running! Press Ctrl+C to stop.', 'startDocumentProcessor');
}
startDocumentProcessor().catch((error) => {
    console.error('Failed to start document processor:', error);
    process.exit(1);
});
//# sourceMappingURL=main.js.map