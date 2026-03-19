import { Router } from "express"
import { getAllDefinitions } from "@controllers/achievement.controller"

const router: Router = Router()

router.get("/", getAllDefinitions)

export default router