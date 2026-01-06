export interface ISolrDocument {
  id: string;
  evidenceId: string;
  taskId: string;
  evidenceType: string;
  fileName: string;
  content: string;
  contentType: string;
  uploadedAt: string;
  extractedAt: string;
  textLength: number;
  processingStatus: string;
}
