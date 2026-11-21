<script setup lang="ts">
/**
 * Tarjeta de "¿Te gusta? Dale una estrella" para quien acaba de crear la cuenta (sus primeras
 * dos semanas). Se puede cerrar y no vuelve a salir en ese navegador.
 */
import { computed, onMounted, ref } from "vue"
import { useAccount } from "../../composables/useAccount"
import { REPO } from "../../config/site"
import GithubRepoButtons from "../ui/GithubRepoButtons.vue"

const DISMISS_KEY = "support-card-dismissed"
const NEW_ACCOUNT_DAYS = 14

const { user } = useAccount()
const dismissed = ref(true)

onMounted(() => {
    try {
        dismissed.value = localStorage.getItem(DISMISS_KEY) === "1"
    } catch {
        dismissed.value = false
    }
})

const isNewAccount = computed(() => {
    const created = user.value?.createdAt ? new Date(user.value.createdAt).getTime() : NaN
    return Number.isFinite(created) && Date.now() - created < NEW_ACCOUNT_DAYS * 24 * 60 * 60 * 1000
})

const dismiss = () => {
    dismissed.value = true
    try {
        localStorage.setItem(DISMISS_KEY, "1")
    } catch {
        /* sin almacenamiento: volverá a salir la próxima vez */
    }
}
</script>

<template>
    <section v-if="isNewAccount && !dismissed" class="relative overflow-hidden rounded-box bg-base-200 shadow-md p-5 pl-6"
        aria-labelledby="apoya-el-proyecto">
        <span aria-hidden="true" class="absolute inset-y-0 left-0 w-1.5 bg-brand"></span>
        <button type="button" class="btn btn-ghost btn-sm btn-circle absolute top-2 right-2 text-base-content/60" aria-label="Cerrar" @click="dismiss">
            <svg class="size-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
        </button>
        <h2 id="apoya-el-proyecto" class="font-black pr-8">¡Hola! ¿Te gusta la web?</h2>
        <p class="mt-1 text-sm text-base-content/75 leading-relaxed">
            Las webs de la comunidad son de código abierto y las hace una sola persona.
            Una estrella en <a :href="REPO.url" target="_blank" rel="noopener" class="link font-semibold">GitHub</a> ayuda mucho.
        </p>
        <div class="mt-3">
            <GithubRepoButtons fork size="sm" />
        </div>
    </section>
</template>
