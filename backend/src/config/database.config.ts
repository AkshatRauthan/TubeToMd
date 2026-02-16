import mongoose from 'mongoose';

const connectDB = async (): Promise<void> => {
	try {
		const db_url: string = process.env.MONGO_URI || 'mongodb://localhost:27017/tradylytics';
		const conn = await mongoose.connect(db_url);
		console.log(`\nMongoDB Connected: ${conn.connection.host}`);
		console.log(`Using DataBase: ${conn.connection.name}`);

	} catch (error) {
		if (error instanceof Error) {
			console.error(`Error: ${error.message}`);
		} else {
			console.error('An unknown error occurred during MongoDB connection.');
			console.error(error);
		}
		process.exit(1);
	}
};

export default connectDB;