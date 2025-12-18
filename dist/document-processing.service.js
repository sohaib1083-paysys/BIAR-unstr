"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocumentProcessingService = void 0;
const cron_1 = require("cron");
const services_1 = require("./services");
const frms_coe_lib_1 = require("@tazama-lf/frms-coe-lib");
const config_1 = require("@tazama-lf/frms-coe-lib/lib/config");
const axios_1 = __importDefault(require("axios"));
class DocumentProcessingService {
    cronJob;
    serviceClient;
    logger;
    config;
    isProcessing = false;
    constructor(config) {
        this.config = config;
        this.serviceClient = new services_1.ServiceClient(config);
        const processorConfig = (0, config_1.validateProcessorConfig)();
        this.logger = new frms_coe_lib_1.LoggerService(processorConfig);
        this.cronJob = new cron_1.CronJob('*/5 * * * *', this.processDocuments.bind(this), null, false, 'America/New_York');
    }
    start() {
        this.logger.log('Starting document processing service', 'DocumentProcessingService');
        this.cronJob.start();
    }
    stop() {
        this.logger.log('Stopping document processing service', 'DocumentProcessingService');
        this.cronJob.stop();
    }
    async processDocuments() {
        if (this.isProcessing) {
            this.logger.log('Processing already in progress, skipping this cycle', 'processDocuments');
            return;
        }
        this.isProcessing = true;
        this.logger.log('Starting document processing cycle', 'processDocuments');
        try {
            const pendingDocs = await this.getPendingDocuments();
            if (pendingDocs.length === 0) {
                this.logger.log('No pending documents found', 'processDocuments');
                return;
            }
            this.logger.log(`Found ${pendingDocs.length} pending documents`, 'processDocuments');
            for (const doc of pendingDocs) {
                await this.processSingleDocument(doc);
            }
        }
        catch (error) {
            this.logger.error(`Document processing cycle failed: ${error.message}`, error, 'processDocuments');
        }
        finally {
            this.isProcessing = false;
            this.logger.log('Document processing cycle completed', 'processDocuments');
        }
    }
    async getPendingDocuments() {
        try {
            const allDocs = await this.serviceClient.getAllCouchDBDocuments();
            const pendingDocs = allDocs.rows
                .map((row) => row.doc)
                .filter((doc) => {
                return doc._attachments &&
                    Object.keys(doc._attachments).length > 0 &&
                    (!doc.processingStatus || doc.processingStatus === 'PENDING');
            });
            return pendingDocs;
        }
        catch (error) {
            this.logger.error(`Failed to get pending documents: ${error.message}`, error, 'getPendingDocuments');
            throw error;
        }
    }
    async processSingleDocument(doc) {
        const documentId = doc._id;
        const startTime = new Date().toISOString();
        this.logger.log(`Processing document: ${documentId}`, 'processSingleDocument');
        try {
            await this.updateDocumentStatus(documentId, 'PROCESSING');
            const attachmentName = Object.keys(doc._attachments)[0];
            this.logger.log(`Processing attachment: ${attachmentName}`, 'processSingleDocument');
            const { text, metadata } = await this.serviceClient.extractTextDirectly(documentId, attachmentName);
            this.logger.log(`Extracted ${text.length} characters from document`, 'processSingleDocument');
            await this.indexDocumentInSolr(doc, text, metadata);
            await this.sendToNifi(doc, text, metadata);
            await this.updateDocumentStatus(documentId, 'SENT');
            const result = {
                documentId,
                success: true,
                extractedText: text,
                metadata,
                timestamp: startTime
            };
            this.logger.log(`Successfully processed document: ${documentId}`, 'processSingleDocument');
            return result;
        }
        catch (error) {
            this.logger.error(`Failed to process document ${documentId}: ${error.message}`, error, 'processSingleDocument');
            await this.updateDocumentStatus(documentId, 'ERROR', error.message);
            return {
                documentId,
                success: false,
                error: error.message,
                timestamp: startTime
            };
        }
    }
    async indexDocumentInSolr(doc, extractedText, metadata) {
        const solrDoc = {
            id: doc._id,
            caseId: doc.CaseId || doc.caseId,
            taskId: doc.TaskId || doc.taskId,
            name: doc.Name || doc.name,
            content: extractedText,
            contentType: metadata['Content-Type'] || 'unknown',
            uploadedAt: doc.UploadedAt || doc.uploadedAt,
            extractedAt: new Date().toISOString(),
            textLength: extractedText.length,
            caseIdExact: (doc.CaseId || doc.caseId),
            caseIdSearchable: (doc.CaseId || doc.caseId),
            processingStatus: 'INDEXED'
        };
        await this.serviceClient.indexDocumentInSolr(solrDoc);
        this.logger.log(`Indexed document ${doc._id} in Solr with caseId: ${solrDoc.caseId}`, 'indexDocumentInSolr');
    }
    async sendToNifi(doc, extractedText, metadata) {
        const nifiEndpoint = process.env.NIFI_URL || 'http://localhost:8080/nifi-api/process-groups/root/processors';
        if (process.env.SKIP_NIFI === 'true') {
            this.logger.log(`NIFI processing skipped for document ${doc._id} (SKIP_NIFI=true)`, 'sendToNifi');
            return;
        }
        const nifiPayload = {
            documentId: doc._id,
            caseId: doc.CaseId || doc.caseId,
            taskId: doc.TaskId || doc.taskId,
            name: doc.Name || doc.name,
            extractedText,
            metadata,
            processedAt: new Date().toISOString(),
            source: 'biar-document-processor',
            destination: 'ozone-raw',
            ozoneVolume: '/biar',
            ozoneBucket: 'processed-documents'
        };
        try {
            const response = await axios_1.default.post(nifiEndpoint, nifiPayload, {
                headers: {
                    'Content-Type': 'application/json',
                },
                timeout: 10000
            });
            if (response.status === 200 || response.status === 201) {
                this.logger.log(`Successfully sent document ${doc._id} to NIFI for Ozone storage`, 'sendToNifi');
                await this.verifyOzoneStorage(doc._id);
            }
            else {
                throw new Error(`NIFI returned status ${response.status}`);
            }
        }
        catch (error) {
            this.logger.log(`NIFI not available for document ${doc._id}, skipping NIFI step: ${error.message}`, 'sendToNifi');
            return;
        }
    }
    async verifyOzoneStorage(documentId) {
        const ozoneUrl = process.env.OZONE_URL || 'http://localhost:9874';
        try {
            const response = await axios_1.default.get(`${ozoneUrl}/api/v1/volume/biar/bucket/processed-documents/key/${documentId}`, {
                timeout: 5000
            });
            if (response.status === 200) {
                this.logger.log(`Document ${documentId} successfully stored in Ozone`, 'verifyOzoneStorage');
            }
        }
        catch (error) {
            this.logger.log(`Could not verify Ozone storage for document ${documentId}: ${error.message}`, 'verifyOzoneStorage');
        }
    }
    async updateDocumentStatus(documentId, status, errorMessage) {
        try {
            const currentDoc = await this.serviceClient.getCouchDBDocument(documentId);
            const updatedDoc = {
                ...currentDoc,
                processingStatus: status,
                lastProcessed: new Date().toISOString(),
                ...(errorMessage && { lastError: errorMessage })
            };
            const response = await axios_1.default.put(`${this.config.COUCHDB_URL}/biar_documents/${documentId}`, updatedDoc, {
                headers: { 'Content-Type': 'application/json' }
            });
            if (response.status === 200 || response.status === 201) {
                this.logger.log(`Updated document ${documentId} status to ${status}`, 'updateDocumentStatus');
            }
            else {
                throw new Error(`Failed to update document status: ${response.status}`);
            }
        }
        catch (error) {
            this.logger.error(`Failed to update document status: ${error.message}`, error, 'updateDocumentStatus');
            throw error;
        }
    }
    async manualTrigger() {
        this.logger.log('Manual processing trigger initiated', 'manualTrigger');
        const pendingDocs = await this.getPendingDocuments();
        const results = [];
        for (const doc of pendingDocs) {
            const result = await this.processSingleDocument(doc);
            results.push(result);
        }
        return results;
    }
    async getProcessingStats() {
        try {
            const allDocs = await this.serviceClient.getAllCouchDBDocuments();
            const docs = allDocs.rows.map((row) => row.doc);
            const stats = {
                total: docs.length,
                pending: docs.filter((d) => !d.processingStatus || d.processingStatus === 'PENDING').length,
                processing: docs.filter((d) => d.processingStatus === 'PROCESSING').length,
                sent: docs.filter((d) => d.processingStatus === 'SENT').length,
                error: docs.filter((d) => d.processingStatus === 'ERROR').length,
                lastRun: new Date().toISOString()
            };
            return stats;
        }
        catch (error) {
            this.logger.error(`Failed to get processing stats: ${error.message}`, error, 'getProcessingStats');
            throw error;
        }
    }
}
exports.DocumentProcessingService = DocumentProcessingService;
//# sourceMappingURL=document-processing.service.js.map