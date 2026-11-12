export const successResponse = (res,statusCode=200,message='success',data = {})=>
    res.status(statusCode).json({success: true, message, data});

export const errorResponse = (res,statusCode=500, message='Something went wrong')=>
    res.status(statusCode).json({success: false,message});
