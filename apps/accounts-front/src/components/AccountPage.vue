<script setup lang="ts">
/** Página de la cuenta: sin sesión manda a /login (y vuelve aquí después). */
import { watch } from "vue"
import { useAccount } from "@/composables/useAccount"
import ProfileCard from "./account/ProfileCard.vue"
import ConnectionsCard from "./account/ConnectionsCard.vue"
import MyPlayerCard from "./account/MyPlayerCard.vue"
import PrivacyCard from "./account/PrivacyCard.vue"
import DangerZoneCard from "./account/DangerZoneCard.vue"

const { isPending, isLoggedIn, authUnavailable } = useAccount()

watch([isPending, isLoggedIn], ([pending, logged]) => {
    if (pending || logged || authUnavailable.value) return
    const here = window.location.pathname + window.location.search + window.location.hash
    window.location.replace(`/login?redirect=${encodeURIComponent(here)}`)
}, { immediate: true })
</script>

<template>
    <div v-if="isLoggedIn" class="space-y-5">
        <ProfileCard />
        <ConnectionsCard />
        <MyPlayerCard />
        <PrivacyCard />
        <DangerZoneCard />
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
