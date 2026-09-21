<script setup lang="ts">
/**
 * Editor de foto de jugador: carga una imagen (URL o fichero), la encuadra a mano
 * (arrastrar para mover, rueda/slider para zoom) sobre un marco fijo de 400x450 —la misma
 * resolución y escala que tenían todas las fotos del club— y sube el PNG resultante.
 */
import { computed, nextTick, onBeforeUnmount, ref, watch } from "vue"
import { ApiError, tpcsApi } from "@/lib/api"
import { PLAYER_PLACEHOLDER } from "@/lib/playerImage"

// Resolución de todas las fotos del club (las antiguas eran 400x450 PNG, busto arriba)
const FRAME_W = 400
const FRAME_H = 450

const props = defineProps<{ playerId: string; playerName: string }>()
const emit = defineEmits<{ (e: "uploaded", imageUrl: string): void }>()

const dialog = ref<HTMLDialogElement | null>(null)
const canvas = ref<HTMLCanvasElement | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)

const urlInput = ref("")
const loading = ref(false)
const uploading = ref(false)
const error = ref("")
const showGuide = ref(true)

// Imagen cargada y su encuadre (en coordenadas del marco 400x450)
const img = ref<HTMLImageElement | null>(null)
let objectUrl: string | null = null
const scale = ref(1)
const offsetX = ref(0)
const offsetY = ref(0)
const minScale = ref(0.1)
const maxScale = ref(6)

const guide = new Image()
guide.src = PLAYER_PLACEHOLDER

const ready = computed(() => !!img.value)

const setError = (e: unknown, fallback: string) => {
    const code = e instanceof ApiError ? e.code : ""
    error.value =
        code === "IMAGE_STORAGE_NOT_CONFIGURED" ? "El api no tiene configurado el almacenamiento de fotos (R2)"
            : code === "ERROR_NOT_FOUND" ? "No se ha podido descargar esa URL"
                : code === "ERROR_BAD_REQUEST" ? "Esa URL no es una imagen válida"
                    : code || fallback
}

const draw = () => {
    const c = canvas.value
    if (!c) return
    const ctx = c.getContext("2d")!
    ctx.clearRect(0, 0, FRAME_W, FRAME_H)
    if (img.value) {
        ctx.drawImage(img.value, offsetX.value, offsetY.value, img.value.width * scale.value, img.value.height * scale.value)
    }
    if (showGuide.value && guide.complete) {
        ctx.globalAlpha = 0.35
        ctx.drawImage(guide, 0, 0, FRAME_W, FRAME_H)
        ctx.globalAlpha = 1
    }
}

/** Encuadre inicial: la imagen cubre el marco a lo ancho y se pega arriba (los bustos) */
const fit = () => {
    if (!img.value) return
    const s = Math.max(FRAME_W / img.value.width, FRAME_H / img.value.height)
    scale.value = s
    minScale.value = Math.min(FRAME_W / img.value.width, FRAME_H / img.value.height) * 0.5
    maxScale.value = s * 6
    offsetX.value = (FRAME_W - img.value.width * s) / 2
    offsetY.value = 0
    draw()
}

const loadFromBlob = (blob: Blob) => new Promise<void>((resolve, reject) => {
    if (objectUrl) URL.revokeObjectURL(objectUrl)
    objectUrl = URL.createObjectURL(blob)
    const image = new Image()
    image.onload = () => { img.value = image; fit(); resolve() }
    image.onerror = () => reject(new Error("No se ha podido leer la imagen"))
    image.src = objectUrl
})

const loadUrl = async (url: string) => {
    error.value = ""
    loading.value = true
    try {
        // Vía proxy del api: así el canvas no queda "tainted" por CORS y se puede exportar
        await loadFromBlob(await tpcsApi.admin.fetchImageViaProxy(url))
    } catch (e) {
        setError(e, e instanceof Error ? e.message : "No se ha podido cargar la imagen")
    } finally {
        loading.value = false
    }
}

