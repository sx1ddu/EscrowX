import mongoose from 'mongoose';
import logger from '../utils/logger.js';

export const connectDB = async ()=>{
       try {
         const conn = await mongoose.connect(process.env.MONGO_URI,{
            dbName: 'trusttrade',
         });
         logger.info(`MongoDB Connected: ${conn.connection.host}`);
       } catch (err) {
          logger.error(`MongoDB Error: ${err.message}`);
          process.exit(1);
       }
}