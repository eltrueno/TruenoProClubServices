<script setup lang="ts">
/**
 * Esqueleto del panel admin con la misma forma que el de verdad. Se usa como fallback
 * estático de la página (antes de que cargue Vue), mientras se comprueba la sesión y, con
 * `bodyOnly`, mientras llegan los datos de un club (la cabecera ya está pintada).
 */
import { CLUBS } from "@/config/site"

withDefaults(defineProps<{ bodyOnly?: boolean }>(), { bodyOnly: false })
</script>

<template>
    <div class="w-full text-left" aria-busy="true" aria-label="Cargando panel admin">
        <template v-if="!bodyOnly">
            <div class="skeleton on-page h-4 w-32 mb-4"></div>
            <div class="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
                <div class="space-y-2">
                    <div class="skeleton on-page h-10 w-56"></div>
                    <div class="skeleton on-page h-4 w-full max-w-md"></div>
                    <div v-if="CLUBS.length > 1" class="flex gap-2 pt-2">
                        <div v-for="c in CLUBS" :key="c.id" class="skeleton on-page h-8 w-40 rounded-field"></div>
                    </div>
                </div>
                <div class="flex items-center gap-2 w-full md:w-auto">
                    <div class="skeleton on-page h-8 w-full md:w-64 rounded-field"></div>
                    <div class="skeleton on-page h-8 w-20 rounded-field shrink-0"></div>
                </div>
            </div>
        </template>

        <div class="flex flex-col gap-3">
            <!-- Solicitudes -->
            <div class="rounded-2xl border border-base-content/10 p-4 mb-3 space-y-3">
                <div class="flex items-center justify-between">
                    <div class="skeleton on-page h-4 w-48"></div>
                    <div class="skeleton on-page h-5 w-6 rounded-full"></div>
                </div>
                <div class="skeleton on-page h-3 w-40"></div>
            </div>

            <div class="flex justify-between gap-3">
                <div class="skeleton on-page h-3 w-36"></div>
                <div class="skeleton on-page h-3 w-64 hidden sm:block"></div>
            </div>

            <!-- Filas de jugadores -->
            <div v-for="i in 6" :key="i" class="rounded-2xl bg-base-200 shadow-sm p-4 grid grid-cols-1 lg:grid-cols-[auto_1fr_1fr_auto] gap-4 items-center">
                <div class="flex items-center gap-3 lg:w-64">
                    <div class="skeleton w-12 h-14 rounded-lg shrink-0"></div>
                    <div class="flex-1 space-y-2">
                        <div class="skeleton h-4 w-28"></div>
                        <div class="skeleton h-3 w-36"></div>
                        <div class="skeleton h-2 w-24"></div>
                    </div>
                </div>
                <div class="space-y-2">
                    <div class="skeleton h-2.5 w-12"></div>
                    <div class="skeleton h-8 w-full rounded-field"></div>
                    <div class="skeleton h-2.5 w-4/5"></div>
                </div>
                <div class="space-y-2">
                    <div class="skeleton h-2.5 w-24"></div>
                    <div class="skeleton h-8 w-full rounded-field"></div>
                </div>
                <div class="lg:w-28">
                    <div class="skeleton h-8 w-full rounded-field"></div>
                </div>
            </div>
        </div>
    </div>
</template>

<style>
/* En oscuro la página es base-300, el mismo color que el skeleton: un tono más claro para que se vea */
[data-theme="dark"] .skeleton.on-page {
    background-color: var(--color-base-200);
}
</style>
