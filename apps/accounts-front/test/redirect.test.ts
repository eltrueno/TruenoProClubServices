/**
 * A dónde se vuelve tras el login (`/login?redirect=…`): solo webs de la comunidad, para que
 * el enlace de login no sirva para mandar a nadie a una web de fuera (open redirect).
 */
import { describe, expect, it } from "vitest"
import { isAllowedRedirect, redirectHost, safeRedirect } from "../src/lib/redirect.js"

const PROD = "https://accounts.casemuro.stream"
const LOCAL = "http://localhost:4323"

describe("isAllowedRedirect", () => {
    it.each([
        "https://city.casemuro.stream/plantilla?x=1",
        "https://united.casemuro.stream/",
        "https://casemuro.stream/",
        "/#mi-jugador",
        "/login",
    ])("acepta %s", (url) => {
        expect(isAllowedRedirect(url, PROD)).toBe(true)
    })

    it.each([
        "https://evil.com/",
        "https://casemuro.stream.evil.com/",
        "https://evilcasemuro.stream/",
        "http://city.casemuro.stream/", // sin https
        "//evil.com/",
        "/\\evil.com",
        "javascript:alert(1)",
        "data:text/html,hola",
        "https://city.casemuro.stream@evil.com/",
        "http://localhost:4321/", // localhost solo si accounts también está en local
        "",
    ])("rechaza %j", (url) => {
        expect(isAllowedRedirect(url, PROD)).toBe(false)
    })

    it("acepta localhost cuando accounts corre en local (pnpm dev:local)", () => {
        expect(isAllowedRedirect("http://localhost:4321/admin", LOCAL)).toBe(true)
    })
})

describe("safeRedirect y redirectHost", () => {
    it("cae a la cuenta si la URL no vale", () => {
        expect(safeRedirect("https://evil.com", "/")).toBe("/")
    })

    it("enseña el host de destino (o nada si es una ruta propia)", () => {
        expect(redirectHost("https://city.casemuro.stream/x")).toBe("city.casemuro.stream")
        expect(redirectHost("/cuenta")).toBeNull()
    })
})
