import { Router } from "express";
import { verifyJwt } from "../middleware/auth.middleware.js";
import { addTank, getTank } from "../controllers/tank.controller.js";

const router = Router();

router.route('/add-tank').post(verifyJwt, addTank);
router.route('/get-tank').get(verifyJwt, getTank);

export default router;
