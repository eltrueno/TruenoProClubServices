import { Router } from "express"
import { getAllMembers, getMemberProfileById, getAllPlayerStats, getAllPlayerStatsByType, getMyMember } from "../controllers/clubMember.controller.js"
import { requireAuth } from "../middleware/requireAdmin.js"

const router = Router()

router.get("/", getAllMembers)
router.get("/stats/:type", getAllPlayerStatsByType)
router.get("/stats", getAllPlayerStats)

// Jugador vinculado a la cuenta con sesión (cookie de auth.casemurocity.org)
router.get("/me", requireAuth, getMyMember)

router.get("/:playerId", getMemberProfileById)

export default router
