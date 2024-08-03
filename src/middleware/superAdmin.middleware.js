import ApiError from "../utils/ApiError.js";
import asyncHandler from "../utils/asynchandler.js";

const verifySuperAdmin = asyncHandler(async(req, _, next) => {
    try {
        if(req.user.role !== 'superadmin'){
            throw new ApiError(401, "You are not super admin.");
        }
        next();
    } catch (error) {
        throw new ApiError(401, error?.message || "Access denied");
    }
})

export{verifySuperAdmin};