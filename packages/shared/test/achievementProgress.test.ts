/** Barras de progreso de los logros (achievementProgress) y el texto de cuánta gente lo tiene */
import { describe, expect, it } from "vitest"
import { ACCOUNT_ACHIEVEMENT_DEFINITIONS, ACHIEVEMENT_CATEGORY_ICONS, ACHIEVEMENT_DEFINITIONS, ACHIEVEMENT_ICONS, achievementIcon, achievementOwnershipLabel, achievementProgress } from "../src/index.js"

const def = (d: Record<string, unknown>) => ({ scope: "cumulative", mode: "unique", metric: "goals", ...d }) as Parameters<typeof achievementProgress>[0]

describe("achievementProgress", () => {
    it("único con umbral: lo que lleva, sin pasarse del objetivo", () => {
        expect(achievementProgress(def({ threshold: 100 }), { goals: 37 })).toEqual({ current: 37, target: 100 })
        expect(achievementProgress(def({ threshold: 100 }), { goals: 140 })).toEqual({ current: 100, target: 100 })
    })

    it("hito que se repite: hacia el siguiente escalón", () => {
        expect(achievementProgress(def({ mode: "infinite", step: 25 }), { goals: 60 }, 50)).toEqual({ current: 60, target: 75 })
        expect(achievementProgress(def({ mode: "infinite", step: 25 }), { goals: 10 })).toEqual({ current: 10, target: 25 })
    })

    it("sin barra: de un partido, de clavar un valor, de sí/no o sin dato", () => {
        expect(achievementProgress(def({ scope: "match", threshold: 5 }), { goals: 3 })).toBeNull()
        expect(achievementProgress(def({ exact: 0 }), { goals: 3 })).toBeNull()
        expect(achievementProgress(def({ threshold: 1 }), { goals: 0 })).toBeNull()
        expect(achievementProgress(def({ threshold: 10 }), {})).toBeNull()
    })
})

describe("achievementOwnershipLabel", () => {
    const noun = { one: "jugador", many: "jugadores" }
    it("dice cuánta gente lo tiene", () => {
        expect(achievementOwnershipLabel(0, 0, noun)).toBe("Nadie lo tiene todavía")
        expect(achievementOwnershipLabel(1, 3.7, noun)).toBe("Lo tiene el 3,7 % (1 jugador)")
        expect(achievementOwnershipLabel(12, 44.4, noun)).toBe("Lo tiene el 44 % (12 jugadores)")
        expect(achievementOwnershipLabel(1, 0.4, noun)).toBe("Lo tiene menos del 1 % (1 jugador)")
    })
})

describe("iconos", () => {
    it("los iconos propios de las definiciones existen, y sin icono se usa el del apartado", () => {
        for (const d of [...ACHIEVEMENT_DEFINITIONS, ...ACCOUNT_ACHIEVEMENT_DEFINITIONS]) {
            if (d.icon) expect(Object.keys(ACHIEVEMENT_ICONS), d._id).toContain(d.icon)
            const icon = achievementIcon(d)
            expect(icon.outline, d._id).toContain("<path")
            expect(icon.solid, d._id).toContain("<path")
        }
        expect(achievementIcon({ category: "streaks", icon: "cake" })).toBe(ACHIEVEMENT_ICONS.cake)
        expect(achievementIcon({ category: "streaks", icon: "no-existe" })).toBe(ACHIEVEMENT_CATEGORY_ICONS.streaks)
    })
})
