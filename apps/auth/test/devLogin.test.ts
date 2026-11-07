/** El login de desarrollo solo puede existir en local (tres condiciones a la vez). */
import { afterEach, describe, expect, it, vi } from "vitest"

vi.stubEnv("MONGODB_URI", "mongodb://127.0.0.1:1") // db/index.ts la exige al importarse (no conecta)
const { isDevLoginEnabled } = await import("../src/routes/devRoutes.js")

const set = (devmode: string, devLogin: string, url: string) => {
    vi.stubEnv("DEVMODE", devmode)
    vi.stubEnv("DEV_LOGIN", devLogin)
    vi.stubEnv("BETTER_AUTH_URL", url)
}

afterEach(() => { vi.unstubAllEnvs() })

describe("isDevLoginEnabled", () => {
    it("activo solo con DEVMODE, DEV_LOGIN y auth en localhost", () => {
        set("true", "true", "http://localhost:3001")
        expect(isDevLoginEnabled()).toBe(true)
        set("true", "true", "http://127.0.0.1:3001")
        expect(isDevLoginEnabled()).toBe(true)
    })

    it.each([
        ["producción", "false", "false", "https://auth.casemuro.stream"],
        ["DEVMODE puesto en producción por error", "true", "true", "https://auth.casemuro.stream"],
        ["sin DEV_LOGIN", "true", "false", "http://localhost:3001"],
        ["sin DEVMODE", "false", "true", "http://localhost:3001"],
        ["dominio que solo empieza por localhost", "true", "true", "https://localhost.evil.com"],
        ["URL rota", "true", "true", "no-es-una-url"],
    ])("desactivado: %s", (_name, devmode, devLogin, url) => {
        set(devmode, devLogin, url)
        expect(isDevLoginEnabled()).toBe(false)
    })
})
