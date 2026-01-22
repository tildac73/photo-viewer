export interface PresignResponse {
    presign_url: string;
    object_name: string;
}
  
export interface FinaliseUploadData {
    file_name: string;
    tags?: string;
    alt_text?: string;
}

export interface UploadResult {
    success: boolean;
    data?: any;
    error?: string;
}

class UploadApi {
    private baseUrl: string;

    constructor(baseUrl: string = '') {
        this.baseUrl = baseUrl;
    }

    /**
     * Request a presigned URL for uploading a file
     */
    async getPresignedUrl(contentType: string): Promise<PresignResponse> {
        const response = await fetch(`${this.baseUrl}/api/photos/presign?content_type=${encodeURIComponent(contentType)}`);

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to get presigned URL: ${response.status} ${errorText}`);
        }
        return response.json();
    }

    /**
     * Upload file directly to storage using presigned URL
     */
    async uploadToStorage(presignedUrl: string, file: File): Promise<void> {
        const response = await fetch(presignedUrl, {
            method: 'PUT',
            headers: {
                'Content-Type': file.type,
            },
            body: file,
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to upload to storage: ${response.status} ${errorText}`);
        }
    }

    /**
     * Finalise the upload by sending it to the backend
     */
    async finaliseUpload(data: FinaliseUploadData): Promise<any> {
        const formData = new FormData();
        formData.append('file_name', data.file_name);
        
        if (data.tags) {
            formData.append('tags', data.tags);
        }
        
        if (data.alt_text) {
            formData.append('alt_text', data.alt_text);
        }

        const response = await fetch(`${this.baseUrl}/api/upload/`, {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to finalize upload: ${response.status} ${errorText}`);
        }

        return response.json();
    }

    /**
     * Complete upload workflow
     */
    async uploadFile(
        file: File,
        tags?: string,
        altText?: string
    ): Promise<UploadResult> {
        try {
            const presignData = await this.getPresignedUrl(file.type);
            await this.uploadToStorage(presignData.presign_url, file);

            const result = await this.finaliseUpload({
                file_name: presignData.object_name,
                tags,
                alt_text: altText,
            });

            return {
                success: true,
                data: result,
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown upload error',
            };
        }
    }
}

export const uploadApi = new UploadApi();