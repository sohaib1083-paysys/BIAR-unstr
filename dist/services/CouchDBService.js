"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CouchDBService = void 0;
const axios_1 = __importDefault(require("axios"));
class CouchDBService {
    static instance = null;
    baseUrl;
    constructor() {
        this.baseUrl = process.env.COUCHDB_URL ?? 'http://localhost:5984/cms-evidence';
    }
    static getInstance() {
        CouchDBService.instance ??= new CouchDBService();
        return CouchDBService.instance;
    }
    async getAllDocs(includeDocs = true) {
        const response = await axios_1.default.get(this.baseUrl + '/_all_docs', {
            params: { include_docs: includeDocs },
        });
        return response.data.rows.map((row) => row.doc).filter((doc) => doc !== null);
    }
    async getDocument(documentId) {
        const response = await axios_1.default.get(this.baseUrl + '/' + documentId);
        return response.data;
    }
    async getAttachment(documentId, attachmentName) {
        const response = await axios_1.default.get(this.baseUrl + '/' + documentId + '/' + encodeURIComponent(attachmentName), {
            responseType: 'arraybuffer',
        });
        return Buffer.from(response.data);
    }
    async updateStatus(documentId, status, errorMessage) {
        const currentDoc = await this.getDocument(documentId);
        const updatedDoc = {
            ...currentDoc,
            processingStatus: status,
            processedAt: new Date().toISOString(),
            ...(errorMessage && { lastError: errorMessage }),
        };
        await axios_1.default.put(this.baseUrl + '/' + documentId, updatedDoc, {
            headers: { 'Content-Type': 'application/json' },
        });
    }
}
exports.CouchDBService = CouchDBService;
//# sourceMappingURL=CouchDBService.js.map