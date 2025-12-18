"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServiceClient = void 0;
const axios_1 = __importDefault(require("axios"));
class ServiceClient {
    config;
    constructor(config) {
        this.config = config;
    }
    async getCouchDBDocument(docId) {
        const response = await axios_1.default.get(`${this.config.COUCHDB_URL}/biar_documents/${docId}`);
        return response.data;
    }
    async getAllCouchDBDocuments() {
        const response = await axios_1.default.get(`${this.config.COUCHDB_URL}/biar_documents/_all_docs?include_docs=true`);
        return response.data;
    }
    async extractTextDirectly(docId, filename) {
        const attachmentResponse = await axios_1.default.get(`${this.config.COUCHDB_URL}/biar_documents/${docId}/${filename}`, { responseType: 'arraybuffer' });
        const fileBuffer = Buffer.from(attachmentResponse.data);
        const [extractedText, metadata] = await Promise.all([
            this.extractTextWithTika(fileBuffer),
            this.extractMetadataWithTika(fileBuffer),
        ]);
        return {
            text: extractedText,
            metadata
        };
    }
    async extractTextWithTika(fileBuffer) {
        const response = await axios_1.default.put(`${this.config.TIKA_URL}/tika`, fileBuffer, {
            headers: {
                'Accept': 'text/plain',
                'Content-Type': 'application/octet-stream',
            },
            timeout: 60000,
        });
        return response.data;
    }
    async extractMetadataWithTika(fileBuffer) {
        const response = await axios_1.default.put(`${this.config.TIKA_URL}/meta`, fileBuffer, {
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/octet-stream',
            },
            timeout: 60000,
        });
        return response.data;
    }
    async indexDocumentInSolr(doc) {
        await axios_1.default.post(`${this.config.SOLR_URL}/update/json/docs?commit=true`, [doc], {
            headers: { 'Content-Type': 'application/json' },
        });
    }
}
exports.ServiceClient = ServiceClient;
//# sourceMappingURL=services.js.map