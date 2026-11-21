<script setup lang="ts">
/**
 * Carta de un jugador en la plantilla: la foto llena la carta; detrás, en grande, el dato por el
 * que se ordena (con su etiqueta); abajo, el nombre, la posición y otros cuatro datos, y al pasar
 * el ratón una fila más. Los tres primeros llevan el puesto grande en oro, plata o bronce.
 * Parallax sutil con Atropos (sin él con el dedo o con prefers-reduced-motion).
 */
import { computed, onBeforeUnmount, onMounted, ref } from "vue"
import "atropos/css"
import type { SquadPlayer, SquadSort } from "@/lib/squad"
import { formatStat, sortByKey } from "@/lib/squad"
import { playerImage, onPlayerImageError } from "@/lib/playerImage"
import { routes } from "@/lib/query"

const props = defineProps<{
    player: SquadPlayer
    /** puesto en el orden actual (1, 2, 3…) */
    rank: number
    sort: SquadSort
    /** 0, 1 o 2 si va en el podio (oro, plata, bronce); null si no */
    medal: 0 | 1 | 2 | null
    /** es el jugador de la cuenta con sesión */
    mine: boolean
}>()

const SHORT: Record<string, string> = { goalkeeper: "POR", defender: "DEF", midfielder: "MED", forward: "DEL" }
const MEDAL_CLASS = ["rank-gold", "rank-silver", "rank-bronze"]

const s = computed(() => props.player.stats)
const big = computed(() => formatStat(props.sort, props.sort.value(s.value)))
/** Tamaño del número de detrás según lo largo que sea ("12", "7,4", "73%", "100%"): los largos, más
 *  pequeños, sobre todo en móvil, donde si no quedaban casi enteros detrás de la cabeza */
const bigSize = computed(() => {
    const len = big.value.length
    if (len <= 2) return "text-[3.75rem] sm:text-[4.5rem]"
    if (len === 3) return "text-[2.5rem] sm:text-[3.25rem] xl:text-[3.75rem]"
    return "text-[2rem] sm:text-[2.5rem] xl:text-[3rem]"
})

// Los cuatro datos de abajo: los de siempre menos el que ya sale en grande
const bottomStats = computed(() =>
    [
        { key: "partidos", label: "PJ" },
        { key: "goles", label: "Goles" },
        { key: "asistencias", label: "Asist." },
        { key: "victorias", label: "Vict." },
        { key: "mvp", label: "MVP" },
    ]
        .filter((x) => x.key !== props.sort.key)
        .slice(0, 4)
        .map((x) => {
            const sort = sortByKey(x.key)
            return { label: x.label, value: formatStat(sort, sort.value(s.value)) }
        }))

const perGame = (n: number) => (s.value.gamesPlayed ? n / s.value.gamesPlayed : 0).toLocaleString("es-ES", { minimumFractionDigits: 1, maximumFractionDigits: 1 })

// ── Atropos ──
const root = ref<HTMLElement | null>(null)
let atropos: { destroy: () => void } | null = null
onMounted(async () => {
    if (!root.value || matchMedia("(prefers-reduced-motion: reduce)").matches) return
    const { default: Atropos } = await import("atropos")
    if (!root.value) return
    atropos = Atropos({ el: root.value, rotateXMax: 6, rotateYMax: 6, activeOffset: 12, shadow: false, highlight: true, rotateTouch: false, duration: 500 })
})
onBeforeUnmount(() => atropos?.destroy())
</script>

