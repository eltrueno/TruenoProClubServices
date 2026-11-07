<script setup lang="ts">
/** Selector de jugador en un modal con buscador. v-model: id del jugador (o null). */
import { computed, nextTick, ref } from "vue"
import { PLAYER_PLACEHOLDER } from "@/lib/format"

export interface PickerItem {
    id: string
    name: string
    image?: string | null
    /** p. ej. los clubes en los que aparece */
    subtitle?: string
}

const props = defineProps<{ items: PickerItem[]; modelValue: string | null; disabled?: boolean }>()
const emit = defineEmits<{ (e: "update:modelValue", value: string | null): void }>()

const dialog = ref<HTMLDialogElement | null>(null)
const input = ref<HTMLInputElement | null>(null)
const search = ref("")

const selected = computed(() => props.items.find((i) => i.id === props.modelValue) ?? null)
const normalize = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
const filtered = computed(() => {
    const q = normalize(search.value.trim())
    return q ? props.items.filter((i) => normalize(i.name).includes(q)) : props.items
})

const open = async () => {
    if (props.disabled) return
    search.value = ""
    dialog.value?.showModal()
    await nextTick()
    input.value?.focus()
}
const pick = (id: string) => {
    emit("update:modelValue", id)
    dialog.value?.close()
}
const onImgError = (e: Event) => {
    const img = e.target as HTMLImageElement
    if (!img.src.endsWith(PLAYER_PLACEHOLDER)) img.src = PLAYER_PLACEHOLDER
}
</script>

<template>
    <button type="button" class="btn btn-sm w-full justify-between font-normal" :disabled="disabled" @click="open">
        <span v-if="selected" class="flex items-center gap-2 min-w-0">
            <img :src="selected.image || PLAYER_PLACEHOLDER" alt="" class="size-6 rounded object-cover object-top" @error="onImgError" />
            <span class="truncate font-bold">{{ selected.name }}</span>
        </span>
        <span v-else class="text-base-content/50">Elige tu jugador…</span>
        <svg class="size-4 opacity-50" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="m6 9 6 6 6-6" /></svg>
    </button>

    <dialog ref="dialog" class="modal modal-bottom sm:modal-middle">
        <div class="modal-box bg-base-200 p-0 flex flex-col max-h-[80dvh]">
            <div class="p-4 border-b border-base-300">
                <h3 class="font-bold text-lg">¿Quién eres?</h3>
                <p class="text-xs text-base-content/50 mt-0.5">Jugadores de todos los clubes que aún no tienen cuenta vinculada</p>
                <input ref="input" v-model="search" type="search" class="input input-sm w-full mt-3" placeholder="Buscar por nombre…" />
            </div>
            <ul class="overflow-y-auto p-2 flex-1 min-h-0">
                <li v-for="item in filtered" :key="item.id">
                    <button
                        type="button"
                        class="w-full flex items-center gap-3 p-2 rounded-field hover:bg-base-300 text-left transition-colors"
                        :class="{ 'bg-base-300': item.id === modelValue }"
                        @click="pick(item.id)"
                    >
                        <img :src="item.image || PLAYER_PLACEHOLDER" alt="" class="w-10 h-12 rounded-lg object-cover object-top bg-base-300 shrink-0" loading="lazy" @error="onImgError" />
                        <span class="min-w-0">
                            <span class="block font-bold text-sm truncate">{{ item.name }}</span>
                            <span v-if="item.subtitle" class="block text-xs text-base-content/50 truncate">{{ item.subtitle }}</span>
                        </span>
                    </button>
                </li>
                <li v-if="filtered.length === 0" class="p-6 text-center text-sm text-base-content/50">Ningún jugador libre coincide</li>
            </ul>
        </div>
        <form method="dialog" class="modal-backdrop"><button>Cerrar</button></form>
    </dialog>
</template>
