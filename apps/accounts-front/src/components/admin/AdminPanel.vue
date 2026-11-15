<script setup lang="ts">
/**
 * Panel admin común a todos los clubes (antes estaba en /admin de cada web).
 *
 * Fotos y vínculos son globales (base compartida, por playerId), así que se trabaja sobre
 * una sola lista: la plantilla de cada club se pide a su api y se junta, con cada jugador
 * una sola vez aunque haya jugado en varios (con los escudos de dónde aparece). Las pestañas
 * de club solo filtran. Los cambios se mandan al api de un club donde está el jugador (los
 * api solo editan su plantilla); la foto, a todos los suyos, para que ninguno se quede con
 * una foto propia antigua tapando a la nueva.
 */
import { computed, nextTick, ref, watch } from "vue"
import type { IClubMember, IClubMemberAdminPatch, ILinkRequest } from "@trueno-proclub-services/shared"
import { useAccount } from "@/composables/useAccount"
import { ApiError, authApi, clubApi, type IAdminUser } from "@/lib/api"
import { CLUBS, type ClubLink } from "@/config/site"
import PlayerPickerModal, { type PickerItem } from "./PlayerPickerModal.vue"
import PlayerCard from "./PlayerCard.vue"
import PlayerImageEditor from "./PlayerImageEditor.vue"
import AdminSkeleton from "./AdminSkeleton.vue"


const { user, isPending, isLoggedIn, authUnavailable } = useAccount()
const isAdmin = computed(() => user.value?.role === "admin")

// Sin sesión: a /login y vuelta aquí (como la página de la cuenta)
watch([isPending, isLoggedIn], ([pending, logged]) => {
    if (pending || logged || authUnavailable.value) return
    const here = window.location.pathname + window.location.search + window.location.hash
    window.location.replace(`/login?redirect=${encodeURIComponent(here)}`)
}, { immediate: true })

// ---- Filtro por club (?club=united; sin nada, todos) ----
type ClubFilter = "all" | ClubLink["id"]
const initialFilter = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("club") : null
const clubFilter = ref<ClubFilter>(CLUBS.some((c) => c.id === initialFilter) ? (initialFilter as ClubFilter) : "all")

function selectFilter(f: ClubFilter) {
    clubFilter.value = f
    const url = new URL(window.location.href)
    if (f === "all") url.searchParams.delete("club")
    else url.searchParams.set("club", f)
    history.replaceState(history.state, "", url)
}

// ---- Datos ----
const members = ref<IClubMember[]>([])
/** Clubes donde aparece cada jugador (en el orden de CLUBS) */
const clubsOf = ref<Record<string, ClubLink[]>>({})
const users = ref<IAdminUser[]>([])
const loading = ref(true)
const loadError = ref("")
/** Clubes cuyo api no ha respondido (se enseña el resto) */
const failedClubs = ref<ClubLink[]>([])
const search = ref("")

const clubsFor = (playerId: string) => clubsOf.value[playerId] ?? []
/** Ficha en la web del primer club donde aparece */
const playerUrl = (playerId: string) => {
    const c = clubsFor(playerId)[0] ?? CLUBS[0]
    return `${c.webUrl}/jugador?id=${encodeURIComponent(playerId)}`
}

// Borradores por jugador (solo lo editado; se envía al guardar)
const drafts = ref<Record<string, { imageUrl: string; userId: string }>>({})
const saving = ref<Record<string, boolean>>({})
const rowMessage = ref<Record<string, { ok: boolean; text: string }>>({})

const usersById = computed(() => new Map(users.value.map((u) => [u.id, u])))

function flash(playerId: string, ok: boolean, text: string) {
    rowMessage.value[playerId] = { ok, text }
    if (ok) setTimeout(() => { if (rowMessage.value[playerId]?.ok) rowMessage.value[playerId] = { ok: true, text: "" } }, 2500)
}

/**
 * La foto es global, pero un club puede tener una propia antigua que la tapa. Al cambiarla
 * se manda también a los demás clubes del jugador (con alcance global), que así la quitan.
 */
async function syncImageToOtherClubs(playerId: string, imageUrl: string | null, done: ClubLink) {
    const others = clubsFor(playerId).filter((c) => c.id !== done.id)
    await Promise.all(others.map((c) => clubApi(c).admin.patchMember(playerId, { imageUrl, imageScope: "global" })))
}

