import axios from 'axios';
import { setTimeout as sleep } from 'timers/promises';
import type { Configuration } from '../config';

interface CouchDBAllDocsResponse<T> {
  rows: Array<{ doc: T }>;
}

const DEFAULT_RETRIES = 3;
const RETRY_DELAY_MS = 100;
const HTTP_CONFLICT = 409;

export class CouchDBService {
  private static instance: CouchDBService | null = null;
  private readonly baseUrl: string;

  private constructor(config: Configuration) {
    this.baseUrl = config.COUCHDB_URL;
  }

  static getInstance(config: Configuration): CouchDBService {
    CouchDBService.instance ??= new CouchDBService(config);
    return CouchDBService.instance;
  }

  async getAllDocs<T>(includeDocs = true): Promise<T[]> {
    const response = await axios.get<CouchDBAllDocsResponse<T>>(this.baseUrl + '/_all_docs', {
      params: { include_docs: includeDocs },
    });
    return response.data.rows.map((row) => row.doc).filter((doc): doc is T => doc !== null);
  }

  async getDocument<T>(documentId: string): Promise<T> {
    const response = await axios.get<T>(this.baseUrl + '/' + documentId);
    return response.data;
  }

  async getAttachment(documentId: string, attachmentName: string): Promise<Buffer> {
    const response = await axios.get(this.baseUrl + '/' + documentId + '/' + encodeURIComponent(attachmentName), {
      responseType: 'arraybuffer',
    });
    return Buffer.from(response.data as ArrayBuffer);
  }

  async updateStatus(documentId: string, status: string, errorMessage?: string, retries = DEFAULT_RETRIES): Promise<void> {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
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
        return;
      } catch (error) {
        const isConflict = axios.isAxiosError(error) && error.response?.status === HTTP_CONFLICT;
        if (isConflict && attempt < retries) {
          await sleep(RETRY_DELAY_MS * attempt);
          continue;
        }
        throw error;
      }
    }
  }
}
