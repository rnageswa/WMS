import { Router, type IRouter } from "express";
import healthRouter from "./health";
import productsRouter from "./products";
import locationsRouter from "./locations";
import inventoryRouter from "./inventory";
import { purchasingRouter } from "./purchasing";
import { suppliersRouter } from "./suppliers";

const router: IRouter = Router();

router.use(healthRouter);
router.use(productsRouter);
router.use(locationsRouter);
router.use(inventoryRouter);
router.use(purchasingRouter);
router.use(suppliersRouter);

export default router;