// Editor de foto (un único modal para todas las filas)
const imageEditor = ref<InstanceType<typeof PlayerImageEditor> | null>(null)
const editingMember = ref<IClubMember | null>(null)
const editingClub = computed(() => (editingMember.value ? clubsFor(editingMember.value.playerId)[0] : undefined) ?? CLUBS[0])
function openImageEditor(m: IClubMember, url?: string) {
    editingMember.value = m
    imageEditor.value?.open(url || undefined)
}
// La foto se sube y asigna al momento: reflejar en la fila (foto y origen) y en el borrador
async function onImageUploaded(updated: IClubMember) {
    const m = editingMember.value
    if (!m) return
    Object.assign(m, updated)
    if (drafts.value[m.playerId]) drafts.value[m.playerId].imageUrl = m.imageUrl ?? ""
    try {
        await syncImageToOtherClubs(m.playerId, m.imageUrl ?? null, editingClub.value)
        flash(m.playerId, true, "Foto actualizada")
    } catch (e) {
        flash(m.playerId, false, `Foto subida, pero falta en otro club (${e instanceof ApiError ? e.code : "ERROR"})`)
    }
}

// Selector de cuenta: uno solo para todas las filas (como el editor de fotos). Uno por fila
// eran 100+ modales con la lista entera de cuentas recalculada en cada tecla.
const accountPicker = ref<InstanceType<typeof PlayerPickerModal> | null>(null)
const pickingFor = ref<IClubMember | null>(null)
async function openAccountPicker(m: IClubMember) {
    pickingFor.value = m
    // Que el selector reciba ya la cuenta y la lista de esta fila antes de abrirse
    await nextTick()
    accountPicker.value?.open()
}

/** Cuentas para el selector de la fila activa: aviso si ya están en otro jugador */
const accountItems = computed<PickerItem[]>(() => {
    const playerId = pickingFor.value?.playerId ?? ""
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
})

// ---- Solicitudes de vinculación (las crean los usuarios desde "Mi cuenta") ----
// Son globales; cada api devuelve las de su plantilla, así que se juntan sin repetir.
const linkRequests = ref<ILinkRequest[]>([])
const requestBusy = ref<Record<string, boolean>>({})
const requestError = ref("")

const inFilter = (playerId: string) => clubFilter.value === "all" || clubsFor(playerId).some((c) => c.id === clubFilter.value)
const visibleRequests = computed(() => linkRequests.value.filter((r) => inFilter(r.playerId)))
const pendingCount = (f: ClubFilter) =>
    f === "all" ? linkRequests.value.length : linkRequests.value.filter((r) => clubsFor(r.playerId).some((c) => c.id === f)).length

