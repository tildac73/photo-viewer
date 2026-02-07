import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useUpload } from './useUpload';
import { uploadApi } from './uploadApi';

// Mock the uploadApi module
vi.mock('./uploadApi', () => ({
    uploadApi: {
        uploadFile: vi.fn()
    }
}));

// Helper to create a mock File
function createMockFile(name: string, type: string): File {
    return new File(['test content'], name, { type });
}

describe('useUpload', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should initialize with default state', () => {
        const { result } = renderHook(() => useUpload());

        expect(result.current.isLoading).toBe(false);
        expect(result.current.error).toBeNull();
        expect(result.current.success).toBe(false);
        expect(typeof result.current.upload).toBe('function');
    });

    it('should set isLoading to true while uploading', async () => {
        let resolveUpload: (value: any) => void;
        const uploadPromise = new Promise((resolve) => {
            resolveUpload = resolve;
        });

        vi.mocked(uploadApi.uploadFile).mockReturnValue(uploadPromise as any);

        const { result } = renderHook(() => useUpload());
        const file = createMockFile('test.jpg', 'image/jpeg');

        act(() => {
            result.current.upload({ file });
        });

        expect(result.current.isLoading).toBe(true);

        await act(async () => {
            resolveUpload!({ success: true, data: {} });
        });

        expect(result.current.isLoading).toBe(false);
    });

    it('should set success to true on successful upload', async () => {
        vi.mocked(uploadApi.uploadFile).mockResolvedValue({
            success: true,
            data: { id: 1, file_path: 'test.jpg' }
        });

        const { result } = renderHook(() => useUpload());
        const file = createMockFile('test.jpg', 'image/jpeg');

        await act(async () => {
            await result.current.upload({ file, tags: 'summer', altText: 'A photo' });
        });

        expect(result.current.success).toBe(true);
        expect(result.current.error).toBeNull();
        expect(result.current.isLoading).toBe(false);
        expect(uploadApi.uploadFile).toHaveBeenCalledWith(file, 'summer', 'A photo');
    });

    it('should set error on failed upload result', async () => {
        vi.mocked(uploadApi.uploadFile).mockResolvedValue({
            success: false,
            error: 'Upload failed: S3 error'
        });

        const { result } = renderHook(() => useUpload());
        const file = createMockFile('test.jpg', 'image/jpeg');

        await act(async () => {
            await result.current.upload({ file });
        });

        expect(result.current.success).toBe(false);
        expect(result.current.error).toBe('Upload failed: S3 error');
        expect(result.current.isLoading).toBe(false);
    });

    it('should set default error message when no error provided', async () => {
        vi.mocked(uploadApi.uploadFile).mockResolvedValue({
            success: false
        });

        const { result } = renderHook(() => useUpload());
        const file = createMockFile('test.jpg', 'image/jpeg');

        await act(async () => {
            await result.current.upload({ file });
        });

        expect(result.current.error).toBe('Upload failed');
    });

    it('should handle thrown errors', async () => {
        vi.mocked(uploadApi.uploadFile).mockRejectedValue(new Error('Network error'));

        const { result } = renderHook(() => useUpload());
        const file = createMockFile('test.jpg', 'image/jpeg');

        await act(async () => {
            await result.current.upload({ file });
        });

        expect(result.current.success).toBe(false);
        expect(result.current.error).toBe('Network error');
        expect(result.current.isLoading).toBe(false);
    });

    it('should handle non-Error thrown values', async () => {
        vi.mocked(uploadApi.uploadFile).mockRejectedValue('string error');

        const { result } = renderHook(() => useUpload());
        const file = createMockFile('test.jpg', 'image/jpeg');

        await act(async () => {
            await result.current.upload({ file });
        });

        expect(result.current.error).toBe('Unknown upload error');
    });

    it('should reset state on new upload', async () => {
        // First upload fails
        vi.mocked(uploadApi.uploadFile).mockResolvedValueOnce({
            success: false,
            error: 'First error'
        });

        const { result } = renderHook(() => useUpload());
        const file = createMockFile('test.jpg', 'image/jpeg');

        await act(async () => {
            await result.current.upload({ file });
        });

        expect(result.current.error).toBe('First error');

        // Second upload succeeds - error should be cleared
        vi.mocked(uploadApi.uploadFile).mockResolvedValueOnce({
            success: true,
            data: {}
        });

        await act(async () => {
            await result.current.upload({ file });
        });

        expect(result.current.error).toBeNull();
        expect(result.current.success).toBe(true);
    });
});
