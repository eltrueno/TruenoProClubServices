<script setup lang="ts">
/**
 * Escudo de un club. Los de un solo color (SVG, `monochrome`) se pueden pintar de otro color
 * con `onBrand`: sobre un fondo de marca (botón con el degradado) el granate no se vería, así
 * que se dibuja en el color del texto (blanco) usando el SVG como máscara.
 * El tamaño va por clase (p. ej. `size-5`), como con un <img>.
 */
import type { ClubLink } from "@/config/site"

defineProps<{
    club: ClubLink
    /** está sobre un fondo de marca: los monocolor van en el color del texto */
    onBrand?: boolean
    /** texto alternativo; vacío = decorativo */
    alt?: string
}>()
</script>

<template>
    <span
        v-if="onBrand && club.monochrome"
        class="crest-mask inline-block bg-current"
        :style="{ '--crest': `url('${club.logo}')` }"
        :role="alt ? 'img' : undefined"
        :aria-label="alt || undefined"
        :aria-hidden="alt ? undefined : 'true'"
        :title="alt || undefined"
    ></span>
    <img v-else :src="club.logo" :alt="alt ?? ''" :title="alt || undefined" class="object-contain" />
</template>

<style scoped>
.crest-mask {
    -webkit-mask: var(--crest) center / contain no-repeat;
    mask: var(--crest) center / contain no-repeat;
}
</style>
