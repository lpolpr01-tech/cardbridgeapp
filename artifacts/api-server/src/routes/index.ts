import { Router, type IRouter } from "express";
import healthRouter from "./health";
import creditRouter from "./credit";
import authRouter from "./auth";
import plaidRouter from "./plaid";
import stripeRouter from "./stripe";
import aiAgentRouter from "./ai-agent";

const router: IRouter = Router();

router.use(healthRouter);
router.use(creditRouter);
router.use(authRouter);
router.use(plaidRouter);
router.use(stripeRouter);
router.use(aiAgentRouter);

export default router;
