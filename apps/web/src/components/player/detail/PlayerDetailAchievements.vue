<template>
    <div class="flex flex-col gap-8 mt-1 text-left">
        <!-- ═══ RESUMEN ═══ -->
        <div class="card bg-base-200 shadow-md">
            <div class="card-body p-6">
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <h2 class="card-title text-xl font-black uppercase border-l-4 border-primary pl-4">Logros</h2>
                    <div class="flex flex-wrap items-center gap-2 self-start sm:self-auto">
                        <!-- Solo admins: ver también los ocultos que no tienen -->
                        <label v-if="isAdmin && hasHidden" class="flex items-center gap-2 text-sm font-semibold cursor-pointer">
                            <input v-model="revealAll" type="checkbox" class="toggle toggle-sm toggle-primary" />
                            Ver ocultos
                        </label>
                        <OptionToggle :model-value="onlyUnlocked ? 'unlocked' : 'all'" :options="SHOW_OPTIONS" size="sm" label="Qué logros enseñar"
                            @update:model-value="(v) => (onlyUnlocked = v === 'unlocked')" />
                    </div>
                </div>

                <div class="flex flex-wrap items-end gap-x-10 gap-y-3 mt-3">
                    <p>
                        <span class="text-5xl font-black tabular-nums text-primary">{{ clubPoints }}</span>
                        <span class="block text-xs font-bold uppercase tracking-wide text-base-content/75">puntos en este club</span>
                    </p>
                    <p>
                        <span class="text-4xl font-black tabular-nums">{{ clubUnlockedCount }}</span>
                        <span v-if="clubDefinitions.length" class="text-xl font-black text-base-content/60 tabular-nums"> / {{ clubDefinitions.length }}</span>
                        <span class="block text-xs font-bold uppercase tracking-wide text-base-content/75">logros</span>
                    </p>
                    <p v-if="profile.account">
                        <span class="text-4xl font-black tabular-nums">{{ profile.account.points.total }}</span>
                        <span class="block text-xs font-bold uppercase tracking-wide text-base-content/75">puntos en total</span>
                    </p>
                </div>

                <!-- Filtro por rareza (con lo conseguido de cada una) -->
                <div class="flex flex-wrap gap-2 mt-3">
                    <button v-for="r in ACHIEVEMENT_RARITIES" :key="r" type="button"
                        class="badge badge-md font-bold gap-1 cursor-pointer border"
                        :class="[RARITY_STYLE[r].badge, rarityFilter && rarityFilter !== r ? 'opacity-40' : '']"
                        :aria-pressed="rarityFilter === r"
                        @click="rarityFilter = rarityFilter === r ? null : r">
                        {{ ACHIEVEMENT_RARITY_LABELS[r] }} · {{ rarityCount[r].unlocked }}/{{ rarityCount[r].total }}
                    </button>
                </div>
            </div>
        </div>

        <div v-if="loadError" role="alert" class="alert alert-warning alert-soft text-sm">
            No se ha podido cargar la lista completa de logros; se enseñan solo los conseguidos.
        </div>

        <!-- ═══ APARTADOS ═══ -->
        <!-- content-visibility: los apartados fuera de pantalla no se pintan (ni se animan sus halos) hasta acercarse -->
        <div v-for="group in groups" :key="group.key" class="achievement-group card bg-base-200 shadow-md">
            <div class="card-body p-6">
                <div class="flex items-baseline justify-between gap-3 mb-3">
                    <h3 class="text-lg font-black uppercase border-l-4 pl-3" :class="'border-primary'">
                        {{ group.label }}
                        <span v-if="group.account" class="badge badge-xs badge-primary align-middle ml-1">Cuenta</span>
                    </h3>
                    <span class="text-xs font-bold text-base-content/50 tabular-nums">{{ group.unlocked }} / {{ group.items.length }}</span>
                </div>

                <ul class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                    <li v-for="item in group.visible" :key="item.id" class="flex">
                        <AchievementTile class="w-full" :item="item" :match-href="item.matchId ? matchUrl(item.matchId) : undefined" />
                    </li>
                </ul>
                <EmptyState v-if="group.visible.length === 0" compact icon="trophy" title="Todavía ninguno en este apartado" text="Cuando caiga el primero, aparecerá aquí." />
            </div>
        </div>

        <p v-if="!profile.account" class="text-sm text-base-content/50 text-center px-4">
            Los logros de cuenta (entre clubes, Twitch, Discord…) son solo para jugadores con la cuenta vinculada.
            <a :href="accountsUrl('mi-jugador')" class="link">Vincula la tuya</a>.
        </p>
    </div>
</template>

<script setup lang="ts">
/**
 * Pestaña "Logros" de la ficha del jugador: los de club (de este club) y, si el jugador
 * tiene cuenta vinculada, los de cuenta (comunes a todos los clubes), por apartados.
 * Los que faltan se enseñan apagados; los hitos que se repiten, con las veces conseguidas.
 */
