<script setup lang="ts">
/**
 * Mi jugador, de todos los clubes a la vez. Una cuenta = un EA ID: la vinculación y las
 * solicitudes viven en la base compartida, así que se consultan a cualquier api, y la
 * plantilla de cada club sirve para saber dónde juega y para elegir el jugador.
 * Las solicitudes las aprueba un admin desde el /admin del club donde juega.
 */
import { computed, onMounted, ref } from "vue"
import ClubCrest from "../admin/ClubCrest.vue"
import type { IClubMember, ILinkRequest } from "@trueno-proclub-services/shared"
import { CLUBS, type ClubLink } from "@/config/site"
import { ApiError, clubApi } from "@/lib/api"
import { PLAYER_PLACEHOLDER } from "@/lib/format"
import PlayerPicker, { type PickerItem } from "./PlayerPicker.vue"

interface Membership {
    club: ClubLink
    member: IClubMember
    /** partidos en este club (oficiales + amistosos) y por posición; null si no se han podido cargar */
    games: number | null
    byPosition: Record<string, number>
}

const POSITION_LABELS: Record<string, string> = { goalkeeper: "Portero", defender: "Defensa", midfielder: "Centrocampista", forward: "Delantero" }
const monthYear = new Intl.DateTimeFormat("es-ES", { month: "long", year: "numeric" })

const loading = ref(true)
const unreachable = ref(false)
const memberships = ref<Membership[]>([])
const request = ref<ILinkRequest | null>(null)
const candidates = ref<{ member: IClubMember; clubs: ClubLink[] }[]>([])
const selectedId = ref<string | null>(null)
const busy = ref(false)
const errorText = ref("")

const linked = computed(() => memberships.value[0]?.member ?? null)
/** Sumando todos sus clubes */
const totalGames = computed(() => memberships.value.reduce((sum, m) => sum + (m.games ?? 0), 0))
const mainPosition = computed(() => {
    const byPosition: Record<string, number> = {}
    for (const m of memberships.value) for (const [pos, n] of Object.entries(m.byPosition)) byPosition[pos] = (byPosition[pos] ?? 0) + n
    const top = Object.entries(byPosition).sort(([, a], [, b]) => b - a)[0]
    return top && top[1] > 0 ? POSITION_LABELS[top[0]] ?? null : null
})
/** Desde cuándo existe el jugador (el primer club en que apareció) */
const since = computed(() => {
    const dates = memberships.value.map((m) => new Date(m.member.createdAt ?? "").getTime()).filter(Number.isFinite)
    return dates.length ? monthYear.format(new Date(Math.min(...dates))) : null
})
const summary = computed(() => [
    mainPosition.value,
    totalGames.value > 0 ? `${totalGames.value} ${totalGames.value === 1 ? "partido" : "partidos"}` : null,
    since.value ? `desde ${since.value}` : null,
].filter(Boolean).join(" · "))
const pickerItems = computed<PickerItem[]>(() =>
    candidates.value.map(({ member, clubs }) => ({
        id: member.playerId,
        name: member.playerName,
        image: member.imageUrl,
        subtitle: clubs.map((c) => c.name).join(" · "),
    }))
)

const ERRORS: Record<string, string> = {
    ALREADY_LINKED: "Tu cuenta ya está vinculada a un jugador",
    PLAYER_TAKEN: "Ese jugador ya tiene una cuenta vinculada",
    ERROR_NOT_FOUND: "Ese jugador ya no existe",
}

/** Primer api que responda (la información compartida es la misma en todos) */
async function firstAvailable<T>(fn: (club: ClubLink) => Promise<T>): Promise<T> {
    let lastError: unknown
    for (const club of CLUBS) {
        try { return await fn(club) } catch (e) { lastError = e }
    }
    throw lastError
}