async function resolveRequest(r: ILinkRequest, action: "approve" | "reject") {
    const c = clubsFor(r.playerId)[0] ?? CLUBS[0]
    requestBusy.value[r.id] = true
    requestError.value = ""
    try {
        if (action === "approve") {
            const { member } = await clubApi(c).admin.approveLinkRequest(r.id)
            // Misma regla que el PATCH: la cuenta se libera de cualquier otro jugador
            members.value.forEach((o) => { if (o.userId === member.userId && o.playerId !== member.playerId) o.userId = null })
            const target = members.value.find((m) => m.playerId === member.playerId)
            if (target) target.userId = member.userId
            drafts.value[member.playerId] = { imageUrl: target?.imageUrl ?? "", userId: member.userId ?? "" }
            // Al aprobar, el api descarta las demás pendientes del mismo usuario/jugador
            linkRequests.value = linkRequests.value.filter((x) => x.id !== r.id && x.userId !== r.userId && x.playerId !== r.playerId)
        } else {
            await clubApi(c).admin.rejectLinkRequest(r.id)
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
    return members.value.filter((m) =>
        inFilter(m.playerId) && (!q || m.playerName.toLowerCase().includes(q) || (m.proName ?? "").toLowerCase().includes(q))
    )
})

const draftOf = (m: IClubMember) => ({ imageUrl: m.imageUrl ?? "", userId: m.userId ?? "" })

/** Borrador de la fila. Se crean todos al cargar: crearlos aquí, durante el render, provocaba otro render más */
function draftFor(m: IClubMember) {
    return drafts.value[m.playerId] ?? (drafts.value[m.playerId] = draftOf(m))
}

function isDirty(m: IClubMember) {
    const d = drafts.value[m.playerId]
    if (!d) return false
    return d.imageUrl !== (m.imageUrl ?? "") || d.userId !== (m.userId ?? "")
}

/** Jugador de cada cuenta vinculada (consulta directa en vez de recorrer la plantilla) */
const memberByUserId = computed(() => {
    const map = new Map<string, IClubMember>()
    for (const m of members.value) if (m.userId) map.set(m.userId, m)
    return map
})

/** Cuentas ya vinculadas a otro jugador (para avisar en el selector) */
function linkedElsewhere(userId: string, playerId: string) {
    const m = memberByUserId.value.get(userId)
    return m && m.playerId !== playerId ? m : undefined
}

const lastSeen = (m: IClubMember) => m.lastSeenAt ?? 0

async function load() {
    loading.value = true
    loadError.value = ""
    failedClubs.value = []
    rowMessage.value = {}
    try {
        const [u, ...perClub] = await Promise.all([
            authApi.adminUsers(),
            ...CLUBS.map((c) =>
                Promise.all([clubApi(c).members(), clubApi(c).admin.linkRequests()]).then(
                    ([m, r]) => ({ club: c, members: m, requests: r }),
                    () => ({ club: c, members: null, requests: null })
                )
            )
        ])
        const ok = perClub.filter((x) => x.members)
        failedClubs.value = perClub.filter((x) => !x.members).map((x) => x.club)
        if (ok.length === 0) throw new ApiError("CONNECTION_REFUSED", "", 0)

        // Un jugador una sola vez: se queda la ficha del club donde jugó más recientemente
        const byId = new Map<string, IClubMember>()
        const clubs: Record<string, ClubLink[]> = {}
        for (const { club, members: list } of ok) {
            for (const m of list!) {
                (clubs[m.playerId] ??= []).push(club)
                const prev = byId.get(m.playerId)
                if (!prev || lastSeen(m) > lastSeen(prev)) byId.set(m.playerId, m)
            }
        }
        const requests = new Map<string, ILinkRequest>()
        for (const { requests: list } of ok) for (const r of list!) requests.set(r.id, r)

        clubsOf.value = clubs
        members.value = [...byId.values()].sort((a, b) => a.playerName.localeCompare(b.playerName))
        users.value = u
        linkRequests.value = [...requests.values()].sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt))
        drafts.value = Object.fromEntries(members.value.map((x) => [x.playerId, draftOf(x)]))
    } catch (e) {
        loadError.value = e instanceof ApiError ? e.code : "Error cargando datos"
    } finally {
        loading.value = false
    }
}

async function save(m: IClubMember) {
    const d = drafts.value[m.playerId]
    const [main] = clubsFor(m.playerId)
    if (!d || !main) return
    saving.value[m.playerId] = true
    rowMessage.value[m.playerId] = { ok: true, text: "" }
    try {
        const patch: IClubMemberAdminPatch = {}
        const imageChanged = d.imageUrl !== (m.imageUrl ?? "")
        if (imageChanged) {
            patch.imageUrl = d.imageUrl.trim() || null
            patch.imageScope = "global"
        }
        if (d.userId !== (m.userId ?? "")) patch.userId = d.userId || null
        // El vínculo es global: con un club basta. La foto, a todos los suyos (ver syncImageToOtherClubs)
        const updated = await clubApi(main).admin.patchMember(m.playerId, patch)
        if (imageChanged) await syncImageToOtherClubs(m.playerId, patch.imageUrl ?? null, main)
        // La cuenta solo puede estar en un jugador: el api la libera del anterior; reflejarlo en la lista
        if (patch.userId) {
            members.value.forEach((o) => { if (o.userId === patch.userId && o.playerId !== m.playerId) o.userId = null })
        }
        Object.assign(m, { imageUrl: updated.imageUrl, imageSource: updated.imageSource, userId: updated.userId })
        drafts.value[m.playerId] = { imageUrl: m.imageUrl ?? "", userId: m.userId ?? "" }
        flash(m.playerId, true, "Guardado")
    } catch (e) {
        const code = e instanceof ApiError ? e.code : "ERROR"
        flash(m.playerId, false, code === "FORBIDDEN" ? "Sin permisos" : code === "ERROR_BAD_REQUEST" ? "URL no válida" : code)
    } finally {
        saving.value[m.playerId] = false
    }
}

