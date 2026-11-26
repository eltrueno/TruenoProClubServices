import { describe, expect, it } from "vitest"
import { radarAxisMax, radarNorm } from "../src/lib/radarScale"

describe("radarAxisMax", () => {
    it("completa: los topes de siempre", () => {
        expect(radarAxisMax([[7, 50]], [10, 100], "full")).toEqual([10, 100])
    })
    it("ajustada: un 15 % por encima del mayor de los conjuntos", () => {
        const [nota, pase] = radarAxisMax([[7, 50], [8, 40]], [10, 100], "fit")
        expect(nota).toBeCloseTo(9.2)
        expect(pase).toBeCloseTo(57.5)
    })
    it("ajustada: sin pasarse del tope real ni quedarse en nada", () => {
        expect(radarAxisMax([[9.8, 0]], [10, 100], "fit")).toEqual([10, 10])
    })
})

describe("radarNorm", () => {
    it("de 0 a 100 y sin salirse", () => {
        expect(radarNorm(5, 10)).toBe(50)
        expect(radarNorm(20, 10)).toBe(100)
        expect(radarNorm(NaN, 10)).toBe(0)
    })
})
