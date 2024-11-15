import { Router } from "express";
import { verifyJwtForLimitFlow } from "../controllers/limitFlow.controller.js";
import { loginUser, getCurrentUser } from "../controllers/limitFlow.controller.js";

const router = Router();

router.route('/login').post(loginUser);
router.route('/get-current-user').get(verifyJwtForLimitFlow, getCurrentUser);

export default router;