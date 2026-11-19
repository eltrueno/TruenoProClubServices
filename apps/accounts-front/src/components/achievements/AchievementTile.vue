<script setup lang="ts">
/**
 * Tarjeta de un logro. La misma en la web de los clubes y en accounts (copia en cada app).
 *
 * - El estado se ve en el icono: a color con una marca de "hecho" si se tiene; en gris y con un
 *   anillo de progreso si no; candado si es oculto y no se tiene.
 * - Los especiales lucen más, con efectos de daisyUI: legendario conseguido = borde dorado que
 *   gira (`aura-gold`) y tarjeta que se inclina con el ratón (`hover-3d`); muy raro (lo tiene
 *   menos del 5 % y lo tienes; no en los hitos que se repiten) = halo con el degradado de la
 *   marca (`aura` de daisyUI con los colores de la marca: `aura-brand`, abajo). Si el sistema pide menos
 *   movimiento, daisyUI ya ralentiza el borde.
 * - Los puntos, discretos.
 */
import { computed } from "vue"
import {
    ACHIEVEMENT_HIDDEN_ICON, ACHIEVEMENT_RARITY_LABELS, achievementIcon,
    type AchievementCategory, type AchievementRarity, type IAchievementProgressValue
} from "@trueno-proclub-services/shared"

export interface AchievementTileItem {
    id: string
    def: { name: string, description?: string, category: AchievementCategory, icon?: string, rarity: AchievementRarity, points: number, unlockedPercent?: number, outOf?: number }
    unlocked: boolean
    /** oculto y sin conseguir */
    secret: boolean
    times: number
    reached?: number
    unlockedAt?: Date | string
    matchId?: string
    progress?: IAchievementProgressValue
    ownership?: string
}

const props = defineProps<{
    item: AchievementTileItem
    /** enlace al partido en que se consiguió (si lo hay) */
    matchHref?: string
}>()

/**
 * Muy raro: lo tiene menos del 5 % de la gente. Solo con al menos 15 jugadores (o cuentas):
 * con menos, cualquier cosa que tenga uno solo saldría como "Top 5 %"
 */
const TOP_PERCENT = 5
const TOP_MIN_PEOPLE = 15
const legendary = computed(() => props.item.unlocked && props.item.def.rarity === "legendary")
const topRare = computed(() => props.item.unlocked && !legendary.value && props.item.def.category !== "milestones"
    && (props.item.def.outOf ?? 0) >= TOP_MIN_PEOPLE && (props.item.def.unlockedPercent ?? 100) < TOP_PERCENT)
const special = computed(() => legendary.value || topRare.value)

/**
 * `tint`: el fondo de las tarjetas con halo. Tiene que ser opaco (si no, el halo se ve a
 * través) y parecerse al de la misma rareza sin halo: la común, el mismo fondo; las demás, su
 * color encima del fondo de la sección.
 */
const RARITY: Record<AchievementRarity, { card: string, border: string, tint: string, icon: string, text: string }> = {
    common: { card: "border-base-content/15 bg-base-100", border: "border-base-content/15", tint: "bg-base-100", icon: "bg-base-300 text-base-content", text: "text-base-content/75" },
    rare: { card: "border-sky-500/40 bg-sky-500/5", border: "border-sky-500/40", tint: "bg-base-200 bg-linear-to-b from-sky-500/10 to-sky-500/5", icon: "bg-sky-500/20 text-sky-600 dark:text-sky-300", text: "text-sky-600 dark:text-sky-300" },
    epic: { card: "border-violet-500/60 bg-violet-500/10", border: "border-violet-500/60", tint: "bg-base-200 bg-linear-to-b from-violet-500/15 to-violet-500/5", icon: "bg-violet-500/25 text-violet-700 dark:text-violet-200", text: "text-violet-700 dark:text-violet-300" },
    legendary: { card: "border-amber-500/70 bg-amber-500/10", border: "border-amber-500/70", tint: "bg-base-200 bg-linear-to-b from-amber-500/15 to-amber-500/5", icon: "bg-amber-400/30 text-amber-700 dark:text-amber-200", text: "text-amber-700 dark:text-amber-300" },
}

