<template>
    <div class="w-full min-h-screen bg-base-200/50 pb-2 rounded-xl animate-in">
        <!-- Migas de pan: mismo alto que en la ficha, para que la foto quede en el mismo sitio -->
        <div class="breadcrumbs text-sm">
            <ul>
                <li><a href="/">Inicio</a></li>
                <li><a href="/plantilla">Plantilla</a></li>
                <li><span class="skeleton dark:bg-base-100 skeletondark inline-block w-20 h-3"></span></li>
            </ul>
        </div>
        <!-- Hero Section Skeleton -->
        <section class="bg-base-200 rounded-2xl shadow-md">
            <div class="mx-auto px-4 py-8 lg:py-12">
                <div class="flex flex-row items-end gap-5 lg:gap-8">
                    <!-- Hueco de la foto, igual que en la ficha. Si se llega desde la plantilla trae ya la foto
                         del jugador (ver lib/playerPhotoTransition.ts): en el esqueleto estático la pone el
                         cambio de página y en el del island se recoge aquí -->
                    <div data-vt-photo class="relative shrink-0 w-28 lg:w-44 aspect-[8/9] dark:bg-base-100 bg-base-300 rounded-2xl lg:rounded-3xl overflow-hidden shadow-sm" :class="{ 'skeleton skeletondark': !photo }">
                        <img :src="photo ?? undefined" :hidden="!photo" alt="" class="w-full h-full object-contain object-top scale-[1.55] origin-top" />
                    </div>
 
                    <!-- Info Skeleton: misma estructura y márgenes que la ficha (chip de cuenta, nombre,
                         posiciones, fechas). La foto va alineada abajo con este bloque, así que si midiera
                         distinto la foto quedaría a otra altura (y la de la transición aterrizaría mal) -->
                    <div class="flex-1 text-left pb-1">
                        <div class="mb-1.5 skeleton dark:bg-base-100 skeletondark rounded-full w-36 lg:w-44 h-6"></div>
                        <div class="mb-2 lg:mb-4">
                            <div class="skeleton dark:bg-base-100 w-44 lg:w-80 h-6 lg:h-12 skeletondark"></div>
                        </div>
                        <div class="flex flex-wrap gap-2 mb-3 lg:mb-4">
                            <div class="skeleton dark:bg-base-100 w-20 lg:w-28 h-6 lg:h-8 skeletondark rounded-full"></div>
                            <div class="skeleton dark:bg-base-100 w-16 lg:w-24 h-6 lg:h-8 skeletondark rounded-full"></div>
                        </div>
                        <!-- Fechas: dos líneas en móvil, una en escritorio (text-sm / text-lg) -->
                        <div class="h-10 lg:h-7 flex flex-col justify-center gap-1.5">
                            <div class="skeleton dark:bg-base-100 w-40 lg:w-96 h-3.5 lg:h-5 skeletondark opacity-60"></div>
                            <div class="skeleton dark:bg-base-100 w-28 h-3.5 skeletondark opacity-60 lg:hidden"></div>
                        </div>
                    </div>
                </div>

                <!-- Global Filter Skeleton -->
                <div class="mt-6 flex justify-center">
                    <div class="join dark:bg-base-100 bg-base-300 p-1 rounded-2xl">
                        <div class="skeleton dark:bg-base-100 w-16 lg:w-24 h-6 lg:h-8 skeletondark join-item"></div>
                        <div class="skeleton dark:bg-base-100 w-16 lg:w-24 h-6 lg:h-8 skeletondark join-item"></div>
                        <div class="skeleton dark:bg-base-100 w-16 lg:w-24 h-6 lg:h-8 skeletondark join-item"></div>
                    </div>
                </div>

                <!-- KPI Cards Skeleton -->
                <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-8 lg:mt-12">
                    <div v-for="n in 4" :key="n" class="card dark:bg-base-100 bg-base-300 shadow-sm overflow-hidden">
                        <div class="card-body p-4 lg:p-6 items-center text-center">
                            <div class="skeleton dark:bg-base-200 w-16 h-3 skeletondark mb-2"></div>
                            <div class="skeleton dark:bg-base-200 w-12 lg:w-20 h-8 lg:h-10 skeletondark"></div>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        <!-- Tabs Section Skeleton -->
        <section class="mx-auto px-4 py-8">
            <div class="overflow-x-auto mb-8 border-b border-base-content/10">
                <div class="flex gap-8 pb-4">
                    <div v-for="n in 5" :key="n" class="skeleton dark:bg-base-100 w-20 h-4 skeletondark"></div>
                </div>
            </div>

            <!-- Preloader for Content Area -->
            <div class="flex flex-col items-center justify-center p-20 bg-base-100/30 rounded-3xl border-2 border-dashed border-base-content/5 mt-4">
                <span class="loading loading-spinner loading-lg text-primary opacity-40"></span>
                <p class="mt-4 text-xs font-black uppercase tracking-widest opacity-20">Cargando...</p>
            </div>
        </section>
    </div>
</template>

<script setup lang="ts">
import { playerPhotoFor } from "@/lib/playerPhotoTransition"

// Solo en cliente: en el HTML estático no hay foto (la pone el cambio de página si procede)
const photo = typeof window === "undefined" ? null : playerPhotoFor(new URLSearchParams(location.search).get("id"))
</script>

<style scoped>
.skeletondark {
    background-image: linear-gradient( 105deg, transparent 0%, transparent 35%, rgba(108, 108, 108, 0.2) 50%, transparent 65%, transparent 100% );
}
.animate-in {
    animation: fadeIn 0.5s ease-out forwards;
}
@keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
}
</style>