<template>
    <div ref="root" class="atropos squad-atropos">
        <div class="atropos-scale">
            <div class="atropos-rotate">
                <a :href="routes.player(player.member.playerId)"
                    class="atropos-inner squad-card group relative block aspect-[3/4] rounded-2xl overflow-hidden hover:ring-primary/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                    :class="mine ? 'ring-[3px] ring-primary' : 'ring-1 ring-base-content/10'"
                    :aria-label="`${player.member.playerName}: ${big} ${sort.unit}`">
                    <!-- El dato del orden, al fondo, con su etiqueta -->
                    <span data-atropos-offset="-4" class="absolute top-1 right-3 z-0 flex flex-col items-end leading-none select-none" aria-hidden="true">
                        <!-- :key → al cambiar el orden, el número y su etiqueta vuelven a entrar -->
                        <span :key="`n-${sort.key}`" class="big-in font-black tracking-tighter text-white/30 sm:text-white/25 tabular-nums" :class="bigSize">{{ big }}</span>
                        <span :key="`u-${sort.key}`" class="big-in big-in-late -mt-1 text-[0.6rem] sm:text-[0.65rem] uppercase font-black tracking-[0.2em] text-white/45">{{ sort.unit }}</span>
                    </span>

                    <!-- Puesto: grande y metálico en el podio -->
                    <span v-if="medal !== null" data-atropos-offset="3"
                        class="rank-medal absolute top-2 left-3 z-20 text-3xl sm:text-4xl font-black tracking-tighter leading-none" :class="MEDAL_CLASS[medal]"
                        aria-hidden="true">#{{ rank }}</span>
                    <span v-else data-atropos-offset="2" class="absolute top-3 left-3 z-20 text-[0.65rem] uppercase font-black tracking-widest text-white/70" aria-hidden="true">#{{ rank }}</span>

                    <span v-if="mine" data-atropos-offset="3" class="absolute top-2.5 left-1/2 -translate-x-1/2 z-30 badge badge-sm font-black tracking-widest bg-primary/35 border-white/25 text-white backdrop-blur-sm">TÚ</span>

                    <img data-atropos-offset="1" :src="playerImage(player.member)" alt="" loading="lazy" decoding="async"
                        :style="`view-transition-name: player-photo-${player.member.playerId}`"
                        class="absolute inset-x-0 bottom-0 z-10 w-full h-[92%] object-cover object-top scale-110 origin-top" @error="onPlayerImageError" />

                    <!-- Abajo: nombre, posición y datos; casi quieto con Atropos (si no, parece despegarse) -->
                    <span data-atropos-offset="0.5" class="squad-info absolute inset-x-0 bottom-0 z-20 p-3 pt-10 text-white">
                        <span class="flex items-center gap-1.5 min-w-0">
                            <span v-if="player.positions[0]" class="relative shrink-0 flex">
                                <span class="badge badge-xs badge-primary font-bold">{{ SHORT[player.positions[0]] }}</span>
                                <!-- Al pasar el ratón: las demás posiciones que juega, apiladas hacia arriba desde la principal -->
                                <span v-if="player.positions.length > 1" class="squad-pos absolute bottom-full left-0 mb-1 flex flex-col-reverse items-start gap-1">
                                    <span v-for="(pos, i) in player.positions.slice(1)" :key="pos" :style="{ '--k': i }"
                                        class="badge badge-xs font-bold bg-black/55 border-white/30 text-white backdrop-blur-sm">{{ SHORT[pos] }}</span>
                                </span>
                            </span>
                            <span class="font-black truncate">{{ player.member.playerName }}</span>
                        </span>
                        <span class="mt-1.5 grid grid-cols-4 gap-1 text-center">
                            <span v-for="st in bottomStats" :key="st.label">
                                <span class="block text-sm font-black tabular-nums">{{ st.value }}</span>
                                <span class="block text-[0.6rem] uppercase text-white/60">{{ st.label }}</span>
                            </span>
                        </span>
                        <span class="squad-more grid" aria-hidden="true">
                            <span class="min-h-0 overflow-hidden">
                                <span class="mt-2 pt-2 grid grid-cols-2 gap-1 text-center border-t border-white/15">
                                    <span><span class="block text-sm font-black tabular-nums">{{ perGame(s.goalsPlusAssists) }}</span><span class="block text-[0.6rem] uppercase text-white/60">G+A / p</span></span>
                                    <span><span class="block text-sm font-black tabular-nums">{{ perGame(s.goals) }}</span><span class="block text-[0.6rem] uppercase text-white/60">Goles / p</span></span>
                                </span>
                                <!-- Pista: la carta entera es un enlace a la ficha -->
                                <span class="mt-2 flex items-center justify-center gap-1 text-[0.6rem] uppercase font-bold tracking-widest text-white/55">
                                    Clic para ver su perfil
                                    <svg class="size-3" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 12h14m-5-5 5 5-5 5" /></svg>
                                </span>
                            </span>
                        </span>
                    </span>
                </a>
            </div>
        </div>
    </div>
