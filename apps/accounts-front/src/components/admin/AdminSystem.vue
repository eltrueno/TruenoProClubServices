<script setup lang="ts">
/**
 * Sistema: cómo está cada club (api, worker en directo, último partido, RabbitMQ), botones para
 * sincronizar ya con EA o recalcular stats (trabajos que se siguen hasta que acaban), los
 * mantenimientos (arreglos de partidos guardados, con vista previa antes de aplicar) y el registro
 * de acciones de admin (lo de los clubes y lo del servicio de cuentas, juntos y por fecha).
 */
import { computed, onBeforeUnmount, onMounted, ref } from "vue"
import type { IAdminAuditEntry, IAdminStatus, IAdminWorkerHealth, IMaintenancePreview, IMaintenanceTask, IWorkerJob } from "@trueno-proclub-services/shared"
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

// ── Worker en directo: ping por RPC cada 10 s mientras la pestaña se ve ──
const workers = ref<Record<string, IAdminWorkerHealth | null>>({})
async function loadWorkers() {
    await Promise.all(CLUBS.map(async (c) => {
        try {
            const h = await clubApi(c).admin.worker()
            workers.value[c.id] = h
            if (h.alive) for (const j of h.jobs ?? []) if (isLiveJob(j) && !tracked.value[jobKey(c, j)]) track(c, j)
        } catch {
            // El api no responde: eso ya lo dice el estado del club
            workers.value[c.id] = null
        }
    }))
}
let workerTimer: ReturnType<typeof setInterval> | null = null
const tick = () => { if (document.visibilityState === "visible") void loadWorkers() }
onMounted(() => { void loadWorkers(); workerTimer = setInterval(tick, 10_000) })
onBeforeUnmount(() => {
    if (workerTimer) clearInterval(workerTimer)
    if (pollTimer) clearInterval(pollTimer)
})

const TASK_LABEL: Record<string, string> = { sync: "sincronizando con EA", recalculate: "recalculando stats", totw: "calculando el TOTW", startup: "arrancando", maintenance: "aplicando un mantenimiento" }
/** "sincronizando con EA (12 s) · 1 esperando" o "Libre" */
function queueText(h: WorkerUp): string {
    const q = h.queue
    const secs = q.runningSince ? Math.max(0, Math.round((Date.now() - new Date(q.runningSince).getTime()) / 1000)) : 0
    const running = q.running ? `${TASK_LABEL[q.running] ?? q.running} (${secs < 90 ? `${secs} s` : `${Math.round(secs / 60)} min`})` : "Libre"
    return q.waiting ? `${running} · ${q.waiting} esperando` : running
}
type WorkerUp = Extract<IAdminWorkerHealth, { alive: true }>
type WorkerDown = Extract<IAdminWorkerHealth, { alive: false }>
const workerUp = (id: string): WorkerUp | null => { const h = workers.value[id]; return h?.alive ? h : null }
const workerDown = (id: string): WorkerDown | null => { const h = workers.value[id]; return h && !h.alive ? h : null }
const WORKER_DOWN: Record<WorkerDown["reason"], string> = {
    disabled: "Sin RabbitMQ en el api: no se le puede preguntar",
    unavailable: "No está escuchando (parado o sin conexión con RabbitMQ)",
    timeout: "No contesta (puede estar colgado)",
    error: "Error al preguntarle",
}

// ── Sincronizar / recalcular ──
const busy = ref<Record<string, boolean>>({})
const confirmRecalc = ref<ClubLink | null>(null)
const recalcDialog = ref<HTMLDialogElement | null>(null)

// ── Trabajos (sincronizar, recalcular, mantenimientos): el worker los acepta al momento y se
//    consultan cada 2 s hasta que acaban ──
type Tracked = { club: ClubLink; job: IWorkerJob; lost?: boolean }
const tracked = ref<Record<string, Tracked>>({})
const jobKey = (c: ClubLink, j: Pick<IWorkerJob, "kind" | "label">) => `${c.id}:${j.kind}:${j.label}`
const trackedFor = (c: ClubLink, kind: IWorkerJob["kind"], label: string): Tracked | undefined => tracked.value[`${c.id}:${kind}:${label}`]
const isLiveJob = (j: IWorkerJob) => j.state === "queued" || j.state === "running"
const isLive = (t?: Tracked) => !!t && !t.lost && isLiveJob(t.job)
/** Para el "lleva 12 s" (se refresca con cada consulta) */
const now = ref(Date.now())
let pollTimer: ReturnType<typeof setInterval> | null = null

