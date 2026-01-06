import axios from 'axios';

export class SolrService {
  private static instance: SolrService | null = null;
  private readonly baseUrl: string;

  private constructor() {
    this.baseUrl = process.env.SOLR_URL ?? 'http://localhost:8983/solr/biar_docs';
  }

  static getInstance(): SolrService {
    SolrService.instance ??= new SolrService();
    return SolrService.instance;
  }

  async indexDocument(document: Record<string, unknown>): Promise<void> {
    await axios.post(this.baseUrl + '/update/json/docs?commit=true', [document], {
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