const onFile = async (ev: Event) => {
    const file = (ev.target as HTMLInputElement).files?.[0]
    if (!file) return
    error.value = ""
    try {
        await loadFromBlob(file)
    } catch (e) {
        error.value = e instanceof Error ? e.message : "No se ha podido leer el fichero"
    }
}

// Arrastrar para mover
let dragging = false
let lastX = 0
let lastY = 0
const displayScale = () => (canvas.value ? FRAME_W / canvas.value.getBoundingClientRect().width : 1)
const onPointerDown = (e: PointerEvent) => {
    if (!img.value) return
    dragging = true
    lastX = e.clientX
    lastY = e.clientY
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
}
const onPointerMove = (e: PointerEvent) => {
    if (!dragging) return
    const k = displayScale()
    offsetX.value += (e.clientX - lastX) * k
    offsetY.value += (e.clientY - lastY) * k
    lastX = e.clientX
    lastY = e.clientY
    draw()
}
const onPointerUp = () => { dragging = false }

// Zoom centrado en el cursor (rueda) o en el centro del marco (slider)
const zoomTo = (next: number, cx = FRAME_W / 2, cy = FRAME_H / 2) => {
    if (!img.value) return
    const s = Math.min(maxScale.value, Math.max(minScale.value, next))
    const ratio = s / scale.value
    offsetX.value = cx - (cx - offsetX.value) * ratio
    offsetY.value = cy - (cy - offsetY.value) * ratio
    scale.value = s
    draw()
}
const onWheel = (e: WheelEvent) => {
    if (!img.value) return
    e.preventDefault()
    const rect = canvas.value!.getBoundingClientRect()
    const k = displayScale()
    zoomTo(scale.value * (e.deltaY < 0 ? 1.08 : 1 / 1.08), (e.clientX - rect.left) * k, (e.clientY - rect.top) * k)
}
const sliderValue = computed({
    get: () => scale.value,
    set: (v: number) => zoomTo(v)
})

const upload = async () => {
    if (!img.value || !canvas.value) return
    uploading.value = true
    error.value = ""
    try {
        // Exportar sin la guía
        const wasGuide = showGuide.value
        showGuide.value = false
        draw()
        const dataUrl = canvas.value.toDataURL("image/png")
        showGuide.value = wasGuide
        draw()
        const member = await tpcsApi.admin.uploadMemberImage(props.playerId, dataUrl)
        emit("uploaded", member.imageUrl || "")
        close()
    } catch (e) {
        setError(e, "No se ha podido subir la foto")
    } finally {
        uploading.value = false
    }
}

const reset = () => {
    if (objectUrl) URL.revokeObjectURL(objectUrl)
    objectUrl = null
    img.value = null
    urlInput.value = ""
    error.value = ""
    if (fileInput.value) fileInput.value.value = ""
}

const open = async (initialUrl?: string) => {
    reset()
    dialog.value?.showModal()
    await nextTick()
    draw()
    if (initialUrl) {
        urlInput.value = initialUrl
        await loadUrl(initialUrl)
    }
}
const close = () => dialog.value?.close()

watch(showGuide, draw)
guide.onload = draw
onBeforeUnmount(() => { if (objectUrl) URL.revokeObjectURL(objectUrl) })

defineExpose({ open, close })
</script>

