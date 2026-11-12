import winston from  'winston';

const logger =  winston.createLogger({
    level: process.env.NODE_ENV === 'production'?'warn':'debug',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.colorize(),
        winston.format.printf(({timestamp,level,message})=>
            `[${timestamp}] ${level}:${message}`
        )
    ),
    transports: [new winston.transports.Console()],
});
export default logger;