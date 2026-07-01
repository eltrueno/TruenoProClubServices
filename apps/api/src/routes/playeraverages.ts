import { Router } from "express"
import { getAllAverages, getAverageByPosition } from "@controllers/averageStats.controller"

const router: Router = Router()

router.get("/", getAllAverages)
router.get("/:position", getAverageByPosition)

export default router