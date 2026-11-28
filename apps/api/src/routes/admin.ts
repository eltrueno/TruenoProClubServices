import { Router, json } from "express"
import { requireAdmin, requireAuth } from "../middleware/requireAdmin.js"
import { patchMember, uploadMemberImage, imageProxy, setMatchVoided } from "../controllers/admin.controller.js"
import { getPendingLinkRequests, approveLinkRequest, rejectLinkRequest } from "../controllers/linkRequest.controller.js"
import { getStatus, getWorkerHealth, syncNow, recalculate, getJob, listMaintenance, previewMaintenance, applyMaintenance, getAudit, getLinkRequestHistory } from "../controllers/adminSystem.controller.js"

const router = Router()

router.use(requireAuth, requireAdmin)

// Panel admin: foto y cuenta vinculada de un miembro
router.patch("/members/:playerId", patchMember)
// Foto del jugador: la web manda el PNG ya recortado (400x450) y se sube a R2
// (solo esta ruta admite un body grande: el PNG llega en base64)
router.post("/members/:playerId/image", json({ limit: "8mb" }), uploadMemberImage)
router.post("/image-proxy", imageProxy)

// Partido nulo a mano (true / false) o vuelta al automático (null); el worker recalcula
router.put("/matches/:matchId/voided", setMatchVoided)

// Solicitudes de vinculacion pendientes
router.get("/link-requests", getPendingLinkRequests)
// Ya resueltas de un jugador (quién las aprobó o rechazó)
router.get("/link-requests/history", getLinkRequestHistory)
router.post("/link-requests/:id/approve", approveLinkRequest)
router.post("/link-requests/:id/reject", rejectLinkRequest)

// Sistema: estado del club, sincronizar / recalcular ya y registro de acciones de admin
router.get("/status", getStatus)
// Ping al worker por RPC: vivo, versión, qué tiene en la cola (alive: false si no contesta)
router.get("/worker", getWorkerHealth)
router.post("/sync", syncNow)
router.post("/recalculate", recalculate)
// Trabajos largos (sincronizar, recalcular, mantenimientos): cómo van
router.get("/jobs/:id", getJob)
// Mantenimientos: arreglos de partidos guardados, con vista previa antes de aplicar
router.get("/maintenance", listMaintenance)
router.post("/maintenance/:name/preview", previewMaintenance)
router.post("/maintenance/:name/apply", applyMaintenance)
router.get("/audit", getAudit)

export default router
