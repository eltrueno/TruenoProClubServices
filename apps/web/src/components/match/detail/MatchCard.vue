<script setup lang="ts">
/**
 * Tarjeta de un bloque de la ficha de partido, con el mismo estilo que las de la ficha de jugador
 * (título en mayúsculas con la raya del club a la izquierda) y una línea que explica qué se ve.
 * Sus animaciones (barras que crecen, fichas que entran…) esperan a que la tarjeta se vea en
 * pantalla: si arrancaran al montar, las de abajo acabarían sin que nadie las viera (.anim-gate).
 */
import { useInView } from "@/composables/useInView"

defineProps<{ title: string; hint?: string }>()
// Umbral 0: en móvil hay tarjetas de 2.000+ px y un 15% eran 300 px; las animaciones se quedaban congeladas a medias
const { target, inView } = useInView({ threshold: 0 })
</script>

<template>
    <section ref="target" class="anim-gate card bg-base-200 shadow-md" :class="inView && 'in-view'">
        <div class="card-body p-4 sm:p-6 gap-4">
            <header class="flex flex-wrap items-start justify-between gap-3">
                <div class="min-w-0">
                    <h2 class="card-title text-lg sm:text-xl font-black uppercase border-l-4 border-primary pl-3 sm:pl-4">{{ title }}</h2>
                    <p v-if="hint" class="text-sm text-base-content/60 mt-1 pl-4 sm:pl-5">{{ hint }}</p>
                </div>
                <slot name="actions" />
            </header>
            <slot />
        </div>
    </section>
</template>
