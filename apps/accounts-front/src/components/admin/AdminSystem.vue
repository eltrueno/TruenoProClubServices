<script setup lang="ts">
/**
 * Sistema: cómo está cada club (api, worker, último partido, RabbitMQ), botones para sincronizar
 * ya con EA o recalcular stats, y el registro de acciones de admin (lo de los clubes y lo del
 * servicio de cuentas, juntos y por fecha).
 */
import { computed, onMounted, ref } from "vue"
import type { IAdminAuditEntry, IAdminStatus } from "@trueno-proclub-services/shared"
import { ApiError, authApi, clubApi } from "@/lib/api"
import { CLUBS, type ClubLink } from "@/config/site"
import { relativeTime, roleLabel } from "@/lib/format"
import { toast } from "@/lib/toast"
import ClubCrest from "./ClubCrest.vue"

const statuses = ref<Record<string, IAdminStatus | null>>({})
const statusError = ref<Record<string, string>>({})
const loadingStatus = ref(true)

async function loadStatus() {
    loadingStatus.value = true
    await Promise.all(CLUBS.map(async (c) => {
        try {
            statuses.value[c.id] = await clubApi(c).admin.status()
            delete statusError.value[c.id]
        } catch (e) {
            statuses.value[c.id] = null
            statusError.value[c.id] = e instanceof ApiError ? e.code : "ERROR"
        }
    }))
    loadingStatus.value = false
}

// ── Sincronizar / recalcular ──
const busy = ref<Record<string, boolean>>({})
const confirmRecalc = ref<ClubLink | null>(null)
const recalcDialog = ref<HTMLDialogElement | null>(null)

async function run(c: ClubLink, what: "sync" | "recalculate") {
    busy.value[`${c.id}-${what}`] = true
    try {
        const { queued } = await (what === "sync" ? clubApi(c).admin.syncNow() : clubApi(c).admin.recalculate())
        if (queued) toast(what === "sync" ? `${c.name}: sincronizando con EA…` : `${c.name}: recalculando stats, logros y medias…`, "success")
        else toast(`${c.name}: el worker no se ha enterado (RabbitMQ no está configurado o no responde)`, "error")
        // El estado cambia cuando el worker termina: se vuelve a mirar en un rato
        setTimeout(loadStatus, what === "sync" ? 15000 : 45000)
    } catch (e) {
        toast(`${c.name}: no se ha podido (${e instanceof ApiError ? e.code : "ERROR"})`, "error")
    } finally {
        busy.value[`${c.id}-${what}`] = false
    }
}
function askRecalc(c: ClubLink) {
    confirmRecalc.value = c
    recalcDialog.value?.showModal()
}

