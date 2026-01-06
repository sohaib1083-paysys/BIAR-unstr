export declare class TikaService {
    private static instance;
    private readonly baseUrl;
    private readonly timeout;
    private constructor();
    static getInstance(): TikaService;
    extract(fileBuffer: Buffer): Promise<{
        text: string;
        metadata: Record<string, unknown>;
    }>;
    private extractText;
    private extractMetadata;
}
//# sourceMappingURL=TikaService.d.ts.map