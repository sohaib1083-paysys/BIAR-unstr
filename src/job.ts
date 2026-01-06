import axios from 'axios';
import { LoggerService } from '@tazama-lf/frms-coe-lib';
import { validateProcessorConfig } from '@tazama-lf/frms-coe-lib/lib/config';
import * as dotenv from 'dotenv';
import { DocumentResult } from './types/types';

dotenv.config();

class DocumentProcessor {
  private logger: LoggerService;
  private config: {
    COUCHDB_URL: string;
    TIKA_URL: string;
    SOLR_URL: string;
    NIFI_URL: string;
  };

  // Configuration constants
  private readonly MAX_FILE_SIZE_MB = 50; // Skip files larger than this
  private readonly TIKA_TIMEOUT_MS = 120000; // 120 seconds

  constructor() {
    process.env.FUNCTION_NAME = process.env.FUNCTION_NAME || 'biar-document-processor';
    
    const processorConfig = validateProcessorConfig();
    this.logger = new LoggerService(processorConfig);

    this.config = {
      COUCHDB_URL: process.env.COUCHDB_URL || 'http://localhost:5984/cms-evidence',
      TIKA_URL: process.env.TIKA_URL || 'http://localhost:9998',
      SOLR_URL: process.env.SOLR_URL || 'http://localhost:8983/solr/biar_docs',
      NIFI_URL: process.env.NIFI_URL || 'http://localhost:8081',
    };
    
  }

  async run(): Promise<void> {
    this.logger.log('Starting document processing job', 'DocumentProcessor');
    
    try {
      
      const documents = await this.getAllDocumentsWithAttachments();
      this.logger.log(`Found ${documents.length} documents with attachments`, 'run');

      const results: DocumentResult[] = [];
      let processedCount = 0;
      
      for (const doc of documents) {
        processedCount++;
        this.logger.log(`Processing document ${processedCount}/${documents.length}`, 'run');
        
        const result = await this.processDocument(doc);
        results.push(result);
        
        // Log progress every 5 documents or on last document
        if (processedCount % 5 === 0 || processedCount === documents.length) {
          const currentSuccess = results.filter(r => r.success).length;
          const currentErrors = results.filter(r => !r.success).length;
          this.logger.log(`Progress: ${processedCount}/${documents.length} - Success: ${currentSuccess}, Errors: ${currentErrors}`, 'run');
        }
      }

    } catch (error) {
      this.logger.error(`Job failed: ${(error as Error).message}`, error, 'run');
    }
  }

  private async getAllDocumentsWithAttachments(): Promise<any[]> {
    const response = await axios.get(`${this.config.COUCHDB_URL}/_all_docs?include_docs=true`);
    
    return response.data.rows
      .map((row: any) => row.doc)
      .filter((doc: any) => {

        if (!doc) {
          return false;
        }
        
        const hasAttachments = doc._attachments && Object.keys(doc._attachments).length > 0;
        if (!hasAttachments) {
          return false;
        }
        
        const isNotCompleted = doc.statuses?.processingStatus !== 'COMPLETED';
        
        return hasAttachments && isNotCompleted;
      });
  }

  private async processDocument(doc: any): Promise<DocumentResult> {
    const documentId = doc._id;
    
    try {
      this.logger.log(`Processing document: ${documentId}`, 'processDocument');
      
      await this.updateDocumentStatus(documentId, 'PROCESSING');
      
      const attachmentName = Object.keys(doc._attachments)[0];
      const { text, metadata } = await this.extractText(documentId, attachmentName);

      this.logger.log(`Extracted text length: ${text.length} characters`, 'processDocument');
      
      await this.indexInSolr(doc, text, metadata);

      await this.sendToNiFi({
        documentId,
        caseId: doc.CaseId || doc.caseId,
        filename: attachmentName,
        content: text,
        metadata,
        extractedAt: new Date().toISOString(),
      });

      
      await this.updateDocumentStatus(documentId, 'COMPLETED');
      
      this.logger.log(`Successfully processed: ${documentId}`, 'processDocument');
      return { documentId, success: true };
      
    } catch (error) {
      this.logger.error(`Failed to process ${documentId}: ${(error as Error).message}`, error, 'processDocument');
      
      // Determine status based on error type
      const errorMessage = (error as Error).message;
      const status = errorMessage.includes('File too large') ? 'SKIPPED_TOO_LARGE' : 'ERROR';
      
      await this.updateDocumentStatus(documentId, status, errorMessage);
      return { documentId, success: false, error: errorMessage };
    }
  }

