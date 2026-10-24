import path from 'path';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

let s3ClientInstance: S3Client | null = null;

export function getS3Client(): S3Client {
  const region = process.env.AWS_REGION;
  const bucket = process.env.AWS_S3_BUCKET;
  if (!region || !bucket) {
    throw new Error('[AWS S3] AWS_REGION and AWS_S3_BUCKET must be configured in environment variables.');
  }
  if (!s3ClientInstance) {
    s3ClientInstance = new S3Client({ region });
  }
  return s3ClientInstance;
}

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
export async function uploadToS3(
  fileBufferOrBase64: Buffer | string,
  folder = 'agent_docs',
  filenameHint = 'document.jpg'
): Promise<S3UploadResult> {
  const bucket = process.env.AWS_S3_BUCKET;
  const client = getS3Client();

  let buffer: Buffer;
  let ext = path.extname(filenameHint).toLowerCase() || '.jpg';
  let mimeType = 'image/jpeg';

  if (Buffer.isBuffer(fileBufferOrBase64)) {
    buffer = fileBufferOrBase64;
  } else if (typeof fileBufferOrBase64 === 'string') {
    if (fileBufferOrBase64.startsWith('data:')) {
      const match = fileBufferOrBase64.match(/^data:([^;]+);base64,(.+)$/s);
      if (match) {
        mimeType = match[1].toLowerCase();
        buffer = Buffer.from(match[2], 'base64');
        ext = `.${mimeType.split('/')[1] || 'jpg'}`;
      } else {
        throw new Error('Malformed base64 string provided');
      }
    } else {
      throw new Error('String input must be a valid base64 data URI');
    }
  } else {
    throw new Error('Input must be a Buffer or base64 data string');
  }

  if (ext === '.pdf') mimeType = 'application/pdf';
  else if (ext === '.png') mimeType = 'image/png';
  else if (ext === '.jpg' || ext === '.jpeg') mimeType = 'image/jpeg';
  else if (ext === '.webp') mimeType = 'image/webp';

  const safeFolder = String(folder || 'agent_docs').replace(/[^a-zA-Z0-9_-]/g, '_');
  const randSuffix = crypto.randomBytes(8).toString('hex');
  const objectKey = `${safeFolder}/${Date.now()}-${randSuffix}${ext}`;

  const putCommand = new PutObjectCommand({
    Bucket: bucket,
    Key: objectKey,
    Body: buffer,
    ContentType: mimeType
  });

  await client.send(putCommand);

  const getCommand = new GetObjectCommand({
    Bucket: bucket,
    Key: objectKey
  });

  const presignedUrl = await getSignedUrl(client, getCommand, { expiresIn: 604800 });

  return {
    success: true,
    key: objectKey,
    url: presignedUrl,
    secure_url: presignedUrl
  };
}

export async function getPresignedUrl(key: string, expiresIn = 3600): Promise<string> {
  if (!key || typeof key !== 'string') return '';
  if (key.startsWith('http://') || key.startsWith('https://')) return key;
  const bucket = process.env.AWS_S3_BUCKET;
  const client = getS3Client();
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key.replace(/^\/+/, '')
  });
  return await getSignedUrl(client, command, { expiresIn });
}

export const uploadToCloudinary = uploadToS3;
