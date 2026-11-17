<script setup lang="ts">
import { computed, onMounted, ref } from "vue"
import { useAccount } from "@/composables/useAccount"
import { authApi } from "@/lib/api"
import { subTierLabel } from "@/lib/format"

const { user, linkDiscord, unlinkDiscord } = useAccount()
const tier = computed(() => subTierLabel(user.value?.twitchSubTier))

// ---- Discord ----
const discordLinked = computed(() => !!user.value?.discordId)
/** null = aún no se sabe si el auth tiene Discord configurado */
const discordEnabled = ref<boolean | null>(null)
const discordBusy = ref(false)
const confirmUnlink = ref(false)
const discordMessage = ref<{ ok: boolean; text: string } | null>(null)

/** Códigos con los que Better Auth vuelve de Discord cuando algo falla */
const DISCORD_ERRORS: Record<string, string> = {
    account_already_linked_to_different_user: "Esa cuenta de Discord ya está conectada a otra cuenta de Casemuro. Desconéctala allí primero.",
    access_denied: "Has cancelado la conexión en Discord.",
}

onMounted(async () => {
    // Vuelta de Discord: ?discord=ok | ?discord=error&error=<código>
    const params = new URLSearchParams(window.location.search)
    const result = params.get("discord")
    if (result) {
        const code = params.get("error") ?? ""
        discordMessage.value = result === "ok"
            ? { ok: true, text: "Discord conectado." }
            : { ok: false, text: DISCORD_ERRORS[code] ?? "No se ha podido conectar Discord. Inténtalo de nuevo." }
        for (const k of ["discord", "error", "error_description"]) params.delete(k)
        const qs = params.toString()
        history.replaceState(history.state, "", window.location.pathname + (qs ? `?${qs}` : "") + window.location.hash)
    }
    try {
        discordEnabled.value = (await authApi.discordStatus()).enabled
    } catch {
        discordEnabled.value = false
    }
})

async function connectDiscord() {
    discordBusy.value = true
    discordMessage.value = null
    try {
        await linkDiscord() // navega a Discord
    } catch (e) {
        console.error("[cuenta] Discord", e)
        discordMessage.value = { ok: false, text: "No se ha podido conectar con Discord. Inténtalo de nuevo." }
        discordBusy.value = false
    }
}

async function disconnectDiscord() {
    discordBusy.value = true
    discordMessage.value = null
    try {
        await unlinkDiscord()
        discordMessage.value = { ok: true, text: "Discord desconectado." }
    } catch (e) {
        console.error("[cuenta] Discord", e)
        discordMessage.value = { ok: false, text: "No se ha podido desconectar Discord. Inténtalo de nuevo." }
    } finally {
        discordBusy.value = false
        confirmUnlink.value = false
    }
}
</script>

<template>
    <section class="rounded-box bg-base-200 shadow-md p-6" aria-labelledby="conexiones">
        <h2 id="conexiones" class="text-xs font-black text-base-content/75 mb-5 uppercase tracking-widest">Conexiones</h2>

        <ul class="divide-y divide-base-content/10">
            <!-- Twitch: es con lo que se entra, siempre conectado -->
            <li class="flex items-start gap-4 pb-4">
                    <div class="size-10 shrink-0 rounded-full bg-[#9146FF]/15 text-[#9146FF] grid place-items-center">
                        <svg class="size-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                            <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z" />
                        </svg>
                    </div>
                <div class="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 min-h-10">
                    <div class="min-w-0">
                        <p class="font-bold text-sm">Twitch</p>
                        <p class="text-xs text-base-content/75 mt-0.5">Con esta cuenta inicias sesión</p>
                    </div>
                <div class="flex flex-wrap gap-1.5 sm:justify-end shrink-0">
                    <span class="badge badge-sm" :class="user?.twitchFollowing ? 'badge-success badge-soft' : 'badge-ghost'">
                        {{ user?.twitchFollowing ? "Sigues el canal" : "No sigues el canal" }}
                    </span>
                    <span v-if="user?.twitchSub" class="badge badge-sm badge-primary">Sub{{ tier ? ` · ${tier}` : "" }}</span>
                </div>
                </div>
            </li>

            <!-- Discord: para que el bot de la comunidad sepa quién es cada uno -->
            <li class="flex items-start gap-4 pt-4">
                    <div class="size-10 shrink-0 rounded-full bg-[#5865F2]/15 text-[#5865F2] grid place-items-center">
                        <svg class="size-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                            <path d="M20.317 4.37a19.79 19.79 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.211.375-.445.865-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.74 19.74 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.1 13.1 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.126-.094.252-.192.372-.291a.074.074 0 0 1 .078-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.3 12.3 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.84 19.84 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.029ZM8.02 15.331c-1.183 0-2.157-1.086-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.332-.956 2.418-2.157 2.418Zm7.975 0c-1.183 0-2.157-1.086-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.332-.946 2.418-2.157 2.418Z" />
                        </svg>
                    </div>
                <div class="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 min-h-10">
                    <div class="min-w-0">
                        <p class="font-bold text-sm flex flex-wrap items-center gap-x-2 gap-y-1">
                            Discord
                            <span v-if="discordLinked && user?.discordName" class="font-normal text-base-content/75 truncate">{{ user.discordName }}</span>
                            <span v-if="discordLinked" class="badge badge-xs badge-success badge-soft">Conectado</span>
                        </p>
                        <p class="text-xs text-base-content/75 mt-0.5">
                            {{ discordLinked
                                ? "El bot de la comunidad te mencionará en los partidos, logros y equipo de la semana de tu jugador."
                                : "Para que el bot de la comunidad sepa quién eres: menciones en el equipo de la semana, mercado de fichajes…" }}
                        </p>
                        <p v-if="discordMessage" class="text-xs font-bold mt-1" :class="discordMessage.ok ? 'text-success' : 'text-error'" role="status">
                            {{ discordMessage.text }}
                        </p>
                    </div>
                <div class="flex flex-wrap items-center gap-2 sm:justify-end shrink-0">
                    <template v-if="discordLinked">
                        <template v-if="confirmUnlink">
                            <button class="btn btn-sm btn-error font-bold" :disabled="discordBusy" @click="disconnectDiscord">
                                <span v-if="discordBusy" class="loading loading-spinner loading-xs"></span>
                                <span v-else>Desconectar</span>
                            </button>
                            <button class="btn btn-sm btn-ghost" :disabled="discordBusy" @click="confirmUnlink = false">Cancelar</button>
                        </template>
                        <button v-else class="btn btn-sm btn-ghost text-base-content/75 hover:text-error hover:bg-error/10" @click="confirmUnlink = true">Desconectar</button>
                    </template>
                    <span v-else-if="discordEnabled === false" class="badge badge-sm badge-ghost">No disponible ahora</span>
                    <button v-else class="btn btn-sm btn-primary font-bold w-full sm:w-auto" :disabled="discordBusy || discordEnabled === null" @click="connectDiscord">
                        <span v-if="discordBusy" class="loading loading-spinner loading-xs"></span>
                        <span v-else>Conectar Discord</span>
                    </button>
                </div>
                </div>
            </li>
        </ul>
    </section>
</template>
