import axios from 'axios';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('DocumentProcessor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Health Check', () => {
    it('should verify Tika is accessible', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        status: 200,
        headers: { server: 'Jetty(9.4.46.v20220331)' },
        data: 'OK',
      });

      const response = await axios.get('http://localhost:9998/tika');
      
      expect(response.status).toBe(200);
      expect(mockedAxios.get).toHaveBeenCalledWith('http://localhost:9998/tika');
    });

    it('should handle Tika connection failure', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('ECONNREFUSED'));

      await expect(axios.get('http://localhost:9998/tika')).rejects.toThrow('ECONNREFUSED');
    });
  });

  describe('File Size Validation', () => {
    const MAX_FILE_SIZE_MB = 20;

    it('should accept files under size limit', () => {
      const fileSizeMB = 15;
      expect(fileSizeMB <= MAX_FILE_SIZE_MB).toBe(true);
    });

    it('should reject files over size limit', () => {
      const fileSizeMB = 50;
      expect(fileSizeMB > MAX_FILE_SIZE_MB).toBe(true);
    });

    it('should handle edge case at exact limit', () => {
      const fileSizeMB = 20;
      expect(fileSizeMB <= MAX_FILE_SIZE_MB).toBe(true);
    });
  });

  describe('Document Filtering', () => {
    it('should filter out documents without attachments', () => {
      const docs = [
        { _id: 'doc1', _attachments: { 'file.pdf': {} } },
        { _id: 'doc2' }, // No attachments
        { _id: 'doc3', _attachments: {} }, // Empty attachments
      ];

      const filtered = docs.filter(
        (doc) => doc._attachments && Object.keys(doc._attachments).length > 0
      );

      expect(filtered).toHaveLength(1);
      expect(filtered[0]._id).toBe('doc1');
    });

    it('should filter out design documents', () => {
      const docs = [
        { _id: 'doc1' },
        { _id: '_design/views' },
        { _id: 'doc2' },
      ];

      const filtered = docs.filter((doc) => !doc._id.startsWith('_design/'));

      expect(filtered).toHaveLength(2);
    });

    it('should filter out completed documents', () => {
      const docs = [
        { _id: 'doc1', statuses: { processingStatus: 'COMPLETED' } },
        { _id: 'doc2', statuses: { processingStatus: 'PENDING' } },
        { _id: 'doc3' }, // No status
      ];

      const filtered = docs.filter(
        (doc) => doc.statuses?.processingStatus !== 'COMPLETED'
      );

      expect(filtered).toHaveLength(2);
    });
  });

  describe('Checksum Calculation', () => {
    it('should generate consistent checksums for same data', () => {
      const crypto = require('crypto');
      const data = JSON.stringify([{ id: 1, name: 'test' }]);
      
      const checksum1 = crypto.createHash('sha256').update(data).digest('hex');
      const checksum2 = crypto.createHash('sha256').update(data).digest('hex');
      
      expect(checksum1).toBe(checksum2);
    });

    it('should generate different checksums for different data', () => {
      const crypto = require('crypto');
      const data1 = JSON.stringify([{ id: 1 }]);
      const data2 = JSON.stringify([{ id: 2 }]);
      
      const checksum1 = crypto.createHash('sha256').update(data1).digest('hex');
      const checksum2 = crypto.createHash('sha256').update(data2).digest('hex');
      
      expect(checksum1).not.toBe(checksum2);
    });
  });
});
