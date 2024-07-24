import ApiError from "../utils/ApiError.js";
import asyncHandler from "../utils/asynchandler.js";
import { Tank } from "../models/tank.model.js";

const verifyAdmin = asyncHandler(async(req, _, next) => {
    try {
        
        const admin = await Tank.find({ user: req.user._id }).exec();
        if(!admin || admin.length === 0){
            throw new ApiError(401, "You are not admin.");
        }
    
        req.admin = req.user;
        next();
    } catch (error) {
        throw new ApiError(401, error?.message || "Access denied");
    }
})

export{verifyAdmin};