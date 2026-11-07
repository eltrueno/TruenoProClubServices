import { Router } from "express"
import { getAllMembers, getMemberProfileById, getAllPlayerStats, getAllPlayerStatsByType, getMyMember, getMyIdentity, unlinkMyIdentity } from "../controllers/clubMember.controller.js"
import { requireAuth } from "../middleware/requireAdmin.js"
import { getMyLinkRequest, createMyLinkRequest, cancelMyLinkRequest } from "../controllers/linkRequest.controller.js"

const router = Router()

router.get("/", getAllMembers)
router.get("/stats/:type", getAllPlayerStatsByType)
router.get("/stats", getAllPlayerStats)

// Jugador vinculado a la cuenta con sesión (cookie de auth.casemuro.stream)
router.get("/me", requireAuth, getMyMember)
// EA ID vinculado a la cuenta aunque no juegue en este club (la vinculación es global)
router.get("/me/identity", requireAuth, getMyIdentity)
// La cuenta suelta su jugador (accounts lo llama antes de borrar la cuenta)
router.delete("/me/identity", requireAuth, unlinkMyIdentity)
// Solicitud de vinculacion cuenta <-> jugador (la aprueba un admin)
router.get("/me/link-request", requireAuth, getMyLinkRequest)
router.post("/me/link-request", requireAuth, createMyLinkRequest)
router.delete("/me/link-request", requireAuth, cancelMyLinkRequest)

router.get("/:playerId", getMemberProfileById)

export default router
