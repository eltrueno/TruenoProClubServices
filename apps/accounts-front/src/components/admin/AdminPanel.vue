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
import ClubCrest from "./ClubCrest.vue"
import ApiTokens from "./ApiTokens.vue"
import Toaster from "../ui/Toaster.vue"
import PanelTabs, { type PanelTab } from "../ui/PanelTabs.vue"
import { toast } from "@/lib/toast"


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

// ---- Pestañas (?tab=solicitudes|jugadores|tokens) ----
type TabId = "solicitudes" | "jugadores" | "tokens"
const TAB_IDS: TabId[] = ["solicitudes", "jugadores", "tokens"]
const initialTab = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("tab") : null
/** null hasta saber si hay solicitudes: sin pestaña en la URL, se abre en Solicitudes solo si hay alguna */
const tab = ref<TabId | null>(TAB_IDS.includes(initialTab as TabId) ? (initialTab as TabId) : null)
const activeTab = computed<TabId>(() => tab.value ?? "jugadores")
function selectTab(id: string) {
    tab.value = id as TabId
    const url = new URL(window.location.href)
    url.searchParams.set("tab", id)
    history.replaceState(history.state, "", url)
}
// Iconos: Heroicons outline
const ICONS = {
    requests: "M18 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0ZM3 19.235v-.11a6.375 6.375 0 0 1 12.75 0v.109A12.318 12.318 0 0 1 9.374 21c-2.331 0-4.512-.645-6.374-1.766Z",
    players: "M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z",
    tokens: "M15.75 5.25a3 3 0 0 1 3 3m3 0a6 6 0 0 1-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1 1 21.75 8.25Z",
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
    const name = members.value.find((m) => m.playerId === playerId)?.playerName
    toast(name ? `${name}: ${text}` : text, ok ? "success" : "error")
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

/** Filtro rápido de la lista: los que más se buscan son los que aún no tienen cuenta o foto */
type StatusFilter = "all" | "noAccount" | "noPhoto"
const statusFilter = ref<StatusFilter>("all")
const STATUS_FILTERS: { id: StatusFilter, label: string }[] = [
    { id: "all", label: "Todos" },
    { id: "noAccount", label: "Sin cuenta" },
    { id: "noPhoto", label: "Sin foto" },
]
const matchesStatus = (m: IClubMember, f: StatusFilter) =>
    f === "all" || (f === "noAccount" ? !m.userId : !m.imageUrl)
const statusCount = (f: StatusFilter) => members.value.filter((m) => inFilter(m.playerId) && matchesStatus(m, f)).length

const filteredMembers = computed(() => {
    const q = search.value.trim().toLowerCase()
    return members.value.filter((m) =>
        inFilter(m.playerId) && matchesStatus(m, statusFilter.value)
        && (!q || m.playerName.toLowerCase().includes(q) || (m.proName ?? "").toLowerCase().includes(q))
    )
})

const tabs = computed<PanelTab[]>(() => [
    { id: "solicitudes", label: "Solicitudes", icon: ICONS.requests, count: loading.value ? undefined : visibleRequests.value.length || undefined },
    { id: "jugadores", label: "Jugadores", icon: ICONS.players },
    { id: "tokens", label: "Tokens de API", icon: ICONS.tokens },
])

// ---- Ventana de edición de un jugador (foto + cuenta) ----
const editDialog = ref<HTMLDialogElement | null>(null)
const editing = ref<IClubMember | null>(null)
async function openEdit(m: IClubMember) {
    editing.value = m
    draftFor(m)
    // Se abre con el contenido ya pintado, para que el foco vaya a su botón con autofocus
    await nextTick()
    editDialog.value?.showModal()
}
/** Al cerrarse (Esc, clic fuera, Cancelar o tras guardar): lo no guardado se descarta */
function onEditClosed() {
    const m = editing.value
    if (m && !saving.value[m.playerId]) drafts.value[m.playerId] = draftOf(m)
}
async function saveEdit() {
    const m = editing.value
    if (!m) return
    await save(m)
    if (!rowMessage.value[m.playerId] || rowMessage.value[m.playerId].ok) editDialog.value?.close()
}

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

// Sin pestaña en la URL: a Solicitudes si hay pendientes, si no a Jugadores
watch(loading, (l) => {
    if (!l && tab.value === null) tab.value = visibleRequests.value.length ? "solicitudes" : "jugadores"
})
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
        <p class="text-base-content/75">Tu cuenta no tiene permisos para ver este panel.</p>
        <a href="/" class="btn btn-primary btn-sm">Volver a mi cuenta</a>
    </div>

    <div v-else class="w-full text-left">
        <div class="breadcrumbs text-sm">
            <ul>
                <li><a href="/">Mi cuenta</a></li>
                <li>Admin</li>
            </ul>
        </div>

        <header class="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-4">
            <div>
                <h1 class="text-3xl lg:text-4xl font-black tracking-tight">Panel admin</h1>
                <p class="text-sm text-base-content/75 mt-1">Vinculaciones, fotos y tokens. Lo que cambies se aplica al jugador en todos los clubes.</p>
            </div>
            <button class="btn btn-sm btn-ghost gap-1.5 self-start md:self-auto" :disabled="loading" @click="load">
                <svg class="size-4" :class="{ 'animate-spin': loading }" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                </svg>
                Recargar
            </button>
        </header>

        <PanelTabs :tabs="tabs" :model-value="activeTab" label="Secciones del panel" @update:model-value="selectTab" />

        <div v-if="failedClubs.length" role="alert" class="alert alert-warning alert-soft text-sm mt-4">
            No responde el api de {{ failedClubs.map((c) => c.name).join(" y ") }}: faltan sus jugadores y solicitudes.
        </div>

        <!-- Filtro por club (Solicitudes y Jugadores): los datos son los mismos, solo cambia qué se ve -->
        <div v-if="CLUBS.length > 1 && activeTab !== 'tokens'" class="flex flex-wrap gap-2 mt-4" role="group" aria-label="Filtrar por club">
            <button type="button" :aria-pressed="clubFilter === 'all'"
                class="btn btn-sm gap-2" :class="clubFilter === 'all' ? 'btn-primary' : 'btn-ghost'" @click="selectFilter('all')">
                <span class="flex -space-x-1.5">
                    <ClubCrest v-for="c in CLUBS" :key="c.id" :club="c" :on-brand="clubFilter === 'all'" class="size-5" />
                </span>
                Todos los clubes
            </button>
            <button v-for="c in CLUBS" :key="c.id" type="button" :aria-pressed="clubFilter === c.id"
                class="btn btn-sm gap-2" :class="clubFilter === c.id ? 'btn-primary' : 'btn-ghost'" @click="selectFilter(c.id)">
                <ClubCrest :club="c" :on-brand="clubFilter === c.id" class="size-5" />
                {{ c.name }}
            </button>
        </div>

        <!-- ═══ Tokens (no depende de cargar jugadores) ═══ -->
        <section v-if="activeTab === 'tokens'" role="tabpanel" aria-labelledby="tab-tokens" class="mt-6">
            <ApiTokens />
        </section>

        <AdminSkeleton v-else-if="loading" body-only class="mt-6" />

        <div v-else-if="loadError" role="alert" class="alert alert-error mt-6">
            <span>No se han podido cargar los datos ({{ loadError }}). ¿Sesión caducada o api caído?</span>
        </div>

        <!-- ═══ Solicitudes ═══ -->
        <section v-else-if="activeTab === 'solicitudes'" role="tabpanel" aria-labelledby="tab-solicitudes" class="mt-6">
            <div v-if="visibleRequests.length === 0" class="rounded-box bg-base-200 p-10 text-center">
                <p class="font-bold">No hay solicitudes pendientes</p>
                <p class="text-sm text-base-content/75 mt-1">Cuando alguien pida vincular su cuenta a un jugador, aparecerá aquí.</p>
            </div>
            <ul v-else class="flex flex-col gap-3">
                <li v-for="r in visibleRequests" :key="r.id" class="rounded-box bg-base-200 p-4 flex flex-col sm:flex-row sm:items-center gap-4">
                    <div class="flex items-center gap-3 min-w-0 flex-1">
                        <div class="avatar shrink-0">
                            <div class="w-10 rounded-full bg-base-300">
                                <img v-if="r.userImage" :src="r.userImage" :alt="r.userName" />
                            </div>
                        </div>
                        <div class="min-w-0">
                            <p class="text-sm">
                                <span class="font-bold">{{ r.userName }}</span>
                                <span class="text-base-content/75"> quiere ser </span>
                                <a :href="playerUrl(r.playerId)" target="_blank" rel="noopener" class="font-bold hover-text-brand">{{ r.playerName }}</a>
                            </p>
                            <p class="text-xs text-base-content/75 mt-0.5 flex items-center gap-1.5">
                                <span class="flex -space-x-1">
                                    <img v-for="c in clubsFor(r.playerId)" :key="c.id" :src="c.logo" :alt="c.name" :title="c.name" class="size-4 object-contain" />
                                </span>
                                Pedida el {{ new Date(r.createdAt).toLocaleDateString("es-ES") }}
                            </p>
                        </div>
                    </div>
                    <div class="flex gap-2 sm:shrink-0">
                        <button class="btn sm:btn-sm btn-primary flex-1 sm:flex-none" :disabled="requestBusy[r.id]" @click="resolveRequest(r, 'approve')">
                            <span v-if="requestBusy[r.id]" class="loading loading-spinner loading-xs"></span>
                            Aprobar
                        </button>
                        <button class="btn sm:btn-sm btn-ghost text-error flex-1 sm:flex-none" :disabled="requestBusy[r.id]" @click="resolveRequest(r, 'reject')">Rechazar</button>
                    </div>
                </li>
            </ul>
            <p v-if="requestError" role="alert" class="text-sm text-error mt-3">No se ha podido resolver la solicitud ({{ requestError }})</p>
        </section>

        <!-- ═══ Jugadores ═══ -->
        <section v-else role="tabpanel" aria-labelledby="tab-jugadores" class="mt-6">
            <div class="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
                <label class="input input-sm w-full sm:w-72">
                    <svg class="size-4 opacity-60" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">
                        <path stroke-linecap="round" stroke-linejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                    </svg>
                    <input v-model="search" type="search" aria-label="Buscar jugador o pro" placeholder="Buscar jugador o pro" />
                </label>
                <div class="flex flex-wrap gap-1.5" role="group" aria-label="Filtrar jugadores">
                    <button v-for="f in STATUS_FILTERS" :key="f.id" type="button" :aria-pressed="statusFilter === f.id"
                        class="btn btn-sm rounded-full" :class="statusFilter === f.id ? 'btn-neutral' : 'btn-ghost'" @click="statusFilter = f.id">
                        {{ f.label }}
                        <span class="text-xs opacity-70 tabular-nums">{{ statusCount(f.id) }}</span>
                    </button>
                </div>
            </div>

            <ul v-if="filteredMembers.length" class="rounded-box bg-base-200 divide-y divide-base-content/10 overflow-hidden">
                <li v-for="m in filteredMembers" :key="m.playerId">
                    <button type="button" class="w-full text-left flex items-center gap-3 px-4 py-3 transition-colors hover:bg-base-content/5 focus-visible:bg-base-content/5"
                        :aria-label="`Editar ${m.playerName}`" @click="openEdit(m)">
                        <PlayerCard class="min-w-0 flex-1" :member="m" :image="m.imageUrl || null" size="sm" no-dates>
                            <span class="flex flex-wrap items-center gap-1.5 mt-1">
                                <img v-for="c in (CLUBS.length > 1 ? clubsFor(m.playerId) : [])" :key="c.id" :src="c.logo" :alt="c.name" :title="c.name" class="size-4 object-contain" />
                                <span v-if="!m.imageUrl" class="badge badge-xs badge-ghost">Sin foto</span>
                                <span v-if="!m.userId" class="badge badge-xs badge-ghost sm:hidden">Sin cuenta</span>
                            </span>
                        </PlayerCard>
                        <span class="hidden sm:flex items-center gap-2 min-w-0 w-48 shrink-0">
                            <template v-if="m.userId && usersById.get(m.userId)">
                                <img v-if="usersById.get(m.userId)!.image" :src="usersById.get(m.userId)!.image!" alt="" class="size-6 rounded-full object-cover shrink-0" loading="lazy" />
                                <span class="text-sm truncate">{{ usersById.get(m.userId)!.name }}</span>
                            </template>
                            <span v-else class="text-sm text-base-content/60">Sin cuenta</span>
                        </span>
                        <svg class="size-4 text-base-content/60 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">
                            <path stroke-linecap="round" stroke-linejoin="round" d="m9 5 7 7-7 7" />
                        </svg>
                    </button>
                </li>
            </ul>
            <p v-else class="rounded-box bg-base-200 p-10 text-center text-base-content/75">Ningún jugador coincide.</p>
        </section>
    </div>

    <!-- Editar un jugador: foto y cuenta vinculada -->
    <dialog ref="editDialog" class="modal modal-bottom sm:modal-middle" closedby="any" aria-labelledby="edit-title" @close="onEditClosed">
        <div v-if="editing" class="modal-box text-left">
            <h3 id="edit-title" class="sr-only">Editar {{ editing.playerName }}</h3>
            <PlayerCard :member="editing" :image="draftFor(editing).imageUrl || null" size="md" :link="playerUrl(editing.playerId)" show-id>
                <span v-if="CLUBS.length > 1" class="flex gap-1 mt-1">
                    <img v-for="c in clubsFor(editing.playerId)" :key="c.id" :src="c.logo" :alt="c.name" :title="c.name" class="size-4 object-contain" />
                </span>
            </PlayerCard>

            <div class="mt-6">
                <p class="text-xs font-black uppercase tracking-wider text-base-content/75">Foto</p>
                <div class="flex flex-wrap gap-2 mt-2">
                    <button type="button" class="btn btn-sm btn-primary" autofocus @click="openImageEditor(editing)">{{ editing.imageUrl ? "Cambiar foto…" : "Añadir foto…" }}</button>
                    <button v-if="draftFor(editing).imageUrl" type="button" class="btn btn-sm btn-ghost text-error" @click="draftFor(editing).imageUrl = ''">Quitar foto</button>
                </div>
                <p class="text-xs text-base-content/75 mt-2">
                    {{ !draftFor(editing).imageUrl && editing.imageUrl
                        ? "Se quitará al guardar."
                        : "Pega una URL o sube una imagen y encuádrala a la escala del club. Se guarda al momento." }}
                </p>
            </div>

            <div class="mt-6">
                <p class="text-xs font-black uppercase tracking-wider text-base-content/75">Cuenta vinculada</p>
                <div class="flex flex-wrap items-center gap-2 mt-2">
                    <button type="button" class="btn btn-sm btn-outline justify-between font-normal min-w-0 flex-1" @click="openAccountPicker(editing)">
                        <span class="flex items-center gap-2 min-w-0">
                            <img v-if="usersById.get(draftFor(editing).userId)?.image" :src="usersById.get(draftFor(editing).userId)!.image!" alt="" class="size-5 rounded-full shrink-0 object-cover" />
                            <span class="truncate" :class="{ 'text-base-content/60': !usersById.get(draftFor(editing).userId) }">{{ usersById.get(draftFor(editing).userId)?.name ?? "Elegir cuenta…" }}</span>
                        </span>
                        <svg class="size-4 shrink-0 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" /></svg>
                    </button>
                    <button v-if="draftFor(editing).userId" type="button" class="btn btn-sm btn-ghost text-error" @click="draftFor(editing).userId = ''">Desvincular</button>
                </div>
                <p v-if="draftFor(editing).userId && linkedElsewhere(draftFor(editing).userId, editing.playerId)" class="text-xs text-warning mt-2">
                    Esta cuenta está vinculada a {{ linkedElsewhere(draftFor(editing).userId, editing.playerId)!.playerName }}; al guardar pasará a este jugador.
                </p>
            </div>

            <p v-if="rowMessage[editing.playerId]?.text && !rowMessage[editing.playerId].ok" role="alert" class="text-sm text-error mt-4">
                {{ rowMessage[editing.playerId].text }}
            </p>

            <div class="modal-action">
                <form method="dialog"><button class="btn btn-ghost">{{ isDirty(editing) ? "Cancelar" : "Cerrar" }}</button></form>
                <button type="button" class="btn btn-primary" :disabled="!isDirty(editing) || saving[editing.playerId]" @click="saveEdit">
                    <span v-if="saving[editing.playerId]" class="loading loading-spinner loading-xs"></span>
                    Guardar cambios
                </button>
            </div>
        </div>
        <form method="dialog" class="modal-backdrop"><button tabindex="-1">Cerrar</button></form>
    </dialog>

    <PlayerImageEditor
        ref="imageEditor"
        :club="editingClub"
        :player-id="editingMember?.playerId ?? ''"
        :player-name="editingMember?.playerName ?? ''"
        @uploaded="onImageUploaded"
    />
    <Toaster />
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
