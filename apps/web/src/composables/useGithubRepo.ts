import { onMounted, ref } from "vue"
import { REPO } from "@/config/developer"

/**
 * Estrellas y forks del repositorio, de la API pública de GitHub. Sin token GitHub deja 60
 * peticiones por hora y por IP: se guarda una hora en el navegador y la piden todos los botones
 * de la página a la vez una sola vez. Si falla (sin red, límite, bloqueador), se queda en null y
 * los botones salen sin número.
 */
const CACHE_KEY = "gh-repo-stats"
const CACHE_MS = 60 * 60 * 1000

interface RepoStats {
    stars: number
    forks: number
}

let pending: Promise<RepoStats | null> | null = null

function readCache(): RepoStats | null {
    try {
        const raw = localStorage.getItem(CACHE_KEY)
        if (!raw) return null
        const { at, stats } = JSON.parse(raw) as { at: number; stats: RepoStats }
        return Date.now() - at < CACHE_MS ? stats : null
    } catch {
        return null
    }
}

function load(): Promise<RepoStats | null> {
    const cached = readCache()
    if (cached) return Promise.resolve(cached)
    pending ??= fetch(REPO.api, { headers: { Accept: "application/vnd.github+json" } })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
            if (!data || typeof data.stargazers_count !== "number") return null
            const stats = { stars: data.stargazers_count, forks: data.forks_count ?? 0 }
            try {
                localStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), stats }))
            } catch {
                /* sin almacenamiento: se pedirá otra vez la próxima */
            }
            return stats
        })
        .catch(() => null)
    return pending
}

export function useGithubRepo() {
    const stars = ref<number | null>(null)
    const forks = ref<number | null>(null)
    onMounted(async () => {
        const stats = await load()
        if (!stats) return
        stars.value = stats.stars
        forks.value = stats.forks
    })
    return { stars, forks }
}
