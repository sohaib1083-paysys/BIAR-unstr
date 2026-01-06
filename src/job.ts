import { LoggerService } from '@tazama-lf/frms-coe-lib';
import { validateProcessorConfig } from '@tazama-lf/frms-coe-lib/lib/config';
import * as dotenv from 'dotenv';
import cron from 'node-cron';
import { CouchDBService } from './services/CouchDBService';
import { TikaService } from './services/TikaService';
import { SolrService } from './services/SolrService';
import { NiFiService } from './services/NiFiService';
import { DecryptionService } from './services/DecryptionService';
import type { IEvidenceDocument } from './interfaces/iEvidenceDocument';

dotenv.config();

class DocumentProcessor {
  private readonly logger: LoggerService;
  private readonly couchdb: CouchDBService;
  private readonly tika: TikaService;
  private readonly solr: SolrService;
  private readonly nifi: NiFiService;
  private readonly decryption: DecryptionService;
  private readonly MAX_FILE_SIZE_MB = 50;

  constructor() {
    process.env.FUNCTION_NAME ??= 'biar-document-processor';
    this.logger = new LoggerService(validateProcessorConfig());
    this.couchdb = CouchDBService.getInstance();
    this.tika = TikaService.getInstance();
    this.solr = SolrService.getInstance();
    this.nifi = NiFiService.getInstance();
    this.decryption = DecryptionService.getInstance();
  }

  async run(): Promise<void> {
    try {
      const documents = await this.getUnprocessedDocuments();
      for (const doc of documents) {
        await this.processDocument(doc);
      }
    } catch (error) {
      this.logger.error('Job failed: ' + (error as Error).message, error, 'run');
    }
  }

  private async getUnprocessedDocuments(): Promise<IEvidenceDocument[]> {
    const allDocs = await this.couchdb.getAllDocs<IEvidenceDocument>(true);
    return allDocs.filter((doc) => 
      doc._attachments && 
      doc.metadata && doc.metadata.length > 0 && 
      !doc.archive && 
      doc.processingStatus !== 'COMPLETED'
    );
  }

  private async processDocument(doc: IEvidenceDocument): Promise<void> {
    const docId = doc._id;
    const {evidenceId} = doc;
    const {taskId} = doc;

    try {
      await this.couchdb.updateStatus(docId, 'PROCESSING');

      const attachmentNames = Object.keys(doc._attachments ?? {});
      if (attachmentNames.length === 0) {
        throw new Error('No attachments found');
      }

      const [attachmentName] = attachmentNames;
      const [fileMeta] = doc.metadata;

      if (fileMeta.fileSize > this.MAX_FILE_SIZE_MB * 1024 * 1024) {
        throw new Error('File too large: ' + Math.round(fileMeta.fileSize / 1024 / 1024) + 'MB');
      }

      let fileBuffer = await this.couchdb.getAttachment(docId, attachmentName);

      if (fileMeta.encryption) {
        fileBuffer = this.decryption.decrypt(fileBuffer, fileMeta.encryption);
      }
      
      const extraction = await this.tika.extract(fileBuffer);
      this.logger.log(`Content length: ${extraction.text.length}`)

      const MAX_SOLR_CONTENT = 30000;
      const contentForSolr = extraction.text.length > MAX_SOLR_CONTENT 
        ? extraction.text.substring(0, MAX_SOLR_CONTENT) 
        : extraction.text;

      await this.solr.indexDocument({
        id: docId,
        evidenceId,
        taskId,
        evidenceType: doc.evidenceType,
        fileName: fileMeta.fileName,
        content: contentForSolr,
        contentType: fileMeta.mimeType,
        uploadedAt: doc.uploadedAt,
        extractedAt: new Date().toISOString(),
        textLength: extraction.text.length,
        processingStatus: 'INDEXED',
      });

      this.logger.log('Sent to solr')

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
    } catch (error) {
      const errorMsg = (error as Error).message;
      this.logger.error('Failed ' + docId + ': ' + errorMsg, error, 'process');
      await this.couchdb.updateStatus(docId, 'ERROR', errorMsg);
    }
  }
}

const processor = new DocumentProcessor();
const cronSchedule = process.env.CRON_SCHEDULE ?? '*/5 * * * *';

if (process.env.CRON_ENABLED === 'true') {
  // eslint-disable-next-line no-console -- Log cron schedule on startup
  console.log(`Starting cron job with schedule: ${cronSchedule}`);
  cron.schedule(cronSchedule, () => {
    processor.run();
  });
} else {
  processor.run();
}

export { DocumentProcessor };
