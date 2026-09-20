import { Router } from "express"
import { requireAdmin, requireAuth } from "../middleware/requireAdmin.js"
import { patchMember } from "../controllers/admin.controller.js"

const router = Router()

router.use(requireAuth, requireAdmin)

// Panel admin: foto y cuenta vinculada de un miembro
router.patch("/members/:playerId", patchMember)

export default router
