import asyncHandler from '../utils/asynchandler.js';
import ApiError from '../utils/ApiError.js';
import ApiResponse from '../utils/ApiResponse.js';
import { User } from '../models/user.model.js';
import { OTP } from '../models/otp.model.js';
import {uploadOnCloudinary, deleteCloudinary} from '../utils/cloudinary.js';
import jwt from 'jsonwebtoken'
import mongoose from 'mongoose';

const generateAccessAndRefreshToken = async (userId) => {
    try {
        const user = await User.findById(userId);
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        user.refreshToken = refreshToken;

        // when we use save() method then all the fields are neccesary so to avoid that we have to pass an object with property {validatBeforeSave:false}
        user.save({ validateBeforeSave: false });

        return { accessToken, refreshToken }
    } catch (error) {
        throw new ApiError(500, "Something wwnt wrong while generating refresh and access token");
    }
}

const registerUser = asyncHandler(async (req, res) => {
    const { userName, email, fullName, password, otp } = req.body;

    if (!userName?.trim() || !email?.trim() || !fullName?.trim() || !password?.trim()) {
        throw new ApiError(400, "All fields are required");
    }

    const existedUser = await User.findOne({
        $or: [{ userName }, { email }]
    });

    if (existedUser) {
        throw new ApiError(409, 'User with same email or username already exists');
    }

    // Find the most recent OTP for the email
    // const response = await OTP.find({ email }).sort({ createdAt: -1 }).limit(1);
    let response = await OTP.find({ otp: otp });
    console.log("Response : ",response)
    if (response.length === 0 || otp !== response[0].otp) {
      return res.status(400).json({
        success: false,
        message: 'The OTP is not valid',
      });
    }

    // Check if 'avatar' is present in req.files and it is an array with at least one element
    if (!req.files?.avatar || !Array.isArray(req.files.avatar) || req.files.avatar.length === 0) {
        throw new ApiError(400, 'Avatar file is required');
    }

    const avatarLocalPath = req.files.avatar[0].path;

    const avatar = await uploadOnCloudinary(avatarLocalPath);

    if (!avatar) {
        throw new ApiError(400, "Avatar file upload failed");
    }

    const user = await User.create({
        fullName,
        avatar: avatar.url || "",
        email,
        password,
        userName
    });

    const createdUser = await User.findById(user._id).select("-password -refreshToken");

    if (!createdUser) {
        throw new ApiError(500, "Something went wrong");
    }

    return res.status(200).json(
        new ApiResponse(200, createdUser, "User registered successfully")
    );
});


const loginUser = asyncHandler(async (req, res) => {
    const { email, userName, password } = req.body;

    if (!userName && !email) {
        throw new ApiError(400, "username or email is required")
    }

    const user = await User.findOne({
        $or: [{ userName }, { email }]
    });

    if (!user) {
        throw new ApiError(404, "User does not exist");
    }

    // you cant access isPasswordCorrect method directly through 'User' beacause User is mogoose object 
    // these methods is applied only the instance of the user when mongoose return its instance
    // you can acces User.findOne() but you cant access User.isPasswordCorrect()
    const isPasswordValid = await user.isPasswordCorrect(password);

    if (!isPasswordValid) {
        throw new ApiError(401, "Invalid user credential");
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user._id);

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken");

    //option object is created beacause we dont want to modified the cookie to front side
    const option = {
        httpOnly: true,
        secure: true
    }

    res.status(200).cookie('accessToken', accessToken, option).cookie('refreshToken', refreshToken, option)
        .json(
            new ApiResponse(200, { loggedInUser, accessToken, refreshToken }, "User logged in sucessully")
        )
});


const logoutUser = asyncHandler(async (req, res) => {
    
    await User.findByIdAndUpdate(req.user._id, { $unset: { refreshToken: 1 } }, { new: true });

    const option = {
        httpOnly: true,
        secure: true
    }

    return res.status(200).clearCookie("accessToken", option).clearCookie("refreshToken", option).json(
        new ApiResponse(200, {}, "User logged out")
    )
})


const refreshAccessToken = asyncHandler(async (req, res) => {
    try {
        const incomingRefreshToken = req.cookie?.refreshToken || req.header("Authorization")?.replace("Bearer ", "");

        if (!incomingRefreshToken) {
            throw new ApiError(401, "Unauthorized request");
        }

        const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET);

        const user = await User.findById(decodedToken?._id);

        if (!user) {
            throw new ApiError(401, "Invalid refresh token");
        }

        if (incomingRefreshToken != user?.refreshToken) {
            throw new ApiError(401, "Refresh token is expired or used");
        }

        const option = {
            httpOnly: true,
            secure: true
        }

        const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user._id);

        return res.status(200).clearCookie("accessToken", accessToken, option).clearCookie("refreshToken", refreshToken, option).json(
            new ApiResponse(200, { accessToken, refreshToken }, "Access token refreshed")
        );
    } catch (error) {
        throw new ApiError(401, "Something went wrong : Invalid refresh token");
    }
})


const changeCurrentPassword = asyncHandler(async (req, res) => {
    const { oldPassword, newPassword } = req.body;

    const user = await User.findById(req.user?._id);
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

    if (!isPasswordCorrect) {
        throw new ApiError(400, "Password is incorrect");
    }

    user.password = newPassword;
    await user.save({ validateBeforeSave: false });

    return res.status(200).json(new ApiResponse(200, {}, "Password changed successfully"));
})


const getCurrentUser = asyncHandler(async (req, res) => {
    return res.status(200).json(
        new ApiResponse(200, req.user, "Current user serched successfully")
    );
})


const updateAccountDetails = asyncHandler(async (req, res) => {
    const { fullName, email } = req.body;

    if (!fullName && !email) {
        throw new ApiError(400, "All fields are required");
    }

    const user = await User.findByIdAndUpdate(req.user?._id, {
        $set: {
            fullName,
            email,
        }
    }, { new: true }).select("-password -refreshToken")

    return res.status(200).json(
        new ApiResponse(200, user, "Account details updated successfully")
    );
})


const updateUserAvatar = asyncHandler(async (req, res) => {
    const avatarLocalPath = req.file?.path;

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is missing");
    }

    const cloudinaryPath = await req.user.avatar;

    if(cloudinaryPath){
        await deleteCloudinary(cloudinaryPath);
    }
    
    const avatar = await uploadOnCloudinary(avatarLocalPath);

    if (!avatar.url) {
        throw new ApiError(400, "Error while uploading on avatar");
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                avatar: avatar.url
            }
        },
        { new: true }
    ).select("-password")

    return res.status(200).json(
        new ApiResponse(200, user, "Avatar image uploaded successfully")
    )
})


export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
};