/** El worker sincroniza cada `intervalSec`: si lleva más del triple sin hacerlo, algo pasa */
function syncHealth(s: IAdminStatus | null): { tone: string; text: string } {
    const w = s?.worker
    if (!w?.lastSyncAt) return { tone: "badge-ghost", text: "Sin datos" }
    if (w.lastSyncOk === false) return { tone: "badge-error", text: "Falló" }
    const age = (Date.now() - new Date(w.lastSyncAt).getTime()) / 1000
    if (age > (w.intervalSec ?? 300) * 3) return { tone: "badge-warning", text: "Parado" }
    return { tone: "badge-success", text: "Al día" }
}
const fmtDate = (v?: string | Date | null) => (v ? new Date(v).toLocaleString("es-ES", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—")

// ── Registro de acciones ──
const audit = ref<IAdminAuditEntry[]>([])
const auditLoading = ref(true)
async function loadAudit() {
    auditLoading.value = true
    const lists = await Promise.all([
        authApi.adminAudit(200).catch(() => []),
        ...CLUBS.map((c) => clubApi(c).admin.audit(200).catch(() => [])),
    ])
    // Lo global (vínculos, fotos) está en la base compartida: llega de cada api, se queda una vez
    const byId = new Map<string, IAdminAuditEntry>()
    for (const list of lists) for (const e of list) byId.set(e.id, e)
    audit.value = [...byId.values()].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
    auditLoading.value = false
}

const clubByEaId = computed(() => new Map(CLUBS.map((c) => [statuses.value[c.id]?.clubId, c] as const).filter(([id]) => !!id)))

const ACTION_TEXT: Record<string, string> = {
    "member.link": "vinculó una cuenta a",
    "member.unlink": "desvinculó la cuenta de",
    "member.photo": "cambió la foto de",
    "member.photo.upload": "subió una foto de",
    "linkRequest.approve": "aprobó la solicitud de",
    "linkRequest.reject": "rechazó la solicitud de",
    "match.void": "marcó como nulo",
    "match.unvoid": "quitó el nulo a",
    "match.voidAuto": "devolvió al automático",
    "worker.sync": "pidió sincronizar con EA",
    "worker.recalculate": "pidió recalcular stats",
    "user.role": "cambió el rol de",
    "token.create": "creó el token",
    "token.revoke": "revocó un token",
}
type Kind = "all" | "players" | "matches" | "accounts" | "system"
const KIND_OF = (a: string): Kind => (a.startsWith("member") || a.startsWith("linkRequest") ? "players" : a.startsWith("match") ? "matches" : a.startsWith("user") || a.startsWith("token") ? "accounts" : "system")
const KINDS: { id: Kind; label: string }[] = [
    { id: "all", label: "Todo" }, { id: "players", label: "Jugadores" }, { id: "matches", label: "Partidos" },
    { id: "accounts", label: "Cuentas" }, { id: "system", label: "Sistema" },
]
const kind = ref<Kind>("all")
const visibleAudit = computed(() => audit.value.filter((e) => kind.value === "all" || KIND_OF(e.action) === kind.value).slice(0, 150))
function extra(e: IAdminAuditEntry): string {
    const d = (e.details ?? {}) as Record<string, unknown>
    if (e.action === "user.role") return `${roleLabel(String(d.from))} → ${roleLabel(String(d.to))}`
    if (e.action === "linkRequest.approve" || e.action === "linkRequest.reject") return d.userName ? `(cuenta ${d.userName})` : ""
    if (e.action === "member.photo" || e.action === "member.photo.upload") return d.scope === "club" ? "(solo en este club)" : ""
    return ""
}

onMounted(() => { loadStatus(); loadAudit() })
</script>

<template>
    <div class="flex flex-col gap-8">
        <!-- Estado por club -->
        <section>
            <div class="flex items-center justify-between gap-3 mb-3">
                <h2 class="text-lg font-black">Estado de los clubes</h2>
                <button type="button" class="btn btn-sm btn-ghost" :disabled="loadingStatus" @click="loadStatus">Actualizar</button>
            </div>
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <article v-for="c in CLUBS" :key="c.id" class="rounded-box bg-base-200 p-5 flex flex-col gap-4">
                    <header class="flex items-center gap-3">
                        <ClubCrest :club="c" class="size-8" />
                        <h3 class="font-black text-lg flex-1">{{ c.name }}</h3>
                        <span v-if="loadingStatus && !statuses[c.id]" class="loading loading-spinner loading-sm"></span>
                        <span v-else-if="statusError[c.id]" class="badge badge-error">Api caído</span>
                        <span v-else class="badge" :class="syncHealth(statuses[c.id] ?? null).tone">{{ syncHealth(statuses[c.id] ?? null).text }}</span>
                    </header>

                    <p v-if="statusError[c.id]" class="text-sm text-error">El api no responde ({{ statusError[c.id] }}).</p>
                    <dl v-else-if="statuses[c.id]" class="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                        <div>
                            <dt class="text-xs uppercase font-black tracking-wider text-base-content/60">Última sincronización</dt>
                            <dd class="font-bold">{{ relativeTime(statuses[c.id]!.worker?.lastSyncAt) ?? "—" }}</dd>
                            <dd class="text-xs text-base-content/70">
                                <template v-if="statuses[c.id]!.worker?.lastSyncOk === false">Error: {{ statuses[c.id]!.worker?.lastSyncError }}</template>
                                <template v-else-if="statuses[c.id]!.worker?.lastSyncAt">{{ statuses[c.id]!.worker?.lastSyncInserted ?? 0 }} partidos nuevos · cada {{ Math.round((statuses[c.id]!.worker?.intervalSec ?? 300) / 60) }} min</template>
                            </dd>
                        </div>
                        <div>
                            <dt class="text-xs uppercase font-black tracking-wider text-base-content/60">Último partido</dt>
                            <dd class="font-bold">{{ statuses[c.id]!.lastMatch ? relativeTime(new Date(statuses[c.id]!.lastMatch!.timestamp * 1000)) : "—" }}</dd>
                            <dd class="text-xs text-base-content/70">{{ statuses[c.id]!.lastMatch ? fmtDate(new Date(statuses[c.id]!.lastMatch!.timestamp * 1000)) : "" }}</dd>
                        </div>
                        <div>
                            <dt class="text-xs uppercase font-black tracking-wider text-base-content/60">Último recálculo</dt>
                            <dd class="font-bold">{{ relativeTime(statuses[c.id]!.worker?.lastRecalcAt) ?? "—" }}</dd>
                            <dd class="text-xs text-base-content/70">Worker arrancado {{ relativeTime(statuses[c.id]!.worker?.startedAt) ?? "—" }}</dd>
                        </div>
                        <div>
                            <dt class="text-xs uppercase font-black tracking-wider text-base-content/60">En la base</dt>
                            <dd class="font-bold tabular-nums">{{ statuses[c.id]!.matches }} partidos · {{ statuses[c.id]!.members }} jugadores</dd>
                            <dd class="text-xs" :class="statuses[c.id]!.events ? 'text-base-content/70' : 'text-warning'">{{ statuses[c.id]!.events ? "RabbitMQ conectado" : "Sin RabbitMQ: los botones no llegan al worker" }}</dd>
                        </div>
                    </dl>

                    <div class="flex flex-wrap gap-2 mt-auto">
                        <button type="button" class="btn btn-sm btn-primary" :disabled="!!statusError[c.id] || busy[`${c.id}-sync`]" @click="run(c, 'sync')">
                            <span v-if="busy[`${c.id}-sync`]" class="loading loading-spinner loading-xs"></span>
                            Sincronizar ahora
                        </button>
                        <button type="button" class="btn btn-sm btn-outline" :disabled="!!statusError[c.id] || busy[`${c.id}-recalculate`]" @click="askRecalc(c)">
                            <span v-if="busy[`${c.id}-recalculate`]" class="loading loading-spinner loading-xs"></span>
                            Recalcular stats
                        </button>
                    </div>
                </article>
            </div>
        </section>

        <!-- Registro de acciones -->
        <section>
            <div class="flex flex-wrap items-center justify-between gap-3 mb-3">
                <h2 class="text-lg font-black">Registro de acciones</h2>
                <div class="flex flex-wrap gap-1.5" role="group" aria-label="Filtrar acciones">
                    <button v-for="k in KINDS" :key="k.id" type="button" :aria-pressed="kind === k.id" class="btn btn-xs rounded-full"
                        :class="kind === k.id ? 'btn-neutral' : 'btn-ghost'" @click="kind = k.id">{{ k.label }}</button>
                </div>
            </div>
            <div v-if="auditLoading" class="flex flex-col gap-2" aria-busy="true"><div v-for="n in 5" :key="n" class="skeleton on-page h-10 w-full"></div></div>
            <p v-else-if="!visibleAudit.length" class="rounded-box bg-base-200 p-8 text-center text-base-content/75">Nada todavía. Las acciones se apuntan desde ahora y se guardan 180 días.</p>
            <ol v-else class="rounded-box bg-base-200 divide-y divide-base-content/10 overflow-hidden text-sm">
                <li v-for="e in visibleAudit" :key="e.id" class="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 px-4 py-2.5">
                    <time class="text-xs text-base-content/60 tabular-nums sm:w-32 shrink-0" :datetime="String(e.createdAt)" :title="new Date(e.createdAt).toLocaleString('es-ES')">{{ fmtDate(e.createdAt) }}</time>
                    <p class="min-w-0 flex-1">
                        <b>{{ e.actorName ?? "Alguien" }}</b>
                        {{ ACTION_TEXT[e.action] ?? e.action }}
                        <b v-if="e.targetName">{{ e.targetName }}</b>
                        <span v-if="extra(e)" class="text-base-content/70 ml-1">{{ extra(e) }}</span>
                    </p>
                    <span v-if="e.clubId && clubByEaId.get(e.clubId)" class="flex items-center gap-1.5 text-xs text-base-content/70 shrink-0">
                        <ClubCrest :club="clubByEaId.get(e.clubId)!" class="size-4" />{{ clubByEaId.get(e.clubId)!.name }}
                    </span>
                </li>
            </ol>
        </section>

        <!-- Confirmación del recálculo (tarda y deja las stats a medias mientras dura) -->
        <dialog ref="recalcDialog" class="modal" closedby="any" aria-labelledby="recalc-title">
            <div class="modal-box text-left">
                <h3 id="recalc-title" class="font-black text-lg">¿Recalcular {{ confirmRecalc?.name }}?</h3>
                <p class="text-sm text-base-content/80 mt-2">
                    El worker borra y rehace desde cero las stats, los logros y las medias con todos los partidos. Tarda un poco y, mientras
                    dura, las webs pueden enseñar números a medias. Los logros no se vuelven a anunciar en Discord.
                </p>
                <div class="modal-action">
                    <form method="dialog"><button class="btn btn-ghost">Cancelar</button></form>
                    <form method="dialog"><button class="btn btn-primary" @click="confirmRecalc && run(confirmRecalc, 'recalculate')">Recalcular</button></form>
                </div>
            </div>
            <form method="dialog" class="modal-backdrop"><button tabindex="-1">Cerrar</button></form>
        </dialog>
    </div>
</template>
