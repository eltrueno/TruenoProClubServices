import { Router } from "express"
import { getAccountDefinitions, getAllDefinitions } from "../controllers/achievement.controller.js"

const router: Router = Router()

router.get("/", getAllDefinitions)
router.get("/account", getAccountDefinitions)

export default router