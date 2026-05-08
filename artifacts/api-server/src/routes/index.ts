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
import seedRouter from "./seed";
import ordersRouter from "./orders";
import pickingRouter from "./picking";
import { currencyRouter } from "./currency";

const router: IRouter = Router();

// Public — health check and seed (no auth required for seed in dev)
router.use(healthRouter);
router.use(seedRouter);

// Currency read routes (public — no auth needed for listing/converting)
router.use(currencyRouter);

// Auth routes (has its own requireAuth where needed)
router.use(authRouter);

// All routes below require a valid Clerk session
router.use(requireAuth);
router.use(productsRouter);
router.use(locationsRouter);
router.use(inventoryRouter);
router.use(purchasingRouter);
router.use(suppliersRouter);
router.use(notificationsRouter);
router.use(ordersRouter);
router.use(pickingRouter);

export default router;
