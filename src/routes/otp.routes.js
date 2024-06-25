import { Router } from "express";
import { sendOTP } from "../controllers/otp.controller.js";

const router = Router();

router.route('/send-otp').post(sendOTP);


export default router;