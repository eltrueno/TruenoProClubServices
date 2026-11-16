import { ACCOUNT_ACHIEVEMENT_DEFINITIONS, type IAccountAchievementUnlocked, type IPlayerClubTotals } from "@trueno-proclub-services/shared"
import {
    AccountAchievementUnlockedModel, AchievementDefinitionModel, AchievementProgressModel, AchievementUnlockedModel,
    PlayerClubTotalsModel, PlayerIdentityModel, PlayerStatsFriendlyModel, PlayerStatsOfficialModel
} from "@trueno-proclub-services/shared/models"
import { evaluateAchievements } from "./achievement.service.js"
import type { Metrics } from "./achievementMetrics.js"

/**
 * Logros de cuenta (comunes a todos los clubes, solo para cuentas vinculadas a su jugador).
 *
 * Cada club tiene su base y su worker, y ninguno ve los datos del otro. Para sumar "entre
 * clubes" cada worker deja en la base compartida un resumen de sus jugadores
 * (`player_club_totals`) y los logros se evalúan con la suma de esos resúmenes más los datos
 * de la cuenta, que se piden al auth con un token de API (`AUTH_API_TOKEN`).
 *
 * Solo se añaden desbloqueos, nunca se quitan: un logro de cuenta no se pierde. Por eso da
 * igual que lo evalúen los workers de dos clubes a la vez (índice único) o que el auth no
 * responda una vez (se evalúa lo que se pueda y el resto, a la siguiente).
 */

const AUTH_URL = () => (process.env.AUTH_URL || "https://auth.casemuro.stream").replace(/\/+$/, "")
const AUTH_API_TOKEN = () => process.env.AUTH_API_TOKEN || ""
/** Máximo de cuentas por petición al auth */
const CHUNK = 100

/** Lo que hace falta de una cuenta (de `GET /api/v1/accounts` del auth) */
export interface AccountInfo {
    id: string
    twitchFollowing?: boolean
    twitchSub?: boolean
    twitchSubTier?: string | null
    discordId?: string | null
    createdAt?: string | Date | null
}

// ---------------------------------------------------------------------------------------
// Resumen de este club en la base compartida
// ---------------------------------------------------------------------------------------

/** Deja en la base compartida lo que lleva cada jugador en ESTE club (partidos, goles, logros…) */
export async function refreshClubTotals(clubId: number): Promise<number> {
    const group = { $group: { _id: "$playerId", gamesPlayed: { $sum: "$gamesPlayed" }, wins: { $sum: "$wins" }, goals: { $sum: "$goals" }, assists: { $sum: "$assists" } } }
    type Row = { _id: string, gamesPlayed: number, wins: number, goals: number, assists: number }
    const [official, friendly, unlocks, definitions, progress] = await Promise.all([
        PlayerStatsOfficialModel.aggregate<Row>([group]),
        PlayerStatsFriendlyModel.aggregate<Row>([group]),
        AchievementUnlockedModel.find({}, { playerId: 1, achievementId: 1 }).lean(),
        AchievementDefinitionModel.find({}, { points: 1 }).lean(),
        AchievementProgressModel.find({}, { playerId: 1, day: 1 }).lean(),
    ])

    const totals = new Map<string, Omit<IPlayerClubTotals, "updatedAt">>()
    const of = (playerId: string) => {
        let t = totals.get(playerId)
        if (!t) {
            t = { playerId, clubId, gamesPlayed: 0, wins: 0, goals: 0, assists: 0, lastDay: null, achievements: 0, points: 0 }
            totals.set(playerId, t)
        }
        return t
    }
    for (const row of [...official, ...friendly]) {
        const t = of(row._id)
        t.gamesPlayed += row.gamesPlayed || 0
        t.wins += row.wins || 0
        t.goals += row.goals || 0
        t.assists += row.assists || 0
    }
    const pointsOf = new Map(definitions.map((d) => [String(d._id), Number(d.points) || 0]))
    for (const u of unlocks) {
        const t = of(u.playerId)
        t.achievements += 1
        t.points += pointsOf.get(u.achievementId) ?? 0
    }
    for (const p of progress) of(p.playerId).lastDay = p.day ?? null

    const rows = [...totals.values()]
    if (rows.length > 0) {
        await PlayerClubTotalsModel.bulkWrite(rows.map((row) => ({
            updateOne: { filter: { playerId: row.playerId, clubId }, update: { $set: row }, upsert: true }
        })))
    }
    // Quien ya no tiene nada en este club (p. ej. tras un recálculo) deja de contar
    await PlayerClubTotalsModel.deleteMany({ clubId, playerId: { $nin: rows.map((r) => r.playerId) } })
    return rows.length
}

