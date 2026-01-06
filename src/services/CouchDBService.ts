import axios from 'axios';

export class CouchDBService {
  private static instance: CouchDBService | null = null;
  private readonly baseUrl: string;

  private constructor() {
    this.baseUrl = process.env.COUCHDB_URL ?? 'http://localhost:5984/cms-evidence';
  }

  static getInstance(): CouchDBService {
    CouchDBService.instance ??= new CouchDBService();
    return CouchDBService.instance;
  }

  async getAllDocs<T>(includeDocs = true): Promise<T[]> {
    const response = await axios.get(this.baseUrl + '/_all_docs', {
      params: { include_docs: includeDocs },
    });
    return response.data.rows.map((row: { doc: T }) => row.doc).filter((doc: T | null) => doc !== null);
  }

  async getDocument<T>(documentId: string): Promise<T> {
    const response = await axios.get(this.baseUrl + '/' + documentId);
    return response.data;
  }

  async getAttachment(documentId: string, attachmentName: string): Promise<Buffer> {
    const response = await axios.get(this.baseUrl + '/' + documentId + '/' + encodeURIComponent(attachmentName), {
      responseType: 'arraybuffer',
    });
    return Buffer.from(response.data);
  }

  async updateStatus(documentId: string, status: string, errorMessage?: string): Promise<void> {
    const currentDoc = await this.getDocument<Record<string, unknown>>(documentId);
    const updatedDoc = {
      ...currentDoc,
      processingStatus: status,
      processedAt: new Date().toISOString(),
      ...(errorMessage && { lastError: errorMessage }),
    };
    await axios.put(this.baseUrl + '/' + documentId, updatedDoc, {
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