async function load() {
    loading.value = true
    unreachable.value = false
    const mine = await Promise.allSettled(CLUBS.map((c) => clubApi(c).mine()))
    const found = mine.flatMap((r, i) => (r.status === "fulfilled" && r.value ? [{ club: CLUBS[i], member: r.value }] : []))
    // Partidos y posiciones de cada club (de su ficha); si una falla, ese club sale sin números
    memberships.value = await Promise.all(found.map(async ({ club, member }): Promise<Membership> => {
        try {
            const { stats } = await clubApi(club).profile(member.playerId)
            const byPosition: Record<string, number> = {}
            for (const s of [...(stats?.official ?? []), ...(stats?.friendly ?? [])]) {
                if (s.position) byPosition[s.position] = (byPosition[s.position] ?? 0) + (Number(s.gamesPlayed) || 0)
            }
            return { club, member, byPosition, games: Object.values(byPosition).reduce((a, b) => a + b, 0) }
        } catch {
            return { club, member, byPosition: {}, games: null }
        }
    }))
    if (mine.every((r) => r.status === "rejected")) unreachable.value = true

    if (!linked.value && !unreachable.value) {
        try {
            request.value = await firstAvailable((c) => clubApi(c).myLinkRequest())
        } catch {
            request.value = null
        }
        if (!request.value) await loadCandidates()
    }
    loading.value = false

    // Desde las webs de los clubes se llega con #mi-jugador: la tarjeta se pinta en cliente
    if (window.location.hash === "#mi-jugador") {
        requestAnimationFrame(() => document.getElementById("mi-jugador")?.scrollIntoView({ behavior: "smooth", block: "start" }))
    }
}

/** Jugadores sin cuenta de todos los clubes, una sola vez cada uno aunque juegue en varios */
async function loadCandidates() {
    const rosters = await Promise.allSettled(CLUBS.map((c) => clubApi(c).members()))
    const byId = new Map<string, { member: IClubMember; clubs: ClubLink[] }>()
    rosters.forEach((r, i) => {
        if (r.status !== "fulfilled") return
        for (const m of r.value) {
            if (m.userId) continue
            const entry = byId.get(m.playerId)
            if (entry) entry.clubs.push(CLUBS[i])
            else byId.set(m.playerId, { member: m, clubs: [CLUBS[i]] })
        }
    })
    candidates.value = [...byId.values()].sort((a, b) => a.member.playerName.localeCompare(b.member.playerName))
}

async function requestLink() {
    const candidate = candidates.value.find((c) => c.member.playerId === selectedId.value)
    if (!candidate || busy.value) return
    busy.value = true
    errorText.value = ""
    try {
        // La solicitud se crea en el api de un club donde aparece el jugador (lo valida su plantilla)
        request.value = await clubApi(candidate.clubs[0]).requestLink(candidate.member.playerId)
    } catch (e) {
        errorText.value = ERRORS[e instanceof ApiError ? e.code : ""] ?? "No se ha podido enviar la solicitud"
    } finally {
        busy.value = false
    }
}

async function cancelRequest() {
    if (busy.value) return
    busy.value = true
    errorText.value = ""
    try {
        await firstAvailable((c) => clubApi(c).cancelLinkRequest())
        request.value = null
        await loadCandidates()
    } catch {
        errorText.value = "No se ha podido cancelar la solicitud"
    } finally {
        busy.value = false
    }
}

const playerUrl = (club: ClubLink, playerId: string) => `${club.webUrl}/jugador?id=${encodeURIComponent(playerId)}`
const onImgError = (e: Event) => {
    const img = e.target as HTMLImageElement
    if (!img.src.endsWith(PLAYER_PLACEHOLDER)) img.src = PLAYER_PLACEHOLDER
}

onMounted(load)
</script>

