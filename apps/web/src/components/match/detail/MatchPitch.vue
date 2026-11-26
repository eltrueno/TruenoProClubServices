<script setup lang="ts">
/**
 * Campo con los jugadores de un equipo colocados por posición (portero abajo, delanteros arriba;
 * EA solo da la posición general, así que en cada línea van repartidos a lo ancho). Cada ficha lleva
 * la cara del jugador (las del rival, sus iniciales), su nota y su nombre; la elegida se marca.
 * Sin Atropos: un campo plano, ligero y que se lee bien en móvil.
 */
import { computed } from "vue"
import type MatchPlayerEntity from "@/model/match/MatchPlayerEntity"
import { useMembers } from "@/composables/useMembers"
import { onPlayerImageError } from "@/lib/playerImage"
import MvpIcon from "@/components/ui/MvpIcon.vue"
import AssistIcon from "@/components/ui/AssistIcon.vue"
import GoalIcon from "@/components/ui/GoalIcon.vue"

const props = defineProps<{ players: MatchPlayerEntity[]; selected: string | null; rival?: boolean; myId?: string | null }>()
const emit = defineEmits<{ select: [playerId: string] }>()
const { imageFor, memberFor } = useMembers()

const ROW_Y: Record<string, number> = { forward: 13, midfielder: 37, defender: 66, goalkeeper: 88 }
const placed = computed(() => {
    const rows: Record<string, MatchPlayerEntity[]> = {}
    for (const p of props.players) (rows[p.position] ??= []).push(p)
    return Object.entries(rows).flatMap(([pos, list]) =>
        list.map((p, i) => {
            // Con 5 o más en una línea (p. ej. el medio campo), en zigzag: uno arriba y otro abajo, para que
            // los de al lado no se pisen y cada uno tenga el doble de ancho para su nombre
            const zigzag = list.length >= 5
            const y = (ROW_Y[pos] ?? 50) + (zigzag ? (i % 2 ? 6 : -6) : 0)
            const w = zigzag ? Math.min(30, 188 / (list.length + 1)) : Math.min(24, 94 / (list.length + 0.5))
            return { p, x: ((i + 1) / (list.length + 1)) * 100, y, w, small: zigzag }
        }))
})
const fmt1 = (n: number) => n.toLocaleString("es-ES", { minimumFractionDigits: 1, maximumFractionDigits: 1 })
const RATING_TONE = (r: number) => (r >= 8 ? "bg-success text-success-content" : r >= 7 ? "bg-lime-500 text-black" : r >= 6 ? "bg-warning text-warning-content" : "bg-error text-error-content")
</script>

