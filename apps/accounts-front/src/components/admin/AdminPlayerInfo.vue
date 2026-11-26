<script setup lang="ts">
/**
 * Lo que se sabe de un jugador, en su ventana del panel admin:
 * - su cuenta vinculada (rol, Twitch, Discord, alta) y cómo se vinculó (solicitudes aprobadas o
 *   rechazadas: quién y cuándo; si se vinculó a mano no queda rastro);
 * - sus logros: de club en cada club donde ha jugado y de cuenta, del más reciente al más antiguo.
 * Se carga al abrir la ventana (la ficha de cada club y el historial de solicitudes).
 */
import { computed, ref, watch } from "vue"
import { ACHIEVEMENT_RARITY_LABELS, type AchievementRarity, type IClubMember, type ILinkRequest, type IPlayerProfile } from "@trueno-proclub-services/shared"
import { clubApi, type IAdminUser } from "@/lib/api"
import type { ClubLink } from "@/config/site"
import { relativeTime, roleLabel, subTierLabel } from "@/lib/format"
import ClubCrest from "./ClubCrest.vue"

const props = defineProps<{
    member: IClubMember
    clubs: ClubLink[]
    /** cuenta vinculada (la guardada, no la del borrador) */
    user?: IAdminUser
    usersById: Map<string, IAdminUser>
}>()
const emit = defineEmits<{ openAccount: [userId: string] }>()

const profiles = ref<{ club: ClubLink; profile: IPlayerProfile }[]>([])
const history = ref<ILinkRequest[]>([])
const loading = ref(false)

async function load() {
    loading.value = true
    const id = props.member.playerId
    const [perClub, hist] = await Promise.all([
        Promise.all(props.clubs.map((c) => clubApi(c).profile(id).then((profile) => ({ club: c, profile }), () => null))),
        props.clubs[0] ? clubApi(props.clubs[0]).admin.linkRequestHistory(id).catch(() => []) : Promise.resolve([]),
    ])
    if (props.member.playerId !== id) return
    profiles.value = perClub.filter((x): x is { club: ClubLink; profile: IPlayerProfile } => !!x)
    history.value = hist
    loading.value = false
}
watch(() => props.member.playerId, load, { immediate: true })

type Row = { key: string; name: string; rarity: AchievementRarity; points: number; at: string; reached?: number; club?: ClubLink; account?: boolean }
const achievements = computed<Row[]>(() => {
    const out: Row[] = []
    for (const { club, profile } of profiles.value) {
        for (const a of profile.achievements) {
            out.push({ key: `${club.id}-${a.achievementId}-${a.reached ?? ""}`, name: a.definition?.name ?? a.achievementId, rarity: (a.definition?.rarity ?? "common") as AchievementRarity, points: a.definition?.points ?? 0, at: String(a.unlockedAt), reached: a.reached, club })
        }
    }
    // Los de cuenta llegan iguales en cada club: con uno basta
    const account = profiles.value.find((p) => p.profile.account)?.profile.account
    for (const a of account?.achievements ?? []) {
        out.push({ key: `acc-${a.achievementId}-${a.reached ?? ""}`, name: a.definition?.name ?? a.achievementId, rarity: (a.definition?.rarity ?? "common") as AchievementRarity, points: a.definition?.points ?? 0, at: String(a.unlockedAt), reached: a.reached, account: true })
    }
    return out.sort((a, b) => +new Date(b.at) - +new Date(a.at))
})
const accountPoints = computed(() => profiles.value.find((p) => p.profile.account)?.profile.account?.points ?? null)
const shown = ref(15)
watch(() => props.member.playerId, () => { shown.value = 15 })

