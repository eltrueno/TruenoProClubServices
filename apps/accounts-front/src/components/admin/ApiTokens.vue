<script setup lang="ts">
/**
 * Tokens de API para servicios externos (webs de fuera de casemuro.stream, bots…): con uno
 * pueden consultar cuentas y su jugador vinculado en `GET /api/v1/accounts` del auth.
 * El token solo se ve al crearlo; después solo queda su principio para reconocerlo.
 */
import { onMounted, ref } from "vue"
import { authApi, type IApiToken } from "@/lib/api"
import { relativeTime } from "@/lib/format"

const tokens = ref<IApiToken[]>([])
const loading = ref(true)
const error = ref("")

const name = ref("")
const creating = ref(false)
/** Token recién creado, en claro: se enseña una vez */
const created = ref<{ name: string; token: string } | null>(null)
const copied = ref(false)
/** id del token que se está confirmando revocar / revocando */
const confirming = ref<string | null>(null)
const revoking = ref<string | null>(null)

const message = (e: unknown) => (e instanceof Error ? e.message : "error")

async function load() {
    loading.value = true
    error.value = ""
    try {
        tokens.value = await authApi.apiTokens()
    } catch (e) {
        error.value = message(e)
    } finally {
        loading.value = false
    }
}

async function create() {
    const n = name.value.trim()
    if (!n || creating.value) return
    creating.value = true
    error.value = ""
    try {
        const { token, ...info } = await authApi.createApiToken(n)
        created.value = { name: info.name, token }
        copied.value = false
        tokens.value = [info, ...tokens.value]
        name.value = ""
    } catch (e) {
        error.value = message(e)
    } finally {
        creating.value = false
    }
}

async function copy() {
    if (!created.value) return
    try {
        await navigator.clipboard.writeText(created.value.token)
        copied.value = true
    } catch { /* sin permiso de portapapeles: se copia a mano */ }
}

async function revoke(t: IApiToken) {
    revoking.value = t.id
    error.value = ""
    try {
        await authApi.revokeApiToken(t.id)
        tokens.value = tokens.value.filter((x) => x.id !== t.id)
    } catch (e) {
        error.value = message(e)
    } finally {
        revoking.value = null
        confirming.value = null
    }
}

onMounted(load)
</script>

<template>
    <section class="text-left">
        <h2 class="text-xl font-black tracking-tight">Tokens de API</h2>
        <p class="text-sm text-base-content/75 mt-1 max-w-3xl">
            Para webs de fuera de casemuro.stream y bots. Con un token pueden consultar, desde su servidor, la cuenta de un
            usuario de Twitch (nombre, avatar, rol, follow y sub) y su jugador vinculado. No da acceso al email ni permite cambiar nada.
        </p>

        <form class="flex flex-col sm:flex-row gap-2 mt-4" @submit.prevent="create">
            <input v-model="name" type="text" maxlength="60" placeholder="Para qué es (p. ej. Web del draft)"
                class="input input-bordered input-sm w-full sm:w-80" aria-label="Nombre del token" />
            <button type="submit" class="btn btn-primary btn-sm" :disabled="!name.trim() || creating">
                <span v-if="creating" class="loading loading-spinner loading-xs"></span>
                <span v-else>Crear token</span>
            </button>
        </form>

        <div v-if="created" role="status" class="alert alert-success alert-soft mt-4 flex-col items-start gap-2">
            <p class="text-sm font-bold">Token de «{{ created.name }}». Cópialo ahora: no se vuelve a mostrar.</p>
            <div class="flex flex-col sm:flex-row gap-2 w-full">
                <code class="bg-base-100 text-base-content rounded px-2 py-1 text-xs break-all flex-1 select-all">{{ created.token }}</code>
                <div class="flex gap-2">
                    <button type="button" class="btn btn-sm btn-primary" @click="copy">{{ copied ? "Copiado" : "Copiar" }}</button>
                    <button type="button" class="btn btn-sm btn-ghost" @click="created = null">Ya lo tengo</button>
                </div>
            </div>
        </div>

        <div v-if="error" role="alert" class="alert alert-error alert-soft mt-4 text-sm">
            No se ha podido completar ({{ error }}).
        </div>

        <div class="mt-4 flex flex-col gap-2">
            <template v-if="loading">
                <div v-for="i in 2" :key="i" class="skeleton on-page h-14 w-full rounded-box"></div>
            </template>
            <p v-else-if="tokens.length === 0 && !error" class="text-sm text-base-content/75">Todavía no hay ningún token.</p>
            <div v-for="t in tokens" v-else :key="t.id"
                class="flex flex-col sm:flex-row sm:items-center gap-2 bg-base-100 border border-base-300 rounded-box px-4 py-3">
                <div class="min-w-0 flex-1">
                    <p class="font-bold truncate">{{ t.name }}</p>
                    <p class="text-xs text-base-content/75">
                        <code>{{ t.hint }}…</code>
                        · creado {{ relativeTime(t.createdAt) ?? "" }}
                        · {{ t.lastUsedAt ? `usado ${relativeTime(t.lastUsedAt)}` : "sin usar" }}
                    </p>
                </div>
                <div class="flex items-center gap-2">
                    <template v-if="confirming === t.id">
                        <span class="text-xs text-base-content/75">Dejará de funcionar ya.</span>
                        <button type="button" class="btn btn-sm btn-error" :disabled="revoking === t.id" @click="revoke(t)">
                            <span v-if="revoking === t.id" class="loading loading-spinner loading-xs"></span>
                            <span v-else>Revocar</span>
                        </button>
                        <button type="button" class="btn btn-sm btn-ghost" :disabled="revoking === t.id" @click="confirming = null">Cancelar</button>
                    </template>
                    <button v-else type="button" class="btn btn-sm btn-ghost text-error" @click="confirming = t.id">Revocar</button>
                </div>
            </div>
        </div>
    </section>
</template>
