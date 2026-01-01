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
const pg_1 = require("pg");
dotenv.config();
class DocumentProcessor {
    logger;
    config;
    TABLE_NAME = 'pacs002';
    constructor() {
        process.env.FUNCTION_NAME || 'biar-pacs002-raw-ingestion';
        const processorConfig = (0, config_1.validateProcessorConfig)();
        this.logger = new frms_coe_lib_1.LoggerService(processorConfig);
        this.config = {
            DATABASE_URL: process.env.CONFIGURATION_DATABASE_URL ||
                'postgresql://postgres:postgres@10.10.80.34:5432/raw_history',
            NIFI_URL: process.env.NIFI_URL || 'http://localhost:8081',
        };
    }
    async run() {
        this.logger.log(`Starting raw ingestion for table ${this.TABLE_NAME}`, 'DocumentProcessor');
        const client = new pg_1.Client({
            connectionString: this.config.DATABASE_URL,
        });
        try {
            await client.connect();
            await this.dumpPacs002Table(client);
            this.logger.log(`Raw ingestion completed for table ${this.TABLE_NAME}`, 'DocumentProcessor');
        }
        catch (error) {
            this.logger.error(`Job failed: ${error.message}`, error, 'run');
        }
        finally {
            await client.end();
        }
    }
    async dumpPacs002Table(client) {
        const batchSize = 1000;
        let offset = 0;
        while (true) {
            const res = await client.query(`
        SELECT *
        FROM ${this.TABLE_NAME}
        ORDER BY 1
        LIMIT $1 OFFSET $2
        `, [batchSize, offset]);
            console.log(res);
            if (res.rows.length === 0)
                break;
            const payload = {
                source: 'raw-history-db',
                database: 'raw_history',
                table: this.TABLE_NAME,
                extractedAt: new Date().toISOString(),
                rowCount: res.rows.length,
                rows: res.rows,
            };
            await this.sendToNiFi(payload);
            offset += batchSize;
        }
    }
    async sendToNiFi(payload) {
        await axios_1.default.post(`${this.config.NIFI_URL}/structured`, payload, {
            headers: { 'Content-Type': 'application/json' },
            timeout: 30000,
        });
        this.logger.log(`Sent batch to NiFi | table=${payload.table} rows=${payload.rowCount}`, 'sendToNiFi');
    }
}
if (require.main === module) {
    const processor = new DocumentProcessor();
    processor
        .run()
        .then(() => {
        console.log('pacs_002 raw ingestion completed');
        process.exit(0);
    })
        .catch((error) => {
        console.error('pacs_002 raw ingestion failed:', error);
        process.exit(1);
    });
}
//# sourceMappingURL=job-struct.js.map