import { computed, onMounted, ref, watch } from "vue"
import { useAuth } from "@/composables/useAuth"
import {
    ACHIEVEMENT_CATEGORIES, ACHIEVEMENT_CATEGORY_LABELS, ACHIEVEMENT_RARITIES, ACHIEVEMENT_RARITY_LABELS,
    achievementOwnershipLabel,
    type AchievementRarity, type IAchievementDefinitionWithStats, type IAchievementProgressValue
} from "@trueno-proclub-services/shared"
import type PlayerProfileEntity from "@/model/PlayerProfileEntity"
import { tpcsApi } from "@/lib/api"
import { accountsUrl } from "@/lib/accounts"
import AchievementTile from "@/components/achievements/AchievementTile.vue"
import OptionToggle, { type ToggleOption } from "@/components/ui/OptionToggle.vue"
import { KPI_ICONS } from "@/lib/kpiIcons"
import EmptyState from "@/components/ui/EmptyState.vue"

const props = defineProps<{ profile: PlayerProfileEntity }>()

type Definition = Omit<IAchievementDefinitionWithStats, "_id" | "unlockedCount" | "unlockedPercent"> & Partial<Pick<IAchievementDefinitionWithStats, "unlockedCount" | "unlockedPercent">>
interface Item {
    id: string
    def: Definition
    unlocked: boolean
    /** oculto y sin conseguir: se ve que existe, pero no qué es */
    secret: boolean
    /** veces conseguido (los hitos que se repiten) */
    times: number
    reached?: number
    unlockedAt?: Date | string
    /** partido en que se consiguió (el último, en los hitos); no lo tienen los de cuenta */
    matchId?: string
    /** cuánto le falta (o al siguiente escalón de un hito) */
    progress?: IAchievementProgressValue
    /** "Lo tiene el 12 % (3 jugadores)" */
    ownership?: string
}

const RARITY_STYLE: Record<AchievementRarity, { card: string, icon: string, text: string, badge: string }> = {
    common: { card: "border-base-content/15 bg-base-100", icon: "bg-base-300 text-base-content", text: "text-base-content/60", badge: "badge-ghost border-base-content/20" },
    rare: { card: "border-sky-500/40 bg-sky-500/5", icon: "bg-sky-500/20 text-sky-700 dark:text-sky-300", text: "text-sky-700 dark:text-sky-300", badge: "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30" },
    epic: { card: "border-violet-500/40 bg-violet-500/5", icon: "bg-violet-500/20 text-violet-700 dark:text-violet-300", text: "text-violet-700 dark:text-violet-300", badge: "bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-500/30" },
    legendary: { card: "border-amber-500/50 bg-amber-500/10", icon: "bg-amber-500/25 text-amber-800 dark:text-amber-300", text: "text-amber-800 dark:text-amber-300", badge: "bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30" },
}

/** Orden dentro de cada apartado: conseguidos primero y, dentro, los más especiales */
const RARITY_RANK: Record<string, number> = { legendary: 3, epic: 2, rare: 1, common: 0 }
const onlyUnlocked = ref(false)
/** Todos / solo los conseguidos (con el icono de la insignia con check) */
const SHOW_OPTIONS: ToggleOption<"all" | "unlocked">[] = [
    { value: "all", label: "Todos" },
    { value: "unlocked", label: "Conseguidos", svg: KPI_ICONS.games },
]
const rarityFilter = ref<AchievementRarity | null>(null)
const matchUrl = (matchId: string) => `/partido?id=${encodeURIComponent(matchId)}&player=${encodeURIComponent(props.profile.member.playerId)}`
const clubDefinitions = ref<IAchievementDefinitionWithStats[]>([])
const accountDefinitions = ref<IAchievementDefinitionWithStats[]>([])
const loadError = ref(false)

onMounted(async () => {
    try {
        const [club, account] = await Promise.all([tpcsApi.achievements.getDefinitions(), tpcsApi.achievements.getAccountDefinitions()])
        clubDefinitions.value = club
        accountDefinitions.value = account
    } catch (e) {
        console.error("[logros]", e)
        loadError.value = true
    }
})

/*
 * Logros ocultos: solo se desvelan a quien también los tiene. En el perfil de otro, uno oculto
 * que él tiene y tú no sale como "Logro oculto" (conseguido, pero sin decir cuál). En el tuyo
 * los ves todos; los admins pueden verlos todos con "Ver ocultos". Es para no destripar: los
 * datos llegan igual del api.
 */
const { isLoggedIn, isAdmin, myMember, loadMyMember } = useAuth()
const revealAll = ref(false)
/** Logros (de club y de cuenta) de quien mira; vacío sin sesión */
const viewerUnlocked = ref<Set<string>>(new Set())
const isOwnProfile = computed(() => !!myMember.value && myMember.value.playerId === props.profile.member.playerId)
const viewerCanSee = (id: string) => revealAll.value || isOwnProfile.value || viewerUnlocked.value.has(id)