/** Icono del logro (el candado si es oculto y no se tiene); relleno o contorno según se tenga */
const icon = computed(() => (props.item.secret ? ACHIEVEMENT_HIDDEN_ICON : achievementIcon(props.item.def)))

const percentDone = computed(() => {
    const p = props.item.progress
    return p && p.target > 0 ? Math.min(100, Math.round((p.current / p.target) * 100)) : 0
})
/** Anillo de progreso: dorado en los legendarios, el degradado de la marca en el resto */
const ringClass = computed(() => (props.item.def.rarity === "legendary" ? "ring-gold" : "ring-brand"))

const dateFormat = new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "short", year: "numeric" })
const formatDate = (value?: Date | string) => (value ? dateFormat.format(new Date(value)) : "")
const formatNumber = (n: number) => n.toLocaleString("es-ES")
</script>

<template>
    <!-- Borde animado solo en los especiales; el resto, tarjeta normal -->
    <div class="w-full" :class="legendary ? 'aura aura-gold aura-sm' : topRare ? 'aura aura-sm aura-brand' : ''" :style="special ? '--aura-radius: 0.75rem' : undefined">
        <div class="w-full h-full" :class="legendary ? 'hover-3d' : ''">
            <!-- Dentro del borde animado, fondo opaco (si no, el brillo se ve a través) -->
            <div
                class="h-full rounded-xl border p-3 flex gap-3 items-start"
                :class="[
                    special ? `text-base-content ${RARITY[item.def.rarity].border} ${RARITY[item.def.rarity].tint}` : item.unlocked ? RARITY[item.def.rarity].card : 'border-base-content/10 bg-base-100/40',
                    item.secret ? 'border-dashed' : '',
                ]"
            >
                <!-- Icono: conseguido (color + marca), en progreso (anillo), oculto (candado) -->
                <div class="relative shrink-0">
                    <!-- Al pasar el ratón (o llegar con el teclado), el porcentaje sustituye al icono -->
                    <div v-if="!item.unlocked && item.progress && !item.secret"
                        class="group size-12 rounded-xl bg-base-300 grid place-items-center cursor-default focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        tabindex="0">
                        <div class="radial-progress" :class="ringClass"
                            :style="`--value: ${percentDone}; --size: 2.5rem; --thickness: 3px`"
                            role="img" :aria-label="`Progreso: ${item.progress.current} de ${item.progress.target} (${percentDone} %)`">
                            <svg class="size-5 text-base-content/70 transition-opacity duration-150 group-hover:opacity-0 group-focus-visible:opacity-0 motion-reduce:transition-none"
                                fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24" aria-hidden="true" v-html="icon.outline"></svg>
                            <span class="absolute inset-0 grid place-items-center text-xs font-black tabular-nums text-base-content opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100 motion-reduce:transition-none"
                                aria-hidden="true">{{ percentDone }}%</span>
                        </div>
                    </div>
                    <div v-else class="size-12 rounded-xl grid place-items-center"
                        :class="item.unlocked ? RARITY[item.def.rarity].icon : 'bg-base-300 text-base-content/70'">
                        <svg v-if="item.unlocked" class="size-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true" v-html="icon.solid"></svg>
                        <svg v-else class="size-6" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24" aria-hidden="true" v-html="icon.outline"></svg>
                    </div>
                    <span v-if="item.unlocked" class="absolute -right-1.5 -bottom-1.5 size-5 rounded-full bg-success text-success-content grid place-items-center ring-2 ring-base-100" title="Conseguido">
                        <svg class="size-3" fill="none" stroke="currentColor" stroke-width="3.5" viewBox="0 0 24 24" aria-hidden="true">
                            <path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                        </svg>
                        <span class="sr-only">Conseguido</span>
                    </span>
                </div>

                <div class="min-w-0 flex-1">
                    <div class="flex items-start justify-between gap-2">
                        <p class="font-bold leading-tight" :class="{ 'text-base-content/75': !item.unlocked }">
                            {{ item.secret ? "Logro oculto" : item.def.name }}
                            <span v-if="item.times > 1" class="badge badge-xs badge-neutral align-middle">×{{ item.times }}</span>
                        </p>
                        <span v-if="!item.secret" class="text-xs text-base-content/60 tabular-nums whitespace-nowrap">{{ item.def.points }} pts</span>
                    </div>
                    <p class="text-xs text-base-content/75 mt-0.5">{{ item.secret ? "Se desvela al conseguirlo" : item.def.description }}</p>

                    <p v-if="item.progress && !item.secret" class="text-xs text-base-content/75 tabular-nums mt-1">
                        {{ formatNumber(item.progress.current) }} / {{ formatNumber(item.progress.target) }}<template v-if="item.unlocked"> para el siguiente</template>
                    </p>

                    <p class="text-xs mt-1.5 font-semibold flex flex-wrap items-center gap-x-1.5" :class="item.unlocked ? RARITY[item.def.rarity].text : 'text-base-content/60'">
                        <span v-if="legendary" aria-hidden="true">★</span>{{ ACHIEVEMENT_RARITY_LABELS[item.def.rarity] }}
                        <span v-if="topRare" class="badge badge-xs border-0 bg-base-content text-base-100 font-bold">Top {{ TOP_PERCENT }} %</span>
                        <template v-if="item.unlocked">
                            <span>·</span>
                            <template v-if="item.reached"><span>último hito: {{ item.reached }}</span><span>·</span></template>
                            <span>{{ formatDate(item.unlockedAt) }}</span>
                        </template>
                    </p>
                    <p v-if="item.ownership" class="text-xs text-base-content/60 mt-0.5">{{ item.ownership }}</p>
                    <a v-if="matchHref && item.unlocked" :href="matchHref" class="link link-hover text-xs font-semibold text-base-content/75 hover:text-primary inline-block mt-1.5"
                        :aria-label="`Ir al partido en que se consiguió ${item.def.name}`">Ir al partido</a>
                </div>
            </div>
            <!-- Zonas de inclinación de hover-3d (8, alrededor de la tarjeta) -->
            <template v-if="legendary"><div v-for="n in 8" :key="n"></div></template>
        </div>
    </div>
