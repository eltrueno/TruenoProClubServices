<script setup lang="ts">
/**
 * Selector genérico en modal con buscador: lista de "personas" (jugadores, cuentas…)
 * con foto, nombre y subtítulo. Uno o varios (`multiple`).
 * v-model: id (string) en simple, ids (string[]) en múltiple.
 * El disparador es el botón por defecto o lo que se pase en el slot (recibe `open`).
 */
import { computed, nextTick, ref, watch } from "vue"
import { PLAYER_POSITIONS, type PlayerPosition } from "@trueno-proclub-services/shared"
import { translatePosition } from "@/i18n/translations"

export interface PickerItem {
    id: string
    name: string
    subtitle?: string
    image?: string | null
    /** aviso pequeño bajo el nombre (p. ej. "ya vinculada a X") */
    hint?: string
    /** posiciones jugadas, la más jugada primero (activa el filtro por posición) */
    positions?: PlayerPosition[]
    disabled?: boolean
}

const POSITION_SHORT: Record<PlayerPosition, string> = { goalkeeper: "POR", defender: "DEF", midfielder: "MC", forward: "DEL" }

const props = withDefaults(defineProps<{
    items: PickerItem[]
    modelValue: string | string[] | null
    multiple?: boolean
    title?: string
    placeholder?: string
    searchPlaceholder?: string
    emptyText?: string
    /** forma de la imagen: avatar redondo (cuentas) o retrato de jugador */
    imageShape?: "avatar" | "player"
    /** imagen cuando el item no tiene */
    fallbackImage?: string
    /** en simple, permite deseleccionar (opción "Ninguno") */
    clearable?: boolean
    size?: "sm" | "md"
    disabled?: boolean
}>(), {
    multiple: false,
    title: "Seleccionar",
    placeholder: "Seleccionar…",
    searchPlaceholder: "Buscar por nombre…",
    emptyText: "No hay resultados",
    imageShape: "player",
    fallbackImage: "",
    clearable: true,
    size: "sm",
    disabled: false
})
const emit = defineEmits<{ (e: "update:modelValue", value: string | string[] | null): void }>()

const dialog = ref<HTMLDialogElement | null>(null)
const searchInput = ref<HTMLInputElement | null>(null)
const search = ref("")
const positionFilter = ref<PlayerPosition | null>(null)
const hasPositions = computed(() => props.items.some((i) => i.positions?.length))
// En múltiple se trabaja sobre una copia y se aplica al cerrar con "Aplicar"
const draft = ref<string[]>([])

const selectedIds = computed<string[]>(() =>
    props.multiple ? (Array.isArray(props.modelValue) ? props.modelValue : []) : props.modelValue ? [String(props.modelValue)] : []
)
const selectedItems = computed(() => props.items.filter((i) => selectedIds.value.includes(i.id)))

const label = computed(() => {
    if (selectedItems.value.length === 0) return props.placeholder
    if (!props.multiple) return selectedItems.value[0].name
    if (selectedItems.value.length <= 2) return selectedItems.value.map((i) => i.name).join(", ")
    return `${selectedItems.value[0].name} +${selectedItems.value.length - 1}`
})

const normalize = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
const filtered = computed(() => {
    const q = normalize(search.value.trim())
    // Sin id no se puede seleccionar (p. ej. datos antiguos sin playerId)
    const valid = props.items.filter((i) => !!i.id)
    let list = q ? valid.filter((i) => normalize(i.name).includes(q) || normalize(i.subtitle ?? "").includes(q)) : valid
    if (positionFilter.value) list = list.filter((i) => i.positions?.includes(positionFilter.value!))
    // Seleccionados primero para verlos sin buscar
    const current = props.multiple ? draft.value : selectedIds.value
    return [...list].sort((a, b) => Number(current.includes(b.id)) - Number(current.includes(a.id)))
})

const isChecked = (id: string) => (props.multiple ? draft.value : selectedIds.value).includes(id)

const open = async () => {
    if (props.disabled) return
    search.value = ""
    positionFilter.value = null
    draft.value = [...selectedIds.value]
    dialog.value?.showModal()
    await nextTick()
    searchInput.value?.focus()
}
const close = () => dialog.value?.close()

const pick = (item: PickerItem) => {
    if (item.disabled) return
    if (props.multiple) {
        draft.value = draft.value.includes(item.id) ? draft.value.filter((x) => x !== item.id) : [...draft.value, item.id]
        return
    }
    emit("update:modelValue", item.id)
    close()
}
const clear = () => {
    if (props.multiple) { draft.value = []; return }
    emit("update:modelValue", null)
    close()
}
const apply = () => {
    emit("update:modelValue", [...draft.value])
    close()
}

watch(() => props.modelValue, () => { if (!dialog.value?.open) draft.value = [...selectedIds.value] })

defineExpose({ open, close })
</script>

