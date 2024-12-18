import asyncHandler from '../utils/asynchandler.js';
import ApiError from '../utils/ApiError.js';
import ApiResponse from '../utils/ApiResponse.js';
import { User } from '../models/user.model.js';
import jwt from 'jsonwebtoken'
import mailSender from '../utils/mailSender.js';

const generateAccessAndRefreshToken = async (userId) => {
    try {
        const user = await User.findById(userId);
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        user.refreshToken = refreshToken;

        // when we use save() method then all the fields are neccesary so to avoid that we have to pass an object with property {validatBeforeSave:false}
        await user.save({ validateBeforeSave: false });

        return { accessToken, refreshToken }
    } catch (error) {
        throw new ApiError(500, "Something wwnt wrong while generating refresh and access token");
    }
}

const registerUser = asyncHandler(async (req, res) => {
    const { userName, email, confirmPassword, password } = req.body;

    if (!userName?.trim() || !email?.trim() || !confirmPassword?.trim() || !password?.trim()) {
        throw new ApiError(400, "All fields are required");
    }

    if (password !== confirmPassword) {
        throw new ApiError(400, "Password do not match");
    }

    const existedUser = await User.findOne({ email });

    if (existedUser) {
        throw new ApiError(409, 'User with same email already exists');
    }

    const user = await User.create({
        userName,
        email,
        password,
    });

    const createdUser = await User.findById(user._id);

    if (!createdUser) {
        throw new ApiError(500, "Something went wrong");
    }

    const mailResponse = await mailSender(email, createdUser._id, "VERIFY");

    if (mailResponse) {
        return res.status(200).json(
            new ApiResponse(200, {}, "An email sent to your account please verify in 10 minutes")
        );
    }

    throw new ApiError(500, "Something went wrong!! An email couldn't sent to your account");
});

const loginUser = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    if (!email) {
        throw new ApiError(400, "email is required");
    }

    const user = await User.findOne({ email });

    if (!user) {
        throw new ApiError(404, "Invalid email");
    }

    // you cant access isPasswordCorrect method directly through 'User' beacause User is mogoose object 
    // these methods is applied only the instance of the user when mongoose return its instance
    // you can acces User.findOne() but you cant access User.isPasswordCorrect()
    const isPasswordValid = await user.isPasswordCorrect(password);

    if (!isPasswordValid) {
        throw new ApiError(401, "Invalid user credential");
    }

    if (!user?.isVerfied) {
        const mailResponse = await mailSender(email, user._id, "VERIFY");

        if (mailResponse) {
            return res.status(401).json(
                new ApiResponse(401, {}, "An email sent to your account please verify in 10 minutes")
            );
        }
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user._id);

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken -__v");

    //option object is created beacause we dont want to modified the cookie to front side
    const option = {
        httpOnly: true,
        secure: true
    }

    return res.status(200).cookie('accessToken', accessToken, option).cookie('refreshToken', refreshToken, option).json(
        new ApiResponse(200, { loggedInUser, accessToken, refreshToken }, "User logged in sucessully")
    );
});

const loginAdmin = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    if (!email) {
        throw new ApiError(400, "email is required");
    }

    const user = await User.findOne({ email });

    if (!user || user.role !== 'superadmin') {
        throw new ApiError(404, "Invalid credential");
    }

    // you cant access isPasswordCorrect method directly through 'User' beacause User is mogoose object 
    // these methods is applied only the instance of the user when mongoose return its instance
    // you can acces User.findOne() but you cant access User.isPasswordCorrect()
    const isPasswordValid = await user.isPasswordCorrect(password);

    if (!isPasswordValid) {
        throw new ApiError(401, "Invalid credential");
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user._id);

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken -__v");

    //option object is created beacause we dont want to modified the cookie to front side
    const option = {
        httpOnly: true,
        secure: true
    }

    return res.status(200).cookie('accessToken', accessToken, option).cookie('refreshToken', refreshToken, option).json(
        new ApiResponse(200, { loggedInUser, accessToken, refreshToken }, "User logged in sucessully")
    );
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

const forgotPassword = asyncHandler(async (req, res) => {
    const { email } = req.body;

    const user = await User.findOne({ email });

    if (!user || !user?.isVerfied) {
        throw new ApiError(404, "Invalid email");
    }

    const mailResponse = await mailSender(email, user._id, "RESET");

    if (mailResponse) {
        return res.status(200).json(
            new ApiResponse(200, {}, "An email sent to your account please reset your password in 10 minutes")
        );
    }

    throw new ApiError(500, "Something went wrong!! An email couldn't sent to your account");
})

const getCurrentUser = asyncHandler(async (req, res) => {
    return res.status(200).json(
        new ApiResponse(200, req.user, "Current user serched successfully")
    );
})

const updateAccountDetails = asyncHandler(async (req, res) => {
    const { userName } = req.body;

    const user = await User.findByIdAndUpdate(req.user?._id, {
        $set: {
            userName: userName || req.user.userName,
        }
    }, { new: true }).select("-password -refreshToken");

    return res.status(200).json(
        new ApiResponse(200, {}, "Account details updated successfully")
    );
})


export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    forgotPassword,
    loginAdmin
};
