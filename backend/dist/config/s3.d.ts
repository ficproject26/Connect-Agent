import { S3Client } from '@aws-sdk/client-s3';
export declare function getS3Client(): S3Client;
export interface S3UploadResult {
    success: boolean;
    key: string;
    url: string;
    secure_url: string;
}
/**
 * Uploads a document/photo buffer or base64 string to AWS S3.
 * Returns the secure pre-signed view URL for the private S3 object.
 */
export declare function uploadToS3(fileBufferOrBase64: Buffer | string, folder?: string, filenameHint?: string): Promise<S3UploadResult>;
export declare function getPresignedUrl(key: string, expiresIn?: number): Promise<string>;
export declare const uploadToCloudinary: typeof uploadToS3;
//# sourceMappingURL=s3.d.ts.map