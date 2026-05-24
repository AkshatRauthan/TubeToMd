import cors, { CorsOptions } from 'cors';
import serverConfig from "@config/server.config";

const corsOptions: CorsOptions = {
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
        const localhostRegex = /^http:\/\/localhost:\d+$/;
        const allowedOrigins = [
            'http://localhost:5173',
        ];
        if (process.env.FRONTEND_URL) {
            const urls = process.env.FRONTEND_URL.split(',').map(u => u.trim().replace(/\/$/, ''));
            allowedOrigins.push(...urls);
        }
        const vercelRegex = /^https:\/\/.*\.vercel\.app$/;
        
        if (!origin || localhostRegex.test(origin) || vercelRegex.test(origin) || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
};

export default cors(corsOptions);