// controllers/otpController.js
import { generate } from 'otp-generator';
import { OTP } from '../models/otp.model.js';
import { User } from '../models/user.model.js';
import ApiResponse from '../utils/ApiResponse.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asynchandler.js';


async function sendOTP (req, res) {
  try {
    const { email } = req.body;
    // Check if user is already present
    const checkUserPresent = await User.findOne({ email });
    // If user found with provided email
    if (checkUserPresent) {
      return res.status(401).json({
        success: false,
        message: 'User is already registered',
      });
    }
    let otp = generate(6, {
      upperCaseAlphabets: false,
      lowerCaseAlphabets: false,
      specialChars: false,
    });
    let result = await OTP.findOne({ otp: otp });
    while (result) {
      otp = generate(6, {
        upperCaseAlphabets: false,
      });
      result = await OTP.findOne({ otp: otp });
    }
    const otpPayload = { email, otp };
    const otpBody = await OTP.create(otpPayload);
    res.status(200).json({
      success: true,
      message: 'OTP sent successfully',
      otp,
    });
  } catch (error) {
    console.log(error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
};

const verifyEmail = asyncHandler( async (req, res)=>{
  try {
    const token = req.query.token;
    const user = await User.findOne({verifyToken:token, verifyTokenExpiry:{$gt: Date.now()}});

    if(!user){
      return res.render("invalid")
    }

    user.isVerfied = true;
    user.verifyToken = undefined;
    user.verifyTokenExpiry = undefined;
    await user.save()

    return res.render("success");

  } catch (error) {
    console.log(error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
});

const resetPassword = asyncHandler( async (req, res)=>{
  try {
    const token = req.query.token;

    const user = await User.findOne({forgotPasswordToken:token, forgotPasswordTokenExpiry:{$gt: Date.now()}});

    if(!user){
      return res.render("invalidForgotLink")
    }

    return res.render("forgotPasswordSuccess")

  } catch (error) {
    console.log(error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
})

const verifyPassword = asyncHandler( async (req, res)=>{
  try {
    const token = req.query.token;
    const { password, confirmPassword } = req.body;

    if (password !== confirmPassword) {
      throw new ApiError(400, "Password do not match");
  }

    const user = await User.findOne({forgotPasswordToken:token, forgotPasswordTokenExpiry:{$gt: Date.now()}});

    if(!user){
      throw new ApiError(500, "Invalid or expired token");
    }

    user.forgotPasswordToken = undefined;
    user.forgotPasswordTokenExpiry = undefined;
    user.password = password
    await user.save()

    return res.status(200).json(
      new ApiResponse(200, {}, "Password reset successful")
    )

  } catch (error) {
    console.log(error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
})


export{sendOTP, verifyEmail, resetPassword, verifyPassword}