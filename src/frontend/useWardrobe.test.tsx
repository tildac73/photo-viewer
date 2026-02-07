import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useWardrobe } from './useWardrobe';

// Mock fetch globally
const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

describe('useWardrobe', () => {
    beforeEach(() => {
        mockFetch.mockClear();
    });

    it('should initialize with default state', () => {
        const { result } = renderHook(() => useWardrobe());

        expect(result.current.isLoading).toBe(false);
        expect(result.current.error).toBeNull();
        expect(result.current.success).toBe(false);
        expect(result.current.wardrobeItems).toEqual([]);
        expect(typeof result.current.fetchWardrobe).toBe('function');
        expect(typeof result.current.fetchItemById).toBe('function');
    });

    describe('fetchWardrobe', () => {
        it('should fetch wardrobe items successfully', async () => {
            const mockItems = [
                {
                    id: 1,
                    file_path: 'photo1.jpg',
                    url: 'https://s3.example.com/photo1.jpg',
                    upload_time: '2024-01-15T10:30:00',
                    tags: 'summer',
                    alt_text: 'Photo 1'
                },
                {
                    id: 2,
                    file_path: 'photo2.jpg',
                    url: 'https://s3.example.com/photo2.jpg',
                    upload_time: '2024-01-16T10:30:00',
                    tags: 'winter',
                    alt_text: 'Photo 2'
                }
            ];

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({
                    items: mockItems,
                    total: 2,
                    skip: 0,
                    limit: 100
                })
            });

            const { result } = renderHook(() => useWardrobe());

            await act(async () => {
                await result.current.fetchWardrobe();
            });

            expect(result.current.wardrobeItems).toEqual(mockItems);
            expect(result.current.success).toBe(true);
            expect(result.current.error).toBeNull();
            expect(result.current.isLoading).toBe(false);
            expect(mockFetch).toHaveBeenCalledWith('/api/wardrobe/?skip=0&limit=100');
        });

        it('should use custom skip and limit parameters', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({
                    items: [],
                    total: 0,
                    skip: 10,
                    limit: 20
                })
            });

            const { result } = renderHook(() => useWardrobe());

            await act(async () => {
                await result.current.fetchWardrobe(10, 20);
            });

            expect(mockFetch).toHaveBeenCalledWith('/api/wardrobe/?skip=10&limit=20');
        });

        it('should set isLoading while fetching', async () => {
            let resolveJson: (value: any) => void;
            const jsonPromise = new Promise((resolve) => {
                resolveJson = resolve;
            });

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => jsonPromise
            });

            const { result } = renderHook(() => useWardrobe());

            act(() => {
                result.current.fetchWardrobe();
            });

            expect(result.current.isLoading).toBe(true);

            await act(async () => {
                resolveJson!({ items: [], total: 0, skip: 0, limit: 100 });
            });

            expect(result.current.isLoading).toBe(false);
        });

        it('should set error on fetch failure', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 500
            });

            const { result } = renderHook(() => useWardrobe());

            await act(async () => {
                await result.current.fetchWardrobe();
            });

            expect(result.current.error).toBe('Failed to fetch wardrobe items');
            expect(result.current.success).toBe(false);
            expect(result.current.isLoading).toBe(false);
        });

        it('should handle network errors', async () => {
            mockFetch.mockRejectedValueOnce(new Error('Network error'));

            const { result } = renderHook(() => useWardrobe());

            await act(async () => {
                await result.current.fetchWardrobe();
            });

            expect(result.current.error).toBe('Network error');
            expect(result.current.success).toBe(false);
        });

        it('should handle non-Error thrown values', async () => {
            mockFetch.mockRejectedValueOnce('string error');

            const { result } = renderHook(() => useWardrobe());

            await act(async () => {
                await result.current.fetchWardrobe();
            });

            expect(result.current.error).toBe('Unknown error');
        });

        it('should reset state on new fetch', async () => {
            // First fetch fails
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 500
            });

            const { result } = renderHook(() => useWardrobe());

            await act(async () => {
                await result.current.fetchWardrobe();
            });

            expect(result.current.error).toBe('Failed to fetch wardrobe items');

            // Second fetch succeeds
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({ items: [], total: 0, skip: 0, limit: 100 })
            });

            await act(async () => {
                await result.current.fetchWardrobe();
            });

            expect(result.current.error).toBeNull();
            expect(result.current.success).toBe(true);
        });
    });

    describe('fetchItemById', () => {
        it('should fetch a single item by id', async () => {
            const mockItem = {
                id: 1,
                file_path: 'photo1.jpg',
                url: 'https://s3.example.com/photo1.jpg',
                upload_time: '2024-01-15T10:30:00',
                tags: 'summer',
                alt_text: 'Photo 1'
            };

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockItem)
            });

            const { result } = renderHook(() => useWardrobe());

            let item;
            await act(async () => {
                item = await result.current.fetchItemById(1);
            });

            expect(item).toEqual(mockItem);
            expect(result.current.error).toBeNull();
            expect(result.current.isLoading).toBe(false);
            expect(mockFetch).toHaveBeenCalledWith('/api/wardrobe/1');
        });

        it('should return null and set error on fetch failure', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 404
            });

            const { result } = renderHook(() => useWardrobe());

            let item;
            await act(async () => {
                item = await result.current.fetchItemById(999);
            });

            expect(item).toBeNull();
            expect(result.current.error).toBe('Failed to fetch item');
        });

        it('should handle network errors', async () => {
            mockFetch.mockRejectedValueOnce(new Error('Connection refused'));

            const { result } = renderHook(() => useWardrobe());

            let item;
            await act(async () => {
                item = await result.current.fetchItemById(1);
            });

            expect(item).toBeNull();
            expect(result.current.error).toBe('Connection refused');
        });

        it('should set isLoading while fetching item', async () => {
            let resolveJson: (value: any) => void;
            const jsonPromise = new Promise((resolve) => {
                resolveJson = resolve;
            });

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => jsonPromise
            });

            const { result } = renderHook(() => useWardrobe());

            act(() => {
                result.current.fetchItemById(1);
            });

            expect(result.current.isLoading).toBe(true);

            await act(async () => {
                resolveJson!({ id: 1, file_path: 'test.jpg' });
            });

            expect(result.current.isLoading).toBe(false);
        });
    });
});
