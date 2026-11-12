import logger from '../utils/logger.js';

export const notFound = (req,res, next)=>{
    const err = new Error(`Route not found:${req.originalUrl}`);
    err.statusCode = 404;
    next(err);
};

export const globalErrorHandler = (err,req,res,next)=>{
    let statusCode = err.statusCode || 500;
    let message = err.message || 'Internal Server Error';
      //mongoose duplicate key
    if(err.code===11000){
        statusCode = 400;
        const field = Object.keys(err.keyValue)[0];
        message = `${field} already exists`;
    }
    // Mongoose validation error
    if(err.name === 'ValidationError'){
        statusCode = 400;
        message = Object.values(err.errors).map(e => e.message).join(', ');
    }
    //jwt errors
    if(err.name==='JsonWebTokenError'){statusCode = 401;message='Invalid token.';}
    if(err.name==='TokenExpiredError'){statusCode = 401;message='Token expired';}

    if(statusCode ===500)logger.error(`${err.stack}`);

    res.status(statusCode).json({
        success:false,
        message,
        ...(process.env.NODE_ENV==='development'&&{stack:err.stack}),
    });
};
