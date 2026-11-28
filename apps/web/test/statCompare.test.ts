import { describe, expect, it } from "vitest"
import { roundTo, shownDiff, shownWinner, signedText, smartDecimals } from "../src/lib/statCompare"

describe("statCompare", () => {
    it("redondea como se escribe", () => {
        expect(roundTo(0.146, 2)).toBe(0.15)
        expect(roundTo(Number.NaN, 1)).toBe(0)
    })

    it("si los dos se ven iguales, es empate aunque por dentro no lo sean", () => {
        expect(shownWinner(0.146, 0.152, 2)).toBeNull()
        expect(shownWinner(50.4, 49.6, 0)).toBeNull()
        expect(shownWinner(0.144, 0.156, 2)).toBe("b")
    })

    it("con menos es mejor, gana el más bajo", () => {
        expect(shownWinner(0.1, 0.3, 1, true)).toBe("a")
    })

    it("la diferencia sale de los valores redondeados (sin −0,0)", () => {
        expect(shownDiff(5.96, 6.04, 1)).toBe(0)
        expect(signedText(shownDiff(5.96, 6.04, 1), 1)).toBe("±0,0")
        expect(signedText(shownDiff(6.04, 5.86, 1), 1)).toBe("+0,1")
        expect(signedText(-1, 0)).toBe("−1")
    })

    it("más decimales para tasas pequeñas", () => {
        expect(smartDecimals([2.3, 1.8], 1)).toBe(1)
        expect(smartDecimals([0.34, 0.2], 1)).toBe(2)
        expect(smartDecimals([0.04, 0.01], 2)).toBe(3)
        expect(smartDecimals([0, 0], 2)).toBe(2)
        expect(smartDecimals([3.2, 2.6], 0, true)).toBe(1)
        expect(smartDecimals([45, 2], 0, true)).toBe(0)
    })
})