<template>
    <section id="mi-jugador" tabindex="-1" class="focus:outline-none rounded-box bg-base-200 shadow-md p-6 scroll-mt-20 sm:scroll-mt-6" aria-labelledby="mi-jugador-title">
        <h2 id="mi-jugador-title" class="text-xs font-black text-base-content/75 mb-5 uppercase tracking-widest">Mi jugador</h2>

        <div v-if="loading" class="flex items-center gap-3">
            <div class="skeleton w-12 h-14 rounded-lg shrink-0"></div>
            <div class="flex-1 space-y-2">
                <div class="skeleton h-4 w-32"></div>
                <div class="skeleton h-3 w-48"></div>
            </div>
        </div>

        <div v-else-if="unreachable" role="alert" class="alert alert-warning alert-soft text-sm">
            No podemos consultar las plantillas de los clubes ahora mismo. Inténtalo en un rato.
        </div>

        <!-- Vinculado: quién es, y una fila por club con su ficha -->
        <div v-else-if="linked">
            <div class="flex items-center gap-3">
                <img :src="linked.imageUrl || PLAYER_PLACEHOLDER" :alt="linked.playerName" class="w-12 h-14 rounded-lg object-cover object-top bg-base-300" @error="onImgError" />
                <div class="min-w-0">
                    <p class="font-bold flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span class="truncate">{{ linked.playerName }}</span>
                        <span class="badge badge-xs badge-success badge-soft">Vinculado</span>
                    </p>
                    <p v-if="summary" class="text-xs text-base-content/75 mt-0.5">{{ summary }}</p>
                </div>
            </div>

            <ul class="mt-4 divide-y divide-base-content/10 rounded-box border border-base-content/10 bg-base-100 overflow-hidden">
                <li v-for="m in memberships" :key="m.club.id">
                    <a :href="playerUrl(m.club, m.member.playerId)" class="group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-primary/5">
                        <ClubCrest :club="m.club" class="size-6 shrink-0" />
                        <span class="min-w-0 flex-1">
                            <span class="block font-bold text-sm truncate">{{ m.club.name }}</span>
                            <span v-if="m.games !== null" class="block text-xs text-base-content/75">{{ m.games }} {{ m.games === 1 ? "partido" : "partidos" }}</span>
                        </span>
                        <span class="text-xs font-bold text-base-content/75 group-hover:text-primary flex items-center gap-1">
                            Ver ficha
                            <svg class="size-3.5 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24" aria-hidden="true">
                                <path stroke-linecap="round" stroke-linejoin="round" d="m9 5 7 7-7 7" />
                            </svg>
                        </span>
                    </a>
                </li>
            </ul>
        </div>

        <!-- Solicitud pendiente -->
        <div v-else-if="request" class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div class="flex items-center gap-3">
                <img :src="PLAYER_PLACEHOLDER" alt="" class="w-12 h-14 rounded-lg object-cover object-top bg-base-300" />
                <div>
                    <p class="font-bold">{{ request.playerName }}</p>
                    <p class="text-xs text-base-content/75 mt-0.5"><span class="badge badge-warning badge-xs mr-1"></span>Solicitud pendiente de que un admin la apruebe</p>
                </div>
            </div>
            <button class="btn btn-sm btn-outline font-bold" :disabled="busy" @click="cancelRequest">
                <span v-if="busy" class="loading loading-spinner loading-xs"></span>
                Cancelar solicitud
            </button>
        </div>

        <!-- Sin vincular: elegir jugador y pedirlo -->
        <div v-else>
            <p class="text-sm text-base-content/75">¿Juegas en algún club de Casemuro? Pide vincular tu cuenta a tu jugador y lo verás en todas las webs.</p>
            <form class="mt-4 flex flex-col sm:flex-row gap-2" @submit.prevent="requestLink">
                <div class="sm:flex-1">
                    <PlayerPicker v-model="selectedId" :items="pickerItems" :disabled="pickerItems.length === 0" />
                </div>
                <button type="submit" class="btn btn-sm btn-primary font-bold" :disabled="!selectedId || busy">
                    <span v-if="busy" class="loading loading-spinner loading-xs"></span>
                    Solicitar vinculación
                </button>
            </form>
        </div>

        <p v-if="errorText" class="text-xs text-error mt-2">{{ errorText }}</p>
    </section>
</template>