<template>
    <!-- Campo oscuro y neutro, a juego con el resto de la web: franjas apenas marcadas y líneas sutiles.
         Las líneas, en el color del equipo -->
    <div class="pitch relative w-full aspect-[68/80] rounded-3xl overflow-hidden ring-1 ring-base-content/10 shadow-inner" :style="{ '--team': rival ? 'var(--them)' : 'var(--us)' }">
        <!-- Líneas -->
        <span class="line absolute inset-3 sm:inset-4 rounded-xl border-2" aria-hidden="true"></span>
        <span class="line absolute inset-x-3 sm:inset-x-4 top-1/2 border-t-2" aria-hidden="true"></span>
        <span class="line absolute left-1/2 top-1/2 size-[24%] -translate-1/2 rounded-full border-2" aria-hidden="true"></span>
        <span class="line absolute left-1/2 top-1/2 size-1.5 -translate-1/2 rounded-full" aria-hidden="true"></span>
        <span class="line absolute left-1/2 -translate-x-1/2 bottom-3 sm:bottom-4 w-[44%] h-[13%] border-2 border-b-0" aria-hidden="true"></span>
        <span class="line absolute left-1/2 -translate-x-1/2 bottom-3 sm:bottom-4 w-[20%] h-[5%] border-2 border-b-0" aria-hidden="true"></span>
        <span class="line absolute left-1/2 -translate-x-1/2 top-3 sm:top-4 w-[44%] h-[13%] border-2 border-t-0" aria-hidden="true"></span>
        <span class="line absolute left-1/2 -translate-x-1/2 top-3 sm:top-4 w-[20%] h-[5%] border-2 border-t-0" aria-hidden="true"></span>

        <button v-for="({ p, x, y, w, small }, i) in placed" :key="p.playerId" type="button"
            class="token absolute -translate-1/2 flex flex-col items-center gap-1 cursor-pointer focus-visible:outline-none"
            :class="selected === p.playerId && 'is-selected'"
            :style="{ left: `${x}%`, top: `${y}%`, width: `${w}%`, '--k': i }" :aria-pressed="selected === p.playerId"
            :aria-label="`${p.playerName}: nota ${fmt1(p.rating)}`" @click="emit('select', p.playerId)">
            <span class="face relative">
                <span class="block sm:size-16 rounded-full overflow-hidden outline-2 shadow-lg transition-[box-shadow,scale] duration-300"
                    :class="[small ? 'size-10' : 'size-12', p.playerId === myId ? 'outline-primary' : rival ? 'outline-(--them)' : 'outline-(--us)', memberFor(p.playerId) ? (rival ? 'bg-(--them)/45' : 'bg-(--us)/45') : (rival ? 'bg-(--them)' : 'bg-(--us)'), selected === p.playerId && 'outline-white!']">
                    <img v-if="memberFor(p.playerId)" :src="imageFor(p.playerId)" alt="" loading="lazy" class="size-full object-cover object-top scale-[2] origin-top" @error="onPlayerImageError" />
                    <span v-else class="size-full grid place-items-center font-black text-white text-sm sm:text-base" aria-hidden="true">{{ p.playerName.slice(0, 2).toUpperCase() }}</span>
                </span>
                <!-- Nota -->
                <span class="absolute -bottom-1 -right-2 rounded-md px-1 text-[0.7rem] sm:text-xs font-black tabular-nums shadow" :class="RATING_TONE(p.rating)">{{ fmt1(p.rating) }}</span>
                <MvpIcon v-if="p.manOfTheMatch" class="absolute -top-1 -right-1.5 size-5 drop-shadow" label="MVP" />
                <!-- Goles, asistencias y tarjeta roja -->
                <span v-if="p.goals || p.assists || p.redCards" class="absolute -bottom-1 -left-3 flex items-center gap-1 rounded-md bg-black/70 text-white px-1 py-px text-[0.6rem] sm:text-[0.7rem] font-black tabular-nums shadow">
                    <span v-if="p.goals" class="inline-flex items-center gap-px" :title="`${p.goals} goles`">
                        <GoalIcon class="size-3.5" />{{ p.goals > 1 ? p.goals : "" }}
                    </span>
                    <span v-if="p.assists" class="inline-flex items-center gap-px" :title="`${p.assists} asistencias`"><AssistIcon class="size-3.5" />{{ p.assists > 1 ? p.assists : "" }}</span>
                    <span v-if="p.redCards" class="inline-block w-2 h-2.5 rounded-[2px] bg-error" title="Roja"></span>
                </span>
                <span v-if="p.playerId === myId" class="absolute -top-2 -left-2 badge badge-xs badge-primary font-black tracking-widest shadow">TÚ</span>
            </span>
            <span class="max-w-full truncate rounded-md px-1.5 py-px text-[0.65rem] sm:text-xs font-bold text-white bg-black/50">{{ p.playerName }}</span>
        </button>
    </div>
</template>

<style scoped>
/* Franjas de césped */
/* Franjas de "césped" en el tono del tema, casi imperceptibles */
.pitch {
    background: repeating-linear-gradient(180deg,
        color-mix(in oklab, var(--color-base-300) 96%, var(--color-base-content)) 0 10%,
        var(--color-base-300) 10% 20%);
}
/* Líneas en el color del equipo (el del club o el azul del rival) */
.line {
    border-color: color-mix(in oklab, var(--team) 65%, transparent);
}
span.line:not([class*="border"]) {
    background: color-mix(in oklab, var(--team) 80%, transparent);
}
.token:hover .face > span:first-child,
.token:focus-visible .face > span:first-child {
    scale: 1.08;
}
.token.is-selected .face > span:first-child {
    scale: 1.15;
    box-shadow: 0 0 0 4px rgb(255 255 255 / 0.35), 0 10px 25px rgb(0 0 0 / 0.4);
}
.token:focus-visible .face {
    outline: 3px solid white;
    outline-offset: 4px;
    border-radius: 9999px;
}
@media (prefers-reduced-motion: no-preference) {
    .token { animation: token-in 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both; animation-delay: calc(var(--k, 0) * 45ms); }
}
@keyframes token-in { from { opacity: 0; scale: 0.5; translate: -50% -20%; } }
</style>