// ---------------------------------------------------------------------------------------
// Métricas de una cuenta
// ---------------------------------------------------------------------------------------

const secondLargest = (values: number[]): number => [...values].sort((a, b) => b - a)[1] ?? 0

/**
 * Lo que miran los logros de cuenta. `account` es null si no se ha podido preguntar al auth:
 * entonces solo salen las métricas de juego y las de la cuenta se quedan sin valor (no se
 * desbloquean, pero tampoco se da por hecho que no es sub).
 */
export function accountMetrics(account: AccountInfo | null, clubs: Pick<IPlayerClubTotals, "gamesPlayed" | "wins" | "goals" | "assists" | "lastDay" | "achievements" | "points">[], now = new Date()): Metrics {
    const sum = (f: "gamesPlayed" | "wins" | "goals" | "assists" | "achievements" | "points") => clubs.reduce((acc, c) => acc + (Number(c[f]) || 0), 0)
    const played = clubs.filter((c) => c.gamesPlayed > 0)
    const days = new Map<string, number>()
    for (const c of played) if (c.lastDay) days.set(c.lastDay, (days.get(c.lastDay) ?? 0) + 1)

    const metrics: Metrics = {
        // Solo se evalúa a quien tiene la cuenta vinculada
        playerLinked: 1,
        clubsPlayed: played.length,
        // "en cada uno de dos clubes": lo que lleva en su segundo club con más
        minGamesPerClub: secondLargest(clubs.map((c) => c.gamesPlayed)),
        clubsScored: clubs.filter((c) => c.goals > 0).length,
        minGoalsPerClub: secondLargest(clubs.map((c) => c.goals)),
        sameDayClubs: Math.max(0, ...days.values()),
        totalGamesPlayed: sum("gamesPlayed"),
        totalGoalsScored: sum("goals"),
        totalAssists: sum("assists"),
        totalWins: sum("wins"),
        clubAchievements: sum("achievements"),
        clubPoints: sum("points"),
    }
    if (!account) return metrics

    const follower = !!account.twitchFollowing
    const sub = !!account.twitchSub
    const discord = !!account.discordId
    const created = account.createdAt ? new Date(account.createdAt).getTime() : NaN
    return {
        ...metrics,
        discordLinked: discord ? 1 : 0,
        twitchFollower: follower ? 1 : 0,
        twitchSub: sub ? 1 : 0,
        twitchSubHighTier: sub && ["2000", "3000"].includes(String(account.twitchSubTier)) ? 1 : 0,
        fullPack: discord && follower && sub ? 1 : 0,
        accountAgeDays: Number.isFinite(created) ? Math.floor((now.getTime() - created) / 86_400_000) : 0,
    }
}

// ---------------------------------------------------------------------------------------
// Evaluación
// ---------------------------------------------------------------------------------------

let warnedNoToken = false

