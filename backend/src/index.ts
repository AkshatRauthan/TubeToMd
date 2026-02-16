import app from './app';
import { connectDB, serverConfig } from "@config";

const PORT: number = serverConfig.PORT ? parseInt(serverConfig.PORT, 10) : 5000;

connectDB()
    .then(() => {
        app.listen(PORT, () => {
            console.log(`✅ Server running on port ${PORT}`);
        });
    })
    .catch((error) => {
        console.error('❌ Failed to connect to the database:', error);
        process.exit(1);
    });