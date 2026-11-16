<template>
    <div class="flex flex-col gap-8 mt-1 text-left">
        <!-- ═══ RESUMEN ═══ -->
        <div class="card bg-base-200 shadow-md">
            <div class="card-body p-6">
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <h2 class="card-title text-xl font-black uppercase border-l-4 border-primary pl-4">Logros</h2>
                    <div class="join self-start sm:self-auto">
                        <button class="btn btn-sm join-item" :class="onlyUnlocked ? 'btn-ghost' : 'btn-primary'" @click="onlyUnlocked = false">Todos</button>
                        <button class="btn btn-sm join-item" :class="onlyUnlocked ? 'btn-primary' : 'btn-ghost'" @click="onlyUnlocked = true">Conseguidos</button>
                    </div>
                </div>

                <div class="flex flex-wrap items-end gap-x-8 gap-y-2 mt-3">
                    <p>
                        <span class="text-5xl font-black tabular-nums">{{ clubUnlockedCount }}</span>
                        <span v-if="clubDefinitions.length" class="text-2xl font-black text-base-content/40 tabular-nums"> / {{ clubDefinitions.length }}</span>
                        <span class="block text-xs font-bold uppercase tracking-wide text-base-content/50">logros en este club</span>
                    </p>
                    <p>
                        <span class="text-3xl font-black tabular-nums">{{ clubPoints }}</span>
                        <span class="block text-xs font-bold uppercase tracking-wide text-base-content/50">puntos</span>
                    </p>
                </div>
                <p v-if="profile.account" class="text-sm text-base-content/50 mt-1">
                    {{ profile.account.points.total }} puntos sumando todos sus clubes y los logros de cuenta
                </p>

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
        <div v-for="group in groups" :key="group.key" class="card bg-base-200 shadow-md">
            <div class="card-body p-6">
                <div class="flex items-baseline justify-between gap-3 mb-3">
                    <h3 class="text-lg font-black uppercase border-l-4 pl-3" :class="'border-primary'">
                        {{ group.label }}
                        <span v-if="group.account" class="badge badge-xs badge-primary align-middle ml-1">Cuenta</span>
                    </h3>
                    <span class="text-xs font-bold text-base-content/50 tabular-nums">{{ group.unlocked }} / {{ group.items.length }}</span>
                </div>

                <ul class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                    <li
                        v-for="item in group.visible"
                        :key="item.id"
                        class="rounded-xl border p-3 flex gap-3 items-start transition-opacity"
                        :class="[item.unlocked ? RARITY_STYLE[item.def.rarity].card : 'border-base-content/10 bg-base-100/40 opacity-60']"
                    >
                        <div class="size-10 shrink-0 rounded-lg grid place-items-center font-black text-sm tabular-nums"
                            :class="item.unlocked ? RARITY_STYLE[item.def.rarity].icon : 'bg-base-300 text-base-content/40'">
                            {{ item.secret ? "?" : item.def.points }}
                        </div>
                        <div class="min-w-0 flex-1">
                            <p class="font-bold leading-tight">
                                {{ item.secret ? "Logro oculto" : item.def.name }}
                                <span v-if="item.times > 1" class="badge badge-xs badge-neutral align-middle">×{{ item.times }}</span>
                            </p>
                            <p class="text-xs text-base-content/60 mt-0.5">{{ item.secret ? "Se desvela al conseguirlo" : item.def.description }}</p>
                            <p class="text-[11px] mt-1 font-semibold" :class="item.unlocked ? RARITY_STYLE[item.def.rarity].text : 'text-base-content/40'">
                                {{ ACHIEVEMENT_RARITY_LABELS[item.def.rarity] }}
                                <template v-if="item.unlocked">
                                    · <template v-if="item.reached">último hito: {{ item.reached }} · </template>
                                    <a v-if="item.matchId" :href="matchUrl(item.matchId)" class="link link-hover" title="Ver el partido">{{ formatDate(item.unlockedAt) }}</a>
                                    <template v-else>{{ formatDate(item.unlockedAt) }}</template>
                                    <template v-if="item.times > 1"> · {{ item.def.points * item.times }} pts en total</template>
                                </template>
                                <template v-else>· sin conseguir</template>
                            </p>
                        </div>
                    </li>
                </ul>
                <p v-if="group.visible.length === 0" class="text-sm text-base-content/50">Todavía ninguno en este apartado.</p>
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
import { computed, onMounted, ref } from "vue"
import {
    ACHIEVEMENT_CATEGORIES, ACHIEVEMENT_CATEGORY_LABELS, ACHIEVEMENT_RARITIES, ACHIEVEMENT_RARITY_LABELS,
    type AchievementRarity, type IAchievementDefinition
} from "@trueno-proclub-services/shared"
import type PlayerProfileEntity from "@/model/PlayerProfileEntity"
import { tpcsApi } from "@/lib/api"
import { accountsUrl } from "@/lib/accounts"

