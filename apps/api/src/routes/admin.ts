import { Router } from "express"
import { requireAdmin, requireAuth } from "../middleware/requireAdmin.js"
import { patchMember } from "../controllers/admin.controller.js"
import { getPendingLinkRequests, approveLinkRequest, rejectLinkRequest } from "../controllers/linkRequest.controller.js"

const router = Router()

router.use(requireAuth, requireAdmin)

// Panel admin: foto y cuenta vinculada de un miembro
router.patch("/members/:playerId", patchMember)

// Solicitudes de vinculacion pendientes
router.get("/link-requests", getPendingLinkRequests)
router.post("/link-requests/:id/approve", approveLinkRequest)
router.post("/link-requests/:id/reject", rejectLinkRequest)

export default router
