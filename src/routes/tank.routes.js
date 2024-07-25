import { Router } from "express";
import { verifyJwt } from "../middleware/auth.middleware.js";
import { addTank, getRegisteredTank, getTank, registerTank, removeTank } from "../controllers/tank.controller.js";

const router = Router();

router.route('/register-tank').post(verifyJwt, registerTank);
router.route('/add-tank').post(verifyJwt, addTank);
router.route('/get-tank').get(verifyJwt, getTank);
router.route('/get-registeredtank').get(verifyJwt, getRegisteredTank);
router.route('/remove-tank').post(verifyJwt, removeTank);

export default router;
