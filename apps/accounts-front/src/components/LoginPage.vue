<script setup lang="ts">
/**
 * /login?redirect=<url>
 * Punto de entrada único para iniciar sesión desde cualquier web de la comunidad.
 * Con sesión, sigue directamente a `redirect` (si es una web de casemuro.stream) o a la cuenta.
 */
import { computed, onMounted, ref, watch } from "vue"
import { useAccount } from "@/composables/useAccount"
import { readQuery, redirectHost, safeRedirect } from "@/lib/redirect"
import { AUTH_URL } from "@/config/site"

const { isPending, isLoggedIn, user, authUnavailable, loginWithTwitch } = useAccount()

const rawRedirect = ref<string | null>(null)
const loginError = ref<string | null>(null)
const accepted = ref(false)
const loggingIn = ref(false)
const leaving = ref(false)

// Login de desarrollo (pnpm dev:local): el auth local lo anuncia en /api/dev/status.
// En producción esa ruta no existe y el panel no aparece.
const devPresets = ref<{ id: string; label: string; role: string }[]>([])
const devBusy = ref<string | null>(null)

onMounted(async () => {
    rawRedirect.value = readQuery("redirect")
    loginError.value = readQuery("error")
    if (!["localhost", "127.0.0.1"].includes(window.location.hostname)) return
    try {
        const res = await fetch(`${AUTH_URL}/api/dev/status`, { credentials: "include" })
        if (res.ok) devPresets.value = (await res.json()).presets ?? []
    } catch { /* sin login de desarrollo */ }
})

const devLogin = async (preset: string) => {
    devBusy.value = preset
    try {
        const res = await fetch(`${AUTH_URL}/api/dev/login`, {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ preset }),
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        window.location.replace(target.value)
    } catch (e) {
        console.error("[login] dev", e)
        loginError.value = "dev"
        devBusy.value = null
    }
}

const target = computed(() => safeRedirect(rawRedirect.value))
const targetHost = computed(() => (target.value === "/" ? null : redirectHost(target.value)))

// Ya hay sesión (vuelta de Twitch o venía logueado): seguir a donde tocaba
watch([isPending, isLoggedIn], ([pending, logged]) => {
    if (pending || !logged || leaving.value) return
    leaving.value = true
    window.location.replace(target.value)
}, { immediate: true })

const login = async () => {
    if (!accepted.value || loggingIn.value) return
    loggingIn.value = true
    try {
        await loginWithTwitch(rawRedirect.value && target.value !== "/" ? target.value : null)
    } catch (e) {
        console.error("[login] Twitch", e)
        loginError.value = "start"
        loggingIn.value = false
    }
}
</script>

<template>
    <div class="min-h-[60vh] flex items-center justify-center">
        <div class="w-full max-w-sm rounded-box bg-base-200 shadow-xl border border-base-300 overflow-hidden">
            <div class="h-1 bg-brand"></div>
            <div class="p-6 sm:p-8 text-center">
                <!-- Comprobando sesión / volviendo -->
                <div v-if="isPending || (isLoggedIn && leaving)" class="flex flex-col items-center gap-4 py-8">
                    <span class="loading loading-spinner loading-lg text-primary"></span>
                    <p class="text-sm font-bold uppercase tracking-widest text-base-content/60">
                        <template v-if="isLoggedIn">Hola, {{ user?.name }}</template>
                        <template v-else>Comprobando sesión</template>
                    </p>
                    <p v-if="isLoggedIn" class="text-xs text-base-content/50">
                        Volviendo{{ targetHost ? ` a ${targetHost}` : " a tu cuenta" }}…
                    </p>
                </div>

                <div v-else class="flex flex-col items-center gap-5">
                    <div class="size-16 rounded-2xl bg-brand text-white grid place-items-center">
                        <svg class="size-8" fill="none" stroke="currentColor" stroke-width="1.6" viewBox="0 0 24 24" aria-hidden="true">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M12 15v2m-6 4h12a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2Zm10-10V7a4 4 0 0 0-8 0v4h8Z" />
                        </svg>
                    </div>

                    <div class="space-y-1.5">
                        <h1 class="text-2xl font-black tracking-tight uppercase">Inicia sesión</h1>
                        <p class="text-sm text-base-content/60 leading-relaxed">
                            Una sola cuenta para todas las webs de Casemuro: tu perfil, tus conexiones y tu jugador.
                        </p>
                    </div>

                    <div v-if="authUnavailable" role="alert" class="alert alert-error alert-soft text-sm text-left w-full">
                        El servicio de cuentas no responde ahora mismo. Inténtalo en un rato.
                    </div>
                    <div v-else-if="loginError" role="alert" class="alert alert-warning alert-soft text-sm text-left w-full">
                        No se ha podido iniciar sesión con Twitch. Vuelve a intentarlo.
                    </div>

                    <label class="flex items-center justify-center gap-2 cursor-pointer select-none text-xs text-base-content/70">
                        <input v-model="accepted" type="checkbox" class="checkbox checkbox-primary checkbox-sm" />
                        <span>
                            He leído y acepto la
                            <a href="/privacidad" target="_blank" rel="noopener" class="link link-primary font-bold">política de privacidad</a>
                        </span>
                    </label>

                    <div class="w-full" :class="{ 'tooltip tooltip-bottom': !accepted }" data-tip="Acepta la política de privacidad para continuar">
                        <button
                            type="button"
                            class="btn btn-block border-none text-white font-black tracking-wide gap-2 bg-[#9146FF] hover:bg-[#772ce8] disabled:bg-[#9146FF]/30 disabled:text-white/40"
                            :disabled="!accepted || loggingIn"
                            @click="login"
                        >
                            <span v-if="loggingIn" class="loading loading-spinner loading-sm"></span>
                            <svg v-else class="size-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z" />
                            </svg>
                            ENTRAR CON TWITCH
                        </button>
                    </div>

                    <p v-if="targetHost" class="text-xs text-base-content/50">
                        Después volverás a <span class="font-bold text-base-content/70">{{ targetHost }}</span>
                    </p>

                    <!-- Solo con pnpm dev:local: entrar como usuario de prueba, sin Twitch -->
                    <div v-if="devPresets.length" class="w-full rounded-field border border-dashed border-warning/60 bg-warning/5 p-3 text-left">
                        <p class="text-[11px] font-black uppercase tracking-widest text-warning">Desarrollo · entrar sin Twitch</p>
                        <div class="grid grid-cols-2 gap-2 mt-2">
                            <button
                                v-for="p in devPresets"
                                :key="p.id"
                                type="button"
                                class="btn btn-sm btn-outline btn-warning font-bold"
                                :disabled="!!devBusy"
                                @click="devLogin(p.id)"
                            >
                                <span v-if="devBusy === p.id" class="loading loading-spinner loading-xs"></span>
                                {{ p.label }}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>