// Espera a la sesión: si no es admin no se pide nada
let started = false
watch([isPending, isAdmin], ([pending, admin]) => {
    if (pending || started) return
    started = true
    if (admin) load()
    else loading.value = false
}, { immediate: true })
</script>

<template>
    <div v-if="!isLoggedIn" class="w-full">
        <div v-if="authUnavailable && !isPending" role="alert" class="alert alert-error alert-soft">
            El servicio de cuentas no responde ahora mismo. Inténtalo en un rato.
        </div>
        <AdminSkeleton v-else />
    </div>

    <div v-else-if="!isAdmin" class="w-full min-h-[50vh] flex flex-col items-center justify-center gap-4 text-center">
        <h2 class="text-3xl font-black">Solo para admins</h2>
        <p class="text-base-content/60">Tu cuenta no tiene permisos para ver este panel.</p>
        <a href="/" class="btn btn-primary btn-sm">Volver a mi cuenta</a>
    </div>

    <div v-else class="w-full text-left">
        <div class="breadcrumbs text-sm">
            <ul>
                <li><a href="/">Mi cuenta</a></li>
                <li>Admin</li>
            </ul>
        </div>

        <header class="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
            <div>
                <h1 class="text-3xl lg:text-4xl font-black tracking-tight">Panel admin</h1>
                <p class="text-sm text-base-content/60 mt-1">Solicitudes de vinculación, foto y cuenta vinculada de cada jugador. Los cambios de las filas se guardan por fila.</p>
                <!-- Filtro por club: los datos son los mismos, solo cambia qué jugadores se ven -->
                <div v-if="CLUBS.length > 1" role="tablist" class="flex flex-wrap gap-2 mt-4">
                    <button type="button" role="tab" :aria-selected="clubFilter === 'all'"
                        class="btn btn-sm gap-2" :class="clubFilter === 'all' ? 'btn-primary' : 'btn-ghost'" @click="selectFilter('all')">
                        <span class="flex -space-x-1.5">
                            <img v-for="c in CLUBS" :key="c.id" :src="c.logo" alt="" class="size-5 object-contain" />
                        </span>
                        Todos
                        <span v-if="!loading && pendingCount('all')" class="badge badge-xs badge-warning">{{ pendingCount("all") }}</span>
                    </button>
                    <button v-for="c in CLUBS" :key="c.id" type="button" role="tab" :aria-selected="clubFilter === c.id"
                        class="btn btn-sm gap-2" :class="clubFilter === c.id ? 'btn-primary' : 'btn-ghost'" @click="selectFilter(c.id)">
                        <img :src="c.logo" alt="" class="size-5 object-contain" />
                        {{ c.name }}
                        <span v-if="!loading && pendingCount(c.id)" class="badge badge-xs badge-warning">{{ pendingCount(c.id) }}</span>
                    </button>
                </div>
            </div>
            <div class="flex items-center gap-2 w-full md:w-auto">
                <input v-model="search" type="text" placeholder="Buscar jugador o pro" class="input input-bordered input-sm w-full md:w-64" />
                <button class="btn btn-sm btn-ghost" @click="load" :disabled="loading">Recargar</button>
            </div>
        </header>

        <!-- Skeleton: bloque de solicitudes + filas de jugadores -->
        <AdminSkeleton v-if="loading" body-only />

        <div v-else-if="loadError" class="alert alert-error">
            <span>No se han podido cargar los datos ({{ loadError }}). ¿Sesión caducada o api caído?</span>
        </div>

        <div v-else class="flex flex-col gap-3">
            <div v-if="failedClubs.length" role="alert" class="alert alert-warning alert-soft text-sm">
                No responde el api de {{ failedClubs.map((c) => c.name).join(" y ") }}: faltan sus jugadores y solicitudes.
            </div>

            <!-- Solicitudes de vinculación -->
            <section class="rounded-2xl border border-warning/30 bg-warning/5 p-4 mb-3">
                <div class="flex items-center justify-between gap-2 mb-2">
                    <h2 class="font-black uppercase tracking-wider text-sm">Solicitudes de vinculación</h2>
                    <span class="badge badge-sm" :class="visibleRequests.length ? 'badge-warning' : 'badge-ghost'">{{ visibleRequests.length }}</span>
                </div>
                <p v-if="visibleRequests.length === 0" class="text-xs text-base-content/50">No hay solicitudes pendientes.</p>
                <ul v-else class="flex flex-col gap-2">
                    <li v-for="r in visibleRequests" :key="r.id" class="flex flex-col sm:flex-row sm:items-center gap-3 rounded-xl bg-base-200 p-3">
                        <div class="flex items-center gap-2 min-w-0 flex-1">
                            <div class="avatar shrink-0">
                                <div class="w-8 rounded-full bg-base-300">
                                    <img v-if="r.userImage" :src="r.userImage" :alt="r.userName" />
                                </div>
                            </div>
                            <p class="text-sm min-w-0 truncate">
                                <span class="font-bold">{{ r.userName }}</span>
                                <span class="text-base-content/50"> quiere ser </span>
                                <a :href="playerUrl(r.playerId)" target="_blank" rel="noopener" class="font-bold hover-text-brand">{{ r.playerName }}</a>
                            </p>
                            <span class="flex -space-x-1 shrink-0">
                                <img v-for="c in clubsFor(r.playerId)" :key="c.id" :src="c.logo" :alt="c.name" :title="c.name" class="size-4 object-contain" />
                            </span>
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

            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-3">
                <p class="text-xs text-base-content/50">{{ filteredMembers.length }} jugadores · {{ users.length }} cuentas</p>
                <p class="text-[10px] text-base-content/40">Fotos y cuentas vinculadas se aplican al jugador en todos los clubes.</p>
            </div>

            <div v-for="m in filteredMembers" :key="m.playerId"
                class="rounded-2xl bg-base-200 border border-transparent shadow-sm p-4 grid grid-cols-1 lg:grid-cols-[auto_1fr_1fr_auto] gap-4 items-center"
                :class="{ 'border-brand-soft': isDirty(m) }">
                <!-- Jugador, con los escudos de los clubes donde aparece -->
                <PlayerCard class="lg:w-64" :member="m" :image="draftFor(m).imageUrl || null" size="md" :link="playerUrl(m.playerId)" show-id>
                    <span v-if="CLUBS.length > 1" class="flex gap-1 mt-1">
                        <img v-for="c in clubsFor(m.playerId)" :key="c.id" :src="c.logo" :alt="c.name" :title="c.name" class="size-4 object-contain" />
                    </span>
                </PlayerCard>

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

                <!-- Cuenta: el botón abre el selector compartido (ver openAccountPicker) -->
                <div class="form-control w-full">
                    <span class="label-text text-[10px] uppercase font-black tracking-wider text-base-content/50 mb-1">Cuenta vinculada</span>
                    <button type="button" class="btn btn-outline btn-sm w-full justify-between font-normal" @click="openAccountPicker(m)">
                        <span class="flex items-center gap-2 min-w-0">
                            <img v-if="usersById.get(draftFor(m).userId)?.image" :src="usersById.get(draftFor(m).userId)!.image!" alt="" class="size-5 rounded-full shrink-0 object-cover" loading="lazy" />
                            <span class="truncate" :class="{ 'opacity-50': !usersById.get(draftFor(m).userId) }">{{ usersById.get(draftFor(m).userId)?.name ?? "— Sin vincular —" }}</span>
                        </span>
                        <svg xmlns="http://www.w3.org/2000/svg" class="size-4 shrink-0 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" /></svg>
                    </button>
                    <span v-if="draftFor(m).userId && linkedElsewhere(draftFor(m).userId, m.playerId)" class="text-[10px] text-warning mt-1">
                        Esta cuenta está vinculada a {{ linkedElsewhere(draftFor(m).userId, m.playerId)!.playerName }}; al guardar pasará a este jugador.
                    </span>
                </div>

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

    <PlayerImageEditor
        ref="imageEditor"
        :club="editingClub"
        :player-id="editingMember?.playerId ?? ''"
        :player-name="editingMember?.playerName ?? ''"
        @uploaded="onImageUploaded"
    />
    <PlayerPickerModal
        ref="accountPicker"
        :trigger="false"
        :model-value="pickingFor ? draftFor(pickingFor).userId || null : null"
        @update:model-value="(v) => { if (pickingFor) draftFor(pickingFor).userId = (v as string | null) ?? '' }"
        :items="accountItems"
        :title="`Cuenta para ${pickingFor?.playerName ?? ''}`"
        search-placeholder="Buscar cuenta…"
        image-shape="avatar"
    />
</template>
