import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import adminRouter from "./admin";
import teacherRouter from "./teacher";
import studentRouter from "./student";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(adminRouter);
router.use(teacherRouter);
router.use(studentRouter);

export default router;
