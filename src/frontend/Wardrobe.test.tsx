import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Wardrobe from './Wardrobe';
import { useWardrobe } from './useWardrobe';

vi.mock('./useWardrobe');
vi.mock('./Wardrobe.scss', () => ({}));

const mockUseWardrobe = vi.mocked(useWardrobe);

const defaultHookReturn = {
    isLoading: false,
    error: null,
    success: false,
    wardrobeItems: [],
    fetchWardrobe: vi.fn(),
    fetchItemById: vi.fn(),
    deleteItem: vi.fn(),
};

describe('Wardrobe', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockUseWardrobe.mockReturnValue({ ...defaultHookReturn });
    });

    it('renders heading', () => {
        render(<Wardrobe />);
        expect(screen.getByText('Your Wardrobe')).toBeDefined();
    });

    it('calls fetchWardrobe on mount exactly once', () => {
        const fetchWardrobe = vi.fn();
        mockUseWardrobe.mockReturnValue({ ...defaultHookReturn, fetchWardrobe });

        render(<Wardrobe />);

        expect(fetchWardrobe).toHaveBeenCalledTimes(1);
    });

    it('renders loading state', () => {
        mockUseWardrobe.mockReturnValue({ ...defaultHookReturn, isLoading: true });

        render(<Wardrobe />);

        expect(screen.getByText('Loading wardrobe...')).toBeDefined();
    });

    it('renders error state', () => {
        mockUseWardrobe.mockReturnValue({ ...defaultHookReturn, error: 'Something broke' });

        render(<Wardrobe />);

        expect(screen.getByText('Error: Something broke')).toBeDefined();
    });

    it('renders empty state when no items', () => {
        mockUseWardrobe.mockReturnValue({ ...defaultHookReturn, wardrobeItems: [] });

        render(<Wardrobe />);

        expect(screen.getByText("Your wardrobe is empty. Upload some items to get started!")).toBeDefined();
    });

    it('renders items with images, titles, and tags', () => {
        mockUseWardrobe.mockReturnValue({
            ...defaultHookReturn,
            wardrobeItems: [
                { id: 1, file_path: 'a.jpg', url: 'http://a.jpg', upload_time: '2024-01-01', tags: 'summer, casual', alt_text: 'Summer outfit' },
            ],
        });

        render(<Wardrobe />);

        expect(screen.getByAltText('Summer outfit')).toBeDefined();
        expect(screen.getByText('Summer outfit')).toBeDefined();
        expect(screen.getByText('summer')).toBeDefined();
        expect(screen.getByText('casual')).toBeDefined();
    });

    it('delete button calls deleteItem with correct ID', () => {
        const deleteItem = vi.fn();
        mockUseWardrobe.mockReturnValue({
            ...defaultHookReturn,
            deleteItem,
            wardrobeItems: [
                { id: 42, file_path: 'a.jpg', url: 'http://a.jpg', upload_time: '2024-01-01', tags: 'tag', alt_text: 'Item' },
            ],
        });

        render(<Wardrobe />);

        fireEvent.click(screen.getByText('Delete'));

        expect(deleteItem).toHaveBeenCalledWith(42);
    });

    it('shows "No tags" when tags is empty', () => {
        mockUseWardrobe.mockReturnValue({
            ...defaultHookReturn,
            wardrobeItems: [
                { id: 1, file_path: 'a.jpg', url: 'http://a.jpg', upload_time: '2024-01-01', tags: '', alt_text: 'Item' },
            ],
        });

        render(<Wardrobe />);

        expect(screen.getByText('No tags')).toBeDefined();
    });

    it('shows "Untitled" when alt_text is empty', () => {
        mockUseWardrobe.mockReturnValue({
            ...defaultHookReturn,
            wardrobeItems: [
                { id: 1, file_path: 'a.jpg', url: 'http://a.jpg', upload_time: '2024-01-01', tags: 'tag', alt_text: '' },
            ],
        });

        render(<Wardrobe />);

        expect(screen.getByText('Untitled')).toBeDefined();
    });
});
