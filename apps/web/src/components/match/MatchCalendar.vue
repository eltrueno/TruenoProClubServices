<script setup lang="ts">
/**
 * Vista calendario de /partidos (lógica en lib/matchCalendar.ts): una rejilla de días como la de
 * contribuciones de GitHub, con los partidos filtrados. Cada día, del color de su resultado y más
 * intenso cuantos más partidos; al pasar por encima, un resumen; al pulsarlo (o con las flechas),
 * sus partidos debajo. Con muchas semanas se desplaza en horizontal y arranca en la más reciente.
 */
import { computed, nextTick, onMounted, ref, watch } from "vue"
import type ClubMatchEntity from "@/model/match/ClubMatchEntity"
import { buildCalendar, type CalendarDay } from "@/lib/matchCalendar"
import MatchRow from "./MatchRow.vue"

const props = defineProps<{ matches: ClubMatchEntity[]; myId?: string | null }>()

const cal = computed(() => buildCalendar(props.matches, new Date()))
type Day = CalendarDay<ClubMatchEntity>

// ── Día elegido: por defecto el último con partidos; si los filtros lo quitan, vuelve al último ──
const selectedKey = ref<string | null>(null)
const selected = computed<Day | null>(() => cal.value?.activeDays.find((d) => d.key === selectedKey.value) ?? cal.value?.activeDays[0] ?? null)
watch(cal, (c) => { if (!c?.activeDays.some((d) => d.key === selectedKey.value)) selectedKey.value = null })

