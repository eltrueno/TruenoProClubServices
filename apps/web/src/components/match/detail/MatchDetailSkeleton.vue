<template>
    <!-- Mientras carga: la misma forma que la página (cabecera con KPIs, pestañas y contenido) -->
    <div class="w-full" aria-busy="true" aria-label="Cargando el partido">
        <div class="skeleton h-4 w-56 mb-3"></div>
        <div class="bg-base-200 rounded-2xl shadow-md px-4 py-6 lg:py-10 flex flex-col gap-6">
            <div class="flex justify-center"><div class="skeleton h-5 w-64"></div></div>
            <div class="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-6">
                <div class="flex justify-end"><div class="skeleton h-8 w-40"></div></div>
                <div class="flex flex-col items-center gap-2"><div class="skeleton h-6 w-20 rounded-full"></div><div class="skeleton h-16 w-36 sm:w-48"></div></div>
                <div><div class="skeleton h-8 w-40"></div></div>
            </div>
            <div class="grid grid-cols-3 gap-2 sm:gap-4">
                <div v-for="n in 3" :key="n" class="skeleton h-24 lg:h-32 rounded-2xl"></div>
            </div>
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
                <div v-for="n in 4" :key="n" class="skeleton h-14 rounded-2xl"></div>
            </div>
        </div>
        <div class="pt-8 px-1">
            <div class="skeleton h-20 w-full rounded-t-3xl rounded-b-none"></div>
            <div class="bg-base-200/50 rounded-b-2xl p-3 flex flex-col gap-4">
                <div class="skeleton h-40 w-full rounded-2xl"></div>
                <div class="skeleton h-64 w-full rounded-2xl"></div>
            </div>
        </div>
    </div>
</template>