  private async extractText(docId: string, filename: string): Promise<{ text: string; metadata: any }> {
    this.logger.log(`Extracting text from ${filename} (document: ${docId})`, 'extractText');
    
    // First, check file size via HEAD request (without downloading)
    const headResponse = await axios.head(
      `${this.config.COUCHDB_URL}/${docId}/${filename}`,
    );
    
    const contentLength = parseInt(headResponse.headers['content-length'] || '0');
    const fileSizeMB = Math.round((contentLength / 1024 / 1024) * 100) / 100;
    
    
    // Skip files larger than configured maximum
    if (fileSizeMB > this.MAX_FILE_SIZE_MB) {
      throw new Error(`File too large: ${fileSizeMB}MB exceeds maximum of ${this.MAX_FILE_SIZE_MB}MB`);
    }
    
    const attachmentResponse = await axios.get(
      `${this.config.COUCHDB_URL}/${docId}/${filename}`,
      { responseType: 'arraybuffer' },
    );
    
    const fileBuffer = Buffer.from(attachmentResponse.data);
    
    const [text, metadata] = await Promise.all([
      this.callTika(fileBuffer, 'tika', 'text/plain'),
      this.callTika(fileBuffer, 'meta', 'application/json'),
    ]);

    this.logger.log(`Successfully extracted text from ${filename}`, 'extractText');
    return { text, metadata };
  }

  private async callTika(fileBuffer: Buffer, endpoint: string, acceptType: string): Promise<any> {
    try {
      const response = await axios.put(`${this.config.TIKA_URL}/${endpoint}`, fileBuffer, {
        headers: {
          'Accept': acceptType,
          'Content-Type': 'application/octet-stream',
        },
        timeout: this.TIKA_TIMEOUT_MS,
      });
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNABORTED') {
          throw new Error(`Tika timeout after ${this.TIKA_TIMEOUT_MS / 1000}s calling ${endpoint}. File may be too large or Tika is overloaded.`);
        }
        if (error.code === 'ECONNREFUSED') {
          throw new Error(`Cannot connect to Tika at ${this.config.TIKA_URL}. Is Tika running?`);
        }
      }
      throw error;
    }
  }

  private async sendToNiFi(payload: any): Promise<void> {
    this.logger.log(`Sending document ${payload.documentId} to NiFi`, 'sendToNiFi');
    
    await axios.post(
      `${this.config.NIFI_URL}/contentListener`,
      payload,
      {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      },
    );

    this.logger.log(
      `Successfully sent document ${payload.documentId} to NiFi`,
      'sendToNiFi',
    );
  }


  private async indexInSolr(doc: any, extractedText: string, metadata: any): Promise<void> {
    const solrDoc = {
      id: doc._id,
      caseId: doc.CaseId || doc.caseId,
      taskId: doc.TaskId || doc.taskId,
      name: doc.Name || doc.name,
      content: extractedText,
      contentType: metadata['Content-Type'] || 'unknown',
      uploadedAt: doc.UploadedAt || doc.uploadedAt,
      extractedAt: new Date().toISOString(),
      textLength: extractedText.length,
      processingStatus: 'INDEXED',
    };


    await axios.post(
      `${this.config.SOLR_URL}/update/json/docs?commit=true`,
      [solrDoc],
      { headers: { 'Content-Type': 'application/json' } },
    );
    
    this.logger.log(`Indexed document ${doc._id} in Solr`, 'indexInSolr');
  }

  

  private async updateDocumentStatus(documentId: string, status: string, errorMessage?: string): Promise<void> {
    const currentDoc = await axios.get(`${this.config.COUCHDB_URL}/${documentId}`);
    
    const updatedDoc = {
      ...currentDoc.data,
      statuses: {processingStatus: status,
        lastProcessed: new Date().toISOString()},
      ...(errorMessage && { lastError: errorMessage }),
    };

    await axios.put(
      `${this.config.COUCHDB_URL}/${documentId}`,
      updatedDoc,
      { headers: { 'Content-Type': 'application/json' } },
    );
  }
}

if (require.main === module) {
  const processor = new DocumentProcessor();
  processor.run().then(() => {
    console.log('Document processing job completed');
    process.exit(0);
  }).catch((error) => {
    console.error('Document processing job failed:', error);
    process.exit(1);
  });
}