<template>
    <slot :open="open" :selected="selectedItems" :label="label">
        <button type="button" class="btn btn-outline w-full justify-between font-normal" :class="size === 'sm' ? 'btn-sm' : ''" :disabled="disabled" @click="open">
            <span class="flex items-center gap-2 min-w-0">
                <template v-if="!multiple && selectedItems[0]">
                    <img
                        :src="selectedItems[0].image || fallbackImage"
                        :alt="selectedItems[0].name"
                        class="shrink-0 object-cover"
                        :class="imageShape === 'avatar' ? 'size-5 rounded-full' : 'size-6 rounded-md object-top'"
                    />
                </template>
                <span class="truncate" :class="{ 'opacity-50': selectedItems.length === 0 }">{{ label }}</span>
            </span>
            <svg xmlns="http://www.w3.org/2000/svg" class="size-4 shrink-0 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" /></svg>
        </button>
    </slot>

    <dialog ref="dialog" class="modal modal-bottom sm:modal-middle">
        <div class="modal-box bg-base-200 border border-base-300 shadow-2xl max-w-2xl p-0 flex flex-col max-h-[85vh]">
            <div class="px-5 py-4 border-b border-base-300 shrink-0 flex flex-col gap-3">
                <div class="flex items-center justify-between gap-2">
                    <h3 class="font-bold text-lg">{{ title }}</h3>
                    <button type="button" class="btn btn-ghost btn-sm btn-circle" aria-label="Cerrar" @click="close">✕</button>
                </div>
                <label class="input input-bordered input-sm flex items-center gap-2 w-full">
                    <svg xmlns="http://www.w3.org/2000/svg" class="size-4 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-4.35-4.35M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z" /></svg>
                    <input ref="searchInput" v-model="search" type="text" class="grow" :placeholder="searchPlaceholder" />
                    <kbd v-if="search" class="kbd kbd-xs cursor-pointer" @click="search = ''">✕</kbd>
                </label>
                <div v-if="hasPositions" class="flex flex-wrap gap-1">
                    <button type="button" class="btn btn-xs" :class="positionFilter === null ? 'btn-primary' : 'btn-ghost'" @click="positionFilter = null">Todas</button>
                    <button
                        v-for="pos in PLAYER_POSITIONS"
                        :key="pos"
                        type="button"
                        class="btn btn-xs"
                        :class="positionFilter === pos ? 'btn-primary' : 'btn-ghost'"
                        @click="positionFilter = positionFilter === pos ? null : pos"
                    >{{ translatePosition(pos) }}</button>
                </div>
            </div>

            <div class="overflow-y-auto flex-1 min-h-0 p-3">
                <p v-if="filtered.length === 0" class="text-center text-sm opacity-50 py-10">{{ emptyText }}</p>
                <ul v-else class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <li v-for="item in filtered" :key="item.id">
                        <button
                            type="button"
                            class="w-full flex items-center gap-3 rounded-xl p-2 text-left transition border"
                            :class="[
                                isChecked(item.id) ? 'bg-primary/10 border-primary/50' : 'bg-base-100 border-transparent hover:border-base-300 hover:bg-base-300/40',
                                item.disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
                            ]"
                            :disabled="item.disabled"
                            @click="pick(item)"
                        >
                            <div class="shrink-0 overflow-hidden bg-base-300" :class="imageShape === 'avatar' ? 'size-10 rounded-full' : 'w-10 h-12 rounded-lg'">
                                <img
                                    v-if="item.image || fallbackImage"
                                    :src="item.image || fallbackImage"
                                    :alt="item.name"
                                    class="w-full h-full object-cover object-top"
                                    :class="{ 'scale-[1.6] origin-top': imageShape === 'player' }"
                                />
                            </div>
                            <div class="min-w-0 flex-1">
                                <p class="font-bold text-sm truncate">{{ item.name }}</p>
                                <p v-if="item.subtitle" class="text-xs opacity-60 truncate">{{ item.subtitle }}</p>
                                <p v-if="item.positions?.length" class="flex gap-1 mt-0.5">
                                    <span v-for="(pos, i) in item.positions" :key="pos" class="badge badge-xs font-bold" :class="i === 0 ? 'badge-primary' : 'badge-ghost'" :title="translatePosition(pos)">{{ POSITION_SHORT[pos] }}</span>
                                </p>
                                <p v-if="item.hint" class="text-[10px] text-warning truncate">{{ item.hint }}</p>
                            </div>
                            <input v-if="multiple" type="checkbox" class="checkbox checkbox-primary checkbox-sm pointer-events-none" :checked="isChecked(item.id)" tabindex="-1" />
                            <span v-else-if="isChecked(item.id)" class="text-primary font-bold">✓</span>
                        </button>
                    </li>
                </ul>
            </div>

            <div class="px-5 py-3 border-t border-base-300 shrink-0 flex items-center justify-between gap-2">
                <span class="text-xs opacity-60">
                    <template v-if="multiple">{{ draft.length }} seleccionado{{ draft.length === 1 ? "" : "s" }}</template>
                    <template v-else>{{ filtered.length }} de {{ items.length }}</template>
                </span>
                <div class="flex gap-2">
                    <button v-if="clearable || multiple" type="button" class="btn btn-ghost btn-sm" @click="clear">{{ multiple ? "Limpiar" : "Ninguno" }}</button>
                    <button v-if="multiple" type="button" class="btn btn-primary btn-sm" @click="apply">Aplicar</button>
                    <button v-else type="button" class="btn btn-sm" @click="close">Cancelar</button>
                </div>
            </div>
        </div>
        <form method="dialog" class="modal-backdrop"><button>close</button></form>
    </dialog>
</template>
