import axios from 'axios';
import { LoggerService } from '@tazama-lf/frms-coe-lib';
import { validateProcessorConfig } from '@tazama-lf/frms-coe-lib/lib/config';
import * as dotenv from 'dotenv';
import { Client } from 'pg';

dotenv.config();

class DocumentProcessor {
  private logger: LoggerService;
  private config: {
    DATABASE_URL: string;
    NIFI_URL: string;
  };

  private readonly TABLE_NAME = 'pacs002';

  constructor() {
    process.env.FUNCTION_NAME =
      process.env.FUNCTION_NAME || 'biar-pacs002-raw-ingestion';

    const processorConfig = validateProcessorConfig();
    this.logger = new LoggerService(processorConfig);

    this.config = {
      DATABASE_URL:
        process.env.CONFIGURATION_DATABASE_URL ||
        'postgresql://postgres:postgres@10.10.80.34:5432/raw_history',
      NIFI_URL: process.env.NIFI_URL || 'http://localhost:8081',
    };
  }

  async run(): Promise<void> {
    this.logger.log(
      `Starting raw ingestion for table ${this.TABLE_NAME}`,
      'DocumentProcessor'
    );

    const client = new Client({
      connectionString: this.config.DATABASE_URL,
    });

    try {
      await client.connect();
      await this.dumpPacs002Table(client);

      this.logger.log(
        `Raw ingestion completed for table ${this.TABLE_NAME}`,
        'DocumentProcessor'
      );
    } catch (error) {
      this.logger.error(
        `Job failed: ${(error as Error).message}`,
        error,
        'run'
      );
    } finally {
      await client.end();
    }
  }

  private async dumpPacs002Table(client: Client): Promise<void> {
    const batchSize = 1000;
    let offset = 0;

    while (true) {
      const res = await client.query(
        `
        SELECT *
        FROM ${this.TABLE_NAME}
        ORDER BY 1
        LIMIT $1 OFFSET $2
        `,
        [batchSize, offset]
      );

      console.log(res)

      if (res.rows.length === 0) break;

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

  private async sendToNiFi(payload: any): Promise<void> {
    await axios.post(
      `${this.config.NIFI_URL}/structured`,
      payload,
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 30000,
      }
    );

    this.logger.log(
      `Sent batch to NiFi | table=${payload.table} rows=${payload.rowCount}`,
      'sendToNiFi'
    );
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
