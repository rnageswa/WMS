import { Router, type IRouter } from "express";
import { requireAuth } from "../middlewares/auth";
import healthRouter from "./health";
import productsRouter from "./products";
import locationsRouter from "./locations";
import inventoryRouter from "./inventory";
import { purchasingRouter } from "./purchasing";
import { suppliersRouter } from "./suppliers";
import notificationsRouter from "./notifications";
import authRouter from "./auth";

const router: IRouter = Router();

// Public — health check does not need auth
router.use(healthRouter);

// All routes below require a valid Clerk session
router.use(requireAuth);
router.use(productsRouter);
router.use(locationsRouter);
router.use(inventoryRouter);
router.use(purchasingRouter);
router.use(suppliersRouter);
router.use(notificationsRouter);
router.use(authRouter);

export default router;
