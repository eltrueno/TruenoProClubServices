<script setup lang="ts">
/** Página de la cuenta: sin sesión manda a /login (y vuelve aquí después). */
import { watch } from "vue"
import { useAccount } from "@/composables/useAccount"
import ProfileCard from "./account/ProfileCard.vue"
import SupportProjectCard from "./account/SupportProjectCard.vue"
import ConnectionsCard from "./account/ConnectionsCard.vue"
import MyPlayerCard from "./account/MyPlayerCard.vue"
import AchievementsCard from "./account/AchievementsCard.vue"
import PrivacyCard from "./account/PrivacyCard.vue"
import DangerZoneCard from "./account/DangerZoneCard.vue"
import Toaster from "./ui/Toaster.vue"
import SectionNav, { type NavSection } from "./ui/SectionNav.vue"

/** Índice de la página (en móvil, que es donde se hace larga). Iconos: Heroicons outline */
const SECTIONS: NavSection[] = [
    { id: "perfil", label: "Perfil", icon: "M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" },
    { id: "conexiones-card", label: "Conexiones", icon: "M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" },
    { id: "mi-jugador", label: "Jugador", icon: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-13.5 3.5 2.5-1.3 4h-4.4l-1.3-4L12 7.5Zm0 0V3m3.5 7 5-1.5M14.2 14l2.8 4.5M9.8 14 7 18.5M8.5 10l-5-1.5" },
    { id: "logros-card", label: "Logros", icon: "M16.5 18.75h-9m9 0a3 3 0 0 1 3 3h-15a3 3 0 0 1 3-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 0 1-.982-3.172M9.497 14.25a7.454 7.454 0 0 0 .981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 0 0 7.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 0 0 2.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 0 1 2.916.52 6.003 6.003 0 0 1-5.395 4.972m0 0a6.726 6.726 0 0 1-2.749 1.35m0 0a6.772 6.772 0 0 1-3.044 0" },
    { id: "ajustes", label: "Ajustes", icon: "M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" },
]

const { isPending, isLoggedIn, authUnavailable } = useAccount()

watch([isPending, isLoggedIn], ([pending, logged]) => {
    if (pending || logged || authUnavailable.value) return
    const here = window.location.pathname + window.location.search + window.location.hash
    window.location.replace(`/login?redirect=${encodeURIComponent(here)}`)
}, { immediate: true })
</script>

<template>
    <div v-if="isLoggedIn" class="space-y-5">
        <SectionNav :sections="SECTIONS" />
        <ProfileCard id="perfil" tabindex="-1" class="scroll-mt-20 focus:outline-none" />
        <!-- Solo en las primeras semanas de la cuenta, y se puede cerrar -->
        <SupportProjectCard />
        <ConnectionsCard id="conexiones-card" tabindex="-1" class="scroll-mt-20 focus:outline-none" />
        <MyPlayerCard />
        <AchievementsCard id="logros-card" tabindex="-1" class="scroll-mt-20 focus:outline-none" />
        <div id="ajustes" tabindex="-1" class="space-y-5 scroll-mt-20 focus:outline-none">
            <h2 class="text-sm font-black uppercase tracking-widest text-base-content/75 pt-4">Ajustes</h2>
            <PrivacyCard />
            <DangerZoneCard />
        </div>
        <Toaster />
    </div>

    <div v-else-if="authUnavailable && !isPending" role="alert" class="alert alert-error alert-soft">
        El servicio de cuentas no responde ahora mismo. Inténtalo en un rato.
    </div>

    <!-- Comprobando sesión -->
    <div v-else class="space-y-5" aria-busy="true">
        <div class="rounded-box bg-base-200 shadow-md overflow-hidden">
            <div class="h-24 skeleton rounded-none"></div>
            <div class="p-6 flex items-center gap-4">
                <div class="skeleton size-20 rounded-full -mt-14 shrink-0"></div>
                <div class="flex-1 space-y-2">
                    <div class="skeleton h-5 w-40"></div>
                    <div class="skeleton h-3 w-56"></div>
                </div>
            </div>
        </div>
        <div v-for="i in 3" :key="i" class="rounded-box bg-base-200 shadow-md p-6 space-y-3">
            <div class="skeleton h-3 w-24"></div>
            <div class="skeleton h-10 w-full"></div>
        </div>
    </div>
</template>
