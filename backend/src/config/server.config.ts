import dotenv from 'dotenv';
dotenv.config();

interface ServerConfig {
    PORT: string | undefined;
    MONGO_URI: string | undefined;
    JWT_SECRET: string | undefined;

    AUTH_BACKEND_URL: string | undefined;
    AI_ANALYTICS_BACKEND_URl: string | undefined;
    JOURNALING_FRONTEND_URL: string | undefined;
}

const serverConfig: ServerConfig = {
    PORT: process.env.PORT,
    MONGO_URI: process.env.MONGO_URI,
    JWT_SECRET: process.env.JWT_SECRET,
    
    AUTH_BACKEND_URL: process.env.AUTH_BACKEND_URL,
    AI_ANALYTICS_BACKEND_URl: process.env.AI_ANALYTICS_BACKEND_URl,
    JOURNALING_FRONTEND_URL : process.env.JOURNALING_FRONTEND_URL,
}

export default serverConfig;