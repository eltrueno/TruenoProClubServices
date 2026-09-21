<script setup lang="ts">
import { computed, onMounted, ref } from "vue"
import type { IClubMember, ILinkRequest, IPublicUser } from "@trueno-proclub-services/shared"
import { useAuth } from "@/composables/useAuth"
import { ApiError, authApi, tpcsApi, type IAdminUser } from "@/lib/api"
import { routes } from "@/lib/query"
import AuthGuard from "@/components/auth/AuthGuard.vue"
import PlayerPickerModal, { type PickerItem } from "@/components/ui/PlayerPickerModal.vue"
import PlayerCard from "@/components/ui/PlayerCard.vue"
import PlayerImageEditor from "@/components/admin/PlayerImageEditor.vue"


const { isAdmin, isLoggedIn, isPending } = useAuth()

const members = ref<IClubMember[]>([])
const users = ref<IAdminUser[]>([])
const loading = ref(true)
const loadError = ref("")
const search = ref("")

// Borradores por jugador (solo lo editado; se envía al guardar)
const drafts = ref<Record<string, { imageUrl: string; userId: string }>>({})
const saving = ref<Record<string, boolean>>({})
const rowMessage = ref<Record<string, { ok: boolean; text: string }>>({})

const usersById = computed(() => new Map(users.value.map((u) => [u.id, u])))

// Editor de foto (un único modal para todas las filas)
const imageEditor = ref<InstanceType<typeof PlayerImageEditor> | null>(null)
const editingMember = ref<IClubMember | null>(null)
function openImageEditor(m: IClubMember, url?: string) {
    editingMember.value = m
    imageEditor.value?.open(url || undefined)
}
// La foto se sube y asigna al momento: reflejar en la fila y en el borrador
function onImageUploaded(imageUrl: string) {
    const m = editingMember.value
    if (!m) return
    m.imageUrl = imageUrl
    if (drafts.value[m.playerId]) drafts.value[m.playerId].imageUrl = imageUrl
    rowMessage.value[m.playerId] = { ok: true, text: "Foto actualizada" }
    setTimeout(() => { if (rowMessage.value[m.playerId]?.ok) rowMessage.value[m.playerId] = { ok: true, text: "" } }, 2500)
}

/** Cuentas para el selector de una fila: aviso si ya están en otro jugador */
function userItemsFor(playerId: string): PickerItem[] {
    return users.value.map((u) => {
        const other = linkedElsewhere(u.id, playerId)
        return {
            id: u.id,
            name: u.name,
            subtitle: u.role !== "visitor" ? u.role : undefined,
            image: u.image,
            hint: other ? `Ya vinculada a ${other.playerName}` : undefined
        }
    })
}

// Solicitudes de vinculación pendientes (las crean los usuarios desde "Mi cuenta")
const linkRequests = ref<ILinkRequest[]>([])
const requestBusy = ref<Record<string, boolean>>({})
const requestError = ref("")

