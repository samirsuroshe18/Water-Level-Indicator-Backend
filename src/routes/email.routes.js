import { Router } from "express";
import { verifyEmail, resetPassword, verifyPassword } from "../controllers/email.controller.js";

const router = Router();

router.route('/verify-email').get(verifyEmail)
router.route('/reset-password').get(resetPassword)
router.route('/verify-password').post(verifyPassword)


export default router;