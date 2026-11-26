<script setup lang="ts">
/**
 * Cuentas: todas las de Casemuro (también las que no tienen jugador), con su rol, Twitch, Discord
 * y jugador vinculado. Desde la ficha de una cuenta se le cambia el rol (vip, mod, admin o quitar el
 * puesto a mano) y se salta a su jugador.
 *
 * El auth lista como mucho 200 cuentas por búsqueda: con más, hay que buscar por nombre.
 */
import { computed, nextTick, ref } from "vue"
import { UserRole, type IClubMember } from "@trueno-proclub-services/shared"
import { ApiError, authApi, type IAdminUser } from "@/lib/api"
import { relativeTime, roleLabel, subTierLabel } from "@/lib/format"
import { toast } from "@/lib/toast"
import { useAccount } from "@/composables/useAccount"

const props = defineProps<{ users: IAdminUser[]; memberByUserId: Map<string, IClubMember> }>()
const emit = defineEmits<{ openPlayer: [playerId: string] }>()
const { user: me } = useAccount()

const search = ref("")
type Filter = "all" | "linked" | "unlinked" | "staff" | "discord"
const filter = ref<Filter>("all")
const FILTERS: { id: Filter; label: string }[] = [
    { id: "all", label: "Todas" },
    { id: "linked", label: "Con jugador" },
    { id: "unlinked", label: "Sin jugador" },
    { id: "staff", label: "Admin / mod / VIP" },
    { id: "discord", label: "Con Discord" },
]
const STAFF: string[] = [UserRole.admin, UserRole.mod, UserRole.vip]
const matches = (u: IAdminUser, f: Filter) =>
    f === "all" || (f === "linked" ? props.memberByUserId.has(u.id) : f === "unlinked" ? !props.memberByUserId.has(u.id) : f === "staff" ? STAFF.includes(u.role) : !!u.discordId)
const count = (f: Filter) => props.users.filter((u) => matches(u, f)).length
const visible = computed(() => {
    const q = search.value.trim().toLowerCase()
    return props.users.filter((u) => matches(u, filter.value) && (!q || (u.name ?? "").toLowerCase().includes(q) || (u.discordName ?? "").toLowerCase().includes(q)))
})

// ── Ficha de una cuenta ──
const dialog = ref<HTMLDialogElement | null>(null)
const open = ref<IAdminUser | null>(null)
const roleDraft = ref("")
const saving = ref(false)
async function openAccount(u: IAdminUser) {
    open.value = u
    roleDraft.value = STAFF.includes(u.role) ? u.role : UserRole.visitor
    await nextTick()
    dialog.value?.showModal()
}
defineExpose({ openById: (id: string) => { const u = props.users.find((x) => x.id === id); if (u) openAccount(u) } })

/** Los que pone un admin; "visitor" = quitar el puesto a mano (Twitch le pondrá seguidor / sub si toca) */
const ROLE_OPTIONS = [
    { value: UserRole.visitor, label: "Sin rol especial (el de Twitch)" },
    { value: UserRole.vip, label: "VIP" },
    { value: UserRole.mod, label: "Mod" },
    { value: UserRole.admin, label: "Admin" },
]
const currentManual = computed(() => (open.value && STAFF.includes(open.value.role) ? open.value.role : UserRole.visitor))
const isMe = computed(() => !!open.value && open.value.id === me.value?.id)

async function saveRole() {
    const u = open.value
    if (!u) return
    saving.value = true
    try {
        const { role } = await authApi.setUserRole(u.id, roleDraft.value)
        u.role = role
        toast(`${u.name}: ahora es ${roleLabel(role)}`, "success")
    } catch (e) {
        const code = e instanceof ApiError ? e.code : "ERROR"
        toast(code === "CANNOT_DEMOTE_SELF" ? "No puedes quitarte tu propio rol de admin" : `No se ha podido cambiar el rol (${code})`, "error")
    } finally {
        saving.value = false
    }
}