const RARITY_TONE: Record<AchievementRarity, string> = {
    common: "text-base-content/70", rare: "text-sky-600 dark:text-sky-300", epic: "text-violet-600 dark:text-violet-300", legendary: "text-amber-600 dark:text-amber-300",
}
const fmtDate = (v?: string | Date | null) => (v ? new Date(v).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" }) : "—")
const adminName = (id?: string | null) => (id ? props.usersById.get(id)?.name ?? "un admin" : "—")
</script>

<template>
    <div class="flex flex-col gap-6">
        <!-- Cuenta vinculada -->
        <section v-if="user">
            <p class="text-xs font-black uppercase tracking-wider text-base-content/75 mb-2">Su cuenta</p>
            <dl class="grid grid-cols-2 gap-x-4 gap-y-2 text-sm rounded-xl bg-base-200 p-3">
                <div><dt class="text-xs text-base-content/60">Rol</dt><dd class="font-bold">{{ roleLabel(user.role) }}</dd></div>
                <div><dt class="text-xs text-base-content/60">Alta</dt><dd class="font-bold">{{ fmtDate(user.createdAt) }}</dd></div>
                <div>
                    <dt class="text-xs text-base-content/60">Twitch</dt>
                    <dd class="font-bold">
                        {{ user.twitchSub ? `Sub ${subTierLabel(user.twitchSubTier) ?? ""}` : user.twitchFollowing ? "Le sigue" : user.twitchId ? "No le sigue" : "Sin Twitch" }}
                        <span v-if="user.twitchNeedsReauth" class="badge badge-xs badge-warning ml-1" title="El permiso de Twitch caducó: follow y sub pueden estar desfasados">Reautorizar</span>
                    </dd>
                    <dd v-if="user.twitchSyncedAt" class="text-xs text-base-content/60">Comprobado {{ relativeTime(user.twitchSyncedAt) }}</dd>
                </div>
                <div><dt class="text-xs text-base-content/60">Discord</dt><dd class="font-bold truncate">{{ user.discordName ?? (user.discordId ? "Vinculado" : "Sin Discord") }}</dd></div>
                <div v-if="accountPoints" class="col-span-2"><dt class="text-xs text-base-content/60">Puntos de logros</dt><dd class="font-bold tabular-nums">{{ accountPoints.total }} en total · {{ accountPoints.account }} de cuenta</dd></div>
            </dl>
            <button type="button" class="btn btn-xs btn-ghost mt-1.5" @click="emit('openAccount', user.id)">Ver la cuenta →</button>
        </section>

        <!-- Cómo se vinculó -->
        <section>
            <p class="text-xs font-black uppercase tracking-wider text-base-content/75 mb-2">Solicitudes de vinculación</p>
            <p v-if="loading" class="skeleton on-page h-10 w-full"></p>
            <ul v-else-if="history.length" class="flex flex-col gap-1.5 text-sm">
                <li v-for="h in history" :key="h.id" class="flex flex-wrap items-center gap-x-2">
                    <span class="badge badge-xs" :class="h.status === 'approved' ? 'badge-success' : h.status === 'rejected' ? 'badge-error' : 'badge-ghost'">
                        {{ h.status === "approved" ? "Aprobada" : h.status === "rejected" ? "Rechazada" : h.status }}
                    </span>
                    <span><b>{{ h.userName }}</b> la pidió el {{ fmtDate(h.createdAt) }}</span>
                    <span v-if="h.resolvedAt" class="text-base-content/70">· la resolvió {{ adminName(h.resolvedBy) }} el {{ fmtDate(h.resolvedAt) }}</span>
                </li>
            </ul>
            <p v-else class="text-sm text-base-content/70">
                {{ user ? "No hay solicitudes: lo vinculó un admin a mano (de eso no queda registro de quién)." : "Ninguna." }}
            </p>
        </section>

        <!-- Historial de logros -->
        <section>
            <p class="text-xs font-black uppercase tracking-wider text-base-content/75 mb-2">
                Logros <span v-if="!loading" class="font-bold normal-case tracking-normal text-base-content/60">({{ achievements.length }})</span>
            </p>
            <div v-if="loading" class="flex flex-col gap-1.5"><div v-for="n in 4" :key="n" class="skeleton on-page h-7 w-full"></div></div>
            <p v-else-if="!achievements.length" class="text-sm text-base-content/70">Todavía ninguno.</p>
            <template v-else>
                <ol class="flex flex-col divide-y divide-base-content/8 text-sm">
                    <li v-for="a in achievements.slice(0, shown)" :key="a.key" class="flex items-center gap-2 py-1.5">
                        <ClubCrest v-if="a.club" :club="a.club" class="size-4 shrink-0" />
                        <span v-else class="badge badge-xs badge-primary shrink-0">Cuenta</span>
                        <span class="font-bold truncate flex-1 min-w-0">{{ a.name }}<span v-if="a.reached" class="text-base-content/60 font-normal"> · {{ a.reached }}</span></span>
                        <span class="text-xs font-semibold shrink-0" :class="RARITY_TONE[a.rarity]">{{ ACHIEVEMENT_RARITY_LABELS[a.rarity] }}</span>
                        <time class="text-xs text-base-content/60 tabular-nums shrink-0 w-24 text-right" :datetime="a.at">{{ fmtDate(a.at) }}</time>
                    </li>
                </ol>
                <button v-if="achievements.length > shown" type="button" class="btn btn-xs btn-ghost mt-1" @click="shown += 30">Ver más ({{ achievements.length - shown }})</button>
            </template>
        </section>
    </div>
</template>
