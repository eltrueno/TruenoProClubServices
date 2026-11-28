import { syncRecentMatches } from "../services/sync.service.js";
import { syncMembersFromEA } from "../services/member.service.js";
import { recalculateAllPlayerStats } from "../services/playerStats.service.js";
import { syncAchievementDefinitions } from "../services/achievement.service.js";
import { PlayerStatsOfficialModel } from "@trueno-proclub-services/shared/models"
import { computePlayerStatsAverages } from "../services/averageStats.service.js";
import { migrateVoidMatches } from "../services/voidMatches.service.js";
import { syncAccountAchievements } from "../services/accountAchievement.service.js";
import { runExclusive } from "./exclusive.js";
import { setWorkerStatus } from "../services/workerStatus.service.js";
import dotenv from "dotenv"

dotenv.config()
const CLUBID: number = Number(process.env.CLUBID) || 290776;
const PLATFORM: string = String(process.env.PLATFORM || 'common-gen5')
const WORKER_INTERVAL = Number(process.env.WORKER_INTERVAL) || 300;
const FORCE_RECALCULATE = process.env.FORCE_RECALCULATE === 'true';

/**
 * Una sincronización con EA (la del intervalo o la que pide un admin desde el panel): partidos,
 * miembros y logros de cuenta. Deja el resultado en el estado del worker.
 */
export async function runSync(trigger: string): Promise<void> {
    console.log(`[Match Finder Worker] Running sync (${trigger})...`)
    let result: { inserted: number; error?: string } = { inserted: 0 }
    try {
        await runExclusive(async () => {
            result = await syncRecentMatches(CLUBID, PLATFORM);
            await syncMembersFromEA(CLUBID, PLATFORM);
            // También sin partidos nuevos: alguien puede haberse vinculado, conectado Discord o hecho sub
            await syncAccountAchievements(CLUBID);
        }, "sync");
    } catch (e) {
        result = { ...result, error: e instanceof Error ? e.message : String(e) }
        console.error("[Match Finder Worker] Error during sync:", e);
    }
    await setWorkerStatus({ lastSyncAt: new Date(), lastSyncOk: !result.error, lastSyncError: result.error ?? null, lastSyncInserted: result.inserted })
}

function startWorker() {
    console.log("[Match Finder Worker] Started!")
    setWorkerStatus({ clubId: CLUBID, intervalSec: WORKER_INTERVAL, startedAt: new Date() })

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

        // Resumen de este club a la base compartida y logros de cuenta (no falla: avisa y sigue)
        await syncAccountAchievements(CLUBID)
    }, "startup").catch((err: unknown) => {
        console.error("[Member Worker] Startup error:", err)
    })

    setInterval(() => { runSync("scheduled") }, WORKER_INTERVAL * 1000)
}

export { startWorker }
