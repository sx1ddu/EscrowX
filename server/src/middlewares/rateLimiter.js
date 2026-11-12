import  rateLimit from 'express-rate-limit';


export const globalRateLimiter  = rateLimit({
    windowMs: 15*60*1000,//15minutes
    max:100,
    message:{succes:false,message:'Too many requests. Try again later.'},
    standardHeaders:true,
    legacyHeaders:false,
});

export const authRateLimiter = rateLimit({
    windowMs: 15*60*1000,
    max:10,
    message:{success:false,message:'Too many auth attempts. Try again in 15 minutes.'},
});

export const paymentRateLimiter = rateLimit({
    windowMs: 60*1000,
    max:5,
    message: { success:false, message: 'Too many payment requests.Slow down'},
});