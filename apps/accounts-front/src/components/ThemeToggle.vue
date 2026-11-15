<script setup lang="ts">
/** Tema claro / sistema / oscuro. Se guarda en localStorage (cada web guarda el suyo). */
import { onMounted, ref } from "vue"

type Theme = "light" | "system" | "dark"
const OPTIONS: { value: Theme; label: string; path: string }[] = [
    { value: "light", label: "Tema claro", path: "M12 3v1m0 16v1m8.66-13.66-.7.7M4.04 19.96l-.7.7M21 12h-1M4 12H3m16.66 7.66-.7-.7M4.04 4.04l-.7-.7M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z" },
    { value: "system", label: "Tema del sistema", path: "M4 5h16v10H4zM8 19h8M12 15v4" },
    { value: "dark", label: "Tema oscuro", path: "M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" },
]

const current = ref<Theme>("system")

const apply = (theme: Theme) => {
    const dark = theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches)
    document.documentElement.setAttribute("data-theme", dark ? "dark" : "light")
}

const choose = (theme: Theme) => {
    current.value = theme
    try { localStorage.setItem("theme", theme) } catch { /* modo privado */ }
    apply(theme)
}

onMounted(() => {
    let stored: string | null = null
    try { stored = localStorage.getItem("theme") } catch { /* modo privado */ }
    current.value = stored === "light" || stored === "dark" ? stored : "system"
})
</script>

<template>
    <div class="join rounded-full bg-base-200 p-1 gap-0.5" role="radiogroup" aria-label="Tema">
        <button
            v-for="o in OPTIONS"
            :key="o.value"
            type="button"
            role="radio"
            :aria-checked="current === o.value"
            :aria-label="o.label"
            :title="o.label"
            class="join-item btn btn-sm btn-circle border-none shadow-none"
            :class="current === o.value ? 'bg-brand text-white' : 'btn-ghost text-base-content/60'"
            @click="choose(o.value)"
        >
            <svg class="size-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24" aria-hidden="true">
                <path :d="o.path" />
            </svg>
        </button>
    </div>
</template>
