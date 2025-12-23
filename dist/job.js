"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const frms_coe_lib_1 = require("@tazama-lf/frms-coe-lib");
const config_1 = require("@tazama-lf/frms-coe-lib/lib/config");
const dotenv = __importStar(require("dotenv"));
dotenv.config();
class DocumentProcessor {
    logger;
    config;
    constructor() {
        process.env.FUNCTION_NAME = process.env.FUNCTION_NAME || 'biar-document-processor';
        const processorConfig = (0, config_1.validateProcessorConfig)();
        this.logger = new frms_coe_lib_1.LoggerService(processorConfig);
        this.config = {
            COUCHDB_URL: process.env.COUCHDB_URL || 'http://admin:password@localhost:5984/cms-evidence',
            TIKA_URL: process.env.TIKA_URL || 'http://localhost:9998',
            SOLR_URL: process.env.SOLR_URL || 'http://localhost:8983/solr/biar_docs',
            NIFI_URL: process.env.NIFI_URL || 'http://localhost:8081',
        };
    }
    async run() {
        this.logger.log('Starting document processing job', 'DocumentProcessor');
        try {
            const documents = await this.getAllDocumentsWithAttachments();
            this.logger.log(`Found ${documents.length} documents with attachments`, 'run');
            const results = [];
            for (const doc of documents) {
                const result = await this.processDocument(doc);
                results.push(result);
            }
            const successCount = results.filter(r => r.success).length;
            const errorCount = results.filter(r => !r.success).length;
            this.logger.log(`Processing complete: ${successCount} success, ${errorCount} errors`, 'run');
        }
        catch (error) {
            this.logger.error(`Job failed: ${error.message}`, error, 'run');
        }
    }
    async getAllDocumentsWithAttachments() {
        const response = await axios_1.default.get(`${this.config.COUCHDB_URL}/_all_docs?include_docs=true`);
        return response.data.rows
            .map((row) => row.doc)
            .filter((doc) => {
            const hasAttachments = doc._attachments && Object.keys(doc._attachments).length > 0 && doc.statuses?.processingStatus != 'COMPLETED';
            return hasAttachments;
        });
    }
    async processDocument(doc) {
        const documentId = doc._id;
        try {
            this.logger.log(`Processing document: ${documentId}`, 'processDocument');
            await this.updateDocumentStatus(documentId, 'PROCESSING');
            const attachmentName = Object.keys(doc._attachments)[0];
            const { text, metadata } = await this.extractText(documentId, attachmentName);
            await this.indexInSolr(doc, text, metadata);
            await this.sendToNiFi({
                documentId,
                caseId: doc.CaseId || doc.caseId,
                filename: attachmentName,
                content: text,
                metadata,
                extractedAt: new Date().toISOString()
            });
            await this.updateDocumentStatus(documentId, 'COMPLETED');
            this.logger.log(`Successfully processed: ${documentId}`, 'processDocument');
            return { documentId, success: true };
        }
        catch (error) {
            this.logger.error(`Failed to process ${documentId}: ${error.message}`, error, 'processDocument');
            await this.updateDocumentStatus(documentId, 'ERROR', error.message);
            return { documentId, success: false, error: error.message };
        }
    }
    async extractText(docId, filename) {
        const attachmentResponse = await axios_1.default.get(`${this.config.COUCHDB_URL}/${docId}/${filename}`, { responseType: 'arraybuffer' });
        const fileBuffer = Buffer.from(attachmentResponse.data);
        const [text, metadata] = await Promise.all([
            this.callTika(fileBuffer, 'tika', 'text/plain'),
            this.callTika(fileBuffer, 'meta', 'application/json')
        ]);
        return { text, metadata };
    }
    async callTika(fileBuffer, endpoint, acceptType) {
        const response = await axios_1.default.put(`${this.config.TIKA_URL}/${endpoint}`, fileBuffer, {
            headers: {
                'Accept': acceptType,
                'Content-Type': 'application/octet-stream',
            },
            timeout: 60000,
        });
        return response.data;
    }
    async sendToNiFi(payload) {
        this.logger.log("The payload being sent is: ", payload);
        await axios_1.default.post(`${this.config.NIFI_URL}/contentListener`, payload, {
            headers: {
                'Content-Type': 'application/json'
            },
            timeout: 30000
        });
        this.logger.log(`Sent document ${payload.documentId} to NiFi`, 'sendToNiFi');
    }
    async indexInSolr(doc, extractedText, metadata) {
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
            processingStatus: 'INDEXED'
        };
        await axios_1.default.post(`${this.config.SOLR_URL}/update/json/docs?commit=true`, [solrDoc], { headers: { 'Content-Type': 'application/json' } });
        this.logger.log(`Indexed document ${doc._id} in Solr`, 'indexInSolr');
    }
    async updateDocumentStatus(documentId, status, errorMessage) {
        const currentDoc = await axios_1.default.get(`${this.config.COUCHDB_URL}/${documentId}`);
        const updatedDoc = {
            ...currentDoc.data,
            statuses: { processingStatus: status,
                lastProcessed: new Date().toISOString() },
            ...(errorMessage && { lastError: errorMessage })
        };
        await axios_1.default.put(`${this.config.COUCHDB_URL}/${documentId}`, updatedDoc, { headers: { 'Content-Type': 'application/json' } });
    }
}
if (require.main === module) {
    const processor = new DocumentProcessor();
    processor.run().then(() => {
        console.log('Document processing job completed');
        process.exit(0);
    }).catch((error) => {
        console.error('Document processing job failed:', error);
        process.exit(1);
    });
}
//# sourceMappingURL=job.js.map