const twitchText = (u: IAdminUser) => (!u.twitchId ? "Sin Twitch" : u.twitchSub ? `Sub ${subTierLabel(u.twitchSubTier) ?? ""}` : u.twitchFollowing ? "Le sigue" : "No le sigue")
const fmtDate = (v?: string | null) => (v ? new Date(v).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" }) : "—")
const ROLE_TONE: Record<string, string> = { admin: "badge-primary", mod: "badge-secondary", vip: "badge-warning", subscriber: "badge-info", follower: "badge-ghost", visitor: "badge-ghost" }
</script>

<template>
    <div>
        <div class="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
            <label class="input input-sm w-full sm:w-72">
                <svg class="size-4 opacity-60" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" /></svg>
                <input v-model="search" type="search" aria-label="Buscar cuenta" placeholder="Buscar por nombre o Discord" />
            </label>
            <div class="flex flex-wrap gap-1.5" role="group" aria-label="Filtrar cuentas">
                <button v-for="f in FILTERS" :key="f.id" type="button" :aria-pressed="filter === f.id" class="btn btn-sm rounded-full"
                    :class="filter === f.id ? 'btn-neutral' : 'btn-ghost'" @click="filter = f.id">
                    {{ f.label }} <span class="text-xs opacity-70 tabular-nums">{{ count(f.id) }}</span>
                </button>
            </div>
        </div>
        <p v-if="users.length >= 200" class="text-xs text-warning mb-3">Se ven las 200 primeras por orden alfabético: busca por nombre para encontrar el resto.</p>

        <ul v-if="visible.length" class="rounded-box bg-base-200 divide-y divide-base-content/10 overflow-hidden">
            <li v-for="u in visible" :key="u.id">
                <button type="button" class="w-full text-left flex items-center gap-3 px-4 py-3 transition-colors hover:bg-base-content/5 focus-visible:bg-base-content/5" @click="openAccount(u)">
                    <span class="avatar shrink-0"><span class="w-9 rounded-full bg-base-300"><img v-if="u.image" :src="u.image" alt="" loading="lazy" /></span></span>
                    <span class="min-w-0 flex-1">
                        <span class="font-bold truncate block">{{ u.name }}</span>
                        <span class="text-xs text-base-content/70 flex flex-wrap items-center gap-x-2">
                            <span class="badge badge-xs" :class="ROLE_TONE[u.role] ?? 'badge-ghost'">{{ roleLabel(u.role) }}</span>
                            <span>{{ twitchText(u) }}</span>
                            <span v-if="u.discordName">· Discord: {{ u.discordName }}</span>
                        </span>
                    </span>
                    <span class="hidden sm:block text-sm truncate w-44 shrink-0" :class="memberByUserId.get(u.id) ? '' : 'text-base-content/60'">
                        {{ memberByUserId.get(u.id)?.playerName ?? "Sin jugador" }}
                    </span>
                    <svg class="size-4 text-base-content/60 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="m9 5 7 7-7 7" /></svg>
                </button>
            </li>
        </ul>
        <p v-else class="rounded-box bg-base-200 p-10 text-center text-base-content/75">Ninguna cuenta coincide.</p>

        <dialog ref="dialog" class="modal modal-bottom sm:modal-middle" closedby="any" aria-labelledby="account-title">
            <div v-if="open" class="modal-box text-left">
                <header class="flex items-center gap-3">
                    <span class="avatar"><span class="w-14 rounded-full bg-base-300"><img v-if="open.image" :src="open.image" alt="" /></span></span>
                    <div class="min-w-0">
                        <h3 id="account-title" class="font-black text-xl truncate">{{ open.name }}</h3>
                        <p class="text-xs text-base-content/60 font-mono select-all">{{ open.id }}</p>
                    </div>
                </header>

                <dl class="grid grid-cols-2 gap-x-4 gap-y-3 text-sm mt-5">
                    <div><dt class="text-xs text-base-content/60">Rol ahora</dt><dd class="font-bold">{{ roleLabel(open.role) }}</dd></div>
                    <div><dt class="text-xs text-base-content/60">Alta</dt><dd class="font-bold">{{ fmtDate(open.createdAt) }}</dd></div>
                    <div>
                        <dt class="text-xs text-base-content/60">Twitch</dt>
                        <dd class="font-bold">{{ twitchText(open) }}
                            <span v-if="open.twitchNeedsReauth" class="badge badge-xs badge-warning ml-1" title="El permiso caducó: follow y sub pueden estar desfasados">Reautorizar</span>
                        </dd>
                        <dd v-if="open.twitchSyncedAt" class="text-xs text-base-content/60">Comprobado {{ relativeTime(open.twitchSyncedAt) }}</dd>
                    </div>
                    <div><dt class="text-xs text-base-content/60">Discord</dt><dd class="font-bold truncate">{{ open.discordName ?? (open.discordId ? "Vinculado" : "Sin Discord") }}</dd></div>
                    <div class="col-span-2">
                        <dt class="text-xs text-base-content/60">Jugador</dt>
                        <dd v-if="memberByUserId.get(open.id)" class="flex items-center gap-2">
                            <b>{{ memberByUserId.get(open.id)!.playerName }}</b>
                            <button type="button" class="btn btn-xs btn-ghost" @click="dialog?.close(); emit('openPlayer', memberByUserId.get(open.id)!.playerId)">Ver jugador →</button>
                        </dd>
                        <dd v-else class="font-bold text-base-content/60">Sin jugador vinculado</dd>
                    </div>
                </dl>

                <div class="mt-6">
                    <label class="text-xs font-black uppercase tracking-wider text-base-content/75" for="role-select">Rol puesto a mano</label>
                    <div class="flex gap-2 mt-2">
                        <select id="role-select" v-model="roleDraft" class="select select-sm flex-1" :disabled="saving">
                            <option v-for="o in ROLE_OPTIONS" :key="o.value" :value="o.value" :disabled="isMe && o.value !== 'admin'">{{ o.label }}</option>
                        </select>
                        <button type="button" class="btn btn-sm btn-primary" :disabled="saving || roleDraft === currentManual" @click="saveRole">
                            <span v-if="saving" class="loading loading-spinner loading-xs"></span>Guardar
                        </button>
                    </div>
                    <p class="text-xs text-base-content/70 mt-2">
                        Seguidor y suscriptor los pone la sincronización con Twitch; VIP, mod y admin no los toca. El cambio se nota en su próxima sesión (unos minutos).
                        <template v-if="isMe"> No puedes quitarte tu propio rol de admin.</template>
                    </p>
                </div>

                <div class="modal-action">
                    <form method="dialog"><button class="btn btn-ghost">Cerrar</button></form>
                </div>
            </div>
            <form method="dialog" class="modal-backdrop"><button tabindex="-1">Cerrar</button></form>
        </dialog>
    </div>
</template>
