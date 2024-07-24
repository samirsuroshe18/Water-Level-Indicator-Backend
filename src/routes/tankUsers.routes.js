import { Router } from "express";
import { verifyJwt } from "../middleware/auth.middleware.js";
import { addTankUser, getTankUser, removeTankUser } from "../controllers/tankUsers.controller.js";
import { verifyAdmin } from "../middleware/admin.middleware.js";

const router = Router();

router.route('/add-user').post(verifyJwt, verifyAdmin, addTankUser);
router.route('/remove-user').post(verifyJwt, verifyAdmin, removeTankUser);
router.route('/get-user').post(verifyJwt, verifyAdmin, getTankUser);

export default router;