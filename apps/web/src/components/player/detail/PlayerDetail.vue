<template>
    <div class="w-full min-h-screen pb-2 rounded-xl" v-if="!isloading && !hasError && playerProfile">
        <!-- Breadcrumbs -->
        <div class="breadcrumbs text-sm ">
            <ul>
                <li><a href="/" class="">Inicio</a></li>
                <li><a href="/plantilla" class="">Plantilla</a></li>
                <li>{{ playerProfile.member.playerName }}</li>
            </ul>
        </div>
        <!-- Hero Section -->
        <section class="relative bg-base-200 rounded-2xl shadow-md">
            <!-- Jugador sin cuenta vinculada: invitación discreta a vincularla, solo a quien aún no tiene
                 jugador (o no ha entrado). Arriba a la derecha y en absoluto: no mueve nada al aparecer -->
            <a v-if="showClaimHint" :href="claimHref"
                class="claim-hint absolute top-3 right-3 z-10 hidden sm:inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold bg-base-100/70 text-base-content/70 ring-1 ring-base-content/10 hover:text-primary hover:ring-primary/50 hover:bg-primary/10 transition-colors">
                <LinkIcon class="size-3.5" />
                ¿Eres {{ playerProfile.member.playerName }}? Vincula tu cuenta
            </a>
            <div class=" mx-auto px-4 py-6 lg:py-10">
                <div class="flex flex-row items-end gap-4 lg:gap-8">
                    <!-- Avatar/Player Photo -->
                    <div :style="`view-transition-name: player-photo-${playerProfile.member.playerId}`" class="relative shrink-0 w-24 lg:w-40 aspect-8/9 dark:bg-base-100 bg-base-300 rounded-2xl lg:rounded-3xl overflow-hidden shadow-sm">
                        <img
                            :src="playerImage"
                            :alt="playerProfile.member.playerName"
                            class="w-full h-full object-contain object-top scale-[1.55] origin-top"
                            @error="handleImageError"
                        />
                    </div>

                    <!-- Info -->
                    <div class="flex-1 min-w-0 text-left pb-1">
                        <!-- Cuenta vinculada (Twitch), solo si la hay. El nombre/avatar pueden estar ocultos por privacidad -->
                        <div v-if="linkedUser" class="mb-1.5 inline-flex items-center gap-2 rounded-full bg-base-100/60 pl-1 pr-3 py-1 text-xs lg:text-sm">
                            <div v-if="linkedUser.image" class="avatar">
                                <div class="w-6 rounded-full"><img :src="linkedUser.image" :alt="linkedUser.name ?? 'Usuario Anónimo'" /></div>
                            </div>
                            <LinkIcon v-else class="size-4 ml-1.5 text-primary" />
                            <span class="font-semibold">{{ linkedUser.name ?? "Usuario Anónimo" }}</span>
                        </div>
                        <div class="mb-2 lg:mb-4">
                            <h1 class="text-2xl lg:text-5xl font-black tracking-tighter leading-none break-words">{{ playerProfile.member.playerName }}</h1>
                        </div>

                        <!-- Posiciones: como en PlayerCard, la principal en rojo y el resto en gris. Clic = filtrar por esa posición -->
                        <div class="flex flex-wrap items-center gap-2 mb-2 lg:mb-3">
                            <button v-for="(pos, i) in topPositions" :key="pos.name" type="button"
                                class="badge badge-sm lg:badge-lg uppercase font-bold py-2 lg:py-3 cursor-pointer select-none transition-all rounded-full"
                                :class="[
                                    i === 0 ? 'badge-primary' : 'badge-soft badge-primary',
                                    posFilter === null ? '' : posFilter === Position[pos.name] ? 'ring-2 ring-base-content/70 ring-offset-2 ring-offset-base-200' : 'opacity-40 hover:opacity-70'
                                ]"
                                :aria-pressed="posFilter === Position[pos.name]"
                                :title="posFilter === Position[pos.name] ? 'Quitar el filtro' : `Ver solo sus partidos de ${translatePosition(pos.name).toLowerCase()}`"
                                @click="handlePosFilter(Position[pos.name])">
                                {{ translatePosition(pos.name) }}
                                <span class="ml-1.5 font-semibold italic text-[0.95em] opacity-80">{{ pos.percentage }}%</span>
                            </button>
                            <span v-if="posFilter === null && topPositions.length > 1" class="hidden sm:inline-flex items-center gap-1 text-xs text-base-content/40">
                                <svg class="size-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M3 4.5h18l-7 8.25V19l-4 1.5v-7.75L3 4.5Z" />
                                </svg>
                                Pulsa una para filtrar
                            </span>
                        </div>
                        <p v-if="memberSince || lastSeen" class="text-base-content/60 text-sm lg:text-base">
                            <span v-if="memberSince">Desde {{ memberSince }}</span>
                            <span v-if="memberSince && lastSeen"> · </span>
                            <span v-if="lastSeen" class="text-base-content/80" :title="lastSeen.exact">Jugó {{ lastSeen.relative }}</span>
                        </p>
                        <p v-if="playerProfile.member.nameHistory?.length > 1" class="mt-1 text-xs text-base-content/50">
                            Antes: {{ playerProfile.member.nameHistory.filter(n => n !== playerProfile.member.playerName).join(", ") }}
                        </p>
                    </div>
                </div>

                <!-- Global Filter (+ el de posición, si hay) -->
                <div class="mt-6 flex flex-wrap justify-center items-center gap-3">
                    <OptionToggle v-model="filterMode" :options="MATCH_SCOPE_OPTIONS" size="md" />
                    <button v-if="posFilterLabel" type="button" @click="posFilter = null"
                        class="btn btn-sm rounded-full dark:bg-base-100 bg-base-300 border-base-content/10 font-semibold gap-1.5"
                        aria-label="Quitar el filtro de posición">
                        Filtrando: {{ posFilterLabel }}
                        <svg class="size-3.5 opacity-60" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24" aria-hidden="true">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <!-- KPIs: planos, con un icono relleno cada uno (sin tarjeta), como en la ficha de partido:
                     los tres principales grandes y el resto en una fila más discreta -->
                <div class="grid grid-cols-3 divide-x divide-base-content/10 mt-6 lg:mt-10 reveal-stagger">
                    <div v-for="kpi in mainKpis" :key="kpi.label" class="flex flex-col items-center text-center px-2 py-1">
                        <svg class="size-7 sm:size-9 text-primary mb-1.5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true" v-html="KPI_ICONS[kpi.icon]"></svg>
                        <AnimatedNumber class="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-none" :class="kpi.class"
                            :value="kpi.value" :decimals="kpi.decimals ?? 0" :suffix="kpi.suffix ?? ''" />
                        <span class="mt-1.5 text-base-content/60 uppercase text-[0.65rem] sm:text-xs font-black tracking-widest">{{ kpi.label }}</span>
                        <!-- Victorias / empates / derrotas -->
                        <div v-if="kpi.record" class="flex w-full max-w-36 h-1.5 rounded-full overflow-hidden bg-base-content/10 mt-1.5" aria-hidden="true">
                            <div class="bg-success" :style="{ flexGrow: kpi.record.wins }"></div>
                            <div class="bg-base-content/30" :style="{ flexGrow: kpi.record.ties }"></div>
                            <div class="bg-error" :style="{ flexGrow: kpi.record.losses }"></div>
                        </div>
                        <span v-if="kpi.sub" class="text-[0.65rem] sm:text-xs text-base-content/45 font-medium mt-1 tabular-nums">{{ kpi.sub }}</span>
                    </div>
                </div>
                <div class="grid grid-cols-2 sm:grid-cols-4 gap-y-4 mt-6 pt-5 border-t border-base-content/10 reveal-stagger">
                    <div v-for="kpi in secondaryKpis" :key="kpi.label" class="flex items-center gap-2.5 px-2 min-w-0">
                        <MvpIcon v-if="kpi.icon === 'mvp'" class="size-6" />
                        <span v-else-if="kpi.icon === 'red'" class="w-4 h-6 shrink-0 rounded-[3px] bg-error mx-1" aria-hidden="true"></span>
                        <svg v-else class="size-6 shrink-0 text-base-content/45" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true" v-html="KPI_ICONS[kpi.icon]"></svg>
                        <span class="min-w-0 leading-tight">
                            <span class="block text-base-content/50 uppercase text-[0.6rem] sm:text-[0.65rem] font-black tracking-widest">{{ kpi.label }}</span>
                            <AnimatedNumber class="block text-lg sm:text-xl font-black" :value="kpi.value" />
                            <span v-if="kpi.sub" class="block text-[0.65rem] text-base-content/45 font-medium tabular-nums">{{ kpi.sub }}</span>
                        </span>
                    </div>
                </div>
            </div>
        </section>

        <!-- Tab Navigation + Content (integrated block) -->
        <section class="mx-auto px-1 pt-8">
            <!-- Al bajar, la barra de pestañas se queda arriba (bajo el menú) con el jugador en pequeño -->
            <div ref="tabSentinel" class="h-px -mb-px" aria-hidden="true"></div>
            <!-- Mismo esquema que la barra de controles de la plantilla: la barra (--tabs-bg) un tono más marcado que
                 el bloque de debajo (.tab-body, base-200 al 50 % sobre el fondo de la página).
                 Sin pegar: opaca, la cabecera del bloque. Pegada (compacta): casi opaca (88 %) con desenfoque,
                 esquinas de abajo redondeadas y sombra, como una lámina que se solapa sobre el contenido -->
            <div class="tabs-bar sticky z-40 flex items-center gap-2 p-2 transition-[border-radius,background-color,box-shadow] duration-300
                    [--tabs-bg:color-mix(in_oklab,var(--color-base-200)_94%,var(--color-base-content))]
                    dark:[--tabs-bg:color-mix(in_oklab,var(--color-base-200)_92%,var(--color-base-content))]"
                :class="tabsStuck
                    ? 'rounded-b-2xl bg-[color-mix(in_oklab,var(--tabs-bg)_88%,transparent)] backdrop-blur-md shadow-lg shadow-black/25'
                    : 'rounded-t-3xl bg-(--tabs-bg)'">
                <!-- Jugador (solo pegada) -->
                <button v-if="tabsStuck" type="button" @click="scrollToTop"
                    class="hidden sm:flex items-center gap-2 min-w-0 shrink pl-1 pr-2 text-left cursor-pointer rounded-xl hover:bg-base-content/5"
                    title="Volver arriba">
                    <span class="size-9 shrink-0 rounded-lg dark:bg-base-100 bg-base-300 overflow-hidden">
                        <img :src="playerImage" alt="" class="w-full h-full object-contain object-top scale-[1.55] origin-top" @error="handleImageError" />
                    </span>
                    <span class="min-w-0 hidden md:block">
                        <span class="block font-black text-sm leading-tight truncate max-w-40">{{ playerProfile.member.playerName }}</span>
                        <span class="block text-xs text-base-content/50 tabular-nums">{{ stickySummary }}</span>
                    </span>
                </button>

                <div class="flex flex-1 justify-around gap-2">
                    <button v-for="tab in TABS" :key="tab.key" type="button"
                        @click="selectTab(tab.key)"
                        :aria-pressed="activeTab === tab.key"
                        :aria-label="tab.label"
                        class="flex-1 flex items-center justify-center rounded-2xl transition-all duration-300 relative overflow-hidden group border cursor-pointer"
                        :class="[
                            tabsStuck ? 'flex-row gap-2 py-2' : 'flex-col gap-1.5 py-4',
                            activeTab === tab.key
                                ? 'bg-primary text-primary-content shadow-xl z-10 border-primary' + (tabsStuck ? '' : ' scale-[1.02]')
                                : 'bg-base-100 text-base-content/70 shadow-sm border-base-content/10 hover:border-primary/40 hover:text-base-content hover:-translate-y-0.5'
                        ]">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 transition-transform duration-300" :class="activeTab === tab.key ? 'scale-110' : 'group-hover:scale-110 opacity-80'" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="tab.icon" />
                        </svg>
                        <span class="text-xs font-bold hidden lg:block tracking-wide uppercase">{{ tab.label }}</span>
                        <div v-if="activeTab === tab.key && !tabsStuck" class="absolute bottom-1 w-6 h-1 bg-primary-content/30 rounded-full blur-[1px]"></div>
                    </button>
                </div>

                <!-- Filtro (solo pegada y con sitio) -->
                <div v-if="tabsStuck" class="hidden xl:block shrink-0">
                    <OptionToggle v-model="filterMode" :options="MATCH_SCOPE_OPTIONS" size="sm" />
                </div>
            </div>

            <!-- Tab Content (rounded bottom only, no gap) -->
            <!-- Alto mínimo de una pantalla: al cambiar de pestaña con la barra pegada, la página no encoge
                 mientras sale la anterior (si no, el navegador recorta el scroll y la barra se despega) -->
            <div class="tab-body rounded-b-2xl bg-[color-mix(in_oklab,var(--color-base-200)_50%,var(--color-base-100))] dark:bg-[color-mix(in_oklab,var(--color-base-200)_50%,var(--color-base-300))] p-2 overflow-x-clip">
                <!-- La pestaña saliente se va a un lado y la entrante llega del otro -->
                <Transition name="tab-slide" mode="out-in">
                    <PlayerDetailStats
                        v-if="activeTab === 'stats'"
                        key="stats"
                        :profile="playerProfile"
                        :stats="activeStats"
                        :matches="playerMatches"
                        :currentFilter="filterMode"
                        :positionFilter="posFilter"
                    />
                    <PlayerDetailProgression
                        v-else-if="activeTab === 'form'"
                        key="form"
                        :player="playerProfile"
                        :stats="activeStats"
                        :matches="playerMatches"
                        :currentFilter="filterMode"
                        :positionFilter="posFilter"
                    />
                    <PlayerDetailAchievements v-else-if="activeTab === 'achievements'" key="achievements" :profile="playerProfile" />
                    <PlayerDetailWIP v-else key="compare" title="Comparador" icon="⚔️" />
                </Transition>
            </div>
        </section>
    </div>

    <!-- Loading State -->
    <PlayerDetailSkeleton v-else-if="isloading" />

    <!-- Error State -->
    <div class="flex flex-col h-full overflow-hidden" v-else>
        <div class="breadcrumbs text-sm">
            <ul>
                <li><a href="/" class="">Inicio</a></li>
                <li><a href="/plantilla" class="">Jugadores</a></li>
            </ul>
        </div>
        <h3 class="text-center text-2xl p-3">No se ha podido encontrar al jugador</h3>
        <div class="flex place-content-center p-6">
            <img src="/illustrations/bugfixingsvg.svg" class="lg:w-2/3 w-full select-none pointer-events-none" alt="Image representing error">
        </div>
    </div>
