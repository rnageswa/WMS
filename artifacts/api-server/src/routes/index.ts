import { Router, type IRouter } from "express";
import healthRouter from "./health";
import productsRouter from "./products";
import locationsRouter from "./locations";
import inventoryRouter from "./inventory";

const router: IRouter = Router();

router.use(healthRouter);
router.use(productsRouter);
router.use(locationsRouter);
router.use(inventoryRouter);

export default router;
