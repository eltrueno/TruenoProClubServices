<script setup lang="ts">
/**
 * "Tu partido": solo para quien tiene sesión y jugador vinculado. Si jugó (en cualquiera de los dos
 * lados), su nota frente a su media, su puesto en las notas de su equipo, goles, asistencias,
 * minutos, sus hitos de este partido y un botón para verlo al detalle; si no, una línea discreta.
 */
import { computed } from "vue"
import type ClubMatchEntity from "@/model/match/ClubMatchEntity"
import { playerForm, playerMoments } from "@/lib/matchInsights"
import { useMembers } from "@/composables/useMembers"
import { onPlayerImageError } from "@/lib/playerImage"
import MvpIcon from "@/components/ui/MvpIcon.vue"

const props = defineProps<{ match: ClubMatchEntity; history: ClubMatchEntity[] | null; myId: string }>()
const emit = defineEmits<{ see: [playerId: string] }>()
const { imageFor } = useMembers()

const fmt = (n: number, d = 0) => (Number.isFinite(n) ? n : 0).toLocaleString("es-ES", { minimumFractionDigits: d, maximumFractionDigits: d })

const mine = computed(() => {
    const inUs = props.match.ourClub.players.find((p) => p.playerId === props.myId)
    if (inUs) return { p: inUs, ours: true, team: props.match.ourClub.players }
    const inThem = props.match.opponentClub.players.find((p) => p.playerId === props.myId)
    return inThem ? { p: inThem, ours: false, team: props.match.opponentClub.players } : null
})
/** Puesto en las notas de su equipo (1 = la mejor) */
const rank = computed(() => {
    if (!mine.value) return null
    const sorted = mine.value.team.filter((p) => p.rating > 0).sort((a, b) => b.rating - a.rating)
    return { pos: sorted.findIndex((p) => p.playerId === props.myId) + 1, of: sorted.length }
})
const form = computed(() => (mine.value?.ours && props.history ? playerForm(props.history, props.match.matchId, props.myId) : null))
const delta = computed(() => (form.value && mine.value && form.value.games > 1 ? mine.value.p.rating - form.value.ratingAve : null))
const myMoments = computed(() => (props.history && mine.value?.ours ? playerMoments(props.history, props.match.matchId).filter((m) => m.playerId === props.myId) : []))
const signed = (n: number) => `${n > 0 ? "+" : n < 0 ? "−" : "±"}${fmt(Math.abs(n), 1)}`
</script>

<template>
    <!-- Jugó -->
    <section v-if="mine" class="you-card anim-in relative overflow-hidden rounded-2xl p-4 sm:p-5 ring-2 ring-primary/50 shadow-md">
        <div class="relative flex flex-col sm:flex-row sm:items-center gap-4">
            <div class="flex items-center gap-4 min-w-0">
                <span class="shrink-0 size-16 sm:size-20 rounded-full overflow-hidden outline-2 outline-primary bg-primary/45">
                    <img :src="imageFor(myId)" alt="" class="size-full object-cover object-top scale-[2] origin-top" @error="onPlayerImageError" />
                </span>
                <div class="min-w-0">
                    <p class="text-xs uppercase tracking-[0.25em] font-black text-primary">Tu partido{{ mine.ours ? "" : " (con el rival)" }}</p>
                    <p class="flex items-end gap-2">
                        <span class="text-4xl sm:text-5xl font-black tabular-nums leading-none">{{ fmt(mine.p.rating, 1) }}</span>
                        <MvpIcon v-if="mine.p.manOfTheMatch" class="size-7 mb-1" label="MVP del partido" />
                        <span v-if="delta !== null" class="text-sm font-bold pb-1" :class="delta >= 0 ? 'text-success' : 'text-error'">{{ signed(delta) }} sobre tu media</span>
                    </p>
                    <p v-if="rank && rank.pos" class="text-sm text-base-content/70">
                        <b>{{ rank.pos === 1 ? "La mejor nota" : `${rank.pos}.ª mejor nota` }}</b> de {{ rank.of }} en {{ mine.ours ? "tu equipo" : "el equipo rival" }}
                    </p>
                </div>
            </div>
            <ul class="flex flex-wrap gap-x-5 gap-y-2 sm:ml-auto text-center">
                <li><b class="block text-2xl font-black tabular-nums">{{ mine.p.goals }}</b><span class="text-[0.65rem] uppercase font-black tracking-widest text-base-content/50">Goles</span></li>
                <li><b class="block text-2xl font-black tabular-nums">{{ mine.p.assists }}</b><span class="text-[0.65rem] uppercase font-black tracking-widest text-base-content/50">Asist.</span></li>
                <li><b class="block text-2xl font-black tabular-nums">{{ Math.round(mine.p.minutesPlayed) }}'</b><span class="text-[0.65rem] uppercase font-black tracking-widest text-base-content/50">Minutos</span></li>
            </ul>
            <button type="button" class="btn btn-primary btn-sm rounded-xl self-start sm:self-center" @click="emit('see', myId)">Ver tu partido</button>
        </div>
        <ul v-if="myMoments.length" class="relative flex flex-wrap gap-2 mt-4">
            <li v-for="m in myMoments" :key="m.text" class="rounded-full px-3 py-1 text-xs font-bold bg-primary/15 text-primary ring-1 ring-primary/30">{{ m.text }}</li>
        </ul>
    </section>

    <!-- No jugó -->
    <p v-else class="anim-in flex items-center gap-2 rounded-2xl px-4 py-3 text-sm text-base-content/70 bg-base-200 ring-1 ring-base-content/5">
        <svg class="size-5 shrink-0 text-base-content/40" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" /></svg>
        No jugaste este partido.
    </p>
</template>

<style scoped>
.you-card {
    background:
        radial-gradient(120% 140% at 0% 0%, color-mix(in oklab, var(--color-primary) 28%, transparent), transparent 60%),
        var(--color-base-200);
}
@media (prefers-reduced-motion: no-preference) {
    .anim-in { animation: you-in 0.5s cubic-bezier(0.22, 1, 0.36, 1) both; }
}
@keyframes you-in { from { opacity: 0; translate: 0 0.75rem; } }
</style>
