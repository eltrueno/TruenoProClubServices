<template>
    <Teleport :to="teleportTarget" :disabled="!teleportTarget">
        <div
            class="chart-tooltip dark:bg-base-100/95 bg-base-300/95 border border-base-content/10 shadow-xl rounded-xl z-50"
            :class="visible ? 'chart-tooltip--visible' : 'chart-tooltip--hidden'"
            :style="positionStyle"
            @click.stop
            @mouseenter="$emit('hover', true)"
            @mouseleave="$emit('hover', false)"
        >
            <button
                v-if="pinned"
                @click="$emit('close')"
                class="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-base-300 border border-base-content/10 flex items-center justify-center text-xs font-black hover:bg-error hover:text-white transition-colors shadow-sm"
                aria-label="Cerrar"
            >
                ×
            </button>
            <slot />
        </div>
    </Teleport>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
    visible: boolean
    pinned?: boolean
    x: number
    y: number
    container: HTMLElement | null
    teleportTarget?: string | null
}>()

defineEmits<{ close: []; hover: [value: boolean] }>()

const ESTIMATED_WIDTH = 220
const ESTIMATED_HEIGHT = 140

const positionStyle = computed(() => {
    if (!props.container) {
        return { position: 'absolute' as const, left: `${props.x}px`, top: `${props.y}px` }
    }
    const containerRect = props.container.getBoundingClientRect()
    const margin = 8
    let left = props.x - ESTIMATED_WIDTH / 2
    let top = props.y - ESTIMATED_HEIGHT - 14
    left = Math.max(margin, Math.min(left, containerRect.width - ESTIMATED_WIDTH - margin))
    if (top < margin) top = props.y + 14
    return { position: 'absolute' as const, left: `${left}px`, top: `${top}px` }
})
</script>

<style scoped>
.chart-tooltip {
    min-width: 180px;
    max-width: 260px;
    transition: opacity 0.18s ease, transform 0.18s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.chart-tooltip--hidden {
    opacity: 0;
    transform: translateY(6px) scale(0.95);
    pointer-events: none;
}

.chart-tooltip--visible {
    opacity: 1;
    transform: translateY(0) scale(1);
    pointer-events: auto;
}
</style>