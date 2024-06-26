import { Router } from "express";
import { sendOTP, verifyEmail, resetPassword, verifyPassword } from "../controllers/otp.controller.js";

const router = Router();

router.route('/send-otp').post(sendOTP);
router.route('/verify-email').get(verifyEmail)
router.route('/reset-password').get(resetPassword)
router.route('/verify-password').post(verifyPassword)


export default router;