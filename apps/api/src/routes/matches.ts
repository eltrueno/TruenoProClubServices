import { Router } from "express"
import { getAllMatches, getMatchById, getAllMatchesOrdered, getMatchesByTypeOrdered, getMatchesByPlayer } from "@controllers/match.controller"

const router: Router = Router()

router.get("/", getAllMatches)

router.get("/ordered", getAllMatchesOrdered)
router.get("/ordered/:type", getMatchesByTypeOrdered)

router.get("/player/:playerName", getMatchesByPlayer)

router.get("/:id", getMatchById)

export default router