import { Router } from "express";
import { verifyJwt } from "../middleware/auth.middleware.js";
import { addTank, getAllClients, getAllClientTanks, getRegisteredTank, getTank, registerTank, removeTank } from "../controllers/tank.controller.js";
import { verifySuperAdmin } from "../middleware/superAdmin.middleware.js";

const router = Router();

router.route('/register-tank').post(verifyJwt, registerTank);
router.route('/add-tank').post(verifyJwt, addTank);
router.route('/get-tank').get(verifyJwt, getTank);
router.route('/get-registeredtank').get(verifyJwt, getRegisteredTank);
router.route('/remove-tank').post(verifyJwt, removeTank);
router.route('/get-clients').get(verifyJwt, verifySuperAdmin, getAllClients);
router.route('/get-client-tanks').get(verifyJwt, verifySuperAdmin, getAllClientTanks);

export default router;
