"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NiFiService = void 0;
const axios_1 = __importDefault(require("axios"));
class NiFiService {
    static instance = null;
    baseUrl;
    constructor() {
        this.baseUrl = process.env.NIFI_URL ?? 'http://localhost:8081';
    }
    static getInstance() {
        NiFiService.instance ??= new NiFiService();
        return NiFiService.instance;
    }
    async sendDocument(payload) {
        await axios_1.default.post(this.baseUrl + '/contentListener', payload, {
            headers: { 'Content-Type': 'application/json' },
            timeout: 30000,
        });
    }
}
exports.NiFiService = NiFiService;
//# sourceMappingURL=NiFiService.js.map