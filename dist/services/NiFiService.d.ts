export declare class NiFiService {
    private static instance;
    private readonly baseUrl;
    private constructor();
    static getInstance(): NiFiService;
    sendDocument(payload: Record<string, unknown>): Promise<void>;
}
//# sourceMappingURL=NiFiService.d.ts.map