<script setup lang="ts">
import { computed, onMounted, ref } from "vue"
import type { IClubMember, IPublicUser } from "@trueno-proclub-services/shared"
import { useAuth } from "@/composables/useAuth"
import { ApiError, authApi, tpcsApi } from "@/lib/api"
import { playerImage, onPlayerImageError } from "@/lib/playerImage"
import { routes } from "@/lib/query"
import AuthGuard from "@/components/auth/AuthGuard.vue"

type AdminUser = IPublicUser & { role: string; twitchId: string | null; discordId: string | null }

const { isAdmin, isLoggedIn, isPending } = useAuth()

const members = ref<IClubMember[]>([])
const users = ref<AdminUser[]>([])
const loading = ref(true)
const loadError = ref("")
const search = ref("")

// Borradores por jugador (solo lo editado; se envía al guardar)
const drafts = ref<Record<string, { imageUrl: string; userId: string }>>({})
const saving = ref<Record<string, boolean>>({})
const rowMessage = ref<Record<string, { ok: boolean; text: string }>>({})

const usersById = computed(() => new Map(users.value.map((u) => [u.id, u])))

const filteredMembers = computed(() => {
    const q = search.value.trim().toLowerCase()
    const list = [...members.value].sort((a, b) => a.playerName.localeCompare(b.playerName))
    if (!q) return list
    return list.filter((m) => m.playerName.toLowerCase().includes(q) || (m.proName ?? "").toLowerCase().includes(q))
})

function draftFor(m: IClubMember) {
    if (!drafts.value[m.playerId]) {
        drafts.value[m.playerId] = { imageUrl: m.imageUrl ?? "", userId: m.userId ?? "" }
    }
    return drafts.value[m.playerId]
}

function isDirty(m: IClubMember) {
    const d = drafts.value[m.playerId]
    if (!d) return false
    return d.imageUrl !== (m.imageUrl ?? "") || d.userId !== (m.userId ?? "")
}

/** Cuentas ya vinculadas a otro jugador (para avisar en el selector) */
function linkedElsewhere(userId: string, playerId: string) {
    return members.value.find((m) => m.userId === userId && m.playerId !== playerId)
}

async function load() {
    loading.value = true
    loadError.value = ""
    try {
        const [m, u] = await Promise.all([tpcsApi.members.getAll(), authApi.admin.users()])
        members.value = m
        users.value = u
        drafts.value = {}
    } catch (e) {
        loadError.value = e instanceof ApiError ? e.code : "Error cargando datos"
    } finally {
        loading.value = false
    }
}

async function save(m: IClubMember) {
    const d = drafts.value[m.playerId]
    if (!d) return
    saving.value[m.playerId] = true
    rowMessage.value[m.playerId] = { ok: true, text: "" }
    try {
        const patch: { imageUrl?: string | null; userId?: string | null } = {}
        if (d.imageUrl !== (m.imageUrl ?? "")) patch.imageUrl = d.imageUrl.trim() || null
        if (d.userId !== (m.userId ?? "")) patch.userId = d.userId || null
        const updated = await tpcsApi.admin.patchMember(m.playerId, patch)
        // La cuenta solo puede estar en un jugador: el api la libera del anterior; reflejarlo en la lista
        if (patch.userId) {
            members.value.forEach((o) => { if (o.userId === patch.userId && o.playerId !== m.playerId) o.userId = null })
        }
        Object.assign(m, updated)
        drafts.value[m.playerId] = { imageUrl: m.imageUrl ?? "", userId: m.userId ?? "" }
        rowMessage.value[m.playerId] = { ok: true, text: "Guardado" }
    } catch (e) {
        const code = e instanceof ApiError ? e.code : "ERROR"
        rowMessage.value[m.playerId] = { ok: false, text: code === "FORBIDDEN" ? "Sin permisos" : code === "ERROR_BAD_REQUEST" ? "URL no válida" : code }
    } finally {
        saving.value[m.playerId] = false
        setTimeout(() => { if (rowMessage.value[m.playerId]?.ok) rowMessage.value[m.playerId] = { ok: true, text: "" } }, 2500)
    }
}

onMounted(() => {
    // Espera a la sesión: si no es admin no se pide nada
    const stop = setInterval(() => {
        if (isPending.value) return
        clearInterval(stop)
        if (isLoggedIn.value && isAdmin.value) load()
        else loading.value = false
    }, 50)
})
</script>

