"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocumentHandler = void 0;
class DocumentHandler {
    serviceClient;
    constructor(serviceClient) {
        this.serviceClient = serviceClient;
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
    async getDocumentById(request, reply) {
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
    async getDocumentAttachments(request, reply) {
        try {
            const doc = await this.serviceClient.getCouchDBDocument(request.params.id);
            const attachments = doc._attachments ? Object.keys(doc._attachments).map(name => ({
                name,
                ...doc._attachments[name]
            })) : [];
            reply.send({
                success: true,
                documentId: request.params.id,
                attachments,
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
    async extractText(request, reply) {
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
            const filename = request.params.filename;
            if (!doc._attachments[filename]) {
                reply.status(404).send({
                    success: false,
                    error: `Attachment '${filename}' not found`,
                    timestamp: new Date().toISOString(),
                });
                return;
            }
            const { text, metadata } = await this.serviceClient.extractTextDirectly(request.params.id, filename);
            reply.send({
                success: true,
                documentId: request.params.id,
                filename,
                extractedTextLength: text.length,
                contentType: metadata['Content-Type'],
                extractedText: text,
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
}
exports.DocumentHandler = DocumentHandler;
//# sourceMappingURL=document.handler.js.map