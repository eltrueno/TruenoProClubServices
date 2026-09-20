import { Router } from "express"
import { publicUserService } from "../services/publicUserService.js"

const router = Router()

/**
 * GET /api/public/users?ids=id1,id2,id3
 * Returns only public data (id, name, image). Unauthenticated: it is intentionally public.
 */
router.get("/users", async (req, res) => {
    const idsParam = req.query.ids
    if (typeof idsParam !== "string" || !idsParam.trim()) {
        return res.status(400).json({ status: "error", message: "Missing ids param" })
    }

    const ids = idsParam.split(",").map((s) => s.trim()).filter(Boolean)
    const result = await publicUserService.getPublicUsersByIds(ids)

    if (!result.ok) {
        switch (result.error.code) {
            case "TOO_MANY_IDS":
                return res.status(400).json({ status: "error", message: "Too many ids in one request" })
            case "NO_VALID_IDS":
                return res.status(400).json({ status: "error", message: "No valid ids provided" })
            default:
                return res.status(500).json({ status: "error", message: "Unknown error" })
        }
    }

    res.json({ status: "success", data: result.data })
})

export default router