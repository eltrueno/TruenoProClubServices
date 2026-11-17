<script setup lang="ts">
/**
 * "Mis logros": los puntos de la cuenta (los de sus logros de cuenta más los de su jugador en
 * cada club) y los logros de cuenta, que son comunes a todos los clubes. Los de cada club se
 * ven en la ficha del jugador en la web de ese club.
 */
import { computed, onMounted, ref } from "vue"
import {
    ACHIEVEMENT_CATEGORY_LABELS, ACHIEVEMENT_RARITY_LABELS,
    type AchievementCategory, type AchievementRarity, type IAchievementDefinition
} from "@trueno-proclub-services/shared"
import { CLUBS, type ClubLink } from "@/config/site"
import { clubApi, type IMyAchievements } from "@/lib/api"

const loading = ref(true)
const failed = ref(false)
const mine = ref<IMyAchievements | null>(null)
/** id de EA de cada club (lo dice su api), para saber de qué club son los puntos */
const clubById = ref(new Map<number, ClubLink>())
const definitions = ref<IAchievementDefinition[]>([])
const showAll = ref(false)

const ACCOUNT_CATEGORIES: AchievementCategory[] = ["account", "global", "collection"]
const RARITY_TEXT: Record<AchievementRarity, string> = {
    common: "text-base-content/75",
    rare: "text-sky-600 dark:text-sky-300",
    epic: "text-violet-600 dark:text-violet-300",
    legendary: "text-amber-600 dark:text-amber-300",
}
const RARITY_ICON: Record<AchievementRarity, string> = {
    common: "bg-base-300 text-base-content",
    rare: "bg-sky-500/20 text-sky-600 dark:text-sky-300",
    epic: "bg-violet-500/20 text-violet-600 dark:text-violet-300",
    legendary: "bg-amber-500/25 text-amber-600 dark:text-amber-300",
}

onMounted(async () => {
    // La base es común: vale lo que responda el api de cualquier club. Se pregunta a todos
    // para saber además el id de cada uno (los puntos de club vienen por id de EA)
    const answers = await Promise.allSettled(CLUBS.map(async (club) => {
        const api = clubApi(club)
        const [achievements, defs] = await Promise.all([api.myAchievements(), api.accountAchievementDefinitions()])
        return { club, achievements, defs }
    }))
    for (const answer of answers) {
        if (answer.status === "rejected") {
            console.warn("[cuenta] Logros: un api no responde", answer.reason)
            continue
        }
        const { club, achievements, defs } = answer.value
        if (achievements.clubId) clubById.value.set(achievements.clubId, club)
        if (!mine.value) {
            mine.value = achievements
            definitions.value = defs
        }
    }
    failed.value = !mine.value
    loading.value = false
})

const items = computed(() => {
    const unlocks = mine.value?.achievements ?? []
    return definitions.value.map(({ _id, ...def }) => {
        const got = unlocks.filter((u) => u.achievementId === _id)
        return {
            id: _id, def,
            unlocked: got.length > 0,
            secret: !!def.hidden && got.length === 0,
            times: got.length,
            reached: got.reduce<number | undefined>((max, u) => (u.reached && u.reached > (max ?? 0) ? u.reached : max), undefined),
        }
    })
})

const groups = computed(() =>
    ACCOUNT_CATEGORIES.map((key) => {
        const all = items.value.filter((i) => i.def.category === key)
            .sort((a, b) => Number(b.unlocked) - Number(a.unlocked) || b.def.points - a.def.points)
        return { key, label: ACHIEVEMENT_CATEGORY_LABELS[key], unlocked: all.filter((i) => i.unlocked).length, total: all.length, items: showAll.value ? all : all.filter((i) => i.unlocked) }
    }).filter((g) => g.total > 0)
)

const unlockedCount = computed(() => items.value.filter((i) => i.unlocked).length)
const clubPoints = computed(() =>
    (mine.value?.points.clubs ?? []).map((c) => ({ ...c, club: clubById.value.get(c.clubId) ?? null })))
</script>

