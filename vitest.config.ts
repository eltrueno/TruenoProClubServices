import { defineConfig } from "vitest/config"

/**
 * Pruebas de todo el monorepo: `pnpm test` (compila antes shared y auth, que se importan ya
 * compilados). Las que necesitan Mongo usan mongodb-memory-server: la primera vez descarga
 * el binario de Mongo (~100 MB) y luego tira de caché.
 */
export default defineConfig({
    test: {
        include: ["apps/*/test/**/*.test.ts", "packages/*/test/**/*.test.ts"],
        // Un archivo cada vez: cada uno levanta su propio Mongo en memoria
        fileParallelism: false,
        pool: "forks",
        testTimeout: 30_000,
        hookTimeout: 180_000,
    },
})
