<script setup lang="ts">
import { computed, ref, watch } from "vue"
import { useAccount } from "@/composables/useAccount"
import { updatePrivacySettings } from "@/lib/auth"

const { user } = useAccount()

const showPublicName = ref(true)
const showPublicImage = ref(true)
const saving = ref(false)
const status = ref<"" | "saved" | "error">("")
const errorText = ref("")

// Lo guardado en la cuenta (por defecto, sí)
const savedName = computed(() => user.value?.showPublicName !== false)
const savedImage = computed(() => user.value?.showPublicImage !== false)
const dirty = computed(() => showPublicName.value !== savedName.value || showPublicImage.value !== savedImage.value)

watch(user, () => {
    showPublicName.value = savedName.value
    showPublicImage.value = savedImage.value
}, { immediate: true })

const save = async () => {
    if (!dirty.value || saving.value) return
    saving.value = true
    status.value = ""
    const { error } = await updatePrivacySettings({ showPublicName: showPublicName.value, showPublicImage: showPublicImage.value })
    if (error) {
        status.value = "error"
        errorText.value = error.status === 403 ? "El servicio de cuentas ha rechazado el cambio" : "No se ha podido guardar"
        showPublicName.value = savedName.value
        showPublicImage.value = savedImage.value
    } else {
        if (user.value) Object.assign(user.value, { showPublicName: showPublicName.value, showPublicImage: showPublicImage.value })
        status.value = "saved"
        setTimeout(() => { if (status.value === "saved") status.value = "" }, 2500)
    }
    saving.value = false
}
</script>

<template>
    <section class="rounded-box bg-base-200 shadow-md p-6" aria-labelledby="privacidad">
        <h2 id="privacidad" class="text-xs font-black text-base-content/60 mb-2 uppercase tracking-widest">Privacidad</h2>
        <p class="text-xs text-base-content/50 mb-4 leading-relaxed">
            Cuando tu cuenta aparece vinculada a tu jugador en la web de un club, elige qué se muestra públicamente.
        </p>
        <div class="flex flex-col gap-3">
            <label class="flex items-center justify-between gap-4 cursor-pointer">
                <span class="text-sm font-medium">Mostrar mi nombre de usuario</span>
                <input v-model="showPublicName" type="checkbox" class="toggle toggle-primary toggle-sm" />
            </label>
            <label class="flex items-center justify-between gap-4 cursor-pointer">
                <span class="text-sm font-medium">Mostrar mi imagen de perfil</span>
                <input v-model="showPublicImage" type="checkbox" class="toggle toggle-primary toggle-sm" />
            </label>
        </div>
        <div class="flex items-center justify-end gap-3 mt-4">
            <span v-if="saving" class="text-xs text-base-content/60">Guardando…</span>
            <span v-else-if="status === 'saved'" class="text-xs font-bold text-success">Guardado</span>
            <span v-else-if="status === 'error'" class="text-xs font-bold text-error">{{ errorText }}</span>
            <button class="btn btn-sm btn-primary font-bold" :disabled="!dirty || saving" @click="save">
                <span v-if="saving" class="loading loading-spinner loading-xs"></span>
                Guardar
            </button>
        </div>
    </section>
</template>
