import { z } from 'zod';
export declare const ConfigSchema: z.ZodObject<{
    PORT: z.ZodDefault<z.ZodString>;
    NODE_ENV: z.ZodDefault<z.ZodEnum<{
        dev: "dev";
        production: "production";
        test: "test";
    }>>;
    COUCHDB_URL: z.ZodDefault<z.ZodString>;
    TIKA_URL: z.ZodDefault<z.ZodString>;
    SOLR_URL: z.ZodDefault<z.ZodString>;
}, z.core.$strip>;
export declare const DocumentParamsSchema: {
    params: {
        type: string;
        properties: {
            id: {
                type: string;
            };
        };
        required: string[];
    };
};
export declare const ExtractParamsSchema: {
    params: {
        type: string;
        properties: {
            id: {
                type: string;
            };
            filename: {
                type: string;
            };
        };
        required: string[];
    };
};
export declare const SearchQuerySchema: {
    querystring: {
        type: string;
        properties: {
            q: {
                type: string;
                default: string;
            };
            rows: {
                type: string;
                default: string;
            };
            start: {
                type: string;
                default: string;
            };
        };
    };
};
export type Config = z.infer<typeof ConfigSchema>;
//# sourceMappingURL=schemas.d.ts.map