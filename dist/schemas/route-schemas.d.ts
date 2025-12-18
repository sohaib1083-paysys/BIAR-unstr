import { z } from 'zod';
export declare const DocumentParamsSchema: z.ZodObject<{
    id: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
}, {
    id: string;
}>;
export declare const FileParamsSchema: z.ZodObject<{
    id: z.ZodString;
    filename: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    filename: string;
}, {
    id: string;
    filename: string;
}>;
export declare const SearchQuerySchema: z.ZodObject<{
    q: z.ZodDefault<z.ZodString>;
    rows: z.ZodEffects<z.ZodDefault<z.ZodString>, number, string | undefined>;
    start: z.ZodEffects<z.ZodDefault<z.ZodString>, number, string | undefined>;
}, "strip", z.ZodTypeAny, {
    q: string;
    rows: number;
    start: number;
}, {
    q?: string | undefined;
    rows?: string | undefined;
    start?: string | undefined;
}>;
export declare const HealthCheckRouteSchema: {
    response: {
        200: {
            type: string;
            properties: {
                success: {
                    type: string;
                };
                status: {
                    type: string;
                };
                timestamp: {
                    type: string;
                };
                services: {
                    type: string;
                    properties: {
                        couchdb: {
                            type: string;
                        };
                        tika: {
                            type: string;
                        };
                        solr: {
                            type: string;
                        };
                    };
                    required: string[];
                };
            };
            required: string[];
        };
        500: {
            type: string;
            properties: {
                success: {
                    type: string;
                };
                error: {
                    type: string;
                };
                timestamp: {
                    type: string;
                };
            };
            required: string[];
        };
    };
};
export declare const GetDocumentsRouteSchema: {
    response: {
        200: {
            type: string;
            properties: {
                success: {
                    type: string;
                };
                total: {
                    type: string;
                };
                documents: {
                    type: string;
                    items: {
                        type: string;
                        properties: {
                            id: {
                                type: string;
                            };
                            caseId: {
                                type: string;
                            };
                            taskId: {
                                type: string;
                            };
                            name: {
                                type: string;
                            };
                            checksum: {
                                type: string;
                            };
                            uploadedAt: {
                                type: string;
                            };
                            type: {
                                type: string;
                            };
                            metadata: {
                                type: string;
                            };
                            hasAttachments: {
                                type: string;
                            };
                            attachments: {
                                type: string;
                                items: {
                                    type: string;
                                };
                            };
                        };
                    };
                };
                timestamp: {
                    type: string;
                };
            };
            required: string[];
        };
        500: {
            type: string;
            properties: {
                success: {
                    type: string;
                };
                error: {
                    type: string;
                };
                timestamp: {
                    type: string;
                };
            };
            required: string[];
        };
    };
};
export declare const GetDocumentByIdRouteSchema: {
    params: {
        type: string;
        properties: {
            id: {
                type: string;
            };
        };
        required: string[];
    };
    response: {
        200: {
            type: string;
            properties: {
                success: {
                    type: string;
                };
                document: {
                    type: string;
                    properties: {
                        id: {
                            type: string;
                        };
                        caseId: {
                            type: string;
                        };
                        taskId: {
                            type: string;
                        };
                        name: {
                            type: string;
                        };
                        checksum: {
                            type: string;
                        };
                        uploadedAt: {
                            type: string;
                        };
                        type: {
                            type: string;
                        };
                        metadata: {
                            type: string;
                        };
                        hasAttachments: {
                            type: string;
                        };
                        attachments: {
                            type: string;
                            items: {
                                type: string;
                            };
                        };
                    };
                };
                timestamp: {
                    type: string;
                };
            };
            required: string[];
        };
        404: {
            type: string;
            properties: {
                success: {
                    type: string;
                };
                error: {
                    type: string;
                };
                timestamp: {
                    type: string;
                };
            };
            required: string[];
        };
        500: {
            type: string;
            properties: {
                success: {
                    type: string;
                };
                error: {
                    type: string;
                };
                timestamp: {
                    type: string;
                };
            };
            required: string[];
        };
    };
};
export declare const DownloadDocumentRouteSchema: {
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
    response: {
        404: {
            type: string;
            properties: {
                success: {
                    type: string;
                };
                error: {
                    type: string;
                };
                timestamp: {
                    type: string;
                };
            };
            required: string[];
        };
        500: {
            type: string;
            properties: {
                success: {
                    type: string;
                };
                error: {
                    type: string;
                };
                timestamp: {
                    type: string;
                };
            };
            required: string[];
        };
    };
};
export declare const GetDocumentAttachmentsRouteSchema: {
    params: {
        type: string;
        properties: {
            id: {
                type: string;
            };
        };
        required: string[];
    };
    response: {
        200: {
            type: string;
            properties: {
                success: {
                    type: string;
                };
                documentId: {
                    type: string;
                };
                attachments: {
                    type: string;
                    items: {
                        type: string;
                        properties: {
                            name: {
                                type: string;
                            };
                            content_type: {
                                type: string;
                            };
                            revpos: {
                                type: string;
                            };
                            digest: {
                                type: string;
                            };
                            length: {
                                type: string;
                            };
                            stub: {
                                type: string;
                            };
                        };
                    };
                };
                timestamp: {
                    type: string;
                };
            };
            required: string[];
        };
        404: {
            type: string;
            properties: {
                success: {
                    type: string;
                };
                error: {
                    type: string;
                };
                timestamp: {
                    type: string;
                };
            };
            required: string[];
        };
        500: {
            type: string;
            properties: {
                success: {
                    type: string;
                };
                error: {
                    type: string;
                };
                timestamp: {
                    type: string;
                };
            };
            required: string[];
        };
    };
};
export declare const ExtractTextRouteSchema: {
    params: {
        type: string;
        properties: {
            id: {
                type: string;
            };
        };
        required: string[];
    };
    response: {
        200: {
            type: string;
            properties: {
                success: {
                    type: string;
                };
                documentId: {
                    type: string;
                };
                extractedTextLength: {
                    type: string;
                };
                contentType: {
                    type: string;
                };
                indexed: {
                    type: string;
                };
                extractedText: {
                    type: string;
                };
                metadata: {
                    type: string;
                };
                timestamp: {
                    type: string;
                };
            };
            required: string[];
        };
        400: {
            type: string;
            properties: {
                success: {
                    type: string;
                };
                error: {
                    type: string;
                };
                timestamp: {
                    type: string;
                };
            };
            required: string[];
        };
        500: {
            type: string;
            properties: {
                success: {
                    type: string;
                };
                error: {
                    type: string;
                };
                timestamp: {
                    type: string;
                };
            };
            required: string[];
        };
    };
};
export declare const ProcessDocumentRouteSchema: {
    params: {
        type: string;
        properties: {
            id: {
                type: string;
            };
        };
        required: string[];
    };
    response: {
        200: {
            type: string;
            properties: {
                success: {
                    type: string;
                };
                documentId: {
                    type: string;
                };
                extractedTextLength: {
                    type: string;
                };
                contentType: {
                    type: string;
                };
                indexed: {
                    type: string;
                };
                extractedText: {
                    type: string;
                };
                metadata: {
                    type: string;
                };
                timestamp: {
                    type: string;
                };
            };
            required: string[];
        };
        400: {
            type: string;
            properties: {
                success: {
                    type: string;
                };
                error: {
                    type: string;
                };
                timestamp: {
                    type: string;
                };
            };
            required: string[];
        };
        500: {
            type: string;
            properties: {
                success: {
                    type: string;
                };
                error: {
                    type: string;
                };
                timestamp: {
                    type: string;
                };
            };
            required: string[];
        };
    };
};
export declare const SearchRouteSchema: {
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
    response: {
        200: {
            type: string;
            properties: {
                success: {
                    type: string;
                };
                query: {
                    type: string;
                };
                total: {
                    type: string;
                };
                start: {
                    type: string;
                };
                rows: {
                    type: string;
                };
                documents: {
                    type: string;
                    items: {
                        type: string;
                    };
                };
                timestamp: {
                    type: string;
                };
            };
            required: string[];
        };
        500: {
            type: string;
            properties: {
                success: {
                    type: string;
                };
                error: {
                    type: string;
                };
                timestamp: {
                    type: string;
                };
            };
            required: string[];
        };
    };
};
export type DocumentParams = z.infer<typeof DocumentParamsSchema>;
export type FileParams = z.infer<typeof FileParamsSchema>;
export type SearchQuery = z.infer<typeof SearchQuerySchema>;
//# sourceMappingURL=route-schemas.d.ts.map