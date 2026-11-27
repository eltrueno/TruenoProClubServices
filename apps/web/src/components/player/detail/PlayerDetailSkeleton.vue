<template>
    <div class="w-full min-h-screen bg-base-200/50 pb-2 rounded-xl animate-in">
        <!-- Migas de pan: mismo alto que en la ficha, para que la foto quede en el mismo sitio -->
        <nav class="breadcrumbs text-sm text-base-content/60" aria-label="Migas de pan">
            <ul>
                <li><a href="/" class="hover:text-primary">Inicio</a></li>
                <li><a href="/plantilla" class="hover:text-primary">Plantilla</a></li>
                <li><span aria-current="page" class="text-base-content font-semibold"><span class="skeleton dark:bg-base-100 skeletondark inline-block w-20 h-3"></span></span></li>
            </ul>
        </nav>
        <!-- Hero Section Skeleton: mismas medidas que la cabecera de la ficha (PlayerDetail.vue) -->
        <section class="bg-base-200 rounded-2xl shadow-md">
            <div class="mx-auto px-4 py-6 lg:py-10">
                <div class="flex flex-row items-end gap-4 lg:gap-8">
                    <!-- Hueco de la foto, igual que en la ficha. Si se llega desde la plantilla trae ya la foto
                         del jugador (ver lib/playerPhotoTransition.ts): en el esqueleto estático la pone el
                         cambio de página y en el del island se recoge aquí -->
                    <div data-vt-photo class="relative shrink-0 w-24 lg:w-40 aspect-[8/9] dark:bg-base-100 bg-base-300 rounded-2xl lg:rounded-3xl overflow-hidden shadow-sm" :class="{ 'skeleton skeletondark': !photo }">
                        <img :src="photo ?? undefined" :hidden="!photo" alt="" class="w-full h-full object-contain object-top scale-[1.55] origin-top" />
                    </div>

                    <!-- Info Skeleton: misma estructura y márgenes que la ficha (nombre, posiciones, fechas).
                         Sin el chip de la cuenta, que solo sale si está vinculada (la mayoría no lo está).
                         La foto va alineada abajo con este bloque, así que si midiera distinto la foto quedaría
                         a otra altura (y la de la transición aterrizaría mal) -->
                    <div class="flex-1 min-w-0 text-left pb-1">
                        <div class="mb-2 lg:mb-4">
                            <div class="skeleton dark:bg-base-100 w-44 lg:w-80 h-6 lg:h-12 skeletondark"></div>
                        </div>
                        <div class="flex flex-wrap gap-2 mb-2 lg:mb-3">
                            <div class="skeleton dark:bg-base-100 w-20 lg:w-28 h-6 lg:h-8 skeletondark rounded-full"></div>
                            <div class="skeleton dark:bg-base-100 w-16 lg:w-24 h-6 lg:h-8 skeletondark rounded-full"></div>
                        </div>
                        <!-- Fechas (text-sm / text-base) -->
                        <div class="h-5 lg:h-6 flex items-center">
                            <div class="skeleton dark:bg-base-100 w-40 lg:w-72 h-3.5 lg:h-4 skeletondark opacity-60"></div>
                        </div>
                    </div>
                </div>

                <!-- Global Filter Skeleton -->
                <div class="mt-6 flex justify-center">
                    <div class="skeleton dark:bg-base-100 skeletondark w-64 lg:w-72 h-12 rounded-full"></div>
                </div>

                <!-- KPIs: tres grandes y una fila de cuatro pequeños. Con los mismos textos y tamaños que los
                     de verdad (transparentes, bajo el gris): así miden lo mismo en cada ancho y nada salta al cargar -->
                <div class="grid grid-cols-3 gap-2 sm:gap-4 mt-6 lg:mt-10">
                    <div v-for="n in 3" :key="n" class="card dark:bg-base-100 bg-base-300 shadow-sm overflow-hidden">
                        <div class="card-body p-3 sm:p-4 lg:p-6 items-center text-center gap-0 text-transparent select-none" aria-hidden="true">
                            <span class="skeleton dark:bg-base-200 skeletondark uppercase text-[0.65rem] sm:text-xs font-black tracking-widest">Partidos</span>
                            <span class="skeleton dark:bg-base-200 skeletondark text-2xl sm:text-3xl lg:text-5xl font-black mt-1">0,0</span>
                            <div v-if="n === 3" class="w-full max-w-36 h-1.5 mt-2"></div>
                            <span class="skeleton dark:bg-base-200 skeletondark opacity-60 text-[0.65rem] sm:text-xs font-medium mt-1">000 min</span>
                        </div>
                    </div>
                </div>
                <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 mt-2 sm:mt-4">
                    <div v-for="n in 4" :key="n" class="rounded-2xl dark:bg-base-100/60 bg-base-300/60 px-3 py-2.5 flex items-center justify-between gap-2 text-transparent select-none" aria-hidden="true">
                        <span class="skeleton dark:bg-base-200 skeletondark uppercase text-[0.65rem] sm:text-xs font-black tracking-widest">Goles</span>
                        <span class="text-right leading-tight">
                            <span class="skeleton dark:bg-base-200 skeletondark text-lg sm:text-xl font-black block">00</span>
                            <span v-if="n <= 2" class="text-[0.65rem] font-medium">0,0 / p</span>
                        </span>
                    </div>
                </div>
            </div>
        </section>

        <!-- Tabs Section Skeleton: la barra de cuatro pestañas -->
        <section class="mx-auto px-1 pt-8">
            <div class="flex gap-2 p-2 rounded-t-3xl dark:bg-base-100/30 bg-base-300/30">
                <div v-for="n in 4" :key="n" class="flex-1 h-14 lg:h-[4.5rem] rounded-2xl skeleton dark:bg-base-100/40 bg-base-200/40 skeletondark"></div>
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
