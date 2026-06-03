import { syncRecentMatches } from '@services/sync.service';
import { syncMembersFromEA } from '@services/member.service';
import { recalculateAllPlayerStats } from '@services/playerStats.service';
import { PlayerStatsOfficialModel } from '@models/playerstats.model';
import { computePlayerStatsAverages } from '@services/averageStats.service';
import dotenv from "dotenv"

dotenv.config()
const CLUBID: number = Number(process.env.CLUBID) || 290776;
const PLATFORM: string = String(process.env.PLATFORM || 'common-gen5')
const WORKER_INTERVAL = Number(process.env.WORKER_INTERVAL) || 300;
const FORCE_RECALCULATE = process.env.FORCE_RECALCULATE === 'true';

function startWorker() {
    console.log("[Match Finder Worker] Started!")

    // On startup: sync static member info from EA and recalculate stats if needed
    syncMembersFromEA(CLUBID, PLATFORM).then(async () => {
        const statsCount = await PlayerStatsOfficialModel.countDocuments();

        if (statsCount === 0 || FORCE_RECALCULATE) {
            console.info("[Player Stats] Performing startup recalculation from match history...")
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
    }).catch(err => {
        console.error("[Member Worker] Startup error:", err)
    })

    setInterval(async function () {
        try {
            console.log("[Match Finder Worker] Running scheduled sync...");
            await syncRecentMatches(CLUBID, PLATFORM);
            await syncMembersFromEA(CLUBID, PLATFORM);
        } catch (e) {
            console.error("[Match Finder Worker] Error during scheduled sync:", e);
        }
    }, WORKER_INTERVAL * 1000)
}

export { startWorker }