<template>
    <section class="rounded-box bg-base-200 shadow-md p-6" aria-labelledby="mis-logros">
        <div class="flex items-center justify-between gap-3 mb-5">
            <h2 id="mis-logros" class="text-xs font-black text-base-content/75 uppercase tracking-widest">Mis logros</h2>
            <button v-if="!loading && !failed && mine?.playerId" class="btn btn-sm btn-ghost" @click="showAll = !showAll">
                {{ showAll ? "Solo los conseguidos" : "Ver todos" }}
            </button>
        </div>

        <div v-if="loading" class="space-y-3" aria-busy="true">
            <div class="skeleton h-16 w-full"></div>
            <div class="skeleton h-10 w-full"></div>
        </div>

        <p v-else-if="failed" role="alert" class="text-sm text-base-content/75">No se han podido cargar tus logros ahora mismo.</p>

        <template v-else-if="mine">
            <!-- Puntos -->
            <p class="text-base-content/75">
                <span class="text-4xl font-black tabular-nums text-brand">{{ mine.points.total }}</span> puntos
            </p>
            <p v-if="mine.playerId" class="text-xs text-base-content/75 mt-1">
                {{ mine.points.account }} de logros de cuenta<template v-for="c in clubPoints" :key="c.clubId"> · {{ c.points }} en {{ c.club?.name ?? "otro club" }}</template>
            </p>

            <p v-if="!mine.playerId" class="text-sm text-base-content/75 mt-4">
                Los logros de cuenta son para quien tiene su cuenta vinculada a su jugador. Pide la vinculación en
                <a href="#mi-jugador" class="link">Mi jugador</a> y, cuando un admin la apruebe, recibirás de golpe todos los que ya te correspondan.
            </p>
            <p v-else-if="unlockedCount === 0 && !showAll" class="text-sm text-base-content/75 mt-4">
                Todavía no tienes logros de cuenta. Si te acabas de vincular, aparecen en unos minutos.
            </p>

            <!-- Logros de cuenta por apartados -->
            <div v-for="g in groups" v-show="g.items.length" :key="g.key" class="mt-5">
                <div class="flex items-baseline justify-between gap-2 mb-2">
                    <h3 class="text-sm font-black uppercase tracking-wide">{{ g.label }}</h3>
                    <span class="text-xs font-bold text-base-content/75 tabular-nums">{{ g.unlocked }} / {{ g.total }}</span>
                </div>
                <ul class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <li v-for="i in g.items" :key="i.id" class="rounded-xl bg-base-100 p-3 flex gap-3 items-start" :class="{ 'opacity-50': !i.unlocked }">
                        <div class="size-9 shrink-0 rounded-lg grid place-items-center font-black text-xs tabular-nums"
                            :class="i.unlocked ? RARITY_ICON[i.def.rarity] : 'bg-base-300 text-base-content/60'">{{ i.secret ? "?" : i.def.points }}</div>
                        <div class="min-w-0">
                            <p class="font-bold text-sm leading-tight">
                                {{ i.secret ? "Logro oculto" : i.def.name }}
                                <span v-if="i.times > 1" class="badge badge-xs badge-neutral align-middle">×{{ i.times }}</span>
                            </p>
                            <p class="text-xs text-base-content/75 mt-0.5">{{ i.secret ? "Se desvela al conseguirlo" : i.def.description }}</p>
                            <p class="text-xs font-semibold mt-0.5" :class="i.unlocked ? RARITY_TEXT[i.def.rarity] : 'text-base-content/60'">
                                {{ ACHIEVEMENT_RARITY_LABELS[i.def.rarity] }}<template v-if="i.reached"> · último hito: {{ i.reached }}</template><template v-if="!i.unlocked"> · sin conseguir</template>
                            </p>
                        </div>
                    </li>
                </ul>
            </div>

            <p v-if="mine.playerId" class="text-xs text-base-content/75 mt-5">
                Los logros de cada club se ven en la ficha de tu jugador, en la web de ese club.
            </p>
        </template>
    </section>
</template>
