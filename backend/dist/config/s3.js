"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPresignedViewUrl = exports.uploadBase64ToS3 = exports.uploadToCloudinary = exports.EXTENSION_TO_MIME = exports.ALLOWED_MIME_MAP = void 0;
exports.getS3Client = getS3Client;
exports.detectMagicBytes = detectMagicBytes;
exports.extractS3Key = extractS3Key;
exports.getDurableImageUrl = getDurableImageUrl;
exports.getPresignedUrl = getPresignedUrl;
exports.getObjectStream = getObjectStream;
exports.uploadToS3 = uploadToS3;
const path_1 = __importDefault(require("path"));
const client_s3_1 = require("@aws-sdk/client-s3");
const s3_request_presigner_1 = require("@aws-sdk/s3-request-presigner");
const crypto_1 = __importDefault(require("crypto"));
const dotenv_1 = __importDefault(require("dotenv"));
const fs_1 = __importDefault(require("fs"));
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
const presignedUrlCache = new Map();
setInterval(() => {
    const now = Date.now();
    for (const [k, entry] of presignedUrlCache.entries()) {
        if (entry.expiresAt <= now) {
            presignedUrlCache.delete(k);
        }
    }
}, 10 * 60 * 1000).unref?.();
// Comprehensive MIME allowlist supporting Images, Documents, and Audio
exports.ALLOWED_MIME_MAP = {
    // Images (Max 15MB)
    'image/jpeg': { ext: 'jpg', category: 'image', maxSizeBytes: 15 * 1024 * 1024 },
    'image/jpg': { ext: 'jpg', category: 'image', maxSizeBytes: 15 * 1024 * 1024 },
    'image/png': { ext: 'png', category: 'image', maxSizeBytes: 15 * 1024 * 1024 },
    'image/webp': { ext: 'webp', category: 'image', maxSizeBytes: 15 * 1024 * 1024 },
    'image/gif': { ext: 'gif', category: 'image', maxSizeBytes: 15 * 1024 * 1024 },
    'image/avif': { ext: 'avif', category: 'image', maxSizeBytes: 15 * 1024 * 1024 },
    'image/svg+xml': { ext: 'svg', category: 'image', maxSizeBytes: 5 * 1024 * 1024 },
    // Documents (Max 25MB)
    'application/pdf': { ext: 'pdf', category: 'document', maxSizeBytes: 25 * 1024 * 1024 },
    'application/msword': { ext: 'doc', category: 'document', maxSizeBytes: 25 * 1024 * 1024 },
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { ext: 'docx', category: 'document', maxSizeBytes: 25 * 1024 * 1024 },
    'application/vnd.ms-excel': { ext: 'xls', category: 'document', maxSizeBytes: 25 * 1024 * 1024 },
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': { ext: 'xlsx', category: 'document', maxSizeBytes: 25 * 1024 * 1024 },
    'text/csv': { ext: 'csv', category: 'document', maxSizeBytes: 10 * 1024 * 1024 },
    'text/plain': { ext: 'txt', category: 'document', maxSizeBytes: 10 * 1024 * 1024 },
    // Audio (Max 25MB)
    'audio/webm': { ext: 'webm', category: 'audio', maxSizeBytes: 25 * 1024 * 1024 },
    'video/webm': { ext: 'webm', category: 'audio', maxSizeBytes: 25 * 1024 * 1024 },
    'audio/mpeg': { ext: 'mp3', category: 'audio', maxSizeBytes: 25 * 1024 * 1024 },
    'audio/mp3': { ext: 'mp3', category: 'audio', maxSizeBytes: 25 * 1024 * 1024 },
    'audio/wav': { ext: 'wav', category: 'audio', maxSizeBytes: 25 * 1024 * 1024 },
    'audio/x-wav': { ext: 'wav', category: 'audio', maxSizeBytes: 25 * 1024 * 1024 },
    'audio/wave': { ext: 'wav', category: 'audio', maxSizeBytes: 25 * 1024 * 1024 },
    'audio/m4a': { ext: 'm4a', category: 'audio', maxSizeBytes: 25 * 1024 * 1024 },
    'audio/x-m4a': { ext: 'm4a', category: 'audio', maxSizeBytes: 25 * 1024 * 1024 },
    'audio/mp4': { ext: 'm4a', category: 'audio', maxSizeBytes: 25 * 1024 * 1024 },
    'audio/ogg': { ext: 'ogg', category: 'audio', maxSizeBytes: 25 * 1024 * 1024 },
    'application/ogg': { ext: 'ogg', category: 'audio', maxSizeBytes: 25 * 1024 * 1024 },
    'audio/aac': { ext: 'aac', category: 'audio', maxSizeBytes: 25 * 1024 * 1024 }
};
exports.EXTENSION_TO_MIME = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    gif: 'image/gif',
    avif: 'image/avif',
    svg: 'image/svg+xml',
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    csv: 'text/csv',
    txt: 'text/plain',
    webm: 'audio/webm',
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
    m4a: 'audio/m4a',
    ogg: 'audio/ogg',
    aac: 'audio/aac'
};
function detectMagicBytes(buf) {
    if (!Buffer.isBuffer(buf) || buf.length < 4)
        return null;
    // JPEG
    if (buf[0] === 0xFF && buf[1] === 0xD8 && buf[2] === 0xFF)
        return 'image/jpeg';
    // PNG
    if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47)
        return 'image/png';
    // GIF
    if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x38)
        return 'image/gif';
    // PDF
    if (buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46)
        return 'application/pdf';
    // WebM (EBML)
    if (buf[0] === 0x1A && buf[1] === 0x45 && buf[2] === 0xDF && buf[3] === 0xA3)
        return 'audio/webm';
    // MP3 ID3
    if (buf[0] === 0x49 && buf[1] === 0x44 && buf[2] === 0x33)
        return 'audio/mpeg';
    // RIFF (WAV or WEBP)
    if (buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 && buf.length >= 12) {
        const sub = buf.toString('ascii', 8, 12);
        if (sub === 'WEBP')
            return 'image/webp';
        if (sub === 'WAVE')
            return 'audio/wav';
    }
    // OGG
    if (buf[0] === 0x4F && buf[1] === 0x67 && buf[2] === 0x67 && buf[3] === 0x53)
        return 'audio/ogg';
    // Office OpenXML / ZIP
    if (buf[0] === 0x50 && buf[1] === 0x4B && buf[2] === 0x03 && buf[3] === 0x04)
        return 'application/zip';
    return null;
}
function extractS3Key(urlOrKey) {
    if (!urlOrKey || typeof urlOrKey !== 'string')
        return null;
    const trimmed = urlOrKey.trim();
    if (trimmed.startsWith('data:') || trimmed.startsWith('blob:') || trimmed.startsWith('https://res.cloudinary.com/')) {
        return null;
    }
    const mediaMatch = trimmed.match(/\/api\/(?:media|uploads)\/s3\/([^?#]+)/i);
    if (mediaMatch && mediaMatch[1]) {
        return decodeURIComponent(mediaMatch[1]).replace(/^\/+/, '');
    }
    const cfDomain = (process.env.AWS_CLOUDFRONT_URL || process.env.CLOUDFRONT_URL || '').replace(/https?:\/\//i, '').replace(/\/+$/, '');
    if (cfDomain && trimmed.includes(cfDomain)) {
        try {
            const parsed = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
            return decodeURIComponent(parsed.pathname).replace(/^\/+/, '');
        }
        catch { }
    }
    if (trimmed.includes('amazonaws.com')) {
        try {
            const parsed = new URL(trimmed);
            let p = decodeURIComponent(parsed.pathname).replace(/^\/+/, '');
            const parts = p.split('/');
            if (parts.length > 1 && ['products', 'vendor_uploads', 'admin_docs', 'subadmin_docs', 'agent_docs', 'voice_notes', 'kyc', 'documents', 'field_visits', 'tasks'].includes(parts[1])) {
                p = parts.slice(1).join('/');
            }
            return p;
        }
        catch {
            const match = trimmed.match(/amazonaws\.com\/([^?#]+)/);
            if (match && match[1]) {
                return decodeURIComponent(match[1]).replace(/^\/+/, '');
            }
        }
    }
    if (/^[a-zA-Z0-9_\-]+\/[a-zA-Z0-9_\-\.]+\.(jpg|jpeg|png|webp|gif|avif|svg|pdf|doc|docx|xls|xlsx|csv|txt|webm|mp3|wav|m4a|ogg|aac)$/i.test(trimmed)) {
        return trimmed;
    }
    return null;
}
function getDurableImageUrl(objectKey) {
    if (!objectKey)
        return '';
    const cleanKey = objectKey.replace(/^\/+/, '');
    const cloudfrontDomain = process.env.AWS_CLOUDFRONT_URL || process.env.CLOUDFRONT_URL;
    if (cloudfrontDomain) {
        const cfBase = cloudfrontDomain.startsWith('http') ? cloudfrontDomain : `https://${cloudfrontDomain}`;
        return `${cfBase.replace(/\/+$/, '')}/${cleanKey}`;
    }
    const backendBase = process.env.BACKEND_URL || 'http://3.110.88.42:8083';
    return `${backendBase.replace(/\/+$/, '')}/api/media/s3/${cleanKey}`;
}
async function getPresignedUrl(key, expiresIn = 3600) {
    if (!key || typeof key !== 'string')
        return '';
    const cleanKey = extractS3Key(key) || key.replace(/^\/+/, '');
    const cacheKey = `${cleanKey}:${expiresIn}`;
    const cached = presignedUrlCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now() + 60000) {
        return cached.url;
    }
    const bucket = process.env.AWS_S3_BUCKET;
    const client = getS3Client();
    const command = new client_s3_1.GetObjectCommand({
        Bucket: bucket,
        Key: cleanKey
    });
    const signedUrl = await (0, s3_request_presigner_1.getSignedUrl)(client, command, { expiresIn });
    presignedUrlCache.set(cacheKey, {
        url: signedUrl,
        expiresAt: Date.now() + (expiresIn - 60) * 1000
    });
    return signedUrl;
}
async function getObjectStream(key) {
    try {
        const bucket = process.env.AWS_S3_BUCKET;
        const client = getS3Client();
        const cleanKey = key.replace(/^\/+/, '');
        const command = new client_s3_1.GetObjectCommand({
            Bucket: bucket,
            Key: cleanKey
        });
        const response = await client.send(command);
        return {
            success: true,
            body: response.Body,
            contentType: response.ContentType || 'application/octet-stream',
            contentLength: response.ContentLength,
            etag: response.ETag
        };
    }
    catch (err) {
        return {
            success: false,
            error: err.name === 'NoSuchKey' ? 'Object not found in S3 bucket' : (err.message || 'Failed to fetch object from S3')
        };
    }
}
/**
 * Uploads Images, Documents, Files, or Audio (Buffer, base64 DataURI, or file path) to AWS S3.
 * Returns a hybrid result object with durable URL and clean S3 key.
 */
async function uploadToS3(fileInput, folder = 'agent_docs', filenameHint) {
    try {
        let fileBuffer;
        let mimeType = 'application/octet-stream';
        let extension = 'bin';
        let originalName = filenameHint || 'file';
        if (Buffer.isBuffer(fileInput)) {
            fileBuffer = fileInput;
            if (filenameHint) {
                const ext = path_1.default.extname(filenameHint).replace('.', '').toLowerCase();
                if (ext && exports.EXTENSION_TO_MIME[ext]) {
                    extension = ext;
                    mimeType = exports.EXTENSION_TO_MIME[ext];
                }
            }
            const magicMime = detectMagicBytes(fileBuffer);
            if (magicMime && exports.ALLOWED_MIME_MAP[magicMime]) {
                mimeType = magicMime;
                extension = exports.ALLOWED_MIME_MAP[magicMime].ext;
            }
        }
        else if (typeof fileInput === 'string') {
            const trimmed = fileInput.trim();
            if (trimmed.startsWith('https://res.cloudinary.com/')) {
                return {
                    success: true,
                    url: trimmed,
                    secure_url: trimmed,
                    key: trimmed,
                    publicId: trimmed,
                    toString() { return trimmed; }
                };
            }
            if (trimmed.includes('/api/media/s3/')) {
                const key = extractS3Key(trimmed) || trimmed;
                return {
                    success: true,
                    url: trimmed,
                    secure_url: trimmed,
                    key,
                    publicId: key,
                    toString() { return trimmed; }
                };
            }
            if (trimmed.includes('amazonaws.com')) {
                const existingKey = extractS3Key(trimmed);
                if (existingKey) {
                    const durableUrl = getDurableImageUrl(existingKey);
                    return {
                        success: true,
                        url: durableUrl,
                        secure_url: durableUrl,
                        key: existingKey,
                        publicId: existingKey,
                        toString() { return durableUrl; }
                    };
                }
            }
            if (fs_1.default.existsSync(trimmed)) {
                fileBuffer = fs_1.default.readFileSync(trimmed);
                originalName = path_1.default.basename(trimmed);
                const ext = path_1.default.extname(trimmed).replace('.', '').toLowerCase();
                if (ext && exports.EXTENSION_TO_MIME[ext]) {
                    extension = ext;
                    mimeType = exports.EXTENSION_TO_MIME[ext];
                }
            }
            else if (trimmed.startsWith('data:')) {
                const match = trimmed.match(/^data:([^;]+);base64,(.+)$/s);
                if (!match) {
                    return { success: false, url: '', secure_url: '', error: 'Malformed base64 data URI.' };
                }
                mimeType = match[1].toLowerCase().trim();
                const conf = exports.ALLOWED_MIME_MAP[mimeType];
                if (!conf) {
                    return {
                        success: false,
                        url: '',
                        secure_url: '',
                        error: `MIME type '\${mimeType}' is not permitted.`
                    };
                }
                extension = conf.ext;
                fileBuffer = Buffer.from(match[2], 'base64');
            }
            else {
                return { success: false, url: '', secure_url: '', error: 'Invalid file format: must be base64 data URI or file path.' };
            }
        }
        else {
            return { success: false, url: '', secure_url: '', error: 'Invalid file input type.' };
        }
        const magicMime = detectMagicBytes(fileBuffer);
        if (magicMime && exports.ALLOWED_MIME_MAP[magicMime]) {
            mimeType = magicMime;
            extension = exports.ALLOWED_MIME_MAP[magicMime].ext;
        }
        const mimeConfig = exports.ALLOWED_MIME_MAP[mimeType] || { category: 'file', maxSizeBytes: 25 * 1024 * 1024, ext: extension };
        if (!exports.ALLOWED_MIME_MAP[mimeType]) {
            return {
                success: false,
                url: '',
                secure_url: '',
                error: `File format '\${mimeType}' is not supported.`
            };
        }
        if (fileBuffer.length > mimeConfig.maxSizeBytes) {
            const maxMb = Math.round(mimeConfig.maxSizeBytes / (1024 * 1024));
            return {
                success: false,
                url: '',
                secure_url: '',
                error: `Payload size exceeds maximum limit of \${maxMb} MB for \${mimeConfig.category}s.`
            };
        }
        const bucket = process.env.AWS_S3_BUCKET;
        const client = getS3Client();
        const safeFolder = /^[a-zA-Z0-9_-]{1,50}$/.test(folder) ? folder : 'agent_docs';
        const randSuffix = crypto_1.default.randomBytes(8).toString('hex');
        const objectKey = `\${safeFolder}/\${Date.now()}-\${randSuffix}.\${extension}`;
        const putCommand = new client_s3_1.PutObjectCommand({
            Bucket: bucket,
            Key: objectKey,
            Body: fileBuffer,
            ContentType: mimeType,
            Metadata: {
                'original-name': encodeURIComponent(path_1.default.basename(originalName)),
                category: mimeConfig.category
            }
        });
        await client.send(putCommand);
        const durableUrl = getDurableImageUrl(objectKey);
        return {
            success: true,
            url: durableUrl,
            secure_url: durableUrl,
            key: objectKey,
            publicId: objectKey,
            category: mimeConfig.category,
            mimeType,
            extension,
            size: fileBuffer.length,
            originalName,
            toString() { return durableUrl; }
        };
    }
    catch (err) {
        console.error('[AWS S3 Agent Upload Error]:', err.message);
        return {
            success: false,
            url: '',
            secure_url: '',
            error: err.message || 'Failed to upload file to AWS S3'
        };
    }
}
exports.uploadToCloudinary = uploadToS3;
exports.uploadBase64ToS3 = uploadToS3;
exports.getPresignedViewUrl = getPresignedUrl;
//# sourceMappingURL=s3.js.map