import { Router } from "express";
import { verifyJwt } from "../middleware/auth.middleware.js";
import { 
    changeCurrentPassword, 
    forgotPassword, 
    getCurrentUser, 
    loginAdmin, 
    loginUser, 
    logoutUser, 
    refreshAccessToken, 
    registerUser, 
    updateAccountDetails } from "../controllers/user.controller.js";

const router = Router();

router.route('/register').post(registerUser);
router.route('/login').post(loginUser);
router.route('/login-admin').post(loginAdmin);
router.route('/forgot-password').post(forgotPassword);

//Secure routes
router.route('/logout').get(verifyJwt, logoutUser);
router.route('/refresh-token').post(refreshAccessToken);
router.route('/change-password').post(verifyJwt, changeCurrentPassword);
router.route('/get-current-user').get(verifyJwt, getCurrentUser);
router.route('/update-details').patch(verifyJwt, updateAccountDetails);


// Imgages Route
// router.route('/update-avatar').patch(verifyJwt, upload.single("avatar"), updateUserAvatar);
// router.route('/register').post(upload.fields([{name:'avatar', maxCount:1}]), registerUser);

export default router;