</template>

<style scoped>
/* Fondo: el color del club, oscurecido hacia abajo (las fotos son recortes sin fondo) */
.squad-card {
    background:
        radial-gradient(120% 80% at 50% 0%, color-mix(in oklab, var(--color-primary) 55%, transparent), transparent 70%),
        linear-gradient(180deg, color-mix(in oklab, var(--color-primary) 35%, var(--color-base-300)), var(--color-base-300));
}

/* #1 #2 #3: grandes y con relleno metálico */
.rank-medal {
    background-clip: text;
    -webkit-background-clip: text;
    color: transparent;
    filter: drop-shadow(0 2px 6px rgb(0 0 0 / 0.55));
}
/* Brillo que cruza el metal de vez en cuando */
.rank-medal { background-size: 250% 100%; background-position: 100% 0; }
@media (prefers-reduced-motion: no-preference) {
    .rank-medal { animation: medal-shine 4.5s ease-in-out 0.8s infinite; }
    .big-in { animation: big-in 0.45s cubic-bezier(0.22, 1, 0.36, 1) both; }
    .big-in-late { animation-delay: 80ms; }
    /* La foto se acerca un poco con el ratón */
    .squad-card img { transition: scale 0.5s cubic-bezier(0.22, 1, 0.36, 1); }
    .squad-card:hover img { scale: 1.15; }
}
@keyframes medal-shine {
    0%, 60% { background-position: 100% 0; }
    85%, 100% { background-position: 0% 0; }
}
@keyframes big-in {
    from { opacity: 0; translate: 0.75rem 0; filter: blur(4px); }
}
.rank-gold { background-image: linear-gradient(160deg, #fff7cc 0%, #fcd34d 35%, #d97706 70%, #fde68a 100%); }
.rank-silver { background-image: linear-gradient(160deg, #ffffff 0%, #e2e8f0 35%, #94a3b8 70%, #f1f5f9 100%); }
.rank-bronze { background-image: linear-gradient(160deg, #ffedd5 0%, #fdba74 35%, #b45309 70%, #fed7aa 100%); }

/* Datos de abajo: degradado oscuro que sube al pasar el ratón; la fila extra se despliega */
.squad-info {
    background: linear-gradient(to top, rgb(0 0 0 / 0.92), rgb(0 0 0 / 0.7) 60%, transparent);
    transition: padding 0.3s cubic-bezier(0.22, 1, 0.36, 1);
}
.squad-more {
    grid-template-rows: 0fr;
    opacity: 0;
    transition: grid-template-rows 0.35s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.25s;
}
.squad-card:is(:hover, :focus-visible) .squad-info { padding-top: 3.5rem; }
.squad-card:is(:hover, :focus-visible) .squad-more { grid-template-rows: 1fr; opacity: 1; }
/* Posiciones secundarias: suben una a una desde la principal */
.squad-pos > * {
    opacity: 0;
    translate: 0 0.75rem;
    transition: opacity 0.2s, translate 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
    transition-delay: calc(var(--k, 0) * 45ms);
}
.squad-card:is(:hover, :focus-visible) .squad-pos > * { opacity: 1; translate: 0 0; }
/* Sin ratón (móvil) no hay fila extra: en una carta de media pantalla taparía la foto */
@media (hover: none) {
    .squad-more, .squad-pos { display: none; }
}
@media (prefers-reduced-motion: reduce) {
    .squad-info, .squad-more, .squad-pos > * { transition: none; }
}

/* Atropos: que sus capas no tapen el enlace */
.squad-atropos :deep(.atropos-scale),
.squad-atropos :deep(.atropos-rotate) {
    pointer-events: none;
}
.squad-atropos :deep(.atropos-inner) {
    pointer-events: auto;
}
</style>