const props = defineProps<{ profile: PlayerProfileEntity }>()

type Definition = Omit<IAchievementDefinition, "_id">
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
}

const RARITY_STYLE: Record<AchievementRarity, { card: string, icon: string, text: string, badge: string }> = {
    common: { card: "border-base-content/15 bg-base-100", icon: "bg-base-300 text-base-content", text: "text-base-content/60", badge: "badge-ghost border-base-content/20" },
    rare: { card: "border-sky-500/40 bg-sky-500/5", icon: "bg-sky-500/20 text-sky-600 dark:text-sky-300", text: "text-sky-600 dark:text-sky-300", badge: "bg-sky-500/15 text-sky-600 dark:text-sky-300 border-sky-500/30" },
    epic: { card: "border-violet-500/40 bg-violet-500/5", icon: "bg-violet-500/20 text-violet-600 dark:text-violet-300", text: "text-violet-600 dark:text-violet-300", badge: "bg-violet-500/15 text-violet-600 dark:text-violet-300 border-violet-500/30" },
    legendary: { card: "border-amber-500/50 bg-amber-500/10", icon: "bg-amber-500/25 text-amber-600 dark:text-amber-300", text: "text-amber-600 dark:text-amber-300", badge: "bg-amber-500/15 text-amber-600 dark:text-amber-300 border-amber-500/30" },
}

const onlyUnlocked = ref(false)
const rarityFilter = ref<AchievementRarity | null>(null)
const matchUrl = (matchId: string) => `/partido?id=${encodeURIComponent(matchId)}&player=${encodeURIComponent(props.profile.member.playerId)}`
const clubDefinitions = ref<IAchievementDefinition[]>([])
const accountDefinitions = ref<IAchievementDefinition[]>([])
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

type Unlock = { achievementId: string, reached?: number, unlockedAt: Date | string, matchId?: string, definition?: Definition }

/** Definiciones (las de la lista completa, o las que traen los desbloqueos si no ha cargado) + lo conseguido */
function buildItems(definitions: IAchievementDefinition[], unlocks: Unlock[]): Item[] {
    const defs = new Map<string, Definition>(definitions.map(({ _id, ...def }) => [_id, def]))
    for (const u of unlocks) if (!defs.has(u.achievementId) && u.definition) defs.set(u.achievementId, u.definition)

    return [...defs.entries()].map(([id, def]) => {
        const mine = unlocks.filter((u) => u.achievementId === id)
        const last = mine.reduce<Unlock | undefined>((best, u) => (!best || new Date(u.unlockedAt) >= new Date(best.unlockedAt) ? u : best), undefined)
        return {
            id, def,
            unlocked: mine.length > 0,
            secret: !!def.hidden && mine.length === 0,
            times: mine.length,
            reached: mine.reduce<number | undefined>((max, u) => (u.reached && u.reached > (max ?? 0) ? u.reached : max), undefined),
            unlockedAt: last?.unlockedAt,
            matchId: last?.matchId || undefined,
        }
    })
}

const clubItems = computed(() => buildItems(clubDefinitions.value, props.profile.achievements))
const accountItems = computed(() => (props.profile.account ? buildItems(accountDefinitions.value, props.profile.account.achievements) : []))

const groups = computed(() =>
    ACHIEVEMENT_CATEGORIES.map((key) => {
        const account = ["account", "global", "collection"].includes(key)
        const items = (account ? accountItems.value : clubItems.value)
            .filter((i) => i.def.category === key)
            // Conseguidos primero; dentro, los que más valen
            .sort((a, b) => Number(b.unlocked) - Number(a.unlocked) || Number(a.secret) - Number(b.secret) || b.def.points - a.def.points || a.def.name.localeCompare(b.def.name))
        return {
            key, account, items,
            label: ACHIEVEMENT_CATEGORY_LABELS[key],
            unlocked: items.filter((i) => i.unlocked).length,
            visible: items.filter((i) => (!onlyUnlocked.value || i.unlocked) && (!rarityFilter.value || i.def.rarity === rarityFilter.value)),
        }
    }).filter((g) => g.visible.length > 0)
)

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
