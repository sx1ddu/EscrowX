
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

export const generateAccessToken = (userId,role)=>
    jwt.sign({id:userId,role},process.env.JWT_ACCESS_SECRET,{
        expiresIn: process.env.JWT_ACCESS_EXPIRES || '15m',
    });

export const generateRefreshToken=(userId)=>
    jwt.sign({ id: userId}, process.env.JWT_REFRESH_SECRET,{
        expiresIn: process.env.JWT_REFRESH_EXPIRES || '7d',
    });

export const verifyAccessToken  = (token) => jwt.verify(token, process.env.JWT_ACCESS_SECRET);
export const verifyRefreshToken = (token) => jwt.verify(token, process.env.JWT_REFRESH_SECRET);


export const generateOTP = () => {
    const otp = crypto.randomInt(100000,999999).toString();
    const expiresAt = new Date(Date.now()+10*60*1000);//10minutes ke liye h
    return { otp, expiresAt };
};


export const generateIdempotencyKey = () => crypto.randomUUID();