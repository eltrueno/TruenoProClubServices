/**
 * Dry run del sistema de logros: copia N partidos de la DB de MONGO_URL (solo
 * lectura) a un Mongo en memoria y ejecuta el recálculo completo del worker
 * (stats + logros) con el código actual. No toca la DB real.
 *
 *   pnpm --filter @trueno-proclub-services/worker achievements:dryrun [limit]
 */
import mongoose from "mongoose"
import { MongoMemoryServer } from "mongodb-memory-server"
import dotenv from "dotenv"
dotenv.config()

const LIMIT = Number(process.argv[2]) || 40
const PROD_URL = String(process.env.MONGO_URL)
const CLUBID = Number(process.env.CLUBID)

const prod = new mongoose.mongo.MongoClient(PROD_URL)
await prod.connect()
const rawMatches = await prod.db().collection("matches").find({}).sort({ timestamp: 1 }).limit(LIMIT).toArray()
await prod.close()

const mem = await MongoMemoryServer.create()
await mongoose.connect(mem.getUri("tpcs_dryrun"))
const db = mongoose.connection.db!

// Partidos anteriores a FC27 (playername, sin id): se adaptan al shape actual para poder procesarlos
const adapt = (m: any) => {
    for (const side of ["localClub", "awayClub"]) {
        m[side].players = m[side].players.map((p: any) => ({ ...p, playerId: p.playerId ?? p.playername, playerName: p.playerName ?? p.playername }))
    }
    return m
}
await db.collection("matches").insertMany(rawMatches.map(adapt))
console.log(`copied ${rawMatches.length} matches; club ${CLUBID}`)

const { setupRabbitmqProducers } = await import("../src/events/index.js")
await setupRabbitmqProducers() // los producers quedan inicializados aunque RabbitMQ no esté disponible
const { syncAchievementDefinitions } = await import("../src/services/achievement.service.js")
await syncAchievementDefinitions()
const { recalculateAllPlayerStats } = await import("../src/services/playerStats.service.js")
await recalculateAllPlayerStats(CLUBID)

const unlocked = await db.collection("achievements_unlocked").find({}).toArray()
const byAch: Record<string, number> = {}
for (const u of unlocked) byAch[u.achievementId] = (byAch[u.achievementId] ?? 0) + 1
console.log("\n=== unlocked:", unlocked.length)
console.log(byAch)
const top = await db.collection("member_stats_officials").find({}).sort({ gamesPlayed: -1 }).limit(3).toArray()
console.log("top stats:", top.map((t) => `${t.playerName}/${t.position} gp=${t.gamesPlayed} g=${t.goals} cs=${t.cleanSheets}`))
if (top[0]) console.log(`unlocks of ${top[0].playerName}:`, unlocked.filter((u) => u.playerId === top[0].playerId).map((u) => `${u.achievementId}${u.reached ? "@" + u.reached : ""}`))

await mongoose.disconnect()
await mem.stop()
process.exit(0)