</template>

<style scoped>
/*
 * Colores de la marca: rojo del City → granate del United (los de accounts). En accounts
 * salen de sus variables; en la web de los clubes, de estos valores.
 */
.aura-brand,
.ring-brand {
    --brand-a: var(--brand-from, #c80d0d);
    --brand-b: var(--brand-to, #b90a34);
}

/* Halo de daisyUI (`aura`) con los dos colores de la marca en vez de uno solo */
.aura-brand {
    background-image: conic-gradient(from var(--aura-angle), transparent 200deg, var(--brand-a) 290deg, var(--brand-b));
}

/* Anillo de progreso de daisyUI (`radial-progress`) en degradado */
.ring-brand,
.ring-gold {
    color: var(--brand-b);
}
.ring-brand::before {
    background:
        radial-gradient(farthest-side, var(--brand-a) 98%, #0000) top / var(--thickness) var(--thickness) no-repeat,
        conic-gradient(var(--brand-a), var(--brand-b) var(--radialprogress), #0000 0);
}
.ring-gold {
    --brand-a: #fcd34d;
    --brand-b: #d97706;
}
.ring-gold::before {
    background:
        radial-gradient(farthest-side, var(--brand-a) 98%, #0000) top / var(--thickness) var(--thickness) no-repeat,
        conic-gradient(var(--brand-a), var(--brand-b) var(--radialprogress), #0000 0);
}
</style>
