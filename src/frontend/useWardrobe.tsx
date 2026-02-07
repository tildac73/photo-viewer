import { useState } from "react";
import { WardrobeItem, wardrobeApi } from "./wardrobeApi";

interface WardrobeResponse {
    items: WardrobeItem[];
    total: number;
    skip: number;
    limit: number;
}

export function useWardrobe() {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [wardrobeItems, setWardrobeItems] = useState<WardrobeItem[]>([]);

    const fetchWardrobe = async (skip: number = 0, limit: number = 100) => {
        setIsLoading(true);
        setError(null);
        setSuccess(false);

        try {
            const response = await fetch(
                `/api/wardrobe/?skip=${skip}&limit=${limit}`
            );

            if (!response.ok) {
                throw new Error("Failed to fetch wardrobe items");
            }

            const data: WardrobeResponse = await response.json();
            setWardrobeItems(data.items);
            setSuccess(true);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Unknown error");
        } finally {
            setIsLoading(false);
        }
    };

    const fetchItemById = async (itemId: number) => {
        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch(
                `/api/wardrobe/${itemId}`
            );

            if (!response.ok) {
                throw new Error("Failed to fetch item");
            }

            const item: WardrobeItem = await response.json();
            return item;
        } catch (err) {
            setError(err instanceof Error ? err.message : "Unknown error");
            return null;
        } finally {
            setIsLoading(false);
        }
    };

    const deleteItem = async (itemId: number) => {
        setIsLoading(true);
        setError(null);

        try {
            const result = await wardrobeApi.deleteItem(itemId);

            if (!result.success) {
                setError(result.error || "Failed to delete item");
                return;
            }

            setWardrobeItems((prev) => prev.filter((item) => item.id !== itemId));
        } catch (err) {
            setError(err instanceof Error ? err.message : "Unknown error");
        } finally {
            setIsLoading(false);
        }
    };

    return {
        isLoading,
        error,
        success,
        wardrobeItems,
        fetchWardrobe,
        fetchItemById,
        deleteItem,
    };
}
