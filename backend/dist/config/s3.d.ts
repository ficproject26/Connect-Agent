import { S3Client } from '@aws-sdk/client-s3';
export declare function getS3Client(): S3Client;
export interface S3UploadResult {
    success?: boolean;
    url: string;
    secure_url?: string;
    durableUrl?: string;
    key?: string;
    publicId?: string;
    bucket?: string;
    contentType?: string;
    mimeType?: string;
    size?: number;
    category?: string;
    extension?: string;
    originalName?: string;
    error?: string;
    toString?: () => string;
}
export declare const ALLOWED_MIME_MAP: Record<string, {
    ext: string;
    category: 'image' | 'document' | 'audio';
    maxSizeBytes: number;
}>;
export declare const EXTENSION_TO_MIME: Record<string, string>;
export declare function detectMagicBytes(buf: Buffer): string | null;
export declare function extractS3Key(urlOrKey: string): string | null;
export declare function getDurableImageUrl(objectKey: string): string;
export declare function getPresignedUrl(key: string, expiresIn?: number): Promise<string>;
export declare function getObjectStream(key: string): Promise<{
    success: boolean;
    body?: any;
    contentType?: string;
    contentLength?: number;
    etag?: string;
    error?: string;
}>;
/**
 * Uploads Images, Documents, Files, or Audio (Buffer, base64 DataURI, or file path) to AWS S3.
 * Returns a hybrid result object with durable URL and clean S3 key.
 */
export declare function uploadToS3(fileInput: string | Buffer, folder?: string, filenameHint?: string): Promise<S3UploadResult>;
export declare const uploadToCloudinary: typeof uploadToS3;
export declare const uploadBase64ToS3: typeof uploadToS3;
export declare const getPresignedViewUrl: typeof getPresignedUrl;
//# sourceMappingURL=s3.d.ts.map