// ── Textos ──
const LONG = new Intl.DateTimeFormat("es-ES", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
const SHORT = new Intl.DateTimeFormat("es-ES", { weekday: "short", day: "numeric", month: "short" })
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
const count = (n: number) => `${n} ${n === 1 ? "partido" : "partidos"}`
/** Nulos del día (no cuentan para el balance, pero están) */
const voids = (d: Day) => d.items.length - d.wins - d.ties - d.losses
const balance = (d: Day) => {
    const v = voids(d)
    return [d.wins && `${d.wins}V`, d.ties && `${d.ties}E`, d.losses && `${d.losses}D`, v && `${v} ${v === 1 ? "nulo" : "nulos"}`].filter(Boolean).join(" · ")
}
const dayLabel = (d: Day) => (d.items.length ? `${cap(SHORT.format(d.date))}: ${count(d.items.length)}, ${balance(d)}` : `${cap(SHORT.format(d.date))}: sin partidos`)

/** Fondo de cada casilla: el color de su resultado, más opaco cuantos más partidos */
const ALPHA = ["", "45%", "65%", "82%", "100%"]
const TONE_VAR = { win: "var(--color-success)", loss: "var(--color-error)", even: "var(--color-warning)", void: "color-mix(in oklab, var(--color-base-content) 35%, transparent)" }
const cellStyle = (d: Day) => (d.tone ? { background: `color-mix(in oklab, ${TONE_VAR[d.tone]} ${ALPHA[d.level]}, transparent)` } : undefined)
const today = new Date()
const isFuture = (d: Day) => d.date > today

// ── Tooltip al pasar el ratón (en el móvil, el detalle de debajo ya lo cuenta) ──
const wrap = ref<HTMLElement | null>(null)
const tip = ref<{ day: Day; x: number; y: number } | null>(null)
function showTip(e: PointerEvent, d: Day) {
    if (e.pointerType !== "mouse" || !wrap.value) return
    const cell = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const box = wrap.value.getBoundingClientRect()
    tip.value = { day: d, x: cell.left + cell.width / 2 - box.left, y: cell.top - box.top }
}

// ── Teclado: flechas entre días con partidos (izquierda / arriba, al anterior; derecha / abajo, al siguiente) ──
const grid = ref<HTMLElement | null>(null)
function onKey(e: KeyboardEvent) {
    const days = cal.value?.activeDays
    if (!days || !selected.value) return
    const i = days.findIndex((d) => d.key === selected.value!.key)
    // activeDays va del más reciente al más antiguo
    const next = ["ArrowLeft", "ArrowUp"].includes(e.key) ? i + 1 : ["ArrowRight", "ArrowDown"].includes(e.key) ? i - 1 : e.key === "Home" ? days.length - 1 : e.key === "End" ? 0 : null
    if (next === null) return
    e.preventDefault()
    const d = days[Math.max(0, Math.min(days.length - 1, next))]
    selectedKey.value = d.key
    nextTick(() => grid.value?.querySelector<HTMLElement>(`[data-day="${d.key}"]`)?.focus())
}

// ── Arranca con la semana más reciente a la vista ──
const scroller = ref<HTMLElement | null>(null)
onMounted(() => nextTick(() => { if (scroller.value) scroller.value.scrollLeft = scroller.value.scrollWidth }))

const DAY_LABELS = ["L", "", "X", "", "V", "", "D"]
</script>

<template>
    <section v-if="cal" class="flex flex-col gap-4" aria-label="Calendario de partidos">
        <div ref="wrap" class="cal relative rounded-2xl bg-base-100 dark:bg-base-200 ring-1 ring-base-content/10 dark:ring-base-content/5 shadow-sm dark:shadow-none p-4 sm:p-5"
            :style="{ '--weeks': cal.weeks.length }">
            <div ref="scroller" class="overflow-x-auto pb-1 -mb-1">
                <div class="grid grid-cols-[auto_1fr] gap-x-2 w-max mx-auto">
                    <!-- Meses -->
                    <span></span>
                    <div class="relative h-5 text-[0.65rem] font-black uppercase tracking-wider text-base-content/50" aria-hidden="true">
                        <span v-for="m in cal.months" :key="`${m.col}-${m.label}`" class="absolute top-0" :style="{ left: `calc(${m.col} * (var(--cell) + var(--gap)))` }">{{ m.label }}</span>
                    </div>
                    <!-- Días de la semana -->
                    <div class="days grid text-[0.6rem] font-bold text-base-content/50" aria-hidden="true">
                        <span v-for="(l, i) in DAY_LABELS" :key="i" class="leading-none flex items-center">{{ l }}</span>
                    </div>
                    <!-- Rejilla: columnas = semanas, filas = lunes…domingo -->
                    <div ref="grid" class="grid-days grid" role="group" aria-label="Días con partidos (flechas para moverse)" @keydown="onKey" @pointerleave="tip = null">
                        <template v-for="w in cal.weeks" :key="w[0].key">
                            <template v-for="d in w" :key="d.key">
                                <button v-if="d.items.length" type="button" :data-day="d.key"
                                    class="cell cursor-pointer" :class="selected?.key === d.key && 'is-selected'"
                                    :style="cellStyle(d)" :aria-label="dayLabel(d)" :aria-pressed="selected?.key === d.key"
                                    :tabindex="selected?.key === d.key ? 0 : -1"
                                    @click="selectedKey = d.key" @pointerenter="showTip($event, d)"></button>
                                <span v-else class="cell" :class="isFuture(d) ? 'opacity-0' : 'bg-base-content/6'" aria-hidden="true"></span>
                            </template>
                        </template>
                    </div>
                </div>
            </div>

            <!-- Tooltip (solo con ratón) -->
            <div v-if="tip" class="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full -mt-2 rounded-lg bg-neutral text-neutral-content text-xs px-2.5 py-1.5 shadow-lg whitespace-nowrap"
                :style="{ left: `${tip.x}px`, top: `${tip.y - 6}px` }">
                <b>{{ cap(SHORT.format(tip.day.date)) }}</b> · {{ count(tip.day.items.length) }} · {{ balance(tip.day) }}
            </div>

            <!-- Leyenda -->
            <div class="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 mt-3 text-[0.7rem] text-base-content/60">
                <span class="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span class="flex items-center gap-1.5"><span class="cell-legend" style="background: var(--color-success)"></span>Más victorias</span>
                    <span class="flex items-center gap-1.5"><span class="cell-legend" style="background: var(--color-warning)"></span>Igualado</span>
                    <span class="flex items-center gap-1.5"><span class="cell-legend" style="background: var(--color-error)"></span>Más derrotas</span>
                </span>
                <span class="flex items-center gap-1" aria-label="Más intenso, más partidos ese día">
                    1
                    <span v-for="l in 4" :key="l" class="cell-legend" :style="{ background: `color-mix(in oklab, var(--color-success) ${ALPHA[l]}, transparent)` }"></span>
                    4+ partidos
                </span>
            </div>
        </div>

        <!-- Partidos del día elegido -->
        <section v-if="selected" :key="selected.key" class="day-in" aria-live="polite" :aria-label="`Partidos del ${LONG.format(selected.date)}`">
            <!-- En el móvil, el balance va debajo de la fecha (no cabe al lado) -->
            <header class="flex flex-wrap items-center gap-x-3 gap-y-0.5 mb-3">
                <h2 class="font-black text-lg">{{ cap(LONG.format(selected.date)) }}</h2>
                <span class="hidden sm:block h-px flex-1 bg-base-content/10" aria-hidden="true"></span>
                <p class="basis-full sm:basis-auto text-xs font-bold tabular-nums text-base-content/70">
                    {{ count(selected.items.length) }}<template v-if="selected.wins + selected.ties + selected.losses"> ·
                        <span class="text-success">{{ selected.wins }}V</span> · {{ selected.ties }}E · <span class="text-error">{{ selected.losses }}D</span></template><template v-if="voids(selected)"> · {{ voids(selected) }} {{ voids(selected) === 1 ? "nulo" : "nulos" }}</template>
                </p>
            </header>
            <ul class="flex flex-col gap-2">
                <li v-for="m in selected.items" :key="m.matchId"><MatchRow :match="m" :my-id="myId" /></li>
            </ul>
        </section>
    </section>
</template>

<style scoped>
/* Casillas: crecen con el ancho de la tarjeta (unidades de contenedor) entre 0,8 y 2,25 rem; con pocas semanas, centradas */
.cal { container-type: inline-size; --gap: 3px; --cell: clamp(0.8rem, calc((100cqi - 3.5rem) / var(--weeks) - var(--gap)), 2.25rem); }
.grid-days { grid-template-rows: repeat(7, var(--cell)); grid-auto-flow: column; grid-auto-columns: var(--cell); gap: var(--gap); }
.days { grid-template-rows: repeat(7, var(--cell)); gap: var(--gap); }
.cell { display: block; width: var(--cell); height: var(--cell); border-radius: 0.2rem; }
button.cell { transition: scale 0.15s, box-shadow 0.15s; }
button.cell:hover { scale: 1.2; }
.cell.is-selected { box-shadow: 0 0 0 2px var(--color-base-100), 0 0 0 4px var(--color-base-content); }
:global([data-theme="dark"]) .cal .cell.is-selected { box-shadow: 0 0 0 2px var(--color-base-200), 0 0 0 4px var(--color-base-content); }
.cell-legend { display: inline-block; width: 0.7rem; height: 0.7rem; border-radius: 0.15rem; }
@media (prefers-reduced-motion: no-preference) {
    .day-in { animation: day-in 0.3s cubic-bezier(0.22, 1, 0.36, 1) both; }
}
@media (prefers-reduced-motion: reduce) { button.cell { transition: none; } button.cell:hover { scale: none; } }
@keyframes day-in { from { opacity: 0; translate: 0 0.5rem; } }
</style>
