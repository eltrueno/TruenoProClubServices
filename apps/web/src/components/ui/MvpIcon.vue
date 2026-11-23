<script setup lang="ts">
/**
 * Icono de MVP de toda la web: el trofeo (relleno) de los logros de colección, en ámbar.
 * Tamaño con `class` (size-4 por defecto). Con `label`, se anuncia ("MVP del partido"); sin él, decorativo.
 */
import { ACHIEVEMENT_CATEGORY_ICONS } from "@trueno-proclub-services/shared"

defineProps<{ label?: string }>()
const PATH = ACHIEVEMENT_CATEGORY_ICONS.collection.solid
</script>

<template>
    <svg class="mvp-icon inline-block shrink-0 text-warning" fill="currentColor" viewBox="0 0 24 24"
        :role="label ? 'img' : undefined" :aria-label="label" :aria-hidden="label ? undefined : 'true'" v-html="PATH"></svg>
</template>

<style scoped>
.mvp-icon:not([class*="size-"]) {
    width: 1rem;
    height: 1rem;
}
</style>
