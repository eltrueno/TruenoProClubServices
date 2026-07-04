<template>
    <ChartTooltip :visible="visible" :pinned="pinned" :x="x" :y="y" :container="container" 
    @close="$emit('close')"
    @hover="$emit('hover', $event)"
    >
        <div :key="matchId" class="p-3 flex flex-col gap-2.5 min-w-[200px]">

            <!-- Header: Resultado + Fecha -->
            <div class="flex items-center justify-between gap-2">
            <span
                class="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black text-white shrink-0 result-badge"
                :class="resultClass"
            >
                    {{ resultText }}
                </span>
                <span class="text-[10px] text-base-content/40 font-medium tabular-nums ml-auto">
                    {{ date }}
                </span>
            </div>

            <!-- Rival -->
            <div class="text-xs font-bold text-base-content/70 -mt-1">
                vs {{ rival }}
            </div>

            <!-- Posición: badge outline, centrada -->
            <div v-if="position" class="flex items-center justify-center gap-1.5 py-0.5">
                <span class="badge badge-xs p-2 badge-outline badge-primary font-bold uppercase rounded-full" style="font-size: 0.65rem">
                    {{ position }}
                </span>
                <span v-if="manOfTheMatch" class="text-amber-400 text-xs" title="MVP del partido">★</span>
            </div>

            <!-- Stat + comparación con media (sin recuadro) -->
            <div class="flex flex-col gap-1 py-1 border-t border-b border-base-content/10">
                <div class="flex items-center justify-between gap-2">
                    <span class="text-[10px] font-black uppercase tracking-wide text-base-content/50">{{ metricLabel }}</span>
                    <span class="text-base font-black tabular-nums">{{ formattedValue }}</span>
                </div>
                <div class="flex items-center justify-between gap-2">
                    <span class="text-[11px] text-base-content/60 font-semibold">Su media: {{ formattedAverage }}</span>
                    <span class="text-xs font-black tabular-nums" :class="deltaClass">
                        {{ deltaSign }}{{ formattedDelta }}
                    </span>
                </div>
            </div>

            
                <a v-if="matchId"
                :href="matchUrl"
                class="btn btn-xs btn-primary rounded-lg font-black uppercase tracking-wide mt-0.5 w-full">
                    Ir al partido
                </a>
        </div>
    </ChartTooltip>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import ChartTooltip from '@/components/utils/ChartTooltip.vue'
import { Result } from '@/i18n/translations';

const props = defineProps<{
    visible: boolean
    pinned?: boolean
    x: number
    y: number
    container: HTMLElement | null
    date: string
    rival: string
    position?: string | null
    result: Result
    manOfTheMatch?: boolean
    matchId: number | null
    playerName: string
    metricLabel: string
    value: number
    average: number
    decimals?: number
    suffix?: string
}>()

defineEmits<{ close: []; hover: [value: boolean] }>()

const matchUrl = computed(() =>
    props.matchId ? `/partido/${props.matchId}?player=${encodeURIComponent(props.playerName)}` : ''
)

const decimals = computed(() => props.decimals ?? 1)
const suffix = computed(() => props.suffix ?? '')

const formattedValue = computed(() => `${props.value.toFixed(decimals.value)}${suffix.value}`)
const formattedAverage = computed(() => `${props.average.toFixed(decimals.value)}${suffix.value}`)

const delta = computed(() => props.value - props.average)
const formattedDelta = computed(() => Math.abs(delta.value).toFixed(decimals.value) + suffix.value)
const deltaSign = computed(() => (delta.value >= 0 ? '+' : '-'))

const deltaClass = computed(() => {
    if (delta.value > 0) return 'text-green-500'
    if (delta.value < 0) return 'text-red-500'
    return 'text-base-content/40'
})

const resultText = computed(() => {
    if (props.result === 'win') return 'V'
    if (props.result === 'tie') return 'E'
    return 'D'
})

const resultClass = computed(() => {
    if (props.result === 'win') return 'bg-green-500'
    if (props.result === 'tie') return 'bg-gray-500 dark:bg-neutral-600'
    return 'bg-red-500'
})
</script>
<style scoped>
.result-badge {
    animation: pop 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes pop {
    from { transform: scale(0.6); opacity: 0; }
    to { transform: scale(1); opacity: 1; }
}
</style>