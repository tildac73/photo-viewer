export interface WardrobeItem {
    id: number,
    file_path: string,
    url: string,
    upload_time: string,
    tags: string[],
    alt_text: string[]
}

export interface AllWardrobeItemsResponse {
    items: WardrobeItem[],
    total: number,
    skip: number,
    limit: number
}

export interface WardrobeResult {
    success: boolean;
    data?: AllWardrobeItemsResponse;
    error?: string;
}

class WardrobeApi {
    private baseUrl: string;

    constructor(baseUrl: string = '') {
        this.baseUrl = baseUrl;
    }

    /**
     * Get a wardrobe item based on id
     */
    async getWardrobeItem(id: number): Promise<WardrobeItem> {
        const response = await fetch(`${this.baseUrl}/api/wardrobe/${id}`);

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to get wardrobe item: ${response.status} ${errorText}`);
        }
        return response.json();
    }

    /**
     * Get all items in a user's wardrobe
     */
    async getAllWardrobeItems(): Promise<WardrobeResult> {
        const response = await fetch(`${this.baseUrl}/api/wardrobe`);

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to get wardrobe items: ${response.status} ${errorText}`);
        }
        return response.json();
    }

    /**
     * Delete a wardrobe item
     */
    async deleteItem(
        itemId: number
    ): Promise<{ success: boolean; data?: any; error?: string }> {
        try {
            const presignedResponse = await fetch(
                `/api/wardrobe/items/${itemId}/delete-url`,
                {
                    method: 'GET',
                }
            );

            if (!presignedResponse.ok) {
                throw new Error('Failed to get presigned delete URL');
            }

            const { deleteUrl } = await presignedResponse.json();

            const s3DeleteResponse = await fetch(deleteUrl, {
                method: 'DELETE',
            });

            if (!s3DeleteResponse.ok) {
                throw new Error('Failed to delete item from S3 storage');
            }

            const dbResponse = await fetch(
                `/api/wardrobe/items/${itemId}`,
                {
                    method: 'DELETE',
                }
            );

            if (!dbResponse.ok) {
                throw new Error('Failed to delete item from database');
            }

            const result = await dbResponse.json();

            return {
                success: true,
                data: result,
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown delete error',
            };
        }
    }
}

export const wardrobeApi = new WardrobeApi();