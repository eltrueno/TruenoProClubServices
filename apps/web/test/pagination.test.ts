import { describe, expect, it } from "vitest"
import { clampPage, pageCount, pageItems, paginate } from "../src/lib/pagination"

describe("paginate", () => {
    const list = Array.from({ length: 45 }, (_, i) => i)
    it("corta por páginas y da el desplazamiento", () => {
        expect(paginate(list, 1, 20)).toMatchObject({ page: 1, pages: 3, offset: 0 })
        expect(paginate(list, 3, 20).items).toEqual([40, 41, 42, 43, 44])
    })
    it("ajusta páginas fuera de rango", () => {
        expect(paginate(list, 9, 20).page).toBe(3)
        expect(paginate(list, 0, 20).page).toBe(1)
        expect(paginate([], 2, 20)).toMatchObject({ page: 1, pages: 1, items: [] })
    })
    it("pageCount y clampPage", () => {
        expect(pageCount(0, 10)).toBe(1)
        expect(pageCount(21, 10)).toBe(3)
        expect(clampPage(NaN, 3)).toBe(1)
    })
})

describe("pageItems", () => {
    it("con pocas páginas, todas", () => {
        expect(pageItems(1, 1)).toEqual([1])
        expect(pageItems(3, 7)).toEqual([1, 2, 3, 4, 5, 6, 7])
    })
    it("con muchas: primera, última, la actual con sus vecinas y saltos", () => {
        expect(pageItems(1, 12)).toEqual([1, 2, 3, 4, 5, "…", 12])
        expect(pageItems(4, 12)).toEqual([1, 2, 3, 4, 5, "…", 12])
        expect(pageItems(5, 12)).toEqual([1, "…", 4, 5, 6, "…", 12])
        expect(pageItems(9, 12)).toEqual([1, "…", 8, 9, 10, 11, 12])
        expect(pageItems(12, 12)).toEqual([1, "…", 8, 9, 10, 11, 12])
    })
    it("siempre el mismo número de botones (no bailan al moverse)", () => {
        for (let p = 1; p <= 30; p++) expect(pageItems(p, 30)).toHaveLength(7)
        for (let p = 1; p <= 30; p++) expect(pageItems(p, 30, 2)).toHaveLength(9)
    })
})
