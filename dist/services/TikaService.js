"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TikaService = void 0;
const axios_1 = __importDefault(require("axios"));
class TikaService {
    static instance = null;
    baseUrl;
    timeout;
    constructor() {
        this.baseUrl = process.env.TIKA_URL ?? 'http://localhost:9998';
        this.timeout = 120000;
    }
    static getInstance() {
        TikaService.instance ??= new TikaService();
        return TikaService.instance;
    }
    async extract(fileBuffer) {
        const [text, metadata] = await Promise.all([
            this.extractText(fileBuffer),
            this.extractMetadata(fileBuffer),
        ]);
        return { text, metadata };
    }
    async extractText(fileBuffer) {
        const response = await axios_1.default.put(this.baseUrl + '/tika', fileBuffer, {
            headers: { Accept: 'text/plain', 'Content-Type': 'application/octet-stream' },
            timeout: this.timeout,
        });
        return response.data;
    }
    async extractMetadata(fileBuffer) {
        const response = await axios_1.default.put(this.baseUrl + '/meta', fileBuffer, {
            headers: { Accept: 'application/json', 'Content-Type': 'application/octet-stream' },
            timeout: this.timeout,
        });
        return response.data;
    }
}
exports.TikaService = TikaService;
//# sourceMappingURL=TikaService.js.map