"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SolrService = void 0;
const axios_1 = __importDefault(require("axios"));
class SolrService {
    static instance = null;
    baseUrl;
    constructor() {
        this.baseUrl = process.env.SOLR_URL ?? 'http://localhost:8983/solr/biar_docs';
    }
    static getInstance() {
        SolrService.instance ??= new SolrService();
        return SolrService.instance;
    }
    async indexDocument(document) {
        await axios_1.default.post(this.baseUrl + '/update/json/docs?commit=true', [document], {
            headers: { 'Content-Type': 'application/json' },
        });
    }
}
exports.SolrService = SolrService;
//# sourceMappingURL=SolrService.js.map