function track(c: ClubLink, job: IWorkerJob) {
    tracked.value[jobKey(c, job)] = { club: c, job }
    if (isLiveJob(job) && !pollTimer) pollTimer = setInterval(pollJobs, 2000)
}
async function pollJobs() {
    now.value = Date.now()
    const live = Object.entries(tracked.value).filter(([, t]) => isLive(t))
    if (!live.length) {
        if (pollTimer) clearInterval(pollTimer)
        pollTimer = null
        return
    }
    await Promise.all(live.map(async ([key, t]) => {
        try {
            const job = await clubApi(t.club).admin.job(t.job.id)
            tracked.value[key] = { ...t, job }
            if (!isLiveJob(job)) finished(t.club, job)
        } catch (e) {
            if (e instanceof ApiError && e.httpStatus === 404) {
                tracked.value[key] = { ...t, lost: true }
                toast(`${t.club.name}: el worker se ha reiniciado y no se sabe cómo acabó «${t.job.label}»`, "error")
            }
            // Otros errores (red, api): se vuelve a probar en la siguiente vuelta
        }
    }))
}
function finished(c: ClubLink, job: IWorkerJob) {
    if (job.state === "done") toast(`${c.name} · ${job.label}: ${job.result?.summary ?? "hecho"}`, "success")
    else toast(`${c.name} · ${job.label} ha fallado: ${job.error ?? "sin detalle"}`, "error")
    void loadStatus()
    void loadWorkers()
}
const secs = (from?: string | null, to?: string | null) => {
    if (!from) return ""
    const n = Math.max(0, Math.round(((to ? new Date(to).getTime() : now.value) - new Date(from).getTime()) / 1000))
    return n < 90 ? `${n} s` : `${Math.round(n / 60)} min`
}
/** Una línea con cómo va: en cola, en marcha (y cuánto lleva), hecho (resumen y duración) o fallido */
function jobLine(t: Tracked): { tone: string; text: string; live: boolean } {
    const j = t.job
    if (t.lost) return { tone: "text-warning", text: "El worker se reinició: no se sabe cómo acabó", live: false }
    if (j.state === "queued") return { tone: "text-base-content/70", text: "En cola, detrás de otra tarea…", live: true }
    if (j.state === "running") return { tone: "text-base-content/70", text: `En marcha · ${secs(j.startedAt)}`, live: true }
    if (j.state === "done") return { tone: "text-success", text: `${j.result?.summary ?? "Hecho"} · ${secs(j.startedAt ?? j.queuedAt, j.finishedAt)} · ${relativeTime(j.finishedAt) ?? ""}`, live: false }
    return { tone: "text-error", text: `Falló: ${j.error ?? "sin detalle"}`, live: false }
}
/** Errores del api al hablar con el worker, en cristiano */
function errText(e: unknown): string {
    if (!(e instanceof ApiError)) return "error inesperado"
    if (e.code === "WORKER_UNAVAILABLE") return "el worker no está escuchando (parado o sin RabbitMQ)"
    if (e.code === "WORKER_TIMEOUT") return "el worker no contesta"
    if (e.code === "WORKER_OUTDATED") return "el worker es de una versión anterior (sin esta función)"
    return e.message && e.message !== e.code ? e.message : e.code
}

const JOB_LABEL = { sync: "Sincronizar con EA", recalculate: "Recalcular stats" } as const
const JOB_KINDS = ["sync", "recalculate"] as const
async function run(c: ClubLink, what: "sync" | "recalculate") {
    busy.value[`${c.id}-${what}`] = true
    try {
        track(c, await (what === "sync" ? clubApi(c).admin.syncNow() : clubApi(c).admin.recalculate()))
        setTimeout(loadWorkers, 1000)
    } catch (e) {
        toast(`${c.name}: no se ha podido (${errText(e)})`, "error")
    } finally {
        busy.value[`${c.id}-${what}`] = false
    }
}

// ── Mantenimientos ──
const tasks = ref<IMaintenanceTask[]>([])
const tasksError = ref<string | null>(null)
const tasksLoading = ref(true)
/** La lista es la misma en todos los workers (mismo código): se pide al primero que conteste */
async function loadTasks() {
    tasksLoading.value = true
    for (const c of CLUBS) {
        try {
            tasks.value = await clubApi(c).admin.maintenance()
            tasksError.value = null
            break
        } catch (e) {
            tasksError.value = errText(e)
        }
    }
    tasksLoading.value = false
}
const preview = ref<{ club: ClubLink; task: IMaintenanceTask; data: IMaintenancePreview } | null>(null)
const previewLoading = ref<string | null>(null)
const previewDialog = ref<HTMLDialogElement | null>(null)
const applying = ref(false)
async function openPreview(c: ClubLink, t: IMaintenanceTask) {
    previewLoading.value = `${c.id}:${t.name}`
    try {
        preview.value = { club: c, task: t, data: await clubApi(c).admin.previewMaintenance(t.name) }
        if (!previewDialog.value?.open) previewDialog.value?.showModal()
    } catch (e) {
        toast(`${c.name}: no se ha podido revisar (${errText(e)})`, "error")
    } finally {
        previewLoading.value = null
    }
}
async function applyPreview() {
    const p = preview.value
    if (!p) return
    applying.value = true
    try {
        track(p.club, await clubApi(p.club).admin.applyMaintenance(p.task.name, p.data.affected))
        previewDialog.value?.close()
    } catch (e) {
        toast(`${p.club.name}: ${errText(e)}`, "error")
        // Ha cambiado desde la vista previa: se vuelve a mirar
        if (e instanceof ApiError && e.httpStatus === 409) await openPreview(p.club, p.task)
    } finally {
        applying.value = false
    }
}
const fmtDay = (ts: number) => new Date(ts * 1000).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "2-digit" })

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
    "worker.maintenance": "aplicó el mantenimiento",
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

