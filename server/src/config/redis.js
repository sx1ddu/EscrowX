import Redis from 'ioredis';
import logger from '../utils/logger.js';

let redisClient;

export const connectRedis = ()=>{
    redisClient = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    redisClient.on('connect',()=>logger.info('Redis Connected'));
    redisClient.on('error',(err)=>logger.error(`redis Error: ${err.message}`));
    return redisClient;
};
export const getRedis = () => redisClient;