"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SearchRouteSchema = exports.ProcessDocumentRouteSchema = exports.ExtractTextRouteSchema = exports.GetDocumentAttachmentsRouteSchema = exports.DownloadDocumentRouteSchema = exports.GetDocumentByIdRouteSchema = exports.GetDocumentsRouteSchema = exports.HealthCheckRouteSchema = exports.SearchQuerySchema = exports.FileParamsSchema = exports.DocumentParamsSchema = void 0;
const zod_1 = require("zod");
exports.DocumentParamsSchema = zod_1.z.object({
    id: zod_1.z.string().min(1, 'Document ID is required'),
});
exports.FileParamsSchema = zod_1.z.object({
    id: zod_1.z.string().min(1, 'Document ID is required'),
    filename: zod_1.z.string().min(1, 'Filename is required'),
});
exports.SearchQuerySchema = zod_1.z.object({
    q: zod_1.z.string().default('*:*'),
    rows: zod_1.z.string().regex(/^\d+$/).default('10').transform(Number),
    start: zod_1.z.string().regex(/^\d+$/).default('0').transform(Number),
});
exports.HealthCheckRouteSchema = {
    response: {
        200: {
            type: 'object',
            properties: {
                success: { type: 'boolean' },
                status: { type: 'string' },
                timestamp: { type: 'string' },
                services: {
                    type: 'object',
                    properties: {
                        couchdb: { type: 'string' },
                        tika: { type: 'string' },
                        solr: { type: 'string' }
                    },
                    required: ['couchdb', 'tika', 'solr']
                }
            },
            required: ['success', 'status', 'timestamp', 'services']
        },
        500: {
            type: 'object',
            properties: {
                success: { type: 'boolean' },
                error: { type: 'string' },
                timestamp: { type: 'string' }
            },
            required: ['success', 'error', 'timestamp']
        }
    }
};
exports.GetDocumentsRouteSchema = {
    response: {
        200: {
            type: 'object',
            properties: {
                success: { type: 'boolean' },
                total: { type: 'number' },
                documents: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            id: { type: 'string' },
                            caseId: { type: 'string' },
                            taskId: { type: 'string' },
                            name: { type: 'string' },
                            checksum: { type: 'string' },
                            uploadedAt: { type: 'string' },
                            type: { type: 'string' },
                            metadata: { type: 'object' },
                            hasAttachments: { type: 'boolean' },
                            attachments: { type: 'array', items: { type: 'string' } }
                        }
                    }
                },
                timestamp: { type: 'string' }
            },
            required: ['success', 'total', 'documents', 'timestamp']
        },
        500: {
            type: 'object',
            properties: {
                success: { type: 'boolean' },
                error: { type: 'string' },
                timestamp: { type: 'string' }
            },
            required: ['success', 'error', 'timestamp']
        }
    }
};
exports.GetDocumentByIdRouteSchema = {
    params: {
        type: 'object',
        properties: {
            id: { type: 'string' }
        },
        required: ['id']
    },
    response: {
        200: {
            type: 'object',
            properties: {
                success: { type: 'boolean' },
                document: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                        caseId: { type: 'string' },
                        taskId: { type: 'string' },
                        name: { type: 'string' },
                        checksum: { type: 'string' },
                        uploadedAt: { type: 'string' },
                        type: { type: 'string' },
                        metadata: { type: 'object' },
                        hasAttachments: { type: 'boolean' },
                        attachments: { type: 'array', items: { type: 'string' } }
                    }
                },
                timestamp: { type: 'string' }
            },
            required: ['success', 'document', 'timestamp']
        },
        404: {
            type: 'object',
            properties: {
                success: { type: 'boolean' },
                error: { type: 'string' },
                timestamp: { type: 'string' }
            },
            required: ['success', 'error', 'timestamp']
        },
        500: {
            type: 'object',
            properties: {
                success: { type: 'boolean' },
                error: { type: 'string' },
                timestamp: { type: 'string' }
            },
            required: ['success', 'error', 'timestamp']
        }
    }
};
exports.DownloadDocumentRouteSchema = {
    params: {
        type: 'object',
        properties: {
            id: { type: 'string' },
            filename: { type: 'string' }
        },
        required: ['id']
    },
    response: {
        404: {
            type: 'object',
            properties: {
                success: { type: 'boolean' },
                error: { type: 'string' },
                timestamp: { type: 'string' }
            },
            required: ['success', 'error', 'timestamp']
        },
        500: {
            type: 'object',
            properties: {
                success: { type: 'boolean' },
                error: { type: 'string' },
                timestamp: { type: 'string' }
            },
            required: ['success', 'error', 'timestamp']
        }
    }
};
exports.GetDocumentAttachmentsRouteSchema = {
    params: {
        type: 'object',
        properties: {
            id: { type: 'string' }
        },
        required: ['id']
    },
    response: {
        200: {
            type: 'object',
            properties: {
                success: { type: 'boolean' },
                documentId: { type: 'string' },
                attachments: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            name: { type: 'string' },
                            content_type: { type: 'string' },
                            revpos: { type: 'number' },
                            digest: { type: 'string' },
                            length: { type: 'number' },
                            stub: { type: 'boolean' }
                        }
                    }
                },
                timestamp: { type: 'string' }
            },
            required: ['success', 'documentId', 'attachments', 'timestamp']
        },
        404: {
            type: 'object',
            properties: {
                success: { type: 'boolean' },
                error: { type: 'string' },
                timestamp: { type: 'string' }
            },
            required: ['success', 'error', 'timestamp']
        },
        500: {
            type: 'object',
            properties: {
                success: { type: 'boolean' },
                error: { type: 'string' },
                timestamp: { type: 'string' }
            },
            required: ['success', 'error', 'timestamp']
        }
    }
};
exports.ExtractTextRouteSchema = {
    params: {
        type: 'object',
        properties: {
            id: { type: 'string' }
        },
        required: ['id']
    },
    response: {
        200: {
            type: 'object',
            properties: {
                success: { type: 'boolean' },
                documentId: { type: 'string' },
                extractedTextLength: { type: 'number' },
                contentType: { type: 'string' },
                indexed: { type: 'boolean' },
                extractedText: { type: 'string' },
                metadata: { type: 'object' },
                timestamp: { type: 'string' }
            },
            required: ['success', 'documentId', 'extractedTextLength', 'contentType', 'indexed', 'extractedText', 'metadata', 'timestamp']
        },
        400: {
            type: 'object',
            properties: {
                success: { type: 'boolean' },
                error: { type: 'string' },
                timestamp: { type: 'string' }
            },
            required: ['success', 'error', 'timestamp']
        },
        500: {
            type: 'object',
            properties: {
                success: { type: 'boolean' },
                error: { type: 'string' },
                timestamp: { type: 'string' }
            },
            required: ['success', 'error', 'timestamp']
        }
    }
};
exports.ProcessDocumentRouteSchema = {
    params: {
        type: 'object',
        properties: {
            id: { type: 'string' }
        },
        required: ['id']
    },
    response: {
        200: {
            type: 'object',
            properties: {
                success: { type: 'boolean' },
                documentId: { type: 'string' },
                extractedTextLength: { type: 'number' },
                contentType: { type: 'string' },
                indexed: { type: 'boolean' },
                extractedText: { type: 'string' },
                metadata: { type: 'object' },
                timestamp: { type: 'string' }
            },
            required: ['success', 'documentId', 'extractedTextLength', 'contentType', 'indexed', 'extractedText', 'metadata', 'timestamp']
        },
        400: {
            type: 'object',
            properties: {
                success: { type: 'boolean' },
                error: { type: 'string' },
                timestamp: { type: 'string' }
            },
            required: ['success', 'error', 'timestamp']
        },
        500: {
            type: 'object',
            properties: {
                success: { type: 'boolean' },
                error: { type: 'string' },
                timestamp: { type: 'string' }
            },
            required: ['success', 'error', 'timestamp']
        }
    }
};
exports.SearchRouteSchema = {
    querystring: {
        type: 'object',
        properties: {
            q: { type: 'string', default: '*:*' },
            rows: { type: 'string', default: '10' },
            start: { type: 'string', default: '0' }
        }
    },
    response: {
        200: {
            type: 'object',
            properties: {
                success: { type: 'boolean' },
                query: { type: 'string' },
                total: { type: 'number' },
                start: { type: 'number' },
                rows: { type: 'number' },
                documents: { type: 'array', items: { type: 'object' } },
                timestamp: { type: 'string' }
            },
            required: ['success', 'query', 'total', 'start', 'rows', 'documents', 'timestamp']
        },
        500: {
            type: 'object',
            properties: {
                success: { type: 'boolean' },
                error: { type: 'string' },
                timestamp: { type: 'string' }
            },
            required: ['success', 'error', 'timestamp']
        }
    }
};
//# sourceMappingURL=route-schemas.js.map