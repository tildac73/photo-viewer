import { describe, it, expect, vi, beforeEach } from 'vitest';
import { wardrobeApi, WardrobeItem, AllWardrobeItemsResponse } from './wardrobeApi';

// Mock fetch globally
const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

describe('WardrobeApi', () => {
    beforeEach(() => {
        mockFetch.mockClear();
    });

    describe('getWardrobeItem', () => {
        it('should fetch a wardrobe item by id', async () => {
            const mockItem: WardrobeItem = {
                id: 1,
                file_path: 'test.jpg',
                url: 'https://s3.example.com/test.jpg',
                upload_time: '2024-01-15T10:30:00',
                tags: ['summer', 'beach'],
                alt_text: ['A beach photo']
            };

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockItem)
            });

            const result = await wardrobeApi.getWardrobeItem(1);

            expect(mockFetch).toHaveBeenCalledWith('/api/wardrobe/1');
            expect(result).toEqual(mockItem);
        });

        it('should throw error when item not found', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 404,
                text: () => Promise.resolve('Item not found')
            });

            await expect(wardrobeApi.getWardrobeItem(999)).rejects.toThrow(
                'Failed to get wardrobe item: 404 Item not found'
            );
        });
    });

    describe('getAllWardrobeItems', () => {
        it('should fetch all wardrobe items', async () => {
            const mockResponse: AllWardrobeItemsResponse = {
                items: [
                    {
                        id: 1,
                        file_path: 'photo1.jpg',
                        url: 'https://s3.example.com/photo1.jpg',
                        upload_time: '2024-01-15T10:30:00',
                        tags: ['tag1'],
                        alt_text: ['Photo 1']
                    },
                    {
                        id: 2,
                        file_path: 'photo2.jpg',
                        url: 'https://s3.example.com/photo2.jpg',
                        upload_time: '2024-01-16T10:30:00',
                        tags: ['tag2'],
                        alt_text: ['Photo 2']
                    }
                ],
                total: 2,
                skip: 0,
                limit: 100
            };

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockResponse)
            });

            const result = await wardrobeApi.getAllWardrobeItems();

            expect(mockFetch).toHaveBeenCalledWith('/api/wardrobe');
            expect(result).toEqual(mockResponse);
        });

        it('should throw error on server failure', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 500,
                text: () => Promise.resolve('Internal server error')
            });

            await expect(wardrobeApi.getAllWardrobeItems()).rejects.toThrow(
                'Failed to get wardrobe items: 500 Internal server error'
            );
        });
    });

    describe('deleteItem', () => {
        it('should delete an item successfully', async () => {
            // Mock getting delete URL
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({ deleteUrl: 'https://s3.example.com/delete-url' })
            });

            // Mock S3 delete
            mockFetch.mockResolvedValueOnce({
                ok: true
            });

            // Mock database delete
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({ message: 'Item deleted', id: 1 })
            });

            const result = await wardrobeApi.deleteItem(1);

            expect(result.success).toBe(true);
            expect(result.data).toEqual({ message: 'Item deleted', id: 1 });
            expect(mockFetch).toHaveBeenCalledTimes(3);
        });

        it('should return error when delete URL fetch fails', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 404
            });

            const result = await wardrobeApi.deleteItem(999);

            expect(result.success).toBe(false);
            expect(result.error).toBe('Failed to get presigned delete URL');
        });

        it('should return error when S3 delete fails', async () => {
            // Mock getting delete URL success
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({ deleteUrl: 'https://s3.example.com/delete-url' })
            });

            // Mock S3 delete failure
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 500
            });

            const result = await wardrobeApi.deleteItem(1);

            expect(result.success).toBe(false);
            expect(result.error).toBe('Failed to delete item from S3 storage');
        });

        it('should return error when database delete fails', async () => {
            // Mock getting delete URL success
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({ deleteUrl: 'https://s3.example.com/delete-url' })
            });

            // Mock S3 delete success
            mockFetch.mockResolvedValueOnce({
                ok: true
            });

            // Mock database delete failure
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 500
            });

            const result = await wardrobeApi.deleteItem(1);

            expect(result.success).toBe(false);
            expect(result.error).toBe('Failed to delete item from database');
        });
    });
});
