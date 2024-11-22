import { Router } from "express";
import { verifyJwtForLimitFlow } from "../controllers/limitFlow.controller.js";
import { loginUser, getCurrentUser, logoutUser } from "../controllers/limitFlow.controller.js";

const router = Router();

router.route('/login').post(loginUser);
router.route('/get-current-user').get(verifyJwtForLimitFlow, getCurrentUser);
router.route('/logout').get(verifyJwtForLimitFlow, logoutUser);

export default router;