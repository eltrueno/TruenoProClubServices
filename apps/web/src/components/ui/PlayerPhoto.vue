<script setup lang="ts">
/**
 * Foto de jugador recortada al busto (zoom desde arriba, como en las fichas de plantilla).
 * Cae al placeholder si no hay foto o el enlace está roto.
 */
import { PLAYER_PLACEHOLDER, onPlayerImageError } from "@/lib/playerImage"

withDefaults(defineProps<{
    src?: string | null
    alt?: string
    size?: "xs" | "sm" | "md" | "lg"
    /** sin zoom: figura completa */
    full?: boolean
}>(), { src: null, alt: "", size: "sm", full: false })

const SIZES = { xs: "w-8 h-9 rounded-md", sm: "w-10 h-12 rounded-lg", md: "w-12 h-14 rounded-lg", lg: "w-20 h-24 rounded-xl" }
</script>

<template>
    <div class="shrink-0 overflow-hidden bg-base-300" :class="SIZES[size]">
        <img
            :src="src || PLAYER_PLACEHOLDER"
            :alt="alt"
            class="w-full h-full object-cover object-top select-none"
            :class="{ 'scale-[1.6] origin-top': !full }"
            loading="lazy"
            @error="onPlayerImageError"
        />
    </div>
</template>