onMounted(() => { loadStatus(); loadAudit(); loadTasks() })
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

                    <!-- Worker en directo (ping por RPC) -->
                    <div v-if="!statusError[c.id] && workers[c.id]" class="flex items-start gap-2.5 rounded-xl px-3 py-2.5 text-sm"
                        :class="workers[c.id]!.alive ? 'bg-success/10' : 'bg-error/10'" aria-live="polite">
                        <span class="relative mt-1.5 flex size-2.5 shrink-0" aria-hidden="true">
                            <span v-if="workers[c.id]!.alive" class="absolute inline-flex size-full rounded-full bg-success opacity-60 motion-safe:animate-ping"></span>
                            <span class="relative inline-flex size-2.5 rounded-full" :class="workers[c.id]!.alive ? 'bg-success' : 'bg-error'"></span>
                        </span>
                        <div v-if="workerUp(c.id)" class="min-w-0">
                            <p class="font-bold">Worker activo <span class="font-normal text-base-content/70">· v{{ workerUp(c.id)!.version }} · arrancó {{ relativeTime(workerUp(c.id)!.startedAt) }} · {{ workerUp(c.id)!.latencyMs }} ms</span></p>
                            <p class="text-xs text-base-content/70">Ahora: {{ queueText(workerUp(c.id)!) }}</p>
                        </div>
                        <div v-else-if="workerDown(c.id)" class="min-w-0">
                            <p class="font-bold text-error">El worker no responde</p>
                            <p class="text-xs text-base-content/70" :title="workerDown(c.id)!.message">{{ WORKER_DOWN[workerDown(c.id)!.reason] }}</p>
                        </div>
                    </div>

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
                        <button type="button" class="btn btn-sm btn-primary" :disabled="!!statusError[c.id] || busy[`${c.id}-sync`] || isLive(trackedFor(c, 'sync', JOB_LABEL.sync))" @click="run(c, 'sync')">
                            <span v-if="busy[`${c.id}-sync`] || isLive(trackedFor(c, 'sync', JOB_LABEL.sync))" class="loading loading-spinner loading-xs"></span>
                            Sincronizar ahora
                        </button>
                        <button type="button" class="btn btn-sm btn-outline" :disabled="!!statusError[c.id] || busy[`${c.id}-recalculate`] || isLive(trackedFor(c, 'recalculate', JOB_LABEL.recalculate))" @click="askRecalc(c)">
                            <span v-if="busy[`${c.id}-recalculate`] || isLive(trackedFor(c, 'recalculate', JOB_LABEL.recalculate))" class="loading loading-spinner loading-xs"></span>
                            Recalcular stats
                        </button>
                    </div>
                    <!-- Cómo van (o cómo acabaron) los trabajos pedidos desde aquí -->
                    <ul v-if="JOB_KINDS.some((k) => trackedFor(c, k, JOB_LABEL[k]))" class="flex flex-col gap-1 text-xs -mt-1" aria-live="polite">
                        <template v-for="kind in JOB_KINDS" :key="kind">
                            <li v-if="trackedFor(c, kind, JOB_LABEL[kind])" class="flex items-center gap-1.5" :class="jobLine(trackedFor(c, kind, JOB_LABEL[kind])!).tone">
                                <span v-if="jobLine(trackedFor(c, kind, JOB_LABEL[kind])!).live" class="loading loading-spinner loading-xs"></span>
                                <b class="font-bold text-base-content">{{ JOB_LABEL[kind] }}:</b> {{ jobLine(trackedFor(c, kind, JOB_LABEL[kind])!).text }}
                            </li>
                        </template>
                    </ul>
                </article>
            </div>
        </section>

        <!-- Mantenimientos -->
        <section>
            <div class="flex items-center justify-between gap-3 mb-1">
                <h2 class="text-lg font-black">Mantenimientos</h2>
                <button type="button" class="btn btn-sm btn-ghost" :disabled="tasksLoading" @click="loadTasks">Actualizar</button>
            </div>
            <p class="text-sm text-base-content/70 mb-3">Arreglos de partidos ya guardados. Primero se revisa qué cambiaría (no toca nada) y luego se aplica.</p>
            <div v-if="tasksLoading && !tasks.length" class="skeleton h-28 rounded-box"></div>
            <p v-else-if="!tasks.length" class="text-sm text-error">No se han podido cargar ({{ tasksError ?? "ningún worker contesta" }}).</p>
            <div v-else class="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <article v-for="t in tasks" :key="t.name" class="rounded-box bg-base-200 p-5 flex flex-col gap-3">
                    <div>
                        <h3 class="font-black">{{ t.title }}</h3>
                        <p class="text-sm text-base-content/70 mt-1">{{ t.description }}</p>
                        <p v-if="t.recalculates" class="text-xs text-base-content/60 mt-1">Si arregla algo, recalcula stats, logros y medias del club.</p>
                    </div>
                    <ul class="flex flex-col gap-2 mt-auto">
                        <li v-for="c in CLUBS" :key="c.id" class="flex flex-wrap items-center gap-x-3 gap-y-1">
                            <span class="flex items-center gap-2 font-bold text-sm flex-1 min-w-0"><ClubCrest :club="c" class="size-5" />{{ c.name }}</span>
                            <button type="button" class="btn btn-xs btn-outline"
                                :disabled="!!previewLoading || isLive(trackedFor(c, 'maintenance', t.title))" @click="openPreview(c, t)">
                                <span v-if="previewLoading === `${c.id}:${t.name}` || isLive(trackedFor(c, 'maintenance', t.title))" class="loading loading-spinner loading-xs"></span>
                                Revisar
                            </button>
                            <p v-if="trackedFor(c, 'maintenance', t.title)" class="basis-full text-xs" :class="jobLine(trackedFor(c, 'maintenance', t.title)!).tone" aria-live="polite">
                                {{ jobLine(trackedFor(c, 'maintenance', t.title)!).text }}
                            </p>
                        </li>
                    </ul>
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

        <!-- Vista previa de un mantenimiento: qué partidos cambiarían, y aplicar -->
        <dialog ref="previewDialog" class="modal" closedby="any" aria-labelledby="preview-title">
            <div v-if="preview" class="modal-box max-w-2xl text-left">
                <h3 id="preview-title" class="font-black text-lg flex items-center gap-2"><ClubCrest :club="preview.club" class="size-6" />{{ preview.task.title }}</h3>
                <p class="text-sm text-base-content/80 mt-2">
                    Revisados <b>{{ preview.data.scanned }}</b> partidos de {{ preview.club.name }}:
                    <template v-if="preview.data.affected"><b>{{ preview.data.affected }}</b> {{ preview.data.affected === 1 ? "cambiaría" : "cambiarían" }}.</template>
                    <template v-else>todo está bien, nada que arreglar.</template>
                </p>
                <div v-if="preview.data.changes.length" class="overflow-x-auto mt-3 max-h-80 overflow-y-auto rounded-box bg-base-200">
                    <table class="table table-sm">
                        <thead><tr><th>Partido</th><th>Ahora</th><th>Quedaría</th></tr></thead>
                        <tbody>
                            <tr v-for="ch in preview.data.changes" :key="ch.matchId">
                                <td class="whitespace-nowrap"><span class="font-bold">{{ ch.rival }}</span><span class="block text-xs text-base-content/60">{{ fmtDay(ch.timestamp) }} · #{{ ch.matchId }}</span></td>
                                <td class="tabular-nums text-base-content/70">{{ ch.before }}</td>
                                <td class="tabular-nums font-bold">{{ ch.after }}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                <p v-if="preview.data.affected > preview.data.changes.length" class="text-xs text-base-content/60 mt-2">Y {{ preview.data.affected - preview.data.changes.length }} más.</p>
                <p v-if="preview.data.affected && preview.task.recalculates" class="text-sm text-warning mt-3">Después recalcula stats, logros y medias: tarda un poco y, mientras dura, las webs pueden enseñar números a medias.</p>
                <div class="modal-action">
                    <form method="dialog"><button class="btn btn-ghost">{{ preview.data.affected ? "Cancelar" : "Cerrar" }}</button></form>
                    <button v-if="preview.data.affected" type="button" class="btn btn-primary" :disabled="applying" @click="applyPreview">
                        <span v-if="applying" class="loading loading-spinner loading-xs"></span>
                        Aplicar a {{ preview.data.affected }} {{ preview.data.affected === 1 ? "partido" : "partidos" }}
                    </button>
                </div>
            </div>
            <form method="dialog" class="modal-backdrop"><button tabindex="-1">Cerrar</button></form>
        </dialog>
    </div>
</template>