<template>
    <AuthGuard>
        <template #loggedin>
            <div v-if="!isAdmin" class="w-full min-h-[50vh] flex flex-col items-center justify-center gap-4 text-center">
                <h2 class="text-3xl font-black">Solo para admins</h2>
                <p class="text-base-content/60">Tu cuenta no tiene permisos para ver este panel.</p>
                <a href="/" class="btn btn-primary btn-sm">Volver al inicio</a>
            </div>

            <div v-else class="w-full text-left">
                <div class="breadcrumbs text-sm">
                    <ul>
                        <li><a href="/">Inicio</a></li>
                        <li>Admin</li>
                    </ul>
                </div>

                <header class="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
                    <div>
                        <h1 class="text-3xl lg:text-4xl font-black tracking-tight">Panel admin</h1>
                        <p class="text-sm text-base-content/60 mt-1">Foto y cuenta vinculada de cada jugador. Los cambios se guardan por fila.</p>
                    </div>
                    <div class="flex items-center gap-2 w-full md:w-auto">
                        <input v-model="search" type="text" placeholder="Buscar jugador o pro" class="input input-bordered input-sm w-full md:w-64" />
                        <button class="btn btn-sm btn-ghost" @click="load" :disabled="loading">Recargar</button>
                    </div>
                </header>

                <div v-if="loading" class="w-full flex justify-center py-16">
                    <span class="loading loading-ring loading-lg text-primary"></span>
                </div>

                <div v-else-if="loadError" class="alert alert-error">
                    <span>No se han podido cargar los datos ({{ loadError }}). ¿Sesión caducada o api caído?</span>
                </div>

                <div v-else class="flex flex-col gap-3">
                    <p class="text-xs text-base-content/50">{{ filteredMembers.length }} jugadores · {{ users.length }} cuentas</p>

                    <div v-for="m in filteredMembers" :key="m.playerId"
                        class="rounded-2xl bg-base-200 shadow-sm p-4 grid grid-cols-1 lg:grid-cols-[auto_1fr_1fr_auto] gap-4 items-center"
                        :class="{ 'ring-1 ring-primary/40': isDirty(m) }">
                        <!-- Jugador -->
                        <div class="flex items-center gap-3 min-w-0 lg:w-64">
                            <div class="w-12 h-14 rounded-lg overflow-hidden bg-base-300 shrink-0">
                                <img :src="playerImage({ imageUrl: draftFor(m).imageUrl || null })" :alt="m.playerName" class="w-full h-full object-cover object-top" @error="onPlayerImageError" />
                            </div>
                            <div class="min-w-0">
                                <a :href="routes.player(m.playerId)" class="font-bold truncate block hover:text-primary">{{ m.playerName }}</a>
                                <p class="text-xs text-base-content/50 truncate">{{ m.proName || "—" }}<span v-if="m.proOverall"> · {{ m.proOverall }}</span></p>
                                <p class="text-[10px] text-base-content/30 font-mono truncate" :title="m.playerId">{{ m.playerId }}</p>
                            </div>
                        </div>

                        <!-- Foto -->
                        <label class="form-control w-full">
                            <span class="label-text text-[10px] uppercase font-black tracking-wider text-base-content/50 mb-1">URL de la foto</span>
                            <input v-model="draftFor(m).imageUrl" type="url" placeholder="https://cdn.casemurocity.org/players/…png" class="input input-bordered input-sm w-full font-mono text-xs" />
                        </label>

                        <!-- Cuenta -->
                        <label class="form-control w-full">
                            <span class="label-text text-[10px] uppercase font-black tracking-wider text-base-content/50 mb-1">Cuenta vinculada</span>
                            <select v-model="draftFor(m).userId" class="select select-bordered select-sm w-full">
                                <option value="">— Sin vincular —</option>
                                <option v-for="u in users" :key="u.id" :value="u.id">
                                    {{ u.name }}{{ u.role !== "visitor" ? ` (${u.role})` : "" }}{{ linkedElsewhere(u.id, m.playerId) ? ` · ya en ${linkedElsewhere(u.id, m.playerId)!.playerName}` : "" }}
                                </option>
                            </select>
                            <span v-if="draftFor(m).userId && linkedElsewhere(draftFor(m).userId, m.playerId)" class="text-[10px] text-warning mt-1">
                                Esta cuenta está vinculada a {{ linkedElsewhere(draftFor(m).userId, m.playerId)!.playerName }}; al guardar pasará a este jugador.
                            </span>
                        </label>

                        <!-- Guardar -->
                        <div class="flex lg:flex-col items-center gap-2 lg:w-28">
                            <button class="btn btn-primary btn-sm w-full" :disabled="!isDirty(m) || saving[m.playerId]" @click="save(m)">
                                <span v-if="saving[m.playerId]" class="loading loading-spinner loading-xs"></span>
                                <span v-else>Guardar</span>
                            </button>
                            <span v-if="rowMessage[m.playerId]?.text" class="text-xs font-bold" :class="rowMessage[m.playerId].ok ? 'text-success' : 'text-error'">
                                {{ rowMessage[m.playerId].text }}
                            </span>
                            <span v-else-if="m.userId && usersById.get(m.userId)" class="text-[10px] text-base-content/40 text-center truncate w-full" :title="usersById.get(m.userId)!.name">
                                {{ usersById.get(m.userId)!.name }}
                            </span>
                        </div>
                    </div>

                    <p v-if="filteredMembers.length === 0" class="text-center text-base-content/50 py-8">Ningún jugador coincide con la búsqueda.</p>
                </div>
            </div>
        </template>
    </AuthGuard>
</template>
