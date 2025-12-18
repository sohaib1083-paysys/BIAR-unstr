"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocumentController = void 0;
class DocumentController {
    fastify;
    serviceClient;
    config;
    constructor(fastify, serviceClient, config) {
        this.fastify = fastify;
        this.serviceClient = serviceClient;
        this.config = config;
    }
    async registerRoutes() {
        this.fastify.get('/health', {
            schema: {
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
                                    solr: { type: 'string' },
                                },
                            },
                        },
                    },
                },
            },
        }, this.healthCheck.bind(this));
        this.fastify.get('/documents', {
            schema: {
                response: {
                    200: {
                        type: 'object',
                        properties: {
                            success: { type: 'boolean' },
                            total: { type: 'number' },
                            documents: { type: 'array' },
                            timestamp: { type: 'string' },
                        },
                    },
                },
            },
        }, this.getAllDocuments.bind(this));
        this.fastify.get('/documents/:id', {
            schema: {
                params: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                    },
                    required: ['id'],
                },
            },
        }, this.getDocument.bind(this));
        this.fastify.get('/documents/:id/files/:filename', {
            schema: {
                params: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                        filename: { type: 'string' },
                    },
                    required: ['id', 'filename'],
                },
            },
        }, this.downloadFile.bind(this));
        this.fastify.post('/documents/:id/extract', {
            schema: {
                params: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                    },
                    required: ['id'],
                },
            },
        }, this.extractAndIndex.bind(this));
        this.fastify.get('/search', {
            schema: {
                querystring: {
                    type: 'object',
                    properties: {
                        q: { type: 'string', default: '*:*' },
                        rows: { type: 'string', default: '10' },
                        start: { type: 'string', default: '0' },
                    },
                },
            },
        }, this.searchDocuments.bind(this));
        this.fastify.get('/search/cases/:caseId', {
            schema: {
                params: {
                    type: 'object',
                    properties: {
                        caseId: { type: 'string' },
                    },
                    required: ['caseId'],
                },
            },
        }, this.searchByCase.bind(this));
    }
    async healthCheck(_request, reply) {
        try {
            const [couchdbHealth, tikaHealth, solrHealth] = await Promise.all([
                this.serviceClient.checkServiceHealth(`${this.config.COUCHDB_URL}/_up`),
                this.serviceClient.checkServiceHealth(`${this.config.TIKA_URL}/version`),
                this.serviceClient.checkServiceHealth(`${this.config.SOLR_URL}/admin/ping`),
            ]);
            reply.send({
                success: true,
                status: 'healthy',
                timestamp: new Date().toISOString(),
                services: {
                    couchdb: couchdbHealth ? 'healthy' : 'unhealthy',
                    tika: tikaHealth ? 'healthy' : 'unhealthy',
                    solr: solrHealth ? 'healthy' : 'unhealthy',
                },
            });
        }
        catch (error) {
            reply.status(500).send({
                success: false,
                error: 'Health check failed',
                timestamp: new Date().toISOString(),
            });
        }
    }
    async getAllDocuments(_request, reply) {
        try {
            const data = await this.serviceClient.getAllCouchDBDocuments();
            const documents = data.rows.map((row) => {
                const doc = row.doc;
                return {
                    id: doc._id,
                    caseId: doc.CaseId,
                    taskId: doc.TaskId,
                    name: doc.Name,
                    checksum: doc.Checksum,
                    uploadedAt: doc.UploadedAt,
                    type: doc.Type,
                    metadata: doc.Metadata || {},
                    hasAttachments: !!doc._attachments,
                    attachments: doc._attachments ? Object.keys(doc._attachments) : [],
                };
            });
            reply.send({
                success: true,
                total: documents.length,
                documents,
                timestamp: new Date().toISOString(),
            });
        }
        catch (error) {
            reply.status(500).send({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                timestamp: new Date().toISOString(),
            });
        }
    }
    async getDocument(request, reply) {
        try {
            const doc = await this.serviceClient.getCouchDBDocument(request.params.id);
            reply.send({
                success: true,
                document: {
                    id: doc._id,
                    caseId: doc.CaseId,
                    taskId: doc.TaskId,
                    name: doc.Name,
                    checksum: doc.Checksum,
                    uploadedAt: doc.UploadedAt,
                    type: doc.Type,
                    metadata: doc.Metadata || {},
                    hasAttachments: !!doc._attachments,
                    attachments: doc._attachments ? Object.keys(doc._attachments) : [],
                },
                timestamp: new Date().toISOString(),
            });
        }
        catch (error) {
            if (error.response?.status === 404) {
                reply.status(404).send({
                    success: false,
                    error: 'Document not found',
                    timestamp: new Date().toISOString(),
                });
            }
            else {
                reply.status(500).send({
                    success: false,
                    error: error.message || 'Unknown error',
                    timestamp: new Date().toISOString(),
                });
            }
        }
    }
    async downloadFile(request, reply) {
        try {
            const buffer = await this.serviceClient.downloadAttachment(request.params.id, request.params.filename);
            reply
                .type('application/octet-stream')
                .header('Content-Disposition', `attachment; filename="${request.params.filename}"`)
                .send(buffer);
        }
        catch (error) {
            if (error.response?.status === 404) {
                reply.status(404).send({
                    success: false,
                    error: 'File not found',
                    timestamp: new Date().toISOString(),
                });
            }
            else {
                reply.status(500).send({
                    success: false,
                    error: error.message || 'Unknown error',
                    timestamp: new Date().toISOString(),
                });
            }
        }
    }
    async extractAndIndex(request, reply) {
        try {
            const doc = await this.serviceClient.getCouchDBDocument(request.params.id);
            if (!doc._attachments) {
                reply.status(400).send({
                    success: false,
                    error: 'Document has no attachments',
                    timestamp: new Date().toISOString(),
                });
                return;
            }
            const attachmentName = Object.keys(doc._attachments)[0];
            const fileBuffer = await this.serviceClient.downloadAttachment(request.params.id, attachmentName);
            const [extractedText, metadata] = await Promise.all([
                this.serviceClient.extractTextWithTika(fileBuffer),
                this.serviceClient.extractMetadataWithTika(fileBuffer),
            ]);
            const solrDoc = {
                id: request.params.id,
                caseId: doc.CaseId,
                taskId: doc.TaskId,
                name: doc.Name,
                content: extractedText,
                contentType: metadata['Content-Type'] || 'unknown',
                uploadedAt: doc.UploadedAt,
                extractedAt: new Date().toISOString(),
                textLength: extractedText.length,
            };
            await this.serviceClient.indexDocumentInSolr(solrDoc);
            reply.send({
                success: true,
                documentId: request.params.id,
                extractedTextLength: extractedText.length,
                contentType: metadata['Content-Type'],
                indexed: true,
                extractedText,
                metadata,
                timestamp: new Date().toISOString(),
            });
        }
        catch (error) {
            reply.status(500).send({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                timestamp: new Date().toISOString(),
            });
        }
    }
    async searchDocuments(request, reply) {
        try {
            const query = request.query.q || '*:*';
            const rows = parseInt(request.query.rows || '10');
            const start = parseInt(request.query.start || '0');
            const data = await this.serviceClient.searchInSolr(query, rows, start);
            reply.send({
                success: true,
                query,
                total: data.response.numFound,
                start,
                rows,
                documents: data.response.docs,
                timestamp: new Date().toISOString(),
            });
        }
        catch (error) {
            reply.status(500).send({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                timestamp: new Date().toISOString(),
            });
        }
    }
    async searchByCase(request, reply) {
        try {
            const query = `caseId:"${request.params.caseId}"`;
            const data = await this.serviceClient.searchInSolr(query, 100, 0);
            reply.send({
                success: true,
                caseId: request.params.caseId,
                total: data.response.numFound,
                documents: data.response.docs,
                timestamp: new Date().toISOString(),
            });
        }
        catch (error) {
            reply.status(500).send({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                timestamp: new Date().toISOString(),
            });
        }
    }
}
exports.DocumentController = DocumentController;
//# sourceMappingURL=controllers.js.map