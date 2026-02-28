import { GoogleGenerativeAI } from '@google/generative-ai';
import serverConfig from '@config/server.config';

const genAI = new GoogleGenerativeAI(serverConfig.GEMINI_API_KEY);

// Text generation model (fast, free tier)
export const geminiFlash = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash',
});

// For complex analysis
export const geminiPro = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash',
});

// For embeddings
export const embeddingModel = genAI.getGenerativeModel({
    model: 'text-embedding-004',
});

export default genAI;
