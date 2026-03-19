import { Router } from "express"
import { getLatestTOTW, getTOTWByWeek, getAllTOTWS, getAllAppearances, getAppearancesByWeek } from "@controllers/totw.controller"

const router: Router = Router()

router.get("/", getAllTOTWS)
router.get("/latest", getLatestTOTW)
router.get("/appearances", getAllAppearances)
router.get("/appearances/:week", getAppearancesByWeek)
router.get("/:week", getTOTWByWeek)

export default router