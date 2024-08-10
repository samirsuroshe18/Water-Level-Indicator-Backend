import { Router } from "express";
import { verifyJwt } from "../middleware/auth.middleware.js";
import { addAccessTank, getAccessTank, removeAccessTank, updateAccessTank } from "../controllers/accessTank.controller.js";

const router = Router();

router.route('/add-accesstank').post(verifyJwt, addAccessTank);
router.route('/get-accesstank').get(verifyJwt, getAccessTank);
router.route('/remove-accesstank').post(verifyJwt, removeAccessTank);
router.route('/update-accesstank').patch(verifyJwt, updateAccessTank);

export default router;