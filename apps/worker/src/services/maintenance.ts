import type { IMaintenanceChange, IMaintenancePreview, IMaintenanceTask, IMatch } from "@trueno-proclub-services/shared"
import { MatchModel } from "@trueno-proclub-services/shared/models"
import { penaltyPatch } from "./penaltyPatch.js"
import { friendlyDnfPatch } from "./voidMatches.service.js"

/**
 * Mantenimientos: arreglos de partidos ya guardados que se lanzan desde el panel admin (RPC
 * `maintenance.*`) en vez de con un script a mano en producción. Primero la vista previa (cuántos
 * y cuáles cambiarían, con el marcador antes y después); luego aplicar, que vuelve a calcularlo
 * todo y solo sigue si siguen siendo los mismos que se vieron. Si cambia algo, recalcula stats,
 * logros y medias.
 *
 * Para añadir uno: una entrada en TASKS con su `patch` (puro, testeable: de un partido guardado al
 * `$set` / `$unset` que lo arregla, o null si está bien) y el filtro de Mongo que acota dónde mirar.
 */

export type MatchPatch = { $set: Record<string, unknown>; $unset?: Record<string, ""> }

interface MaintenanceDef extends IMaintenanceTask {
    /** dónde mirar (para no leer todos los partidos) */
    filter: Record<string, unknown>
    patch: (m: IMatch) => MatchPatch | null
}

const TASKS: MaintenanceDef[] = [
    {
        name: "penalties",
        title: "Penaltis mal detectados",
        description: "Partidos guardados \"a penaltis\" con la detección antigua, que no miraba si el partido había acabado en empate (p. ej. un gol en propia de cada equipo se tomaba por tanda). Se corrige el marcador, la tanda y el resultado.",
        recalculates: true,
        filter: { winnerByPen: true },
        patch: penaltyPatch,
    },
    {
        name: "friendly-dnf",
        title: "Amistosos con abandono",
        description: "Amistosos cortados antes del final con el 3-0 que pone EA al que se va: el marcador pasa a ser el de los goles de los jugadores y pierde quien abandonó.",
        recalculates: true,
        filter: { matchType: "friendly" },
        patch: (m) => {
            const set = friendlyDnfPatch(m)
            return set ? { $set: set } : null
        },
    },
]

const MAX_SAMPLE = 50

// ── Puras ──

/** El partido como quedaría con el parche (copia; los campos van con puntos: "localClub.matchStats.goals") */
export function applyPatch(m: IMatch, patch: MatchPatch): IMatch {
    const out = structuredClone(m) as unknown as Record<string, unknown>
    const walk = (path: string, fn: (obj: Record<string, unknown>, key: string) => void) => {
        const keys = path.split(".")
        let obj = out
        for (const k of keys.slice(0, -1)) {
            if (typeof obj[k] !== "object" || obj[k] === null) obj[k] = {}
            obj = obj[k] as Record<string, unknown>
        }
        fn(obj, keys[keys.length - 1])
    }
    for (const [path, value] of Object.entries(patch.$set)) walk(path, (o, k) => { o[k] = value })
    for (const path of Object.keys(patch.$unset ?? {})) walk(path, (o, k) => { delete o[k] })
    return out as unknown as IMatch
}

const RESULT_TEXT: Record<string, string> = { win: "victoria", tie: "empate", loose: "derrota" }

/** "2–1 (pen. 4–3) · victoria", desde nuestro lado */
export function scoreText(m: IMatch): string {
    const ours = m.localTeam === false ? m.awayClub : m.localClub
    const theirs = m.localTeam === false ? m.localClub : m.awayClub
    const goals = (c: IMatch["localClub"]) => Number(c.matchStats?.goals) || 0
    const pens = m.winnerByPen && ours.penaltiesScore != null && theirs.penaltiesScore != null ? ` (pen. ${ours.penaltiesScore}–${theirs.penaltiesScore})` : ""
    const dnf = m.winnerByDnf ? " · abandono" : ""
    return `${goals(ours)}–${goals(theirs)}${pens} · ${RESULT_TEXT[m.result] ?? m.result}${dnf}`
}

/** Lo que cambiaría en una lista de partidos (del más reciente al más antiguo) */
export function planChanges(matches: IMatch[], patch: (m: IMatch) => MatchPatch | null): { match: IMatch; patch: MatchPatch; change: IMaintenanceChange }[] {
    return matches
        .map((m) => ({ m, p: patch(m) }))
        .filter((x): x is { m: IMatch; p: MatchPatch } => x.p !== null)
        .sort((a, b) => b.m.timestamp - a.m.timestamp)
        .map(({ m, p }) => ({
            match: m,
            patch: p,
            change: {
                matchId: m.matchId,
                timestamp: m.timestamp,
                rival: (m.localTeam === false ? m.localClub : m.awayClub).name,
                before: scoreText(m),
                after: scoreText(applyPatch(m, p)),
            },
        }))
}

// ── Con la base ──

const findTask = (name: string): MaintenanceDef => {
    const t = TASKS.find((x) => x.name === name)
    if (!t) throw new Error(`No existe el mantenimiento "${name}"`)
    return t
}

export const listMaintenance = (): IMaintenanceTask[] =>
    TASKS.map(({ name, title, description, recalculates }) => ({ name, title, description, recalculates }))

export async function previewMaintenance(name: string): Promise<IMaintenancePreview> {
    const task = findTask(name)
    const matches = await MatchModel.find(task.filter).lean<IMatch[]>()
    const plan = planChanges(matches, task.patch)
    return { name, scanned: matches.length, affected: plan.length, changes: plan.slice(0, MAX_SAMPLE).map((x) => x.change) }
}

export const maintenanceTitle = (name: string) => findTask(name).title
export const maintenanceRecalculates = (name: string) => findTask(name).recalculates

/**
 * Lo aplica (dentro de runExclusive: quien llama lo mete en la cola). Se vuelve a calcular aquí:
 * si ya no son `expected` partidos, no toca nada (algo ha cambiado desde la vista previa).
 */
export async function applyMaintenance(name: string, expected: number): Promise<{ changed: number }> {
    const task = findTask(name)
    const matches = await MatchModel.find(task.filter).lean<IMatch[]>()
    const plan = planChanges(matches, task.patch)
    if (plan.length !== expected) throw new Error(`Ha cambiado desde la vista previa (${expected} → ${plan.length} partidos): vuelve a mirarlo`)
    if (plan.length) {
        await MatchModel.bulkWrite(plan.map(({ match, patch }) => ({
            updateOne: { filter: { matchId: match.matchId }, update: patch.$unset ? { $set: patch.$set, $unset: patch.$unset } : { $set: patch.$set } },
        })))
    }
    console.info(`[Maintenance] ${task.title}: ${plan.length} partidos arreglados`)
    return { changed: plan.length }
}
