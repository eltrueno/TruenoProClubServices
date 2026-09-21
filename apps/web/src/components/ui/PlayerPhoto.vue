<script setup lang="ts">
/**
 * Foto de jugador recortada al busto (zoom desde arriba, como en las fichas de plantilla).
 * Cae al placeholder si no hay foto o el enlace está roto.
 */
import { PLAYER_PLACEHOLDER, onPlayerImageError } from "@/lib/playerImage"

export type PhotoZoom = "none" | "sm" | "md" | "lg" | "xl" | "2xl"

withDefaults(defineProps<{
    src?: string | null
    alt?: string
    size?: "xs" | "sm" | "md" | "lg" | "xl"
    /** recorte al busto: none = figura completa, sm/md/lg = cada vez más cerca de la cara */
    zoom?: PhotoZoom
}>(), { src: null, alt: "", size: "sm", zoom: "md" })

const SIZES = { xs: "w-8 h-9 rounded-md", sm: "w-10 h-12 rounded-lg", md: "w-12 h-14 rounded-lg", lg: "w-20 h-24 rounded-xl", xl: "w-24 h-28 rounded-xl" }
const ZOOMS: Record<PhotoZoom, string> = { none: "", sm: "scale-[1.3] origin-top", md: "scale-[1.6] origin-top", 
lg: "scale-[2.1] origin-top", xl: "scale-[2.4] origin-top", '2xl': "scale-[2.8] origin-top" }
</script>

<template>
    <div class="shrink-0 overflow-hidden bg-base-300" :class="SIZES[size]">
        <img
            :src="src || PLAYER_PLACEHOLDER"
            :alt="alt"
            class="w-full h-full object-cover object-top select-none"
            :class="ZOOMS[zoom]"
            loading="lazy"
            @error="onPlayerImageError"
        />
    </div>
</template>
