import axios from 'axios';

export class TikaService {
  private static instance: TikaService | null = null;
  private readonly baseUrl: string;
  private readonly timeout: number;

  private constructor() {
    this.baseUrl = process.env.TIKA_URL ?? 'http://localhost:9998';
    this.timeout = 120000;
  }

  static getInstance(): TikaService {
    TikaService.instance ??= new TikaService();
    return TikaService.instance;
  }

  async extract(fileBuffer: Buffer): Promise<{ text: string; metadata: Record<string, unknown> }> {
    const [text, metadata] = await Promise.all([
      this.extractText(fileBuffer),
      this.extractMetadata(fileBuffer),
    ]);
    return { text, metadata };
  }

  private async extractText(fileBuffer: Buffer): Promise<string> {
    const response = await axios.put(this.baseUrl + '/tika', fileBuffer, {
      headers: { Accept: 'text/plain', 'Content-Type': 'application/octet-stream' },
      timeout: this.timeout,
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
    });
    return typeof response.data === 'string' ? response.data : String(response.data);
  }

  private async extractMetadata(fileBuffer: Buffer): Promise<Record<string, unknown>> {
    const response = await axios.put(this.baseUrl + '/meta', fileBuffer, {
      headers: { Accept: 'application/json', 'Content-Type': 'application/octet-stream' },
      timeout: this.timeout,
    });
    return response.data;
  }
}
