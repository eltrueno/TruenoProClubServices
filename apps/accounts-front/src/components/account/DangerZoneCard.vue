<script setup lang="ts">
import { onMounted, ref } from "vue"
import { useAccount } from "@/composables/useAccount"

const { deleteAccount, loginWithTwitch } = useAccount()

const modal = ref<HTMLDialogElement | null>(null)
const busy = ref(false)
const needsReauth = ref(false)
const errorText = ref("")

const open = () => {
    needsReauth.value = false
    errorText.value = ""
    modal.value?.showModal()
}

const confirm = async () => {
    if (busy.value) return
    busy.value = true
    errorText.value = ""
    try {
        const result = await deleteAccount()
        if (result === "deleted") {
            window.location.href = "/login"
            return
        }
        needsReauth.value = true
    } catch (e) {
        errorText.value = e instanceof Error ? e.message : "No se ha podido eliminar la cuenta"
    } finally {
        busy.value = false
    }
}

// Por seguridad, borrar la cuenta exige haber entrado hace poco: se vuelve a entrar y se
// regresa aquí con #borrar para abrir de nuevo la confirmación
const reauth = () => loginWithTwitch("/#borrar")

onMounted(() => {
    if (window.location.hash === "#borrar") {
        history.replaceState(null, "", window.location.pathname + window.location.search)
        open()
    }
})
</script>

<template>
    <section class="rounded-box bg-base-200 shadow-md p-6 border border-error/20" aria-labelledby="peligro">
        <h2 id="peligro" class="text-xs font-black text-error/80 mb-5 uppercase tracking-widest">Zona de peligro</h2>
        <div class="flex flex-col sm:flex-row items-start justify-between gap-6">
            <div>
                <p class="font-medium text-sm">Eliminar cuenta</p>
                <p class="text-xs text-base-content/50 mt-1 leading-relaxed">
                    Se borran tu cuenta y tus conexiones en todas las webs de Casemuro. Tu jugador queda sin cuenta vinculada; sus estadísticas no se tocan. No se puede deshacer.
                </p>
            </div>
            <button class="btn btn-sm btn-error text-white font-bold whitespace-nowrap" @click="open">Eliminar cuenta</button>
        </div>

        <dialog ref="modal" class="modal modal-bottom sm:modal-middle">
            <div class="modal-box bg-base-200 border border-error/20">
                <h3 class="font-bold text-lg text-error">¿Eliminar tu cuenta?</h3>
                <template v-if="needsReauth">
                    <p class="py-4 text-sm text-base-content/70">
                        Por seguridad, para borrar la cuenta tienes que haber iniciado sesión hace poco. Vuelve a entrar con Twitch y te traemos de vuelta aquí.
                    </p>
                    <div class="modal-action">
                        <form method="dialog"><button class="btn btn-ghost">Cancelar</button></form>
                        <button class="btn btn-error text-white" @click="reauth">Volver a entrar</button>
                    </div>
                </template>
                <template v-else>
                    <p class="py-4 text-sm text-base-content/70">
                        Se borrarán tu cuenta, tus conexiones y tus ajustes, y tu jugador quedará libre para que pueda volver a vincularse. <strong class="text-base-content">Esta acción no se puede deshacer.</strong>
                    </p>
                    <p v-if="errorText" class="text-xs text-error mb-2">{{ errorText }}</p>
                    <div class="modal-action">
                        <form method="dialog"><button class="btn btn-ghost" :disabled="busy">Cancelar</button></form>
                        <button class="btn btn-error text-white" :disabled="busy" @click="confirm">
                            <span v-if="busy" class="loading loading-spinner loading-xs"></span>
                            Sí, eliminar mi cuenta
                        </button>
                    </div>
                </template>
            </div>
            <form method="dialog" class="modal-backdrop"><button>Cerrar</button></form>
        </dialog>
    </section>
</template>
