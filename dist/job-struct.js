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
const crypto = __importStar(require("crypto"));
dotenv.config();
class DocumentProcessor {
    logger;
    config;
    constructor() {
        process.env.FUNCTION_NAME =
            process.env.FUNCTION_NAME || 'biar-structured-raw-ingestion';
        const processorConfig = (0, config_1.validateProcessorConfig)();
        this.logger = new frms_coe_lib_1.LoggerService(processorConfig);
        this.config = {
            CONFIGURATION_DATABASE_URL: process.env.CONFIGURATION_DATABASE_URL ||
                'postgresql://postgres:postgres@10.10.80.34:5432/raw_history',
            NIFI_URL: process.env.NIFI_URL || 'http://localhost:8081',
        };
    }
    async run() {
        this.logger.log('Starting structured raw ingestion job', 'DocumentProcessor');
        const client = new pg_1.Client({
            connectionString: this.config.CONFIGURATION_DATABASE_URL,
        });
        try {
            await client.connect();
            const tables = await this.getAllTables(client);
            this.logger.log(`Discovered ${tables.length} tables`, 'DocumentProcessor');
            for (const table of tables) {
                this.logger.log(`Dumping table: ${table}`, 'DocumentProcessor');
                await this.dumpTable(client, table);
            }
            this.logger.log('Structured raw ingestion completed successfully', 'DocumentProcessor');
        }
        catch (error) {
            this.logger.error(`Job failed: ${error.message}`, error, 'run');
        }
        finally {
            await client.end();
        }
    }
    async getAllTables(client) {
        const res = await client.query(`
      SELECT 
        schemaname,
        tablename,
        hasindexes,
        hasrules,
        hastriggers
      FROM pg_tables
      WHERE schemaname NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
        AND schemaname = 'public'
      ORDER BY tablename
    `);
        this.logger.log(`Found ${res.rows.length} tables in public schema`, 'getAllTables');
        return res.rows.map((r) => r.tablename);
    }
    async dumpTable(client, table) {
        this.logger.log(`Starting dump for table: ${table}`, 'dumpTable');
        const countRes = await client.query(`SELECT COUNT(*) as total FROM "${table}"`);
        const totalRows = parseInt(countRes.rows[0].total);
        this.logger.log(`Table ${table} has ${totalRows} rows`, 'dumpTable');
        if (totalRows === 0) {
            this.logger.log(`Skipping empty table: ${table}`, 'dumpTable');
            return;
        }
        if (totalRows > 100000) {
            this.logger.log(`Skipping large table ${table} (${totalRows} rows) - adjust limit if needed`, 'dumpTable');
            return;
        }
        const batchSize = 1000;
        let offset = 0;
        let batchCount = 0;
        while (true) {
            const res = await client.query(`SELECT * FROM "${table}" ORDER BY 1 LIMIT $1 OFFSET $2`, [batchSize, offset]);
            if (res.rows.length === 0) {
                break;
            }
            batchCount++;
            const payload = {
                documentId: `${table}_batch_${batchCount}_${Date.now()}`,
                source: 'raw-history-db',
                database: 'raw_history',
                table,
                batchNumber: batchCount,
                extractedAt: new Date().toISOString(),
                totalRowsInTable: totalRows,
                rowCount: res.rows.length,
                offset: offset,
                rows: res.rows,
                checksum: this.calculateChecksum(res.rows),
            };
            await this.sendToNiFi(payload);
            offset += batchSize;
            this.logger.log(`Processed batch ${batchCount} for table ${table}: ${res.rows.length} rows (${offset}/${totalRows})`, 'dumpTable');
        }
        this.logger.log(`Completed dump for table ${table}: ${batchCount} batches, ${totalRows} total rows`, 'dumpTable');
    }
    async sendToNiFi(payload) {
        await axios_1.default.post(`${this.config.NIFI_URL}/contentListener`, payload, {
            headers: {
                'Content-Type': 'application/json',
            },
            timeout: 30000,
        });
        this.logger.log(`Sent batch to NiFi | documentId=${payload.documentId} table=${payload.table} rows=${payload.rowCount}`, 'sendToNiFi');
    }
    calculateChecksum(rows) {
        const dataString = JSON.stringify(rows);
        return crypto.createHash('sha256').update(dataString).digest('hex');
    }
}
if (require.main === module) {
    const processor = new DocumentProcessor();
    processor
        .run()
        .then(() => {
        console.log('Document processing job completed');
        process.exit(0);
    })
        .catch((error) => {
        console.error('Document processing job failed:', error);
        process.exit(1);
    });
}
//# sourceMappingURL=job-struct.js.map