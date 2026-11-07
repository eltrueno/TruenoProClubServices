<script setup lang="ts">
import { computed } from "vue"
import { useAccount } from "@/composables/useAccount"
import { subTierLabel } from "@/lib/format"

const { user } = useAccount()
const tier = computed(() => subTierLabel(user.value?.twitchSubTier))
</script>

<template>
    <section class="rounded-box bg-base-200 shadow-md p-6" aria-labelledby="conexiones">
        <h2 id="conexiones" class="text-xs font-black text-base-content/60 mb-5 uppercase tracking-widest">Conexiones</h2>

        <ul class="space-y-5">
            <!-- Twitch: es con lo que se entra, siempre conectado -->
            <li class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div class="flex items-center gap-4">
                    <div class="size-10 shrink-0 rounded-full bg-[#9146FF]/15 text-[#9146FF] grid place-items-center">
                        <svg class="size-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                            <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z" />
                        </svg>
                    </div>
                    <div>
                        <p class="font-bold text-sm">Twitch</p>
                        <p class="text-xs text-base-content/50 mt-0.5">Con esta cuenta inicias sesión</p>
                    </div>
                </div>
                <div class="flex flex-wrap gap-1.5 sm:justify-end">
                    <span class="badge badge-sm" :class="user?.twitchFollowing ? 'badge-success badge-soft' : 'badge-ghost'">
                        {{ user?.twitchFollowing ? "Sigues el canal" : "No sigues el canal" }}
                    </span>
                    <span v-if="user?.twitchSub" class="badge badge-sm badge-primary">Sub{{ tier ? ` · ${tier}` : "" }}</span>
                </div>
            </li>

            <!-- Discord: el siguiente paso (vinculación con Casemuro Bot) -->
            <li class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div class="flex items-center gap-4">
                    <div class="size-10 shrink-0 rounded-full bg-[#5865F2]/15 text-[#5865F2] grid place-items-center">
                        <svg class="size-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                            <path d="M20.317 4.37a19.79 19.79 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.211.375-.445.865-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.74 19.74 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.1 13.1 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.126-.094.252-.192.372-.291a.074.074 0 0 1 .078-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.3 12.3 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.84 19.84 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.029ZM8.02 15.331c-1.183 0-2.157-1.086-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.332-.956 2.418-2.157 2.418Zm7.975 0c-1.183 0-2.157-1.086-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.332-.946 2.418-2.157 2.418Z" />
                        </svg>
                    </div>
                    <div>
                        <p class="font-bold text-sm">Discord</p>
                        <p class="text-xs text-base-content/50 mt-0.5">Para que el bot de la comunidad sepa quién eres: menciones en el equipo de la semana, mercado de fichajes…</p>
                    </div>
                </div>
                <button class="btn btn-sm btn-outline btn-disabled font-bold w-full sm:w-auto">Próximamente</button>
            </li>
        </ul>
    </section>
</template>