async function resolveRequest(r: ILinkRequest, action: "approve" | "reject") {
    requestBusy.value[r.id] = true
    requestError.value = ""
    try {
        if (action === "approve") {
            const { member } = await tpcsApi.admin.approveLinkRequest(r.id)
            // Misma regla que el PATCH: la cuenta se libera de cualquier otro jugador
            members.value.forEach((o) => { if (o.userId === member.userId && o.playerId !== member.playerId) o.userId = null })
            const target = members.value.find((m) => m.playerId === member.playerId)
            if (target) Object.assign(target, member)
            drafts.value[member.playerId] = { imageUrl: member.imageUrl ?? "", userId: member.userId ?? "" }
            // Al aprobar, el api descarta las demás pendientes del mismo usuario/jugador
            linkRequests.value = linkRequests.value.filter((x) => x.id !== r.id && x.userId !== r.userId && x.playerId !== r.playerId)
        } else {
            await tpcsApi.admin.rejectLinkRequest(r.id)
            linkRequests.value = linkRequests.value.filter((x) => x.id !== r.id)
        }
    } catch (e) {
        requestError.value = e instanceof ApiError ? e.code : "ERROR"
    } finally {
        requestBusy.value[r.id] = false
    }
}

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
        const [m, u, r] = await Promise.all([tpcsApi.members.getAll(), authApi.admin.users(), tpcsApi.admin.linkRequests()])
        members.value = m
        users.value = u
        linkRequests.value = r
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
                        <p class="text-sm text-base-content/60 mt-1">Solicitudes de vinculación, foto y cuenta vinculada de cada jugador. Los cambios de las filas se guardan por fila.</p>
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
                    <!-- Solicitudes de vinculación -->
                    <section class="rounded-2xl border border-warning/30 bg-warning/5 p-4 mb-3">
                        <div class="flex items-center justify-between gap-2 mb-2">
                            <h2 class="font-black uppercase tracking-wider text-sm">Solicitudes de vinculación</h2>
                            <span class="badge badge-sm" :class="linkRequests.length ? 'badge-warning' : 'badge-ghost'">{{ linkRequests.length }}</span>
                        </div>
                        <p v-if="linkRequests.length === 0" class="text-xs text-base-content/50">No hay solicitudes pendientes.</p>
                        <ul v-else class="flex flex-col gap-2">
                            <li v-for="r in linkRequests" :key="r.id" class="flex flex-col sm:flex-row sm:items-center gap-3 rounded-xl bg-base-200 p-3">
                                <div class="flex items-center gap-2 min-w-0 flex-1">
                                    <div class="avatar shrink-0">
                                        <div class="w-8 rounded-full bg-base-300">
                                            <img v-if="r.userImage" :src="r.userImage" :alt="r.userName" />
                                        </div>
                                    </div>
                                    <p class="text-sm min-w-0 truncate">
                                        <span class="font-bold">{{ r.userName }}</span>
                                        <span class="text-base-content/50"> quiere ser </span>
                                        <a :href="routes.player(r.playerId)" class="font-bold hover:text-primary">{{ r.playerName }}</a>
                                    </p>
                                    <span class="text-[10px] text-base-content/40 shrink-0 hidden md:inline">{{ new Date(r.createdAt).toLocaleDateString("es-ES") }}</span>
                                </div>
                                <div class="flex gap-2">
                                    <button class="btn btn-sm btn-success" :disabled="requestBusy[r.id]" @click="resolveRequest(r, 'approve')">
                                        <span v-if="requestBusy[r.id]" class="loading loading-spinner loading-xs"></span>
                                        Aprobar
                                    </button>
                                    <button class="btn btn-sm btn-ghost text-error" :disabled="requestBusy[r.id]" @click="resolveRequest(r, 'reject')">Rechazar</button>
                                </div>
                            </li>
                        </ul>
                        <p v-if="requestError" class="text-xs text-error mt-2">No se ha podido resolver la solicitud ({{ requestError }})</p>
                    </section>

                    <p class="text-xs text-base-content/50">{{ filteredMembers.length }} jugadores · {{ users.length }} cuentas</p>

                    <div v-for="m in filteredMembers" :key="m.playerId"
                        class="rounded-2xl bg-base-200 shadow-sm p-4 grid grid-cols-1 lg:grid-cols-[auto_1fr_1fr_auto] gap-4 items-center"
                        :class="{ 'ring-1 ring-primary/40': isDirty(m) }">
                        <!-- Jugador -->
                        <PlayerCard class="lg:w-64" :member="m" :image="draftFor(m).imageUrl || null" size="md" link show-id />

                        <!-- Foto: cualquier URL pasa por el editor para encuadrarla a 400x450 y subirla al CDN -->
                        <div class="form-control w-full">
                            <span class="label-text text-[10px] uppercase font-black tracking-wider text-base-content/50 mb-1">Foto</span>
                            <div class="join w-full">
                                <input
                                    v-model="draftFor(m).imageUrl"
                                    type="url"
                                    placeholder="Pega una URL y pulsa Enter, o Cambiar…"
                                    class="input input-bordered input-sm join-item w-full font-mono text-xs"
                                    @keydown.enter.prevent="openImageEditor(m, draftFor(m).imageUrl)"
                                />
                                <button type="button" class="btn btn-sm join-item" @click="openImageEditor(m, draftFor(m).imageUrl)">Cambiar…</button>
                            </div>
                            <span class="text-[10px] text-base-content/40 mt-1">Al pulsar Enter se abre el editor para ajustar la foto a la escala del club. Vacía y guarda para quitarla.</span>
                        </div>

                        <!-- Cuenta -->
                        <label class="form-control w-full">
                            <span class="label-text text-[10px] uppercase font-black tracking-wider text-base-content/50 mb-1">Cuenta vinculada</span>
                            <PlayerPickerModal
                                :model-value="draftFor(m).userId || null"
                                @update:model-value="(v) => (draftFor(m).userId = (v as string | null) ?? '')"
                                :items="userItemsFor(m.playerId)"
                                :title="`Cuenta para ${m.playerName}`"
                                placeholder="— Sin vincular —"
                                search-placeholder="Buscar cuenta…"
                                image-shape="avatar"
                            />
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
    <PlayerImageEditor
        ref="imageEditor"
        :player-id="editingMember?.playerId ?? ''"
        :player-name="editingMember?.playerName ?? ''"
        @uploaded="onImageUploaded"
    />
</template>
