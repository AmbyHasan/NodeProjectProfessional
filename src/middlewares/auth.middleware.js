import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import jwt from "jsonwebtoken"
import { User } from "../models/user.model.js";
import cookieParser from "cookie-parser";



export const verifyJWT = asyncHandler( async( req ,_ , next)=>{ //because here we are not utitlizing code that is why we are using underscore
    try {
        const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer " ,""); //Authorization - > Bearer token_name
    
        if(!token) throw new ApiError(401 , "Unauthorized header");
    
        const decodedToken=jwt.verify(token ,process.env.ACCESS_TOKEN_SECRET);
    
        const  user =await User.findById(decodedToken?._id).select("-password  -refreshToken"); //user object excluding password and refreshToken
        if(!user) throw new ApiError(401 ,"Invalid access token");
    
        req.user=user; //adding a new object in the request
        next();
    } catch (error) {
          throw new ApiError(401 , error.message || "Invalid access token");
    }

})