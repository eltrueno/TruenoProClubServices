<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue"
import { useAccount } from "@/composables/useAccount"
import { maskEmail, relativeTime, roleLabel } from "@/lib/format"
import { ApiError } from "@/lib/api"

const { user, syncTwitch, logout, loginWithTwitch } = useAccount()

const syncedLabel = computed(() => relativeTime(user.value?.twitchSyncedAt))
const needsReauth = computed(() => !!user.value?.twitchNeedsReauth)

// El servidor ya sincroniza solo (al entrar, en segundo plano y cada hora); el botón es por si
// alguien acaba de suscribirse y no quiere esperar. 60 s entre pulsaciones, y al menos 30 s desde
// el último intento del servidor (p. ej. el del propio login), que es lo que él exige.
const COOLDOWN_MS = 60_000
const SERVER_MIN_MS = 30_000
const syncing = ref(false)
const cooldown = ref(0)
const syncError = ref("")
let timer: ReturnType<typeof setInterval> | null = null

const updateCooldown = () => {
    let last = 0
    try { last = Number(localStorage.getItem("last_twitch_sync") || 0) } catch { /* modo privado */ }
    const serverAttempt = new Date(user.value?.twitchSyncAttemptAt ?? 0).getTime() || 0
    const left = Math.max(COOLDOWN_MS - (Date.now() - last), SERVER_MIN_MS - (Date.now() - serverAttempt))
    cooldown.value = left > 0 ? Math.ceil(left / 1000) : 0
}

const SYNC_ERRORS: Record<string, string> = {
    TWITCH_SYNC_TOO_SOON: "Se acaba de sincronizar hace un momento. Prueba en unos segundos.",
    TWITCH_UNAVAILABLE: "Twitch no responde ahora mismo. Lo volveremos a intentar solos.",
}

const sync = async () => {
    if (syncing.value || cooldown.value > 0) return
    syncing.value = true
    syncError.value = ""
    try {
        await syncTwitch()
    } catch (e) {
        console.warn("[cuenta] Twitch sync", e)
        const code = e instanceof ApiError ? e.code : ""
        syncError.value = SYNC_ERRORS[code]
            ?? (e instanceof ApiError && e.httpStatus === 500
                ? "El servidor no puede comprobar Twitch ahora mismo (configuración del canal)."
                : "No se ha podido sincronizar con Twitch. Inténtalo en un rato.")
    } finally {
        try { localStorage.setItem("last_twitch_sync", String(Date.now())) } catch { /* modo privado */ }
        updateCooldown()
        syncing.value = false
    }
}

onMounted(() => {
    updateCooldown()
    timer = setInterval(updateCooldown, 1000)
})
onUnmounted(() => { if (timer) clearInterval(timer) })
</script>

<template>
    <section class="rounded-box bg-base-200 shadow-md overflow-hidden" aria-label="Perfil">
        <!-- Banner con el degradado de marca -->
        <div class="h-24 bg-brand relative overflow-hidden">
            <div class="absolute inset-0 opacity-20" style="background-image: radial-gradient(circle at 20% 120%, white 0, transparent 45%), radial-gradient(circle at 90% -20%, white 0, transparent 40%)"></div>
        </div>

        <div class="px-6 pb-6 relative">
            <div class="flex items-end justify-between gap-4">
                <div class="-mt-12 size-24 rounded-full border-4 border-base-200 bg-base-300 overflow-hidden shadow-lg shrink-0">
                    <img v-if="user?.image" :src="user.image" :alt="user?.name ?? 'Avatar'" class="size-full object-cover" referrerpolicy="no-referrer" />
                </div>
                <span class="badge badge-primary badge-sm uppercase font-bold tracking-wide mt-3">{{ roleLabel(user?.role) }}</span>
            </div>

            <div class="mt-3">
                <h1 class="text-xl font-bold tracking-tight flex items-center gap-2">
                    {{ user?.name || "Usuario" }}
                    <svg class="size-4 text-[#9146FF]" fill="currentColor" viewBox="0 0 24 24" aria-label="Cuenta de Twitch">
                        <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z" />
                    </svg>
                </h1>
                <p class="text-sm text-base-content/50 mt-0.5">{{ maskEmail(user?.email) }}</p>
                <p v-if="!needsReauth && syncedLabel" class="text-xs text-base-content/40 mt-1">Datos de Twitch actualizados {{ syncedLabel }}</p>
            </div>

            <div v-if="needsReauth" role="alert" class="alert alert-warning alert-soft mt-4 text-sm">
                <span>Tu conexión con Twitch ha caducado y no podemos comprobar si sigues el canal o eres sub.</span>
                <button class="btn btn-sm btn-warning font-bold" @click="loginWithTwitch(null)">Reconectar Twitch</button>
            </div>
            <p v-else-if="syncError" class="text-xs text-warning mt-3">{{ syncError }}</p>

            <div class="mt-5 pt-4 border-t border-base-content/10 flex flex-col sm:flex-row gap-2">
                <button class="btn btn-sm btn-primary flex-1 font-bold gap-1.5" :disabled="syncing || cooldown > 0 || needsReauth" @click="sync">
                    <span v-if="syncing" class="loading loading-spinner loading-xs"></span>
                    <svg v-else class="size-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 0 0 4.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 0 1-15.357-2m15.357 2H15" />
                    </svg>
                    {{ cooldown > 0 ? `Sincronizar de nuevo en ${cooldown}s` : "Sincronizar con Twitch" }}
                </button>
                <button class="btn btn-sm btn-ghost flex-1 font-bold gap-1.5 text-base-content/60 hover:text-error hover:bg-error/10" @click="logout">
                    <svg class="size-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M17 16l4-4m0 0-4-4m4 4H7m6 4v1a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3h4a3 3 0 0 1 3 3v1" />
                    </svg>
                    Cerrar sesión
                </button>
            </div>
        </div>
    </section>
</template>
