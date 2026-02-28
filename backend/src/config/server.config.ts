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
    GEMINI_API_KEY: string;
    PYTHON_SERVICE_URL: string;
    FRONTEND_URL: string;
    UPLOAD_DIR: string;
    ADMIN_API_TOKEN: string;
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
    GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
    PYTHON_SERVICE_URL: process.env.PYTHON_SERVICE_URL || 'http://localhost:8000',
    FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',
    UPLOAD_DIR: process.env.UPLOAD_DIR || './uploads',
    ADMIN_API_TOKEN: process.env.ADMIN_API_TOKEN || '',
};

export default serverConfig;