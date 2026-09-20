import { Router } from "express"
import { getAllDefinitions } from "../controllers/achievement.controller.js"

const router: Router = Router()

router.get("/", getAllDefinitions)

export default router