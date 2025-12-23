import axios from 'axios';
import { LoggerService } from '@tazama-lf/frms-coe-lib';
import { validateProcessorConfig } from '@tazama-lf/frms-coe-lib/lib/config';
import * as dotenv from 'dotenv';

dotenv.config();

interface DocumentResult {
  documentId: string;
  success: boolean;
  error?: string;
}

class DocumentProcessor {
  private logger: LoggerService;
  private config: {
    COUCHDB_URL: string;
    TIKA_URL: string;
    SOLR_URL: string;
    NIFI_URL: string;
  };

  constructor() {
    process.env.FUNCTION_NAME = process.env.FUNCTION_NAME || 'biar-document-processor';
    
    const processorConfig = validateProcessorConfig();
    this.logger = new LoggerService(processorConfig);

    this.config = {
      COUCHDB_URL: process.env.COUCHDB_URL || 'http://admin:password@localhost:5984/cms-evidence',
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
      
      for (const doc of documents) {
        const result = await this.processDocument(doc);
        results.push(result);
      }

      const successCount = results.filter(r => r.success).length;
      const errorCount = results.filter(r => !r.success).length;
      
      this.logger.log(`Processing complete: ${successCount} success, ${errorCount} errors`, 'run');
      
    } catch (error) {
      this.logger.error(`Job failed: ${(error as Error).message}`, error, 'run');
    }
  }

  private async getAllDocumentsWithAttachments(): Promise<any[]> {
    const response = await axios.get(`${this.config.COUCHDB_URL}/_all_docs?include_docs=true`);
    
    return response.data.rows
      .map((row: any) => row.doc)
      .filter((doc: any) => {
        const hasAttachments = doc._attachments && Object.keys(doc._attachments).length > 0 && doc.statuses?.processingStatus != 'COMPLETED';
        
        return hasAttachments;
      });
  }

  private async processDocument(doc: any): Promise<DocumentResult> {
    const documentId = doc._id;
    
    try {
      this.logger.log(`Processing document: ${documentId}`, 'processDocument');
      
      await this.updateDocumentStatus(documentId, 'PROCESSING');
      
      const attachmentName = Object.keys(doc._attachments)[0];
      const { text, metadata } = await this.extractText(documentId, attachmentName);
      // this.logger.log('The doc is ', doc)
      // this.logger.log('The text is ', text)
      // this.logger.log('The metadata is ', metadata)

      
      await this.indexInSolr(doc, text, metadata);

      await this.sendToNiFi({
        documentId,
        caseId: doc.CaseId || doc.caseId,
        filename: attachmentName,
        content: text,
        metadata,
        extractedAt: new Date().toISOString()
      });


      
      await this.updateDocumentStatus(documentId, 'COMPLETED');
      
      this.logger.log(`Successfully processed: ${documentId}`, 'processDocument');
      return { documentId, success: true };
      
    } catch (error) {
      this.logger.error(`Failed to process ${documentId}: ${(error as Error).message}`, error, 'processDocument');
      await this.updateDocumentStatus(documentId, 'ERROR', (error as Error).message);
      return { documentId, success: false, error: (error as Error).message };
    }
  }

  private async extractText(docId: string, filename: string): Promise<{ text: string; metadata: any }> {
    const attachmentResponse = await axios.get(
      `${this.config.COUCHDB_URL}/${docId}/${filename}`,
      { responseType: 'arraybuffer' }
    );
    
    const fileBuffer = Buffer.from(attachmentResponse.data);
    
    const [text, metadata] = await Promise.all([
      this.callTika(fileBuffer, 'tika', 'text/plain'),
      this.callTika(fileBuffer, 'meta', 'application/json')
    ]);

    return { text, metadata };
  }

  private async callTika(fileBuffer: Buffer, endpoint: string, acceptType: string): Promise<any> {
    const response = await axios.put(`${this.config.TIKA_URL}/${endpoint}`, fileBuffer, {
      headers: {
        'Accept': acceptType,
        'Content-Type': 'application/octet-stream',
      },
      timeout: 60000,
    });
    return response.data;
  }

  private async sendToNiFi(payload: any): Promise<void> {
    this.logger.log("The payload being sent is: ", payload)
    await axios.post(
      `${this.config.NIFI_URL}/contentListener`,
      payload,
      {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
  );

  this.logger.log(
    `Sent document ${payload.documentId} to NiFi`,
    'sendToNiFi'
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
      processingStatus: 'INDEXED'
    };


    await axios.post(
      `${this.config.SOLR_URL}/update/json/docs?commit=true`,
      [solrDoc],
      { headers: { 'Content-Type': 'application/json' } }
    );
    
    this.logger.log(`Indexed document ${doc._id} in Solr`, 'indexInSolr');
  }

  

  private async updateDocumentStatus(documentId: string, status: string, errorMessage?: string): Promise<void> {
    const currentDoc = await axios.get(`${this.config.COUCHDB_URL}/${documentId}`);
    
    const updatedDoc = {
      ...currentDoc.data,
      statuses: {processingStatus: status,
      lastProcessed: new Date().toISOString()},
      ...(errorMessage && { lastError: errorMessage })
    };

    await axios.put(
      `${this.config.COUCHDB_URL}/${documentId}`,
      updatedDoc,
      { headers: { 'Content-Type': 'application/json' } }
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