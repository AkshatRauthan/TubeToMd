import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import serverConfig from '@config/server.config';
import fs from 'fs';

// Ensure upload directory exists (for temporary audio chunk storage)
const uploadDir = serverConfig.UPLOAD_DIR;
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (_req, _file, cb) => {
        cb(null, uploadDir);
    },
    filename: (_req, file, cb) => {
        const ext = path.extname(file.originalname);
        const uniqueName = `chunk_${uuidv4()}${ext}`;
        cb(null, uniqueName);
    },
});

const ALLOWED_AUDIO_MIMETYPES = [
    'audio/mpeg',
    'audio/wav',
    'audio/webm',
    'audio/mp4',
    'audio/ogg',
    'audio/flac',
    'audio/x-m4a',
    'audio/x-wav',
    'application/octet-stream', // FFmpeg.wasm may not set mimetype
];

/**
 * Multer middleware for receiving audio chunks from the browser.
 * No video storage on backend — frontend extracts audio via FFmpeg.wasm.
 * Each chunk is ~5 min of audio (~5-15MB).
 */
const chunkUpload = multer({
    storage,
    limits: {
        fileSize: 100 * 1024 * 1024, // 100MB per chunk (generous for uncompressed)
    },
    fileFilter: (_req, file, cb) => {
        if (ALLOWED_AUDIO_MIMETYPES.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error(`Unsupported audio type: ${file.mimetype}`));
        }
    },
});

export const uploadAudioChunk = chunkUpload;
export default chunkUpload;
