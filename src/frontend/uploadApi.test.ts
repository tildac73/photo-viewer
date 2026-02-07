import { describe, it, expect, vi, beforeEach } from 'vitest';
import { uploadApi, PresignResponse, FinaliseUploadData } from './uploadApi';

// Mock fetch globally
const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

// Helper to create a mock File
function createMockFile(name: string, type: string, size: number = 1024): File {
    const content = new Array(size).fill('a').join('');
    return new File([content], name, { type });
}

describe('UploadApi', () => {
    beforeEach(() => {
        mockFetch.mockClear();
    });

    describe('getPresignedUrl', () => {
        it('should fetch a presigned URL for upload', async () => {
            const mockResponse: PresignResponse = {
                presign_url: 'https://s3.amazonaws.com/presigned-url',
                object_name: 'abc123.jpg'
            };

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockResponse)
            });

            const result = await uploadApi.getPresignedUrl('image/jpeg');

            expect(mockFetch).toHaveBeenCalledWith(
                '/api/photos/presign?content_type=image%2Fjpeg'
            );
            expect(result).toEqual(mockResponse);
        });

        it('should throw error on failure', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 500,
                text: () => Promise.resolve('Server error')
            });

            await expect(uploadApi.getPresignedUrl('image/jpeg')).rejects.toThrow(
                'Failed to get presigned URL: 500 Server error'
            );
        });
    });

    describe('uploadToStorage', () => {
        it('should upload file to presigned URL', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true
            });

            const file = createMockFile('test.jpg', 'image/jpeg');

            await uploadApi.uploadToStorage('https://s3.example.com/upload-url', file);

            expect(mockFetch).toHaveBeenCalledWith('https://s3.example.com/upload-url', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'image/jpeg'
                },
                body: file
            });
        });

        it('should throw error on upload failure', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 403,
                text: () => Promise.resolve('Access denied')
            });

            const file = createMockFile('test.jpg', 'image/jpeg');

            await expect(
                uploadApi.uploadToStorage('https://s3.example.com/upload-url', file)
            ).rejects.toThrow('Failed to upload to storage: 403 Access denied');
        });
    });

    describe('finaliseUpload', () => {
        it('should finalize upload with all fields', async () => {
            const mockResult = {
                id: 1,
                file_path: 'abc123.jpg',
                tags: 'summer,beach',
                alt_text: 'A photo'
            };

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockResult)
            });

            const data: FinaliseUploadData = {
                file_name: 'abc123.jpg',
                tags: 'summer,beach',
                alt_text: 'A photo'
            };

            const result = await uploadApi.finaliseUpload(data);

            expect(mockFetch).toHaveBeenCalledWith('/api/upload/', {
                method: 'POST',
                body: expect.any(FormData)
            });
            expect(result).toEqual(mockResult);
        });

        it('should finalize upload with only required fields', async () => {
            const mockResult = {
                id: 1,
                file_path: 'abc123.jpg',
                tags: null,
                alt_text: null
            };

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockResult)
            });

            const data: FinaliseUploadData = {
                file_name: 'abc123.jpg'
            };

            const result = await uploadApi.finaliseUpload(data);

            expect(result).toEqual(mockResult);
        });

        it('should throw error on finalize failure', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 400,
                text: () => Promise.resolve('No file provided')
            });

            const data: FinaliseUploadData = {
                file_name: ''
            };

            await expect(uploadApi.finaliseUpload(data)).rejects.toThrow(
                'Failed to finalize upload: 400 No file provided'
            );
        });
    });

    describe('uploadFile', () => {
        it('should complete full upload workflow successfully', async () => {
            // Mock presigned URL response
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({
                    presign_url: 'https://s3.example.com/upload-url',
                    object_name: 'abc123.jpg'
                })
            });

            // Mock S3 upload
            mockFetch.mockResolvedValueOnce({
                ok: true
            });

            // Mock finalize
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({
                    id: 1,
                    file_path: 'abc123.jpg',
                    tags: 'summer',
                    alt_text: 'Beach photo'
                })
            });

            const file = createMockFile('test.jpg', 'image/jpeg');
            const result = await uploadApi.uploadFile(file, 'summer', 'Beach photo');

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                id: 1,
                file_path: 'abc123.jpg',
                tags: 'summer',
                alt_text: 'Beach photo'
            });
            expect(mockFetch).toHaveBeenCalledTimes(3);
        });

        it('should return error when presigned URL fetch fails', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 500,
                text: () => Promise.resolve('Server error')
            });

            const file = createMockFile('test.jpg', 'image/jpeg');
            const result = await uploadApi.uploadFile(file);

            expect(result.success).toBe(false);
            expect(result.error).toContain('Failed to get presigned URL');
        });

        it('should return error when S3 upload fails', async () => {
            // Mock presigned URL success
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({
                    presign_url: 'https://s3.example.com/upload-url',
                    object_name: 'abc123.jpg'
                })
            });

            // Mock S3 upload failure
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 403,
                text: () => Promise.resolve('Access denied')
            });

            const file = createMockFile('test.jpg', 'image/jpeg');
            const result = await uploadApi.uploadFile(file);

            expect(result.success).toBe(false);
            expect(result.error).toContain('Failed to upload to storage');
        });

        it('should return error when finalize fails', async () => {
            // Mock presigned URL success
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({
                    presign_url: 'https://s3.example.com/upload-url',
                    object_name: 'abc123.jpg'
                })
            });

            // Mock S3 upload success
            mockFetch.mockResolvedValueOnce({
                ok: true
            });

            // Mock finalize failure
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 500,
                text: () => Promise.resolve('Database error')
            });

            const file = createMockFile('test.jpg', 'image/jpeg');
            const result = await uploadApi.uploadFile(file);

            expect(result.success).toBe(false);
            expect(result.error).toContain('Failed to finalize upload');
        });

        it('should handle upload without optional parameters', async () => {
            // Mock presigned URL response
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({
                    presign_url: 'https://s3.example.com/upload-url',
                    object_name: 'abc123.jpg'
                })
            });

            // Mock S3 upload
            mockFetch.mockResolvedValueOnce({
                ok: true
            });

            // Mock finalize
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({
                    id: 1,
                    file_path: 'abc123.jpg',
                    tags: null,
                    alt_text: null
                })
            });

            const file = createMockFile('test.jpg', 'image/jpeg');
            const result = await uploadApi.uploadFile(file);

            expect(result.success).toBe(true);
            expect(result.data.tags).toBeNull();
            expect(result.data.alt_text).toBeNull();
        });
    });
});
