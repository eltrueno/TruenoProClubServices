import { afterEach, describe, expect, it } from "vitest"
import { applyPatch, planChanges, scoreText } from "../src/services/maintenance.js"
import { penaltyPatch } from "../src/services/penaltyPatch.js"
import { clearJobs, getJob, recentJobs, startJob } from "../src/utils/jobs.js"

// Partido guardado "a penaltis" (como en penalties.test.ts), con rival y fecha
const saved = (id: number, ts: number, goals: [number, number], pens: [number, number], localTeam = true) => ({
    matchId: id, timestamp: ts, winnerByPen: true, localTeam, result: "tie",
    localClub: { name: "Casemuro City", matchStats: { goals: goals[0] }, penaltiesScore: pens[0] },
    awayClub: { name: "Rival FC", matchStats: { goals: goals[1] }, penaltiesScore: pens[1] },
}) as never

describe("mantenimientos (puros)", () => {
    it("applyPatch: pone los campos con puntos y quita los de $unset, sin tocar el original", () => {
        const m = saved(1, 100, [1, 2], [1, 1])
        const after = applyPatch(m, penaltyPatch(m)!) as unknown as { winnerByPen: boolean; localClub: { matchStats: { goals: number }; penaltiesScore?: number } }
        expect(after.winnerByPen).toBe(false)
        expect(after.localClub.matchStats.goals).toBe(2)
        expect("penaltiesScore" in after.localClub).toBe(false)
        expect((m as unknown as { localClub: { penaltiesScore: number } }).localClub.penaltiesScore).toBe(1)
    })

    it("scoreText: desde nuestro lado, con tanda y resultado", () => {
        expect(scoreText({ ...(saved(1, 100, [1, 1], [4, 3]) as object), result: "win" } as never)).toBe("1–1 (pen. 4–3) · victoria")
        expect(scoreText({ ...(saved(1, 100, [1, 1], [4, 3], false) as object), result: "loose" } as never)).toBe("1–1 (pen. 3–4) · derrota")
    })

    it("planChanges: solo los que cambian, del más reciente al más antiguo, con antes y después", () => {
        const plan = planChanges([
            saved(1, 100, [1, 2], [1, 1]), // falso: se arregla
            saved(2, 300, [1, 1], [4, 3]), // tanda buena: no se toca
            saved(3, 200, [0, 1], [2, 1]), // falso
        ], penaltyPatch)
        expect(plan.map((x) => x.change.matchId)).toEqual([3, 1])
        expect(plan[1].change).toEqual({ matchId: 1, timestamp: 100, rival: "Rival FC", before: "1–2 (pen. 1–1) · empate", after: "2–3 · derrota" })
    })
})

describe("trabajos del panel", () => {
    afterEach(() => clearJobs())

    it("en cola → en marcha → hecho, con su resultado", async () => {
        let release!: () => void
        const gate = new Promise<void>((r) => { release = r })
        let start!: () => void
        const job = startJob("sync", "Sincronizar con EA", "admin1", async (started) => {
            start = started
            await gate
            return { summary: "3 partidos nuevos", inserted: 3 }
        })
        expect(job.state).toBe("queued")
        start()
        expect(getJob(job.id)!.state).toBe("running")
        release()
        await new Promise((r) => setTimeout(r, 0))
        const done = getJob(job.id)!
        expect(done.state).toBe("done")
        expect(done.result).toEqual({ summary: "3 partidos nuevos", inserted: 3 })
        expect(done.finishedAt).not.toBeNull()
    })

    it("si falla, queda el error", async () => {
        const job = startJob("recalculate", "Recalcular stats", null, async () => { throw new Error("Mongo caído") })
        await new Promise((r) => setTimeout(r, 0))
        expect(getJob(job.id)).toMatchObject({ state: "failed", error: "Mongo caído" })
    })

    it("pulsar dos veces no encola dos: devuelve el que ya espera", () => {
        const never = () => new Promise<{ summary: string }>(() => undefined)
        const a = startJob("sync", "Sincronizar con EA", null, never)
        const b = startJob("sync", "Sincronizar con EA", null, never)
        expect(b.id).toBe(a.id)
        expect(recentJobs()).toHaveLength(1)
    })

    it("desconocido → null; los últimos, del más reciente al más antiguo", () => {
        const never = () => new Promise<{ summary: string }>(() => undefined)
        const a = startJob("sync", "Sincronizar con EA", null, never)
        const b = startJob("recalculate", "Recalcular stats", null, never)
        expect(getJob("no-existe")).toBeNull()
        expect(recentJobs().map((j) => j.id)).toEqual([b.id, a.id])
    })
})