<template>
    <dialog ref="dialog" class="modal modal-bottom sm:modal-middle" @close="reset">
        <div class="modal-box bg-base-200 border border-base-300 shadow-2xl max-w-3xl p-0 flex flex-col max-h-[90vh]">
            <div class="px-5 py-4 border-b border-base-300 shrink-0 flex items-center justify-between gap-2">
                <div class="min-w-0">
                    <h3 class="font-bold text-lg truncate">Foto de {{ playerName }}</h3>
                    <p class="text-xs text-base-content/60">Encuadra el busto dentro del marco de {{ FRAME_W }}×{{ FRAME_H }} usando la silueta como guía</p>
                </div>
                <button type="button" class="btn btn-ghost btn-sm btn-circle" aria-label="Cerrar" @click="close">✕</button>
            </div>

            <div class="overflow-y-auto flex-1 min-h-0 p-5 grid gap-5 md:grid-cols-[auto_1fr] items-start">
                <!-- Marco -->
                <div class="mx-auto">
                    <div
                        class="relative rounded-xl overflow-hidden bg-base-300 border border-base-content/10 select-none touch-none"
                        :class="ready ? 'cursor-grab active:cursor-grabbing' : ''"
                        :style="`width: min(${FRAME_W}px, 70vw); aspect-ratio: ${FRAME_W} / ${FRAME_H}`"
                        @pointerdown="onPointerDown"
                        @pointermove="onPointerMove"
                        @pointerup="onPointerUp"
                        @pointercancel="onPointerUp"
                        @wheel="onWheel"
                    >
                        <canvas ref="canvas" :width="FRAME_W" :height="FRAME_H" class="w-full h-full block"></canvas>
                        <div v-if="loading" class="absolute inset-0 flex items-center justify-center bg-base-300/70">
                            <span class="loading loading-spinner loading-lg text-primary"></span>
                        </div>
                        <p v-else-if="!ready" class="absolute inset-0 flex items-center justify-center text-xs text-base-content/50 text-center px-6">
                            Carga una imagen por URL o desde un fichero
                        </p>
                    </div>
                    <div v-if="ready" class="mt-3 flex items-center gap-3">
                        <span class="text-xs text-base-content/60">Zoom</span>
                        <input type="range" class="range range-primary range-xs flex-1" :min="minScale" :max="maxScale" :step="0.001" v-model.number="sliderValue" />
                        <button type="button" class="btn btn-ghost btn-xs" @click="fit">Ajustar</button>
                    </div>
                </div>

                <!-- Fuente + opciones -->
                <div class="flex flex-col gap-4 min-w-0">
                    <label class="form-control w-full">
                        <span class="label-text text-[10px] uppercase font-black tracking-wider text-base-content/50 mb-1">Desde una URL</span>
                        <div class="join w-full">
                            <input v-model="urlInput" type="url" placeholder="https://…/foto.png" class="input input-bordered input-sm join-item w-full font-mono text-xs" @keydown.enter.prevent="loadUrl(urlInput)" />
                            <button type="button" class="btn btn-sm join-item" :disabled="!urlInput || loading" @click="loadUrl(urlInput)">Cargar</button>
                        </div>
                    </label>

                    <label class="form-control w-full">
                        <span class="label-text text-[10px] uppercase font-black tracking-wider text-base-content/50 mb-1">O desde un fichero</span>
                        <input ref="fileInput" type="file" accept="image/*" class="file-input file-input-bordered file-input-sm w-full" @change="onFile" />
                    </label>

                    <label class="flex items-center gap-2 cursor-pointer text-sm">
                        <input type="checkbox" class="checkbox checkbox-sm checkbox-primary" v-model="showGuide" />
                        Mostrar silueta guía
                    </label>

                    <p class="text-xs text-base-content/50 leading-relaxed">
                        Arrastra para mover y usa la rueda o el slider para el zoom. Se guarda un PNG de {{ FRAME_W }}×{{ FRAME_H }} en el CDN y se asigna al jugador al instante.
                    </p>

                    <p v-if="error" class="text-xs text-error">{{ error }}</p>
                </div>
            </div>

            <div class="px-5 py-3 border-t border-base-300 shrink-0 flex justify-end gap-2">
                <button type="button" class="btn btn-sm" @click="close">Cancelar</button>
                <button type="button" class="btn btn-primary btn-sm" :disabled="!ready || uploading" @click="upload">
                    <span v-if="uploading" class="loading loading-spinner loading-xs"></span>
                    Subir y asignar
                </button>
            </div>
        </div>
        <form method="dialog" class="modal-backdrop"><button>close</button></form>
    </dialog>
</template>