/** Cuentas del auth por id. null si no hay token o no responde (se sigue sin los datos de cuenta) */
async function fetchAccounts(userIds: string[]): Promise<Map<string, AccountInfo> | null> {
    const token = AUTH_API_TOKEN()
    if (!token) {
        if (!warnedNoToken) {
            console.warn("[Account achievements] Falta AUTH_API_TOKEN: no se evalúan los logros que dependen de la cuenta (Discord, follow, sub…), solo los de juego")
            warnedNoToken = true
        }
        return null
    }
    try {
        const accounts = new Map<string, AccountInfo>()
        for (let i = 0; i < userIds.length; i += CHUNK) {
            const res = await fetch(`${AUTH_URL()}/api/v1/accounts?ids=${userIds.slice(i, i + CHUNK).join(",")}`, {
                headers: { authorization: `Bearer ${token}` },
                signal: AbortSignal.timeout(10_000),
            })
            if (!res.ok) throw new Error(`HTTP ${res.status}`)
            const body = (await res.json()) as { data?: AccountInfo[] }
            for (const a of body.data ?? []) accounts.set(a.id, a)
        }
        return accounts
    } catch (err) {
        console.warn("[Account achievements] El auth no responde, se evalúan solo los logros de juego:", err instanceof Error ? err.message : err)
        return null
    }
}

/**
 * Evalúa los logros de cuenta de todas las cuentas vinculadas a un jugador y guarda los
 * nuevos. `getAccounts` se puede sustituir en los tests. Devuelve cuántos ha desbloqueado.
 */
export async function evaluateAccountAchievements(getAccounts: typeof fetchAccounts = fetchAccounts, now = new Date()): Promise<number> {
    const identities = (await PlayerIdentityModel.find({ userId: { $type: "string" } }, { _id: 0, playerId: 1, userId: 1 }).lean())
        .flatMap((i) => (i.userId ? [{ playerId: i.playerId, userId: i.userId }] : []))
    if (identities.length === 0) return 0

    const [accounts, totals, unlocked] = await Promise.all([
        getAccounts(identities.map((i) => i.userId)),
        PlayerClubTotalsModel.find({ playerId: { $in: identities.map((i) => i.playerId) } }).lean(),
        AccountAchievementUnlockedModel.find({ userId: { $in: identities.map((i) => i.userId) } }, { userId: 1, achievementId: 1, reached: 1 }).lean(),
    ])

    const newUnlocks: IAccountAchievementUnlocked[] = []
    for (const { playerId, userId } of identities) {
        // El auth ha respondido y la cuenta no existe (borrada): no se le da nada
        if (accounts && !accounts.has(userId)) continue

        const metrics = accountMetrics(accounts?.get(userId) ?? null, totals.filter((t) => t.playerId === playerId), now)
        const mine = unlocked.filter((u) => u.userId === userId)
        for (const { unlock } of evaluateAchievements(ACCOUNT_ACHIEVEMENT_DEFINITIONS, mine, { cumulative: metrics }, { playerId, playerName: "", unlockedAt: now })) {
            newUnlocks.push({ userId, playerId, achievementId: unlock.achievementId, reached: unlock.reached, unlockedAt: now })
        }
    }

    for (const unlock of newUnlocks) {
        await AccountAchievementUnlockedModel.updateOne(
            { userId: unlock.userId, achievementId: unlock.achievementId, reached: unlock.reached },
            { $setOnInsert: unlock },
            { upsert: true }
        )
    }
    if (newUnlocks.length > 0) console.info(`[Account achievements] ${newUnlocks.length} nuevos (${[...new Set(newUnlocks.map((u) => u.userId))].length} cuentas)`)
    return newUnlocks.length
}

/**
 * Lo que se hace al arrancar y después de cada sincronización: resumen de este club a la
 * base compartida y logros de cuenta. No tumba nada si falla (p. ej. sin permisos en la base
 * compartida): se avisa y se reintenta en la siguiente.
 */
export async function syncAccountAchievements(clubId: number): Promise<void> {
    try {
        await refreshClubTotals(clubId)
        await evaluateAccountAchievements()
    } catch (err) {
        console.error("[Account achievements] Error:", err instanceof Error ? err.message : err)
    }
}
