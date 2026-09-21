import { Router, json } from "express"
import { requireAdmin, requireAuth } from "../middleware/requireAdmin.js"
import { patchMember, uploadMemberImage, imageProxy } from "../controllers/admin.controller.js"
import { getPendingLinkRequests, approveLinkRequest, rejectLinkRequest } from "../controllers/linkRequest.controller.js"

const router = Router()

router.use(requireAuth, requireAdmin)

// Panel admin: foto y cuenta vinculada de un miembro
router.patch("/members/:playerId", patchMember)
// Foto del jugador: la web manda el PNG ya recortado (400x450) y se sube a R2
// (solo esta ruta admite un body grande: el PNG llega en base64)
router.post("/members/:playerId/image", json({ limit: "8mb" }), uploadMemberImage)
router.post("/image-proxy", imageProxy)

// Solicitudes de vinculacion pendientes
router.get("/link-requests", getPendingLinkRequests)
router.post("/link-requests/:id/approve", approveLinkRequest)
router.post("/link-requests/:id/reject", rejectLinkRequest)

export default router
