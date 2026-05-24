import dotenv from 'dotenv';
dotenv.config();

interface ServerConfig {
    PORT: string;
    MONGO_URI: string;
    JWT_SECRET: string;
    JWT_REFRESH_SECRET: string;
    JWT_EXPIRY: string;
    JWT_REFRESH_EXPIRY: string;
    GOOGLE_CLIENT_ID: string;
    GOOGLE_CLIENT_SECRET: string;
    GOOGLE_CALLBACK_URL: string;

    // NVIDIA NIM
    NVIDIA_API_KEY: string;
    NVIDIA_API_KEYS: string;
    NVIDIA_BASE_URL: string;
    NVIDIA_IMAGE_BASE_URL: string;
    NVIDIA_MODEL_QUALITY: string;
    NVIDIA_MODEL_QUALITY_FALLBACK: string;
    NVIDIA_MODEL_FAST: string;
    NVIDIA_MODEL_FAST_FALLBACK: string;
    NVIDIA_MODEL_IMAGE: string;
    NVIDIA_MODEL_IMAGE_FALLBACK: string;
    IMAGE_GEN_DAILY_QUOTA_PER_USER: number;

    PYTHON_SERVICE_URL: string;
    FRONTEND_URL: string;
    UPLOAD_DIR: string;
    ADMIN_API_TOKEN: string;
    MAX_VIDEO_DURATION_SECONDS: number;
}

const serverConfig: ServerConfig = {
    PORT: process.env.PORT || '5000',
    MONGO_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/tubetomd',
    JWT_SECRET: process.env.JWT_SECRET || 'your-jwt-secret-change-in-production',
    JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-change-in-production',
    JWT_EXPIRY: process.env.JWT_EXPIRY || '1d',
    JWT_REFRESH_EXPIRY: process.env.JWT_REFRESH_EXPIRY || '7d',
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || '',
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || '',
    GOOGLE_CALLBACK_URL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5000/api/v1/auth/google/callback',

    NVIDIA_API_KEY: process.env.NVIDIA_API_KEY || '',
    NVIDIA_API_KEYS: process.env.NVIDIA_API_KEYS || '',
    NVIDIA_BASE_URL: process.env.NVIDIA_BASE_URL || 'https://integrate.api.nvidia.com/v1',
    NVIDIA_IMAGE_BASE_URL: process.env.NVIDIA_IMAGE_BASE_URL || 'https://ai.api.nvidia.com/v1',
    NVIDIA_MODEL_QUALITY: process.env.NVIDIA_MODEL_QUALITY || 'meta/llama-3.3-70b-instruct',
    NVIDIA_MODEL_QUALITY_FALLBACK: process.env.NVIDIA_MODEL_QUALITY_FALLBACK || 'nvidia/llama-3.1-nemotron-70b-instruct',
    NVIDIA_MODEL_FAST: process.env.NVIDIA_MODEL_FAST || 'meta/llama-3.1-8b-instruct',
    NVIDIA_MODEL_FAST_FALLBACK: process.env.NVIDIA_MODEL_FAST_FALLBACK || 'mistralai/mistral-small-24b-instruct',
    NVIDIA_MODEL_IMAGE: process.env.NVIDIA_MODEL_IMAGE || 'black-forest-labs/flux.1-schnell',
    NVIDIA_MODEL_IMAGE_FALLBACK: process.env.NVIDIA_MODEL_IMAGE_FALLBACK || 'stabilityai/stable-diffusion-3-medium',
    IMAGE_GEN_DAILY_QUOTA_PER_USER: parseInt(process.env.IMAGE_GEN_DAILY_QUOTA_PER_USER || '5', 10),

    PYTHON_SERVICE_URL: process.env.PYTHON_SERVICE_URL || 'http://localhost:8000',
    FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',
    UPLOAD_DIR: process.env.UPLOAD_DIR || './uploads',
    ADMIN_API_TOKEN: process.env.ADMIN_API_TOKEN || '',
    MAX_VIDEO_DURATION_SECONDS: parseInt(process.env.MAX_VIDEO_DURATION_SECONDS || '900', 10),
};

export default serverConfig;
