import axios from 'axios';

export class NiFiService {
  private static instance: NiFiService | null = null;
  private readonly baseUrl: string;

  private constructor() {
    this.baseUrl = process.env.NIFI_URL ?? 'http://localhost:8081';
  }

  static getInstance(): NiFiService {
    NiFiService.instance ??= new NiFiService();
    return NiFiService.instance;
  }

  async sendDocument(payload: Record<string, unknown>): Promise<void> {
    await axios.post(this.baseUrl + '/contentListener', payload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 30000,
    });
  }
}
