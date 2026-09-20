import { Router } from "express"
import { getAllMembers, getMemberProfileById, getAllPlayerStats, getAllPlayerStatsByType, getMyMember } from "../controllers/clubMember.controller.js"
import { requireAuth } from "../middleware/requireAdmin.js"
import { getMyLinkRequest, createMyLinkRequest, cancelMyLinkRequest } from "../controllers/linkRequest.controller.js"

const router = Router()

router.get("/", getAllMembers)
router.get("/stats/:type", getAllPlayerStatsByType)
router.get("/stats", getAllPlayerStats)

// Jugador vinculado a la cuenta con sesión (cookie de auth.casemurocity.org)
router.get("/me", requireAuth, getMyMember)
// Solicitud de vinculacion cuenta <-> jugador (la aprueba un admin)
router.get("/me/link-request", requireAuth, getMyLinkRequest)
router.post("/me/link-request", requireAuth, createMyLinkRequest)
router.delete("/me/link-request", requireAuth, cancelMyLinkRequest)

router.get("/:playerId", getMemberProfileById)

export default router
