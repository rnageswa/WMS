import { Router, type IRouter } from "express";
import healthRouter from "./health";
import productsRouter from "./products";
import locationsRouter from "./locations";
import inventoryRouter from "./inventory";
import { purchasingRouter } from "./purchasing";

const router: IRouter = Router();

router.use(healthRouter);
router.use(productsRouter);
router.use(locationsRouter);
router.use(inventoryRouter);
router.use(purchasingRouter);

export default router;
