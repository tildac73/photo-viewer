import { useState } from "react";
import { uploadApi } from "./uploadApi";

export interface UploadParams {
  file: File;
  tags?: string;
  altText?: string;
}

export interface UseUploadResult {
  upload: (params: UploadParams) => Promise<void>;
  isLoading: boolean;
  error: string | null;
  success: boolean;
}

export function useUpload(): UseUploadResult {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const upload = async ({ file, tags, altText }: UploadParams) => {
    setIsLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const result = await uploadApi.uploadFile(file, tags, altText);

      if (result.success) {
        setSuccess(true);
      } else {
        setError(result.error || "Upload failed");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown upload error");
    } finally {
      setIsLoading(false);
    }
  };

  return {
    upload,
    isLoading,
    error,
    success,
  };
}
