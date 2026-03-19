import { Router } from 'express';
import { getAllMembers, getMemberProfileByName, getAllPlayerStats, getAllPlayerStatsByType } from "@controllers/clubMember.controller"

const router = Router()



router.get("/", getAllMembers)

router.get("/stats/:type", getAllPlayerStatsByType)

router.get("/stats", getAllPlayerStats)

router.get("/:playername", getMemberProfileByName)

export default router;