</template>

<script setup lang="ts">
    import MvpIcon from "@/components/ui/MvpIcon.vue"
    import { KPI_ICONS, type KpiIcon } from "@/lib/kpiIcons"
    import { ref, computed, onBeforeMount, onMounted, onBeforeUnmount, watch, nextTick, type Ref } from "vue";
    import PlayerProfileService from "@/services/PlayerProfileService";
    import { useMatches } from "@/composables/useMatches";
    import AverageStatsService from "@/services/AverageStatsService.ts";
    import PlayerStatsEntity from "@/model/PlayerStatsEntity";
    import OptionToggle from "@/components/ui/OptionToggle.vue";
    import AnimatedNumber from "@/components/ui/AnimatedNumber.vue";
    import LinkIcon from "@/icons/link.svg?component";
    import { useAuth } from "@/composables/useAuth";
    import { accountsUrl } from "@/lib/accounts";
    import { MATCH_SCOPE_OPTIONS, type MatchScope } from "@/lib/matchScope";
    import { Position, translatePosition } from "@/i18n/translations";
    import { getQueryParam, setQueryParams } from "@/lib/query";
    import { playerImage as memberImage, onPlayerImageError } from "@/lib/playerImage";
    import { useMembers } from "@/composables/useMembers";
    import { authApi } from "@/lib/api";
    import type { IPublicUser } from "@trueno-proclub-services/shared";

    // Subcomponents
    import PlayerDetailStats from "./PlayerDetailStats.vue";
    import PlayerDetailProgression from "./PlayerDetailProgression.vue";
    import PlayerDetailWIP from "./PlayerDetailWIP.vue";
    import PlayerDetailAchievements from "./PlayerDetailAchievements.vue";
    import PlayerDetailSkeleton from "./PlayerDetailSkeleton.vue";

    // /jugador?id=<playerId>&tab=stats|form|achievements|compare
    const playerId = getQueryParam("id")

    const playerProfileService = new PlayerProfileService(playerId)
    const playerProfile = playerProfileService.getData()

    const playerMatchesResource = useMatches().playerMatches(playerId)
    const playerMatches = playerMatchesResource.data

    const averageStatsService = new AverageStatsService()
    const averageStats = averageStatsService.getData()

    const isloading = playerProfileService.isloading || playerMatchesResource.loading || averageStatsService.isloading as Ref<boolean>
    const hasError = playerProfileService.getHasError() || playerMatchesResource.hasError || averageStatsService.getHasError() as Ref<boolean>
    const errorText = playerProfileService.getError() || playerMatchesResource.error || averageStatsService.getError() as Ref<string>

    // State
    const filterMode = ref<MatchScope>('all')
    
    let defaultTab = 'stats'
    if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search)
        const t = params.get('tab')
        if (t && ['stats', 'form', 'achievements', 'compare'].includes(t)) {
            defaultTab = t
        }
    }
    const activeTab = ref(defaultTab)

    const TABS = [
        { key: 'stats', label: 'Estadísticas', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
        { key: 'form', label: 'Forma', icon: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6' },
        { key: 'achievements', label: 'Logros', icon: 'M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z' },
        { key: 'compare', label: 'Comparador', icon: 'M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4' },
    ] as const

    // ── Barra de pestañas pegada arriba al bajar ──
    const tabSentinel = ref<HTMLElement | null>(null)
    /** true cuando la barra ya está pegada bajo el menú */
    const tabsStuck = ref(false)
    /** Alto del menú de arriba (también sticky): la barra se pega justo debajo */
    let navH = 64
    const measureNav = () => {
        navH = document.querySelector<HTMLElement>('nav.navbar')?.offsetHeight ?? 64
        document.documentElement.style.setProperty('--nav-h', `${navH}px`)
    }
    const smooth = (): ScrollBehavior => (matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth')

    // El marcador está justo encima de la barra: cuando pasa por debajo del menú, la barra está pegada.
    // Con un scroll pasivo (una sola medida) en vez de IntersectionObserver: este no avisa del todo
    // bien con saltos de scroll grandes ni con la página en segundo plano
    const updateStuck = () => {
        const el = tabSentinel.value
        tabsStuck.value = !!el && el.getBoundingClientRect().top < navH - 0.5
    }
    const onResize = () => { measureNav(); updateStuck() }
    watch(tabSentinel, (el) => {
        if (!el) return
        measureNav()
        updateStuck()
    })
    onMounted(() => {
        window.addEventListener('scroll', updateStuck, { passive: true })
        window.addEventListener('resize', onResize, { passive: true })
    })
    onBeforeUnmount(() => {
        window.removeEventListener('scroll', updateStuck)
        window.removeEventListener('resize', onResize)
    })

    /** Con la barra pegada, al cambiar de pestaña se sube al principio de la pestaña */
    function selectTab(key: string) {
        const wasStuck = tabsStuck.value
        activeTab.value = key
        if (!wasStuck || !tabSentinel.value) return
        nextTick(() => {
            // 1px más abajo: así sigue pegada (compacta) y no da el salto a la grande al llegar
            const top = tabSentinel.value!.getBoundingClientRect().top + window.scrollY - navH + 1
            window.scrollTo({ top, behavior: smooth() })
        })
    }
    const scrollToTop = () => window.scrollTo({ top: 0, behavior: smooth() })

    // La pestaña va en la URL. setQueryParams conserva history.state: con replaceState(null) se borraba
    // el estado del ClientRouter de Astro y luego el botón de atrás no hacía nada en esa entrada
    watch(activeTab, (newTab) => setQueryParams({ tab: newTab }))
    const posFilter = ref<Position | null>(null)

    function handlePosFilter(position: Position) {
        if (posFilter.value === position) {
            posFilter.value = null 
        } else {
            posFilter.value = position
        }
    }
    /** Nombre de la posición por la que se filtra (para el chip de "Filtrando") */
    const posFilterLabel = computed(() => {
        if (posFilter.value === null) return ''
        const name = Object.keys(Position).find(k => Position[k as keyof typeof Position] === posFilter.value)
        return name ? translatePosition(name) : ''
    })

    const fetchData = async () => {
        if (!playerId) {
            playerProfileService.status.value = 400
            playerProfileService.isloading.value = false
            return
        }
        await Promise.all([playerProfileService.fetch(), playerMatchesResource.load(), averageStatsService.fetch(), useMembers().load()])
    }

    onBeforeMount(fetchData)

    const playerImage = computed(() => memberImage(playerProfile.value?.member))
    const handleImageError = onPlayerImageError

    // Cuenta vinculada al jugador (nombre / avatar de Twitch), si la hay
    const linkedUser = ref<IPublicUser | null>(null)
    watch(playerProfile, async (p) => {
        linkedUser.value = null
        const userId = p?.member?.userId
        if (!userId) return
        try {
            linkedUser.value = (await authApi.publicUsers([userId]))[0] ?? null
        } catch (e) {
            console.warn("[PlayerDetail] linked user unavailable", e)
        }
    })

    // "¿Eres tú? Vincula tu cuenta": en jugadores sin cuenta, para quien no ha entrado o aún no tiene jugador
    const { isLoggedIn, isPending: authPending, myPlayerId, myMemberLoaded } = useAuth()
    const claimHref = accountsUrl("mi-jugador")
    const showClaimHint = computed(() =>
        !!playerProfile.value && !playerProfile.value.member.userId && !authPending.value &&
        (!isLoggedIn.value || (myMemberLoaded.value && !myPlayerId.value)))

    const filteredStats = computed(() => {
        const { official, friendly } = playerProfile.value.stats

        if (filterMode.value === 'official') return official
        if (filterMode.value === 'friendly') return friendly

        return [...official, ...friendly]
    })

    const activeStats = computed(() => {
        if (!playerProfile.value) return {} as PlayerStatsEntity
        const { official, friendly } = playerProfile.value.stats

        if (filterMode.value === 'official') {
            return PlayerStatsEntity.aggregate(official.filter(stats => posFilter.value === null ||
                    Position[stats.position] === posFilter.value))
        }
        if (filterMode.value === 'friendly') {
            return PlayerStatsEntity.aggregate(friendly.filter(stats => posFilter.value === null ||
                    Position[stats.position] === posFilter.value))
        }

        return PlayerStatsEntity.aggregate(
            [...official, ...friendly].filter(
                stats =>
                    posFilter.value === null ||
                    Position[stats.position] === posFilter.value
            )
        )
    })

    // Alta en el club (createdAt del miembro) y último partido (lastSeenAt en segundos)
    const fmtMonth = (d?: Date | string | number | null) => {
        if (!d) return ""
        const date = typeof d === "number" ? new Date(d * 1000) : new Date(d)
        return isNaN(date.getTime()) ? "" : date.toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" })
    }
    const memberSince = computed(() => fmtMonth(playerProfile.value?.member.createdAt))

    // Último partido como "hace 2 días" (la fecha exacta, en el title)
    const relativeFormat = new Intl.RelativeTimeFormat("es-ES", { numeric: "auto" })
    const lastSeen = computed(() => {
        const seconds = playerProfile.value?.member.lastSeenAt
        if (!seconds) return null
        const days = Math.floor((Date.now() / 1000 - seconds) / 86400)
        const relative = days < 1 ? "hoy"
            : days < 30 ? relativeFormat.format(-days, "day")
            : days < 365 ? relativeFormat.format(-Math.floor(days / 30), "month")
            : relativeFormat.format(-Math.floor(days / 365), "year")
        return { relative, exact: fmtMonth(seconds) }
    })

    const topPositions = computed(() => {
        const stats = filteredStats.value

        if (!stats.length) return []

        const positionMap: Record<string, number> = {}

        for (const stat of stats) {
            positionMap[stat.position] ??= 0
            positionMap[stat.position] += stat.gamesPlayed
        }

        const total = Object.values(positionMap)
            .reduce((a, b) => a + b, 0)

        return Object.entries(positionMap)
            .sort(([, a], [, b]) => b - a)
            .map(([pos, count]) => ({
                name: pos,
                percentage: Math.round((count / total) * 100)
            }))
    })

    // ── KPIs ──
    const number = (n: number, decimals = 0) => n.toLocaleString("es-ES", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
    const perMatch = (n: number) => {
        const played = activeStats.value.gamesPlayed ?? 0
        return played ? `${number(n / played, 1)} / p` : ""
    }
    /** Color de la valoración media: verde si es buena, rojo si es floja */
    const ratingClass = (r: number) => (r >= 8 ? "text-success" : r > 0 && r < 6.5 ? "text-error" : "")

    interface MainKpi {
        label: string
        value: number | string
        decimals?: number
        suffix?: string
        class?: string
        sub?: string
        record?: { wins: number; ties: number; losses: number }
        icon: KpiIcon
    }

    const mainKpis = computed<MainKpi[]>(() => {
        const s = activeStats.value
        const played = s.gamesPlayed ?? 0
        // Sin partidos no hay media ni porcentaje: un guion en vez de un 0
        if (!played) return [{ label: 'Partidos', value: 0, icon: 'games' }, { label: 'Valoración', value: '—', icon: 'rating' }, { label: 'Victorias', value: '—', icon: 'wins' }]
        return [
            { label: 'Partidos', icon: 'games', value: played, sub: `${number(s.minutesPlayed ?? 0)} min` },
            { label: 'Valoración', icon: 'rating', value: s.ratingAve ?? 0, decimals: 1, class: ratingClass(s.ratingAve ?? 0), sub: 'media' },
            {
                label: 'Victorias', icon: 'wins', value: s.winRate ?? 0, suffix: '%',
                record: { wins: s.wins ?? 0, ties: s.ties ?? 0, losses: s.losses ?? 0 },
                sub: `${s.wins ?? 0} V · ${s.ties ?? 0} E · ${s.losses ?? 0} D`,
            },
        ]
    })

    const secondaryKpis = computed(() => {
        const s = activeStats.value
        return [
            { label: 'Goles', icon: 'goals', value: s.goals ?? 0, sub: perMatch(s.goals ?? 0) },
            { label: 'Asistencias', icon: 'assists', value: s.assists ?? 0, sub: perMatch(s.assists ?? 0) },
            { label: 'MVP', value: s.manOfTheMatch ?? 0, icon: 'mvp' },
            { label: 'Rojas', value: s.redCards ?? 0, icon: 'red' },
        ]
    })

    /** "8,6 · 11 partidos" para la barra pegada */
    const stickySummary = computed(() => {
        const s = activeStats.value
        const played = s.gamesPlayed ?? 0
        return played ? `${number(s.ratingAve ?? 0, 1)} · ${played} ${played === 1 ? 'partido' : 'partidos'}` : 'Sin partidos'
    })
</script>

<style scoped>
    .tab-active {
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }
    /* Justo bajo el menú de arriba, que también es sticky (su alto lo pone el script en --nav-h) */
    .tabs-bar {
        top: var(--nav-h, 4rem);
    }
    .tab-body {
        min-height: calc(100svh - var(--nav-h, 4rem));
    }
</style>
