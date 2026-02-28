import connectDB from "@config/database.config";
import serverConfig from "@config/server.config";
import corsConfig from "@config/cors.config";
import { geminiFlash, geminiPro, embeddingModel } from "@config/gemini.config";

export {
    connectDB,
    serverConfig,
    corsConfig,
    geminiFlash,
    geminiPro,
    embeddingModel,
}