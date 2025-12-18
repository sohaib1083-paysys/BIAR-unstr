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
    OZONE_URL: string;
    OZONE_VOLUME: string;
    OZONE_BUCKET: string;
  };

  constructor() {
    process.env.FUNCTION_NAME = process.env.FUNCTION_NAME || 'biar-document-processor';
    
    const processorConfig = validateProcessorConfig();
    this.logger = new LoggerService(processorConfig);

    this.config = {
      COUCHDB_URL: process.env.COUCHDB_URL || 'http://admin:password@localhost:5984',
      TIKA_URL: process.env.TIKA_URL || 'http://localhost:9998',
      SOLR_URL: process.env.SOLR_URL || 'http://localhost:8983/solr/biar_docs',
      NIFI_URL: process.env.NIFI_URL || 'http://localhost:8080',
      OZONE_URL: process.env.OZONE_URL || 'http://localhost:9878',
      OZONE_VOLUME: process.env.OZONE_VOLUME || 's3v',
      OZONE_BUCKET: process.env.OZONE_BUCKET || 'biar'
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
    const response = await axios.get(`${this.config.COUCHDB_URL}/biar_documents/_all_docs?include_docs=true`);
    
    return response.data.rows
      .map((row: any) => row.doc)
      .filter((doc: any) => doc._attachments && Object.keys(doc._attachments).length > 0);
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
      await this.sendToNifi(doc, text, metadata);
      await this.storeInOzone(doc, text, metadata);
      
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
      `${this.config.COUCHDB_URL}/biar_documents/${docId}/${filename}`,
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

  private async sendToNifi(doc: any, extractedText: string, metadata: any): Promise<void> {
    const payload = {
      documentId: doc._id,
      caseId: doc.CaseId || doc.caseId,
      taskId: doc.TaskId || doc.taskId,
      name: doc.Name || doc.name,
      extractedText,
      metadata,
      processedAt: new Date().toISOString(),
      source: 'biar-document-processor'
    };

    try {
      // Write file directly to NIFI's monitored directory
      const fs = require('fs');
      const fileName = `biar_doc_${doc._id}_${Date.now()}.json`;
      const localFilePath = `/tmp/${fileName}`;
      
      // Create file locally first
      fs.writeFileSync(localFilePath, JSON.stringify(payload, null, 2));
      
      // Copy to NIFI container using docker cp
      const { execSync } = require('child_process');
      execSync(`docker cp ${localFilePath} biar-nifi:/tmp/biar-documents/${fileName}`);
      
      // Clean up local file
      fs.unlinkSync(localFilePath);
      
      this.logger.log(`Successfully sent document ${doc._id} to NIFI as ${fileName}`, 'sendToNifi');
    } catch (error: any) {
      this.logger.log(`Failed to send to NIFI: ${error.message}`, 'sendToNifi');
    }
  }

  private async storeInOzone(doc: any, extractedText: string, metadata: any): Promise<void> {
    const documentData = {
      documentId: doc._id,
      caseId: doc.CaseId || doc.caseId,
      taskId: doc.TaskId || doc.taskId,
      name: doc.Name || doc.name,
      extractedText,
      metadata,
      processedAt: new Date().toISOString(),
      source: 'biar-document-processor',
      originalDocument: doc
    };

    try {
      // Store file directly in Ozone's storage directory
      const fs = require('fs');
      const fileName = `processed_doc_${doc._id}_${Date.now()}.json`;
      const localFilePath = `/tmp/${fileName}`;
      
      // Create file locally first
      fs.writeFileSync(localFilePath, JSON.stringify(documentData, null, 2));
      
      // Copy to Ozone container storage
      const { execSync } = require('child_process');
      execSync(`docker cp ${localFilePath} biar-ozone:/data/ozone/processed/${fileName}`);
      
      // Clean up local file
      fs.unlinkSync(localFilePath);

      this.logger.log(`Stored document ${doc._id} in Ozone as ${fileName}`, 'storeInOzone');
      
      // Also store original attachments if needed
      if (doc._attachments) {
        for (const [filename, attachment] of Object.entries(doc._attachments)) {
          await this.storeAttachmentInOzone(doc._id, filename, attachment as any);
        }
      }
    } catch (error: any) {
      this.logger.log(`Failed to store in Ozone: ${error.message}`, 'storeInOzone');
      // Continue processing even if Ozone storage fails
    }
  }

  private async storeAttachmentInOzone(docId: string, filename: string, attachment: any): Promise<void> {
    try {
      const attachmentResponse = await axios.get(
        `${this.config.COUCHDB_URL}/biar_documents/${docId}/${filename}`,
        { responseType: 'arraybuffer' }
      );
      
      const objectKey = `original-documents/${docId}/${filename}`;
      
      await axios.put(
        `${this.config.OZONE_URL}/s3v/${this.config.OZONE_VOLUME}/${this.config.OZONE_BUCKET}/${objectKey}`,
        attachmentResponse.data,
        {
          headers: {
            'Content-Type': attachment.content_type || 'application/octet-stream',
            'Content-Length': attachment.length
          },
          timeout: 20000
        }
      );

      this.logger.log(`Stored attachment ${filename} for document ${docId} in Ozone`, 'storeAttachmentInOzone');
    } catch (error: any) {
      this.logger.log(`Failed to store attachment ${filename}: ${error.message}`, 'storeAttachmentInOzone');
    }
  }

  private async updateDocumentStatus(documentId: string, status: string, errorMessage?: string): Promise<void> {
    const currentDoc = await axios.get(`${this.config.COUCHDB_URL}/biar_documents/${documentId}`);
    
    const updatedDoc = {
      ...currentDoc.data,
      processingStatus: status,
      lastProcessed: new Date().toISOString(),
      ...(errorMessage && { lastError: errorMessage })
    };

    await axios.put(
      `${this.config.COUCHDB_URL}/biar_documents/${documentId}`,
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