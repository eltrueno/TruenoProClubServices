import { Router, Request, Response } from "express";
import { getMatchImage } from "../services/match.service";
import { getAchievementImage } from "../services/playerAchievement.service";
import { getTotwByWeekImage, getLatestTotwImage } from "../services/totw.service";

const router = Router();

router.post("/", async (req: Request, res: Response) => {
  const { type, data } = req.body;

  try {
    console.log(`[RenderRoute] Received render request for type: ${type}`);
    let imageBuffer: Buffer | string;

    switch (type) {
      case 'match-summary':
        if (!data.matchId) throw new Error("matchId is required for match-summary");
        imageBuffer = await getMatchImage(data.matchId);
        break;

      case 'player-achievement':
        if (!data.playerName || !data.type || !data.reached) {
          throw new Error("playerName, type, and reached are required for player-achievement");
        }
        imageBuffer = await getAchievementImage(data.playerName, data.type as string, Number(data.reached));
        break;

      case 'totw':
        if (data.week) {
          imageBuffer = await getTotwByWeekImage(data.week, data.type as "best" | "worst");
        } else {
          imageBuffer = await getLatestTotwImage(data.type ? data.type as "best" | "worst" : "best");
        }
        break;

      default:
        return res.status(400).json({ error: `Unsupported render type: ${type}` });
    }

    res.set("Content-Type", "image/jpeg");
    res.send(imageBuffer);
    console.log(`[RenderRoute] Rendered ${type} successfully`);
  } catch (error: any) {
    console.error(`[RenderRoute] Error rendering ${type}:`, error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
