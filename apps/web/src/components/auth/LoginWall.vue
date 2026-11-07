<script setup lang="ts">
/**
 * Aviso de "hay que iniciar sesión" (lo usa AuthGuard, p. ej. en /admin). El login se hace
 * en accounts.casemuro.stream y al terminar se vuelve a esta misma página.
 */
import { useAuth } from "@/composables/useAuth"

const { isPending, login } = useAuth()
</script>

<template>
  <div class="min-h-[60vh] flex items-center justify-center p-2 sm:p-4">
    <div class="card w-full max-w-sm bg-base-200 shadow-xl border border-base-300">
      <div class="card-body items-center text-center p-6 sm:p-8 gap-5">
        <div v-if="isPending" class="flex flex-col items-center gap-6 py-8">
          <span class="loading loading-spinner loading-lg text-primary"></span>
          <p class="text-sm font-black tracking-widest uppercase opacity-70 animate-pulse">Verificando sesión</p>
        </div>

        <template v-else>
          <div class="relative">
            <div class="absolute inset-0 bg-primary/20 blur-3xl rounded-full"></div>
            <div class="relative bg-base-300 p-4 rounded-2xl">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
          </div>

          <div class="space-y-1.5">
            <h2 class="text-2xl font-black tracking-tight uppercase">Inicia sesión</h2>
            <p class="text-sm opacity-60 leading-relaxed">Necesitas iniciar sesión con tu cuenta de Casemuro para ver esta página.</p>
          </div>

          <button
            @click="login()"
            class="btn bg-[#9146FF] hover:bg-[#772ce8] border-none text-white btn-block gap-2 font-black tracking-wide"
          >
            <svg class="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z"/>
            </svg>
            INICIAR SESIÓN
          </button>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.card {
  background-image: radial-gradient(circle at top right, color-mix(in srgb, var(--color-primary) 5%, transparent), transparent 40%);
}
</style>