async function loadViewer() {
    if (!isLoggedIn.value) { viewerUnlocked.value = new Set(); return }
    await loadMyMember()
    const me = myMember.value
    const [account, club] = await Promise.all([
        tpcsApi.members.getMyAchievements().catch(() => null),
        // Si juega en este club, sus logros de club (los de cuenta valen en cualquier club)
        me && me.playerId !== props.profile.member.playerId ? tpcsApi.members.getProfile(me.playerId).catch(() => null) : null,
    ])
    viewerUnlocked.value = new Set([
        ...(account?.achievements ?? []).map((a) => a.achievementId),
        ...(club?.achievements ?? []).map((a) => a.achievementId),
    ])
}
watch(isLoggedIn, loadViewer, { immediate: true })

type Unlock = { achievementId: string, reached?: number, unlockedAt: Date | string, matchId?: string, definition?: Definition }

/** Definiciones (las de la lista completa, o las que traen los desbloqueos si no ha cargado) + lo conseguido */
function buildItems(definitions: IAchievementDefinitionWithStats[], unlocks: Unlock[], progress: Record<string, IAchievementProgressValue>, noun: { one: string, many: string }): Item[] {
    const defs = new Map<string, Definition>(definitions.map(({ _id, ...def }) => [_id, def]))
    for (const u of unlocks) if (!defs.has(u.achievementId) && u.definition) defs.set(u.achievementId, u.definition)
    // Desbloqueos agrupados por logro de una pasada (antes se filtraba la lista entera por cada logro)
    const byId = new Map<string, Unlock[]>()
    for (const u of unlocks) {
        const list = byId.get(u.achievementId)
        if (list) list.push(u)
        else byId.set(u.achievementId, [u])
    }

    return [...defs.entries()].map(([id, def]) => {
        const mine = byId.get(id) ?? []
        const last = mine.reduce<Unlock | undefined>((best, u) => (!best || new Date(u.unlockedAt) >= new Date(best.unlockedAt) ? u : best), undefined)
        return {
            id, def,
            unlocked: mine.length > 0,
            // Oculto: si no lo tiene, o si lo tiene pero quien mira no (para no destripárselo)
            secret: !!def.hidden && (mine.length === 0 || !viewerCanSee(id)),
            times: mine.length,
            reached: mine.reduce<number | undefined>((max, u) => (u.reached && u.reached > (max ?? 0) ? u.reached : max), undefined),
            unlockedAt: last?.unlockedAt,
            matchId: last?.matchId || undefined,
            progress: progress[id],
            ownership: def.unlockedCount !== undefined ? achievementOwnershipLabel(def.unlockedCount, def.unlockedPercent ?? 0, noun) : undefined,
        }
    })
}

const clubItems = computed(() => buildItems(clubDefinitions.value, props.profile.achievements, props.profile.progress, { one: "jugador", many: "jugadores" }))
const accountItems = computed(() => (props.profile.account ? buildItems(accountDefinitions.value, props.profile.account.achievements, props.profile.account.progress ?? {}, { one: "cuenta", many: "cuentas" }) : []))

const groups = computed(() =>
    ACHIEVEMENT_CATEGORIES.map((key) => {
        const account = ["account", "global", "collection"].includes(key)
        const items = (account ? accountItems.value : clubItems.value)
            .filter((i) => i.def.category === key)
            // Conseguidos primero; dentro, los que más valen
            .sort((a, b) => Number(b.unlocked) - Number(a.unlocked) || Number(a.secret) - Number(b.secret) || RARITY_RANK[b.def.rarity] - RARITY_RANK[a.def.rarity] || b.def.points - a.def.points || a.def.name.localeCompare(b.def.name))
        return {
            key, account, items,
            label: ACHIEVEMENT_CATEGORY_LABELS[key],
            unlocked: items.filter((i) => i.unlocked).length,
            visible: items.filter((i) => (!onlyUnlocked.value || i.unlocked) && (!rarityFilter.value || i.def.rarity === rarityFilter.value)),
        }
    }).filter((g) => g.visible.length > 0)
)

const hasHidden = computed(() => [...clubDefinitions.value, ...accountDefinitions.value].some((d) => d.hidden))
const clubUnlockedCount = computed(() => clubItems.value.filter((i) => i.unlocked).length)
const clubPoints = computed(() => clubItems.value.reduce((sum, i) => sum + i.def.points * i.times, 0))
const rarityCount = computed(() => {
    const all = [...clubItems.value, ...accountItems.value]
    return Object.fromEntries(ACHIEVEMENT_RARITIES.map((r) => {
        const of = all.filter((i) => i.def.rarity === r)
        return [r, { unlocked: of.filter((i) => i.unlocked).length, total: of.length }]
    })) as Record<AchievementRarity, { unlocked: number, total: number }>
})

const dateFormat = new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "short", year: "numeric" })
const formatDate = (value?: Date | string) => (value ? dateFormat.format(new Date(value)) : "")
</script>

<style scoped>
.achievement-group {
    content-visibility: auto;
    contain-intrinsic-size: auto 40rem;
}
</style>
