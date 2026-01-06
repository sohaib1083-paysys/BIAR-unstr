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
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocumentProcessor = void 0;
const frms_coe_lib_1 = require("@tazama-lf/frms-coe-lib");
const config_1 = require("@tazama-lf/frms-coe-lib/lib/config");
const dotenv = __importStar(require("dotenv"));
const CouchDBService_1 = require("./services/CouchDBService");
const TikaService_1 = require("./services/TikaService");
const SolrService_1 = require("./services/SolrService");
const NiFiService_1 = require("./services/NiFiService");
dotenv.config();
class DocumentProcessor {
    logger;
    couchdb;
    tika;
    solr;
    nifi;
    MAX_FILE_SIZE_MB = 50;
    constructor() {
        process.env.FUNCTION_NAME ??= 'biar-document-processor';
        this.logger = new frms_coe_lib_1.LoggerService((0, config_1.validateProcessorConfig)());
        this.couchdb = CouchDBService_1.CouchDBService.getInstance();
        this.tika = TikaService_1.TikaService.getInstance();
        this.solr = SolrService_1.SolrService.getInstance();
        this.nifi = NiFiService_1.NiFiService.getInstance();
    }
    async run() {
        try {
            const documents = await this.getUnprocessedDocuments();
            for (const doc of documents) {
                await this.processDocument(doc);
            }
        }
        catch (error) {
            this.logger.error('Job failed: ' + error.message, error, 'run');
        }
    }
    async getUnprocessedDocuments() {
        const allDocs = await this.couchdb.getAllDocs(true);
        return allDocs.filter((doc) => doc._attachments && !doc.archive && doc.processingStatus !== 'COMPLETED');
    }
    async processDocument(doc) {
        const docId = doc._id;
        const { evidenceId } = doc;
        const { taskId } = doc;
        try {
            await this.couchdb.updateStatus(docId, 'PROCESSING');
            const [attachmentName] = Object.keys(doc._attachments);
            const [fileMeta] = doc.metadata;
            if (fileMeta.fileSize > this.MAX_FILE_SIZE_MB * 1024 * 1024) {
                throw new Error('File too large: ' + Math.round(fileMeta.fileSize / 1024 / 1024) + 'MB');
            }
            const fileBuffer = await this.couchdb.getAttachment(docId, attachmentName);
            const extraction = await this.tika.extract(fileBuffer);
            await this.solr.indexDocument({
                id: docId,
                evidenceId,
                taskId,
                evidenceType: doc.evidenceType,
                fileName: fileMeta.fileName,
                content: extraction.text,
                contentType: fileMeta.mimeType,
                uploadedAt: doc.uploadedAt,
                extractedAt: new Date().toISOString(),
                textLength: extraction.text.length,
                processingStatus: 'INDEXED',
            });
            await this.nifi.sendDocument({
                documentId: docId,
                evidenceId,
                taskId,
                filename: fileMeta.fileName,
                content: extraction.text,
                metadata: extraction.metadata,
                extractedAt: new Date().toISOString(),
            });
            await this.couchdb.updateStatus(docId, 'COMPLETED');
        }
        catch (error) {
            const errorMsg = error.message;
            this.logger.error('Failed ' + docId + ': ' + errorMsg, error, 'process');
            await this.couchdb.updateStatus(docId, 'ERROR', errorMsg);
        }
    }
}
exports.DocumentProcessor = DocumentProcessor;
const processor = new DocumentProcessor();
processor.run();
//# sourceMappingURL=job.js.map