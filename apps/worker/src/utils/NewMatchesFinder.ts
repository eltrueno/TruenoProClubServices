import { syncRecentMatches } from "../services/sync.service.js";
import { syncMembersFromEA } from "../services/member.service.js";
import { recalculateAllPlayerStats } from "../services/playerStats.service.js";
import { syncAchievementDefinitions } from "../services/achievement.service.js";
import { PlayerStatsOfficialModel } from "@trueno-proclub-services/shared/models"
import { computePlayerStatsAverages } from "../services/averageStats.service.js";
import { migrateVoidMatches } from "../services/voidMatches.service.js";
import { runExclusive } from "./exclusive.js";
import dotenv from "dotenv"

dotenv.config()
const CLUBID: number = Number(process.env.CLUBID) || 290776;
const PLATFORM: string = String(process.env.PLATFORM || 'common-gen5')
const WORKER_INTERVAL = Number(process.env.WORKER_INTERVAL) || 300;
const FORCE_RECALCULATE = process.env.FORCE_RECALCULATE === 'true';

function startWorker() {
    console.log("[Match Finder Worker] Started!")

    // On startup: seed achievement definitions, enrich members from EA and recalculate stats if needed
    // Todo lo que toca stats va por runExclusive (ver utils/exclusive.ts)
    runExclusive(async () => {
        // true = cambian logros que ya existían: los desbloqueados se rehacen desde cero
        const achievementsChanged = await syncAchievementDefinitions()
        await syncMembersFromEA(CLUBID, PLATFORM)

        // Una sola vez: partidos nulos / abandonos de amistosos ya guardados (recalcula si la hace)
        const migrated = await migrateVoidMatches(CLUBID).catch((err) => {
            console.error("[Void matches] Migration error:", err)
            return false
        })

        const statsCount = await PlayerStatsOfficialModel.countDocuments();

        if (migrated) {
            console.info("[Player Stats] Already recalculated by the void-matches migration.")
        } else if (statsCount === 0 || FORCE_RECALCULATE || achievementsChanged) {
            console.info(achievementsChanged
                ? "[Player Stats] Achievement definitions changed: recalculating stats and achievements from match history..."
                : "[Player Stats] Performing startup recalculation from match history...")
            await recalculateAllPlayerStats(CLUBID).catch(err =>
                console.error("[Player Stats] Recalculation error:", err)
            )
        } else {
            console.info("[Player Stats] Stats already present, skipping full recalculation. (Set FORCE_RECALCULATE=true to force it)");
        }

        console.info("[Average Stats] Performing startup recalculation...")
        await computePlayerStatsAverages().catch(err =>
            console.error("[Average Stats] Recalculation error:", err)
        )
        console.info("[Average Stats] Player averages recalculated")
    }).catch((err: unknown) => {
        console.error("[Member Worker] Startup error:", err)
    })

    setInterval(async function () {
        try {
            console.log("[Match Finder Worker] Running scheduled sync...");
            await runExclusive(async () => {
                await syncRecentMatches(CLUBID, PLATFORM);
                await syncMembersFromEA(CLUBID, PLATFORM);
            });
        } catch (e) {
            console.error("[Match Finder Worker] Error during scheduled sync:", e);
        }
    }, WORKER_INTERVAL * 1000)
}

export { startWorker }
