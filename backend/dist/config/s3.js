"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadToCloudinary = void 0;
exports.getS3Client = getS3Client;
exports.uploadToS3 = uploadToS3;
exports.getPresignedUrl = getPresignedUrl;
const path_1 = __importDefault(require("path"));
const client_s3_1 = require("@aws-sdk/client-s3");
const s3_request_presigner_1 = require("@aws-sdk/s3-request-presigner");
const crypto_1 = __importDefault(require("crypto"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
let s3ClientInstance = null;
function getS3Client() {
    const region = process.env.AWS_REGION;
    const bucket = process.env.AWS_S3_BUCKET;
    if (!region || !bucket) {
        throw new Error('[AWS S3] AWS_REGION and AWS_S3_BUCKET must be configured in environment variables.');
    }
    if (!s3ClientInstance) {
        s3ClientInstance = new client_s3_1.S3Client({ region });
    }
    return s3ClientInstance;
}
/**
 * Uploads a document/photo buffer or base64 string to AWS S3.
 * Returns the secure pre-signed view URL for the private S3 object.
 */
async function uploadToS3(fileBufferOrBase64, folder = 'agent_docs', filenameHint = 'document.jpg') {
    const bucket = process.env.AWS_S3_BUCKET;
    const client = getS3Client();
    let buffer;
    let ext = path_1.default.extname(filenameHint).toLowerCase() || '.jpg';
    let mimeType = 'image/jpeg';
    if (Buffer.isBuffer(fileBufferOrBase64)) {
        buffer = fileBufferOrBase64;
    }
    else if (typeof fileBufferOrBase64 === 'string') {
        if (fileBufferOrBase64.startsWith('data:')) {
            const match = fileBufferOrBase64.match(/^data:([^;]+);base64,(.+)$/s);
            if (match) {
                mimeType = match[1].toLowerCase();
                buffer = Buffer.from(match[2], 'base64');
                ext = `.${mimeType.split('/')[1] || 'jpg'}`;
            }
            else {
                throw new Error('Malformed base64 string provided');
            }
        }
        else {
            throw new Error('String input must be a valid base64 data URI');
        }
    }
    else {
        throw new Error('Input must be a Buffer or base64 data string');
    }
    if (ext === '.pdf')
        mimeType = 'application/pdf';
    else if (ext === '.png')
        mimeType = 'image/png';
    else if (ext === '.jpg' || ext === '.jpeg')
        mimeType = 'image/jpeg';
    else if (ext === '.webp')
        mimeType = 'image/webp';
    const safeFolder = String(folder || 'agent_docs').replace(/[^a-zA-Z0-9_-]/g, '_');
    const randSuffix = crypto_1.default.randomBytes(8).toString('hex');
    const objectKey = `${safeFolder}/${Date.now()}-${randSuffix}${ext}`;
    const putCommand = new client_s3_1.PutObjectCommand({
        Bucket: bucket,
        Key: objectKey,
        Body: buffer,
        ContentType: mimeType
    });
    await client.send(putCommand);
    const getCommand = new client_s3_1.GetObjectCommand({
        Bucket: bucket,
        Key: objectKey
    });
    const presignedUrl = await (0, s3_request_presigner_1.getSignedUrl)(client, getCommand, { expiresIn: 604800 });
    return {
        success: true,
        key: objectKey,
        url: presignedUrl,
        secure_url: presignedUrl
    };
}
async function getPresignedUrl(key, expiresIn = 3600) {
    if (!key || typeof key !== 'string')
        return '';
    if (key.startsWith('http://') || key.startsWith('https://'))
        return key;
    const bucket = process.env.AWS_S3_BUCKET;
    const client = getS3Client();
    const command = new client_s3_1.GetObjectCommand({
        Bucket: bucket,
        Key: key.replace(/^\/+/, '')
    });
    return await (0, s3_request_presigner_1.getSignedUrl)(client, command, { expiresIn });
}
exports.uploadToCloudinary = uploadToS3;
//# sourceMappingURL=s3.js.map