<template>
    <div class="flex flex-col gap-8 mt-1">

        <!-- ═══ EVOLUCIÓN (Line Chart) ═══ -->
        <div ref="chartCard" class="reveal card bg-base-200 shadow-md relative">
            <div class="card-body p-4 sm:p-6">
                <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 mb-3 sm:mb-4">
                    <h2 class="card-title text-xl font-black uppercase border-l-4 border-primary pl-4">Evolución</h2>

                    <div class="flex flex-wrap items-center gap-3 w-full sm:w-auto sm:justify-end">
                        <!-- Legend -->
                        <div class="hidden sm:flex items-center gap-4 text-xs text-base-content/60 mr-2">
                            <span class="flex items-center gap-1.5">
                                <span class="w-5 h-0.5 bg-primary rounded-full inline-block"></span>
                                Partido
                            </span>
                            <span class="flex items-center gap-1.5">
                                <span class="w-5 h-0.5 border-t-2 border-dashed border-base-content/40 inline-block"></span>
                                Su media
                            </span>
                        </div>

                        <!-- Metric selector (Mobile Native) -->
                        <select
                            v-model="evolutionMetric"
                            class="select select-sm select-bordered dark:bg-base-100 bg-base-300 font-bold uppercase text-xs tracking-wide rounded-xl md:hidden w-full sm:w-auto"
                        >
                            <option value="rating">Valoración</option>
                            <option value="goals">Goles</option>
                            <option value="assists">Asistencias</option>
                            <option value="goalsPlusAssists">G+A</option>
                            <option value="passes">Pases Intentados</option>
                            <option value="passSuccessRate">% Acierto Pases</option>
                            <option value="tackleSuccessRate">% Acierto Entradas</option>
                            <option value="shotAccuracyPercent">% Acierto Tiros</option>
                            <option v-if="isGK" value="saves">Paradas</option>
                            <option v-if="isGK" value="savesSuccessRate">% Paradas</option>
                        </select>

                        <!-- Metric selector (Desktop DaisyUI Dropdown) -->
                        <details ref="metricDropdown" class="dropdown dropdown-end hidden md:inline-block">
                            <summary class="btn btn-sm btn-bordered dark:bg-base-100 bg-base-300 font-bold uppercase text-xs tracking-wide rounded-xl flex items-center gap-2 cursor-pointer border border-base-content/10 shadow-sm min-w-[150px] justify-between">
                                <span>
                                    {{ 
                                    currentMetricMeta?.label || 'Valoración'
                                    }}
                                </span>
                                <svg class="w-3 h-3 opacity-60" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M19 9l-7 7-7-7" />
                                </svg>
                            </summary>
                            <ul class="p-2 shadow menu dropdown-content z-20 bg-base-100 rounded-xl w-48 mt-1 border border-base-content/5">
                                <li>
                                    <button 
                                        @click="evolutionMetric = 'rating'; metricDropdown?.removeAttribute('open')"
                                        :class="{ 'active bg-primary text-primary-content': evolutionMetric === 'rating' }"
                                        class="font-semibold uppercase text-xs tracking-wide py-2 rounded-lg"
                                    >Valoración</button>
                                </li>
                                <li>
                                    <button 
                                        @click="evolutionMetric = 'goals'; metricDropdown?.removeAttribute('open')"
                                        :class="{ 'active bg-primary text-primary-content': evolutionMetric === 'goals' }"
                                        class="font-semibold uppercase text-xs tracking-wide py-2 rounded-lg"
                                    >Goles</button>
                                </li>
                                <li>
                                    <button 
                                        @click="evolutionMetric = 'assists'; metricDropdown?.removeAttribute('open')"
                                        :class="{ 'active bg-primary text-primary-content': evolutionMetric === 'assists' }"
                                        class="font-semibold uppercase text-xs tracking-wide py-2 rounded-lg"
                                    >Asistencias</button>
                                </li>
                                <li>
                                    <button 
                                        @click="evolutionMetric = 'goalsPlusAssists'; metricDropdown?.removeAttribute('open')"
                                        :class="{ 'active bg-primary text-primary-content': evolutionMetric === 'goalsPlusAssists' }"
                                        class="font-semibold uppercase text-xs tracking-wide py-2 rounded-lg"
                                    >G+A</button>
                                </li>
                                <li>
                                    <button 
                                        @click="evolutionMetric = 'passes'; metricDropdown?.removeAttribute('open')"
                                        :class="{ 'active bg-primary text-primary-content': evolutionMetric === 'passes' }"
                                        class="font-semibold uppercase text-xs tracking-wide py-2 rounded-lg"
                                    >Pases Intentados</button>
                                </li>
                                <li>
                                    <button 
                                        @click="evolutionMetric = 'passSuccessRate'; metricDropdown?.removeAttribute('open')"
                                        :class="{ 'active bg-primary text-primary-content': evolutionMetric === 'passSuccessRate' }"
                                        class="font-semibold uppercase text-xs tracking-wide py-2 rounded-lg"
                                    >% Acierto Pases</button>
                                </li>
                                <li>
                                    <button 
                                        @click="evolutionMetric = 'tackleSuccessRate'; metricDropdown?.removeAttribute('open')"
                                        :class="{ 'active bg-primary text-primary-content': evolutionMetric === 'tackleSuccessRate' }"
                                        class="font-semibold uppercase text-xs tracking-wide py-2 rounded-lg"
                                    >% Acierto Entradas</button>
                                </li>
                                <li>
                                    <button 
                                        @click="evolutionMetric = 'shotAccuracyPercent'; metricDropdown?.removeAttribute('open')"
                                        :class="{ 'active bg-primary text-primary-content': evolutionMetric === 'shotAccuracyPercent' }"
                                        class="font-semibold uppercase text-xs tracking-wide py-2 rounded-lg"
                                    >% Acierto Tiros</button>
                                </li>
                                <li v-if="isGK">
                                    <button 
                                        @click="evolutionMetric = 'saves'; metricDropdown?.removeAttribute('open')"
                                        :class="{ 'active bg-primary text-primary-content': evolutionMetric === 'saves' }"
                                        class="font-semibold uppercase text-xs tracking-wide py-2 rounded-lg"
                                    >Paradas</button>
                                </li>
                                <li v-if="isGK">
                                    <button 
                                        @click="evolutionMetric = 'savesSuccessRate'; metricDropdown?.removeAttribute('open')"
                                        :class="{ 'active bg-primary text-primary-content': evolutionMetric === 'savesSuccessRate' }"
                                        class="font-semibold uppercase text-xs tracking-wide py-2 rounded-lg"
                                    >% Paradas</button>
                                </li>
                            </ul>
                        </details>
                    </div>
                </div>

                <!-- Date Range and Zoom Filter Controls -->
                <div class="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 p-2 sm:p-3 dark:bg-base-100/40 bg-base-300/30 border border-base-content/5 rounded-2xl mb-4 sm:mb-6">
                    <div class="flex flex-wrap items-center gap-3 text-xs w-full md:w-auto">
                        <span class="font-black uppercase tracking-wider text-base-content/50 flex items-center gap-1">
                        Rango de fechas
                        </span>

                        <div class="relative w-full md:w-[260px]">
                            <DateRangePicker :model-value="dateFilter" class="text-xs font-bold" @update:model-value="setDates" />
                        </div>
                    </div>

                    <!-- Atajos (se empieza por los últimos 20) -->
                    <div ref="presetBar" class="join dark:bg-base-100 bg-base-300 p-1 rounded-2xl w-full md:w-auto">
                        <button
                            v-for="preset in EVOLUTION_PRESETS"
                            :key="preset.key"
                            type="button"
                            @click="setPreset(preset.key)"
                            class="btn btn-xs join-item border-none flex-1 md:flex-none px-1.5 sm:px-3 lg:px-5"
                            :class="activePreset === preset.key ? 'btn-primary shadow-sm' : 'btn-ghost'"
                            :aria-pressed="activePreset === preset.key"
                        >
                            {{ preset.label }}
                        </button>
                    </div>
                </div>

                <!-- Ctrl + rueda (o pellizcar el trackpad / la pantalla): zoom; rueda horizontal: mover; con zoom, arrastrar con el ratón: mover -->
                <div ref="mainChartContainer" class="w-full h-[280px] sm:h-[300px] relative touch-pan-y" v-on="zoomPan.listeners">
                    <Line
                        ref="evolutionChart"
                        v-if="evolutionChartData"
                        :data="evolutionChartData"
                        :options="evolutionOptions"
                        :update-mode="chartUpdateMode"
                        @click="handleMainChartClick"
                    />
                    <div v-else-if="evolutionMatches.length" class="h-full grid place-content-center justify-items-center gap-3 text-center">
                        <p class="text-sm font-medium text-base-content/75">No hay partidos suyos entre esas fechas con estos filtros.</p>
                        <button type="button" class="btn btn-sm btn-ghost" @click="showWholeChartAndFocus">Ver todas las fechas</button>
                    </div>

                    <MatchChartTooltip
                        v-if="activeTooltipMatch"
                        :visible="tooltip.visible"
                        :pinned="tooltip.pinned"
                        :x="tooltip.x"
                        :y="tooltip.y"
                        :container="mainChartContainer"
                        :date="activeTooltipMatch.date"
                        :rival="activeTooltipMatch.rival"
                        :position="activeTooltipMatch.position"
                        :result="activeTooltipMatch.result"
                        :man-of-the-match="activeTooltipMatch.manOfTheMatch"
                        :match-id="activeTooltipMatch.matchId"
                        :player-id="playerId"
                        :metric-label="currentMetricMeta.label"
                        :value="activeTooltipMatch.value"
                        :average="activeTooltipMatch.average"
                        :decimals="currentMetricMeta.decimals"
                        :suffix="currentMetricMeta.suffix"
                        @close="closeTooltip"
                        @hover="setHoveringTooltip"
                    />

                </div>

                <!-- Zoom y desplazamiento: barra con todos sus partidos y la ventana de lo que se ve arriba -->
                <ChartRangeNavigator
                    v-if="showNavigator && viewRange"
                    variant="controls"
                    class="mt-3 sm:mt-4"
                    :model-value="viewRange"
                    :count="evolutionMatches.length"
                    :min-size="MIN_VISIBLE_MATCHES"
                    :value-text="navigatorValueText"
                    :unit="{ one: 'partido', many: 'partidos' }"
                    hint="Arrastra la ventana o sus bordes, o usa la rueda sobre ella; Ctrl + rueda sobre la gráfica para acercar"
                    label="Zoom de la gráfica de evolución"
                    start-label="Primer partido de la gráfica"
                    end-label="Último partido de la gráfica"
                    @update:model-value="setViewRange"
                />
            </div>
        </div>

        <!-- ═══ FORMA RECIENTE + MEJORES REGISTROS (Side-by-side on desktop) ═══ -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 reveal-sides">

            <!-- Forma Reciente -->
            <div ref="formCard" class="card bg-base-200 shadow-md relative">
                <div class="card-body p-6 flex flex-col justify-between gap-5">
                    <div>
                        <h2 class="card-title text-xl font-black uppercase border-l-4 border-primary pl-4 mb-6 tracking-widest">
                            Forma Reciente · Últimos {{ recentCount }}
                        </h2>

                        <!-- Recent Form Bar Chart -->
                        <div class="h-[140px] mt-5">
                            <Bar v-if="recentBarData" :data="recentBarData" :options="recentBarOptions" />
                        </div>

                        <div class="grid gap-3 grid-cols-1 reveal-stagger">
                            <!-- Delta de valoración (siempre visible) -->
                            <div class="dark:bg-base-100 bg-base-300 rounded-2xl p-5 flex flex-col justify-center border-l-4"
                                :class="recentDelta >= 0 ? 'border-green-500' : 'border-red-500'">
                                <AnimatedNumber class="text-3xl font-black block" :class="recentDelta >= 0 ? 'text-green-500' : 'text-red-500'"
                                    :value="recentDelta" :decimals="2" :prefix="recentDelta >= 0 ? '+' : ''" />
                                <div class="text-xs text-base-content/50 mt-1 font-medium">vs su media en valoración</div>
                            </div>

                            <!-- Delta de la métrica elegida en "Evolución" -->
                            <div v-if="evolutionMetric !== 'rating'"
                                class="dark:bg-base-100 bg-base-300 rounded-2xl p-5 flex flex-col justify-center border-l-4"
                                :class="selectedMetricDelta >= 0 ? 'border-green-500' : 'border-red-500'">
                                <AnimatedNumber class="text-3xl font-black block" :class="selectedMetricDelta >= 0 ? 'text-green-500' : 'text-red-500'"
                                    :value="selectedMetricDelta" :decimals="currentMetricMeta.decimals" :prefix="selectedMetricDelta >= 0 ? '+' : ''" :suffix="currentMetricMeta.suffix" />
                                <div class="text-xs text-base-content/50 mt-1 font-medium">vs su media en {{ currentMetricMeta.label.toLowerCase() }}</div>
                            </div>
                        </div>
                    </div>

                    <!-- Additional details to fill the vertical space -->
                    <div class="flex flex-col gap-3 pt-4 border-t border-base-content/5">
                        <!-- Form circles -->
                        <div class="flex items-center justify-between">
                            <span class="text-xs font-bold text-base-content/50 uppercase tracking-wider">Racha Reciente</span>
                            <div class="flex gap-1.5">
                                <div v-for="(res, idx) in recentResults" :key="idx"
                                     class="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black text-white shadow-sm transition-transform hover:scale-110"
                                     :class="res.class"
                                     :title="res.tooltip">
                                    {{ res.text }}
                                </div>
                            </div>
                        </div>

                        <!-- Stats summary grid -->
                        <div class="grid grid-cols-3 gap-2 text-center mt-1 reveal-stagger">
                            <div class="bg-base-300/30 dark:bg-base-100/40 border border-base-content/5 rounded-xl p-2">
                                <div class="text-[9px] uppercase font-black text-base-content/40 tracking-wider">Goles</div>
                                <div class="text-sm font-black text-primary mt-0.5">{{ recentStatsSummary.goals }}</div>
                            </div>
                            <div class="bg-base-300/30 dark:bg-base-100/40 border border-base-content/5 rounded-xl p-2">
                                <div class="text-[9px] uppercase font-black text-base-content/40 tracking-wider">Asistencias</div>
                                <div class="text-sm font-black text-primary mt-0.5">{{ recentStatsSummary.assists }}</div>
                            </div>
                            <div class="bg-base-300/30 dark:bg-base-100/40 border border-base-content/5 rounded-xl p-2">
                                <div class="text-[9px] uppercase font-black text-base-content/40 tracking-wider">Minutos</div>
                                <div class="text-sm font-black text-primary mt-0.5">{{ recentStatsSummary.minutes }}'</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Mejores Registros -->
            <div class="card bg-base-200 shadow-md relative">
                <div class="card-body p-6">
                    <h2 class="card-title text-xl font-black uppercase border-l-4 border-primary pl-4 mb-6 tracking-widest">
                        Mejores Registros
                    </h2>

                    <div class="grid grid-cols-2 gap-3 lg:gap-4 reveal-stagger">
                        <div v-for="h in highlightStats" :key="h.label"
                             class="dark:bg-base-100 bg-base-300 border border-base-content/5 rounded-xl p-3 flex flex-col items-center text-center gap-1 group hover:-translate-y-0.5 hover:shadow-md hover:border-primary/25 transition-all duration-300 relative"
                             :class="{ 'cursor-pointer hover:border-primary/40': h.matchId }">
                            <span class="size-9 rounded-full bg-primary/10 text-primary grid place-items-center group-hover:scale-110 transition-transform duration-300 motion-reduce:transition-none">
                                <svg v-if="typeof h.icon === 'string'" class="size-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true" v-html="h.icon"></svg>
                                <component :is="h.icon" v-else class="size-5" />
                            </span>
                            <span class="text-base-content/50 uppercase text-[0.65rem] lg:text-[0.7rem] font-black tracking-widest leading-tight">{{ h.label }}</span>
                            <AnimatedNumber class="text-lg font-black mt-0.5" :value="h.value" :decimals="h.decimals ?? 0" />
                            
                            <span v-if="h.matchId" class="tooltip tooltip-top w-full before:text-[10px]" data-tip="Ir al partido">
                                <a :href="routes.match(h.matchId, playerId)"
                                   class="text-[0.6rem] lg:text-[0.65rem] text-base-content/40 font-medium truncate max-w-full hover:underline hover:text-primary transition-colors after:absolute after:inset-0 after:content-[''] block w-full">
                                    {{ h.sub }}
                                </a>
                            </span>
                            <span v-else-if="h.sub" class="text-[0.6rem] lg:text-[0.65rem] text-base-content/40 font-medium truncate max-w-full" :title="h.sub">
                                {{ h.sub }}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- ═══ PARTIDOS (Table) ═══ -->

        <!-- ═══ PARTIDOS ═══ -->
        <div class="reveal card bg-base-200 shadow-md relative">
            <div class="card-body p-6">
                <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                    <h2 class="card-title text-xl font-black uppercase border-l-4 border-primary pl-4">Partidos</h2>

                    <label class="label cursor-pointer gap-2 text-xs font-bold uppercase tracking-wider text-base-content/60 tooltip tooltip-bottom" data-tip="Partidos en los que jugó menos de 15 minutos y partidos nulos. Nunca cuentan para las stats ni las medias.">
                        <input type="checkbox" class="toggle toggle-primary toggle-sm" v-model="showUnplayed" />
                        <span>Mostrar sin jugar</span>
                    </label>

                    <div class="relative w-full sm:w-64">
                        <svg class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-base-content/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z" />
                        </svg>
                        <input
                            v-model="matchSearch"
                            type="text"
                            placeholder="Buscar rival..."
                            class="input input-sm input-bordered dark:bg-base-100 bg-base-300 w-full pl-9 rounded-xl text-xs font-medium"
                        />
                        <button
                            v-if="matchSearch"
                            @click="matchSearch = ''"
                            class="absolute right-3 top-1/2 -translate-y-1/2 text-base-content/40 hover:text-base-content"
                        >✕</button>
                    </div>
                </div>

                <!-- Filtro de rango de fechas (mismo patrón que el chart de Evolución) -->
                <div class="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 p-3 dark:bg-base-100/40 bg-base-300/30 border border-base-content/5 rounded-2xl mb-4">
                    <div class="flex flex-wrap items-center gap-3 text-xs w-full md:w-auto">
                        <span class="font-black uppercase tracking-wider text-base-content/50 flex items-center gap-1">
                            Rango de fechas
                        </span>
                        <div class="relative w-full md:w-[260px]">
                            <DateRangePicker v-model="tableDateFilter" class="text-xs font-bold" />
                        </div>
                    </div>

                    <div class="join dark:bg-base-100 bg-base-300 p-1 rounded-2xl w-full md:w-auto justify-around md:justify-start">
                        <button
                            v-for="preset in [
                                { val: 'all', label: 'Todo' },
                                { val: 5, label: 'Últ. 5' },
                                { val: 10, label: 'Últ. 10' },
                                { val: 20, label: 'Últ. 20' }
                            ]"
                            :key="preset.val"
                            @click="setTableQuickRange(preset.val as any)"
                            class="btn btn-xs join-item capitalize border-none px-4 lg:px-6"
                            :class="tableActiveQuickRange === preset.val ? 'btn-primary shadow-sm' : 'btn-ghost'"
                        >
                            {{ preset.label }}
                        </button>
                    </div>
                </div>
                

                <div class="flex items-center gap-2 mb-6 flex-wrap">
                    <button
                        @click="matchResultFilter = 'all'"
                        class="text-[11px] font-black uppercase px-3 py-2 rounded-full transition-all"
                        :class="matchResultFilter === 'all' ? 'dark:bg-base-100 bg-base-300 ring-2 ring-primary shadow-sm' : 'dark:bg-base-100/50 bg-base-300/50 text-base-content/50 hover:text-base-content/80'"
                    >
                        Todos <span class="opacity-60">({{ resultCounts.all }})</span>
                    </button>

                    <button
                        v-for="f in [
                            { val: 'win', label: 'Victorias', count: resultCounts.win, dot: 'bg-green-500' },
                            { val: 'tie', label: 'Empates', count: resultCounts.tie, dot: 'bg-gray-500 dark:bg-neutral-600' },
                            { val: 'loss', label: 'Derrotas', count: resultCounts.loss, dot: 'bg-red-500' }]"
                        :key="f.val"
                        @click="matchResultFilter = matchResultFilter === f.val ? 'all' : f.val as any" 
                        class="flex items-center gap-1.5 text-[11px] font-black uppercase px-3 py-2 rounded-full transition-all"
                        :class="matchResultFilter === f.val ? 'dark:bg-base-100 bg-base-300 ring-2 ring-primary shadow-sm' : 'dark:bg-base-100/50 bg-base-300/50 text-base-content/50 hover:text-base-content/80'">
                        <span class="w-2 h-2 rounded-full" :class="f.dot"></span>
                        {{ f.label }} <span class="opacity-60">({{ f.count }})</span>
                    </button>
                </div>

                <!-- Selector de orden (visible SOLO en móvil, ya que desktop ordena por cabecera) -->
                <div class="md:hidden flex items-center gap-2 mb-4">
                    <span class="text-[10px] font-black uppercase tracking-wider text-base-content/40 shrink-0">Ordenar:</span>
                    <select
                        v-model="matchSortKey"
                        class="select select-xs select-bordered dark:bg-base-100 bg-base-300 font-bold uppercase text-[11px] tracking-wide rounded-lg flex-1"
                    >
                        <option v-for="opt in sortOptions" :key="opt.key" :value="opt.key">{{ opt.label }}</option>
                    </select>
                    <button
                        @click="matchSortDir = matchSortDir === 'asc' ? 'desc' : 'asc'"
                        class="btn btn-xs btn-square dark:bg-base-100 bg-base-300 rounded-lg"
                        :aria-label="matchSortDir === 'asc' ? 'Ascendente' : 'Descendente'"
                    >
                        {{ matchSortDir === 'asc' ? '↑' : '↓' }}
                    </button>
                </div>

                <div v-if="matchRows.length === 0" class="text-center py-10 text-base-content/40 text-sm font-medium">
                    No se encontraron partidos con esos filtros.
                </div>

                
                <!-- En lg la tabla cabe: sin overflow, que lo convertiría en contenedor de scroll y dejaría quietas las filas (view()) -->
                <div v-else class="hidden md:block overflow-x-auto lg:overflow-visible">
                    <table class="table table-sm w-full">
                        <thead>
                            <tr class="text-xs uppercase text-base-content/40 tracking-widest border-b border-base-content/10">
                                <th class="font-black w-10"></th>
                                <th class="font-black">Rival</th>
                                <th class="font-black text-center cursor-pointer select-none hover:text-primary transition-colors" @click="toggleSort('date')">
                                    Fecha <span v-if="matchSortKey === 'date'">{{ matchSortDir === 'asc' ? '↑' : '↓' }}</span>
                                </th>
                                <th class="font-black text-center">Tipo</th>
                                <th class="font-black text-center">Pos</th>
                                <th class="font-black text-center cursor-pointer select-none hover:text-primary transition-colors" @click="toggleSort('rating')">
                                    Val <span v-if="matchSortKey === 'rating'">{{ matchSortDir === 'asc' ? '↑' : '↓' }}</span>
                                </th>
                                <th class="font-black text-center cursor-pointer select-none hover:text-primary transition-colors" @click="toggleSort('goals')">
                                    G <span v-if="matchSortKey === 'goals'">{{ matchSortDir === 'asc' ? '↑' : '↓' }}</span>
                                </th>
                                <th class="font-black text-center cursor-pointer select-none hover:text-primary transition-colors" @click="toggleSort('assists')">
                                    A <span v-if="matchSortKey === 'assists'">{{ matchSortDir === 'asc' ? '↑' : '↓' }}</span>
                                </th>
                                <th class="font-black text-center cursor-pointer select-none hover:text-primary transition-colors" @click="toggleSort('minutes')">
                                    Min <span v-if="matchSortKey === 'minutes'">{{ matchSortDir === 'asc' ? '↑' : '↓' }}</span>
                                </th>
                            </tr>
                        </thead>
                        <tbody class="reveal-list">
                            <tr v-for="row in visibleMatches" :key="row.matchId"
                                class="border-b border-base-content/5 transition-colors duration-150 relative cursor-pointer"
                                :class="[row.manOfTheMatch
                                    ? 'bg-amber-400/[0.04] hover:bg-amber-400/[0.08] mvp-row'
                                    : 'hover:bg-base-100/30', !row.played ? 'opacity-50 italic' : '']">
                                <td class="py-3">
                                    <span
                                        class="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black text-white mx-auto"
                                        :class="{
                                            'bg-green-500': row.result === 'win',
                                            'bg-gray-500 dark:bg-neutral-600': row.result === 'tie',
                                            'bg-red-500': row.result === 'loss'
                                        }"
                                    >
                                        {{ row.result === 'win' ? 'V' : row.result === 'tie' ? 'E' : 'D' }}
                                    </span>
                                </td>
                                <td class="font-semibold py-3">
                                    <div class="flex items-center gap-2">
                                        <span v-if="row.manOfTheMatch" class="tooltip tooltip-right cursor-default z-10 relative" data-tip="MVP del partido" @click.stop>
                                            <span class="text-amber-400 text-sm">★</span>
                                        </span>
                                        <a :href="routes.match(row.matchId, playerId)" class="after:absolute after:inset-0 after:content-['']">
                                            {{ row.rivalName }}
                                        </a>
                                    </div>
                                </td>
                                <td class="text-center py-3 text-xs tabular-nums text-base-content/60">{{ row.date }}</td>
                                <td class="text-center py-3">
                                    <span class="badge badge-xs badge-primary font-bold uppercase px-2 py-2.5 rounded-md">{{ translateMatchType(row.matchType) }}</span>
                                </td>
                                <td class="text-center py-3 text-xs font-bold text-base-content/70">{{ translatePosition(row.position) }}</td>
                                <template v-if="row.played">
                                    <td class="text-center font-black tabular-nums py-3" :class="getRatingColor(row.rating)">{{ row.rating.toFixed(1) }}</td>
                                    <td class="text-center tabular-nums py-3">{{ row.goals }}</td>
                                    <td class="text-center tabular-nums py-3">{{ row.assists }}</td>
                                    <td class="text-center tabular-nums py-3 text-base-content/60">{{ row.minutes }}'</td>
                                </template>
                                <td v-else colspan="4" class="text-center py-3 text-xs font-bold uppercase tracking-wider text-base-content/40">{{ row.voided ? "Partido nulo" : "Menos de 15'" }}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <div v-if="matchRows.length > 0" class="md:hidden flex flex-col gap-3 reveal-list">
                    
                        <a v-for="row in visibleMatches" :key="row.matchId"
                        :href="routes.match(row.matchId, playerId)"
                        class="flex items-center gap-3 dark:bg-base-100 bg-base-300 rounded-2xl p-4 border border-base-content/5 active:scale-[0.98] transition-transform"
                        :class="{ 'opacity-50': !row.played }">
                        <!-- Badge de resultado -->
                        <span
                            class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black text-white shrink-0"
                            :class="{
                                'bg-green-500': row.result === 'win',
                                'bg-gray-500 dark:bg-neutral-600': row.result === 'tie',
                                'bg-red-500': row.result === 'loss'
                            }"
                        >
                            {{ row.result === 'win' ? 'V' : row.result === 'tie' ? 'E' : 'D' }}
                        </span>

                        <!-- Contenido central -->
                        <div class="flex-1 min-w-0">
                            <div class="flex items-center justify-between gap-2 mb-1.5">
                                <div class="flex items-center gap-1.5 min-w-0">
                                    <span v-if="row.manOfTheMatch" class="text-amber-400 text-sm shrink-0">★</span>
                                    <span class="font-bold text-sm truncate">{{ row.rivalName }}</span>
                                </div>
                                <span class="text-[10px] text-base-content/40 font-medium tabular-nums shrink-0">{{ row.date }}</span>
                            </div>

                            <div class="flex items-center gap-1.5 mb-2.5">
                                <span class="badge badge-xs badge-primary font-bold uppercase px-2 py-2 rounded-md">{{ translateMatchType(row.matchType) }}</span>
                                <span class="badge badge-xs badge-outline font-bold uppercase px-2 py-2 rounded-full">{{ translatePosition(row.position) }}</span>
                            </div>

                            <div v-if="!row.played" class="text-xs font-bold uppercase tracking-wider text-base-content/40 italic">{{ row.voided ? "Partido nulo" : "Menos de 15'" }}</div>
                            <div v-else class="grid grid-cols-4 gap-2 text-center">
                                <div>
                                    <div class="text-[9px] uppercase font-black text-base-content/40 tracking-wider">Val</div>
                                    <div class="text-sm font-black tabular-nums" :class="getRatingColor(row.rating)">{{ row.rating.toFixed(1) }}</div>
                                </div>
                                <div>
                                    <div class="text-[9px] uppercase font-black text-base-content/40 tracking-wider">Goles</div>
                                    <div class="text-sm font-black tabular-nums">{{ row.goals }}</div>
                                </div>
                                <div>
                                    <div class="text-[9px] uppercase font-black text-base-content/40 tracking-wider">Asist.</div>
                                    <div class="text-sm font-black tabular-nums">{{ row.assists }}</div>
                                </div>
                                <div>
                                    <div class="text-[9px] uppercase font-black text-base-content/40 tracking-wider">Min</div>
                                    <div class="text-sm font-black tabular-nums">{{ row.minutes }}'</div>
                                </div>
                            </div>
                        </div>

                        <svg class="w-4 h-4 text-base-content/25 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7" />
                        </svg>
                    </a>
                </div>

                <button
                    v-if="matchRows.length > initialShowCount"
                    @click="showAll = !showAll"
                    class="btn btn-outline btn-block mt-6 rounded-2xl uppercase font-black tracking-wider text-sm border-2 hover:btn-primary"
                >
                    {{ showAll ? 'Mostrar menos' : `Ver todos los partidos (${matchRows.length})` }}
                </button>
            </div>
        </div>


    </div>
</template>

<script setup lang="ts">
    import { computed, ref, watch, onMounted, onUnmounted, nextTick } from 'vue';
    import { useInView } from '@/composables/useInView';
    import AnimatedNumber from '@/components/ui/AnimatedNumber.vue';
    import { useSiteFontInCharts } from '@/lib/chartFont';
    import {
        Chart as ChartJS,
        CategoryScale,
        LinearScale,
        PointElement,
        LineElement,
        BarElement,
        Filler,
        Tooltip,
        Legend,
        LineController,
        BarController,
        type ChartOptions
    } from 'chart.js';
    import { Line, Bar } from 'vue-chartjs';
    import { translateMatchType, translatePosition } from '@/i18n/translations';
    import { routes } from '@/lib/query';
    import DateRangePicker from '@/components/ui/DateRangePicker.vue';
    import type PlayerProfileEntity from '@/model/PlayerProfileEntity';
    import type PlayerStatsEntity from '@/model/PlayerStatsEntity';
    import type ClubMatchEntity from '@/model/match/ClubMatchEntity';
    import { CLUB } from '@/config/club';
    import { hexToRgba } from '@/lib/color';

    import { useChartExternalTooltip } from '@/composables/useChartExternalTooltip'
    import MatchChartTooltip from '@/components/player/detail/charts/MatchChartTooltip.vue'
    import ChartRangeNavigator from '@/components/ui/ChartRangeNavigator.vue'
    import { ACHIEVEMENT_CATEGORY_ICONS, ACHIEVEMENT_ICONS } from '@trueno-proclub-services/shared'
    import SoccerBallIcon from '@/icons/soccer-ball.svg?component'
    import { fullRange, lastRange } from '@/lib/chartRange'
    import { useChartWindow, type ChartWindowPreset } from '@/composables/useChartWindow'
    import { useChartZoomPan } from '@/composables/useChartZoomPan'
    const mainChartContainer = ref<HTMLElement | null>(null)
    const { tooltip, externalTooltipHandler, setHoveringTooltip, pinTooltip, closeTooltip } = useChartExternalTooltip()

    ChartJS.register(
        CategoryScale, LinearScale, PointElement, LineElement,
        BarElement, Filler, Tooltip, Legend, LineController, BarController
    );
    useSiteFontInCharts();

    const props = defineProps<{
        player: PlayerProfileEntity,
        stats: PlayerStatsEntity,
        matches: ClubMatchEntity[] | undefined,
        currentFilter: string,
        positionFilter?: string | null
    }>()

    // ── State ──
    const evolutionChart = ref<any>(null)
    const metricDropdown = ref<HTMLDetailsElement | null>(null)
    const evolutionMetric = ref<'rating' | 'goals' | 'assists' | 'goalsPlusAssists' | 'passes' | 'passSuccessRate' | 'saves' | 'savesSuccessRate' | 'tackleSuccessRate' | 'shotAccuracyPercent'>('rating')
    const showAll = ref(false)
    const initialShowCount = 7
    const recentCount = 5
    const pendingPointIndex = ref<number | null>(null)

    const isGK = computed(() => {
        if (!props.player) return false
        return props.player.mostPlayedPosition === 'goalkeeper' || 
            (props.player.playedPositions && props.player.playedPositions['goalkeeper'] > 0)
    })

    const isMobile = ref(false)
    const updateMobile = () => { isMobile.value = window.innerWidth < 640 }

    const handleClickOutside = (event: MouseEvent) => {
        if (!tooltip.value.pinned) return
        const target = event.target as HTMLElement
        if (mainChartContainer.value && !mainChartContainer.value.contains(target)) {
            closeTooltip()
        }
    }

    onMounted(() => { 
        updateMobile(); 
        window.addEventListener('resize', updateMobile) 
        document.addEventListener('click', handleClickOutside)
    })
    onUnmounted(() => {
        window.removeEventListener('resize', updateMobile)
        document.removeEventListener('click', handleClickOutside) 
        detachCanvasListener()
    })

    // FIX: Mantiene el punto activo en el gráfico cuando el tooltip está "pinned"
    const forceActivePoint = () => {
        const chartInstance = evolutionChart.value?.chart
        if (!chartInstance) return

        if (tooltip.value.visible && tooltip.value.dataIndex !== null) {
            chartInstance.setActiveElements([
                { datasetIndex: tooltip.value.datasetIndex ?? 0, index: tooltip.value.dataIndex }
            ])
        } else {
            chartInstance.setActiveElements([])
        }
        chartInstance.update('none')
    }
    let canvasEl: HTMLCanvasElement | null = null
    const attachCanvasListener = () => {
        const chartInstance = evolutionChart.value?.chart
        if (!chartInstance) return
        canvasEl = chartInstance.canvas

        canvasEl.addEventListener('mouseout', handleCanvasMouseOut)
    }
    const detachCanvasListener = () => {
        canvasEl?.removeEventListener('mouseout', handleCanvasMouseOut)
    }
    const handleCanvasMouseOut = () => {
        // setTimeout(0): se ejecuta DESPUÉS de que Chart.js termine
        // de procesar su propio reseteo interno del punto activo
        setTimeout(() => {
            forceActivePoint()
        }, 0)
    }
    watch(
        () => [tooltip.value.visible, tooltip.value.dataIndex, tooltip.value.datasetIndex, tooltip.value.pinned],
        () => {
            forceActivePoint()
        },
        { flush: 'post' }
    )


    const handleMainChartClick = (event: MouseEvent) => {
        const chartInstance = evolutionChart.value?.chart
        if (!chartInstance) return
        // Soltar después de arrastrar para mover la gráfica no es pulsar un punto
        if (zoomPan.consumeDragClick()) return

        const elements = chartInstance.getElementsAtEventForMode(event, 'index', { intersect: false }, true)
        if (!elements || elements.length === 0) return

        const playerEl = elements.find((el: any) => el.datasetIndex === 0) || elements[0]
        const point = playerEl.element as any

        if (tooltip.value.pinned && tooltip.value.dataIndex === playerEl.index) {
            closeTooltip()
            return
        }

        pinTooltip(playerEl.index, playerEl.datasetIndex, point.x, point.y)
    }


    const playerId = computed(() => props.player?.member?.playerId ?? '')

    /** El jugador en nuestro lado del partido (por playerId) */
    const findPlayer = (match: ClubMatchEntity) => match.ourClub.players.find(p => p.playerId === playerId.value) ?? null

    const getRivalName = (match: ClubMatchEntity) => match.opponentClub.name

    // Partidos en los que apareció con 0 segundos: se pueden ver en el historial, pero nunca cuentan para gráficas ni medias
    const showUnplayed = ref(false)

    const formatDate = (timestamp: number) => {
        const date = new Date(timestamp * 1000)
        const day = String(date.getDate()).padStart(2, '0')
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const year = date.getFullYear()
        return `${day}/${month}/${year}`
    }

    /** HH:mm */
    const formatTime = (timestamp: number) => {
        const date = new Date(timestamp * 1000)
        return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
    }

    const formatToDatePicker = (timestamp: number) => {
        return formatDate(timestamp)
    }

    // ═══════════════════════════════════════════
    // ── FILTERING (Respects parent type & position filters) ──
    // ═══════════════════════════════════════════
    const filteredMatches = computed(() => {
        if (!props.matches || props.matches.length === 0) return []
        
        // Filter matches based on the current filter mode
        const filteredMatches = props.matches.filter(m => {
            if (props.currentFilter === 'all') return true;
            if (props.currentFilter === 'official') return (m.matchType === 'league' || m.matchType === 'playoff');
            if (props.currentFilter === 'friendly') return (m.matchType !== 'league' && m.matchType !== 'playoff');
            return true;
        });

        if (filteredMatches.length === 0) return []

        let list = filteredMatches

        // 2. Filter by position (if set in parent)
        list = list.filter(m => {
            const p = findPlayer(m)
            return props.positionFilter ? (p && p.position === props.positionFilter) : true
        })

        return list
    })

    // ── FILTERED LIST (solo partidos que realmente jugó: base de gráficas, medias y forma reciente) ---
    const filteredMatchesWithPlayer = computed(() => {
        return filteredMatches.value.filter(m => !!findPlayer(m)?.played)
    })

    // ── HISTORIAL (incluye los de 0 segundos si el toggle está activo) ---
    const historyMatches = computed(() => {
        return filteredMatches.value.filter(m => {
            const p = findPlayer(m)
            return !!p && (p.played || showUnplayed.value)
        })
    })

    // ═══════════════════════════════════════════
    // ── VENTANA DEL GRÁFICO (zoom, desplazamiento, fechas y atajos) ──
    // ═══════════════════════════════════════════
    /** Lo mínimo que se ve de una vez al acercar */
    const MIN_VISIBLE_MATCHES = 3

    /** Partidos que jugó (con los filtros de tipo y posición), del más antiguo al más nuevo: la base del gráfico y del navegador */
    const evolutionMatches = computed(() => [...filteredMatchesWithPlayer.value].sort((a, b) => a.timestamp - b.timestamp))
    const evolutionTimestamps = computed(() => evolutionMatches.value.map(m => m.timestamp))

    /** Atajos de encima del gráfico. Se empieza por los últimos 20 */
    const EVOLUTION_PRESETS: ChartWindowPreset[] = [
        { key: 'all', label: 'Todo', range: (ts) => fullRange(ts.length) },
        { key: 5, label: 'Últ. 5', range: (ts) => lastRange(ts.length, 5) },
        { key: 10, label: 'Últ. 10', range: (ts) => lastRange(ts.length, 10) },
        { key: 20, label: 'Últ. 20', range: (ts) => lastRange(ts.length, 20) },
    ]

    // viewRange: qué partidos se ven (índices de evolutionMatches); dateFilter va sincronizado con ella
    const {
        range: viewRange, setRange: setViewRange, dateFilter, setDates, updateMode: chartUpdateMode,
        animateNextUpdate, activePreset, setPreset, showAll: showWholeChart, slice: sliceVisible,
    } = useChartWindow({ timestamps: evolutionTimestamps, presets: EVOLUTION_PRESETS, initialPreset: 20 })

    const chartMatchesOldestFirst = computed(() => sliceVisible(evolutionMatches.value))

    /** Con pocos partidos no hay nada que acercar */
    const showNavigator = computed(() => evolutionMatches.value.length >= 6)

    // Al cambiar de métrica, la gráfica sí se anima
    watch(evolutionMetric, animateNextUpdate)

    // El tooltip (fijado o no) apunta a un partido por su posición en la gráfica, que ya es otro
    watch(viewRange, () => {
        if (tooltip.value.visible) closeTooltip()
        // Un cambio sin animación no corta la animación que esté en marcha (p. ej. la de cambiar de
        // métrica): al acabar dejaría los puntos donde iban antes. Se corta aquí, antes de repintar
        if (chartUpdateMode.value === 'none') evolutionChart.value?.chart?.stop()
    })

    // "Ver todas las fechas" desaparece al pulsarlo: el foco pasa al atajo que queda marcado
    const presetBar = ref<HTMLElement | null>(null)
    const showWholeChartAndFocus = async () => {
        showWholeChart()
        await nextTick()
        presetBar.value?.querySelector<HTMLElement>('[aria-pressed="true"]')?.focus()
    }

    // Rueda y arrastre sobre la propia gráfica
    const zoomPan = useChartZoomPan({
        chart: () => evolutionChart.value?.chart,
        range: viewRange,
        count: () => evolutionMatches.value.length,
        setRange: setViewRange,
        minSize: MIN_VISIBLE_MATCHES,
        enabled: () => showNavigator.value,
    })

    // ═══════════════════════════════════════════
    // ── MEJORES REGISTROS (Highlight Stats) ──
    // ═══════════════════════════════════════════
    /** Iconos de "Mejores registros": los Heroicons de los logros (en relleno) y, para goles, el balón */
    const HL_ICONS = {
        star: ACHIEVEMENT_CATEGORY_ICONS.performance.solid,  // star
        goals: SoccerBallIcon,
        assists: ACHIEVEMENT_CATEGORY_ICONS.team.solid,      // user-group
        streak: ACHIEVEMENT_CATEGORY_ICONS.streaks.solid,    // bolt
        ga: ACHIEVEMENT_ICONS.rocket.solid,                  // rocket-launch
        mvp: ACHIEVEMENT_CATEGORY_ICONS.collection.solid,    // trophy
        average: ACHIEVEMENT_CATEGORY_ICONS.expert.solid,    // sparkles
        perMatch: ACHIEVEMENT_ICONS.target.solid,            // viewfinder-circle
    }

    const highlightStats = computed(() => {
        const matches = filteredMatchesWithPlayer.value
        if (!matches.length) return []

        let bestRating = 0, bestRatingRival = '', bestRatingMatchId: number | null = null
        let bestGoals = 0, bestGoalsRival = '', bestGoalsMatchId: number | null = null
        let bestAssists = 0, bestAssistsRival = '', bestAssistsMatchId: number | null = null
        let bestGA = 0, bestGARival = '', bestGAMatchId: number | null = null
        let currentStreak = 0, maxStreak = 0
        let totalMvp = 0

        // Walk matches newest→oldest for streak, collect bests
        for (const m of matches) {
            const p = findPlayer(m)
            if (!p) continue

            const rival = getRivalName(m)

            if (p.rating > bestRating) { bestRating = p.rating; bestRatingRival = rival; bestRatingMatchId = m.matchId }
            if (p.goals > bestGoals) { bestGoals = p.goals; bestGoalsRival = rival; bestGoalsMatchId = m.matchId }
            if (p.assists > bestAssists) { bestAssists = p.assists; bestAssistsRival = rival; bestAssistsMatchId = m.matchId }
            if ((p.goals + p.assists) > bestGA) { bestGA = p.goals + p.assists; bestGARival = rival; bestGAMatchId = m.matchId }
            if (p.manOfTheMatch) totalMvp++
        }

        // Win streak (newest first = natural order from API)
        for (const m of matches) {
            if (m.result === 'win') currentStreak++
            else break
        }
        // Max streak scanning all
        let tmpStreak = 0
        for (const m of [...matches].reverse()) {
            if (m.result === 'win') { tmpStreak++; if (tmpStreak > maxStreak) maxStreak = tmpStreak }
            else tmpStreak = 0
        }
        return [
            { icon: HL_ICONS.star, label: 'Mejor Valoración', value: bestRating, decimals: 1, sub: `vs ${bestRatingRival}`, matchId: bestRatingMatchId },
            { icon: HL_ICONS.goals, label: 'Máx. Goles', value: bestGoals, sub: `vs ${bestGoalsRival}`, matchId: bestGoalsMatchId },
            { icon: HL_ICONS.assists, label: 'Máx. Asistencias', value: bestAssists, sub: `vs ${bestAssistsRival}`, matchId: bestAssistsMatchId },
            { icon: HL_ICONS.streak, label: 'Racha Victorias', value: currentStreak > 0 ? `${currentStreak} actual` : `${maxStreak} mejor`, sub: currentStreak > 0 ? 'Racha activa' : 'Récord histórico' },
            { icon: HL_ICONS.ga, label: 'Máx. G+A', value: bestGA, sub: `vs ${bestGARival}`, matchId: bestGAMatchId },
            { icon: HL_ICONS.mvp, label: 'MVPs Totales', value: totalMvp, sub: `${matches.length} partidos` },
            { icon: HL_ICONS.average, label: 'Media Valoración', value: props.stats?.ratingAve ?? 0, decimals: 2, sub: 'Histórica' },
            { icon: HL_ICONS.perMatch, label: 'G+A / Partido', value: props.stats?.goalsPlusAssistsPerMatch ?? 0, decimals: 2, sub: 'Media por partido' },
        ]
    })

    const METRIC_META: Record<string, { label: string; decimals: number; suffix: string }> = {
        rating: { label: 'Valoración', decimals: 2, suffix: '' },
        goals: { label: 'Goles', decimals: 2, suffix: '' },
        assists: { label: 'Asistencias', decimals: 2, suffix: '' },
        goalsPlusAssists: { label: 'G+A', decimals: 2, suffix: '' },
        passes: { label: 'Pases Intentados', decimals: 1, suffix: '' },
        passSuccessRate: { label: '% Acierto Pases', decimals: 1, suffix: '%' },
        tackleSuccessRate: { label: '% Acierto Entradas', decimals: 1, suffix: '%' },
        shotAccuracyPercent: { label: '% Acierto Tiros', decimals: 1, suffix: '%' },
        saves: { label: 'Paradas', decimals: 1, suffix: '' },
        savesSuccessRate: { label: '% Paradas', decimals: 1, suffix: '%' },
    }
    const currentMetricMeta = computed(() => METRIC_META[evolutionMetric.value])

    const getMetricValue = (p: any, metric: typeof evolutionMetric.value): number => {
        if (!p) return 0
        switch (metric) {
            case 'rating': return p.rating
            case 'goals': return p.goals
            case 'assists': return p.assists
            case 'goalsPlusAssists': return p.goals + p.assists
            case 'passes': return p.passesMade
            case 'passSuccessRate': return isNaN(p.passSuccessRate) ? 0 : p.passSuccessRate
            case 'tackleSuccessRate': return isNaN(p.tackleSuccessRate) ? 0 : p.tackleSuccessRate
            case 'shotAccuracyPercent': return isNaN(p.shotAccuracyPercent) ? 0 : p.shotAccuracyPercent
            case 'saves': return p.saves ?? 0
            case 'savesSuccessRate': {
                const totalShots = (p.saves ?? 0) + (p.goalsConceded ?? 0)
                const rate = totalShots > 0 ? ((p.saves ?? 0) / totalShots) * 100 : 0
                return isNaN(rate) ? 0 : rate
            }
            default: return 0
        }
    }

    // ═══════════════════════════════════════
    // ── EVOLUCIÓN (Line Chart) ──
    // ═══════════════════════════════════════
    const navigatorValueText = (index: number) => {
        const m = evolutionMatches.value[index]
        return m ? `Partido ${index + 1} de ${evolutionMatches.value.length}: ${formatDate(m.timestamp)} contra ${getRivalName(m)}` : ''
    }

    const evolutionChartData = computed(() => {
        const matches = chartMatchesOldestFirst.value
        if (matches.length === 0) return null

        const dataPoints: number[] = []
        const labels: (string | string[])[] = []
        // Con zoom se ven varios partidos del mismo día y las fechas se repetirían: debajo va la hora
        const withTime = matches.length <= 30 && new Set(matches.map(m => formatDate(m.timestamp))).size < matches.length
        // En el móvil sin el año: cabe más y no hay que girar las etiquetas (el tooltip lleva la fecha entera)
        const day = (ts: number) => (isMobile.value ? formatDate(ts).slice(0, 5) : formatDate(ts))

        matches.forEach((m) => {
            const p = findPlayer(m)
            if (!p) return

            const val = getMetricValue(p, evolutionMetric.value)

            dataPoints.push(val)
            labels.push(withTime ? [day(m.timestamp), formatTime(m.timestamp)] : day(m.timestamp))
        })

        const avg = dataPoints.length > 0 ? dataPoints.reduce((a, b) => a + b, 0) / dataPoints.length : 0
        // Con muchos partidos a la vista los puntos se amontonan: más pequeños (al pasar por encima se ven igual)
        const roomy = isMobile.value ? 0.45 : 1 // en el móvil caben la mitad
        const dense = dataPoints.length > 90 * roomy ? 2 : dataPoints.length > 45 * roomy ? 1 : 0

        return {
            labels,
            datasets: [
                {
                    label: 'Partido',
                    data: dataPoints,
                    borderColor: CLUB.colors.primary,
                    backgroundColor: hexToRgba(CLUB.colors.primary, 0.08),
                    borderWidth: dense === 2 ? 2 : 3,
                    pointBackgroundColor: CLUB.colors.primary,
                    pointBorderColor: '#fff',
                    pointRadius: [4, 2.5, 0][dense],
                    pointHoverRadius: 6,
                    fill: true,
                    tension: 0.3
                },
                {
                    label: 'Su media',
                    data: Array(dataPoints.length).fill(avg),
                    borderColor: 'rgba(166, 173, 187, 0.5)',
                    borderWidth: 2,
                    borderDash: [6, 4],
                    pointRadius: 0,
                    fill: false,
                    tension: 0
                }
            ]
        }
    })

    //FIX Chart point detection after data update
    watch(evolutionChartData, async () => {
        await nextTick()
        ;(window as any).__debugChart = evolutionChart.value?.chart
        detachCanvasListener() // por si ya había uno de una instancia anterior
        attachCanvasListener()
    }, { immediate: true })

    // Las gráficas se dibujan animadas al entrar en pantalla
    const { target: chartCard, inView: chartInView } = useInView()
    // Las barras de forma reciente están en otra tarjeta: se animan cuando esa entra en pantalla
    const { target: formCard, inView: formInView } = useInView()

     const evolutionOptions = computed<ChartOptions<'line'>>(() => ({
        animation: chartInView.value ? { duration: 900, easing: 'easeOutQuart' as const } : { duration: 0 },
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        layout: {
            padding: isMobile.value ? { left: 0, right: 2, top: 4, bottom: 0 } : { left: 4, right: 4, top: 4, bottom: 0 }
        },
        onHover: (event, elements) => {
            if (event.native && event.native.target) {
                const hasPlayerPoint = elements.some(el => el.datasetIndex === 0)
                const target = event.native.target as HTMLElement
                target.style.cursor = hasPlayerPoint ? 'pointer' : 'default'
            }
        },
        scales: {
            x: {
                offset: false,
                bounds: 'data',
                grid: { color: 'rgba(166, 173, 187, 0.08)' },
                ticks: {
                    color: 'rgba(166, 173, 187, 0.5)',
                    font: { size: 10, weight: 'bold' },
                    maxTicksLimit: isMobile.value ? 5 : 10,
                    autoSkipPadding: 8,
                    // Sin girar: giradas, la primera etiqueta se come el ancho y el alto de la gráfica (en el móvil, casi la mitad).
                    // "inner": la primera y la última no se salen por los lados (y no hace falta dejarles hueco)
                    maxRotation: 0,
                    align: 'inner',
                }
            },
            y: {
                grid: { color: 'rgba(166, 173, 187, 0.08)' },
                ticks: {
                    color: 'rgba(166, 173, 187, 0.5)',
                    padding: isMobile.value ? 2 : 4,
                    maxTicksLimit: 6,
                    font: { size: isMobile.value ? 10 : 11 },
                    stepSize: evolutionMetric.value === 'rating' ? 1 : undefined,
                    callback: (value) => {
                        const m = evolutionMetric.value
                        if (m === 'passSuccessRate' || m === 'savesSuccessRate' || m === 'tackleSuccessRate' || m === 'shotAccuracyPercent') {
                            return `${value}%`
                        }
                        return value
                    }
                },
                suggestedMin: evolutionMetric.value === 'rating' ? 4 : 0,
                suggestedMax: (evolutionMetric.value === 'passSuccessRate' || evolutionMetric.value === 'savesSuccessRate' || evolutionMetric.value === 'tackleSuccessRate' || evolutionMetric.value === 'shotAccuracyPercent') ? 100 : undefined
            }
        },
        plugins: {
            legend: { display: false },
            tooltip: {
               enabled: false,
               external: externalTooltipHandler,
            }
        }
    }))

    const activeTooltipMatch = computed(() => {
        if (tooltip.value.dataIndex === null) return null
        const matches = chartMatchesOldestFirst.value
        const m = matches[tooltip.value.dataIndex]
        if (!m) return null
        const p = findPlayer(m)
        if (!p) return null

        // Media de la métrica seleccionada sobre el rango visible en el chart
        const values = matches
            .map(mm => findPlayer(mm))
            .filter(Boolean)
            .map(pp => getMetricValue(pp, evolutionMetric.value))
        const average = values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0

        return {
            date: `${formatDate(m.timestamp)} · ${formatTime(m.timestamp)}`,
            rival: getRivalName(m),
            position: translatePosition(p.position),
            result: m.result,
            manOfTheMatch: p.manOfTheMatch,
            matchId: m.matchId,
            value: getMetricValue(p, evolutionMetric.value),
            average
        }
    })


    // ═══════════════════════════════════════
    // ── FORMA RECIENTE ──
    // ═══════════════════════════════════════
    const recentMatchesData = computed(() => {
        const matches = filteredMatchesWithPlayer.value.slice(0, recentCount)
        return matches.map(m => findPlayer(m)!.rating).reverse()
    })

    const recentDelta = computed(() => {
        const ratings = recentMatchesData.value
        if (ratings.length === 0) return 0
        const recentAvg = ratings.reduce((a, b) => a + b, 0) / ratings.length
        const overallAvg = props.stats?.ratingAve ?? 0
        return recentAvg - overallAvg
    })

    const recentSelectedMetricAvg = computed(() => {
        const matches = filteredMatchesWithPlayer.value.slice(0, recentCount)
        const values = matches.map(m => getMetricValue(findPlayer(m), evolutionMetric.value))
        if (!values.length) return 0
        return values.reduce((a, b) => a + b, 0) / values.length
    })

    const overallSelectedMetricAvg = computed(() => {
        const values = filteredMatchesWithPlayer.value.map(m => getMetricValue(findPlayer(m), evolutionMetric.value))
        if (!values.length) return 0
        return values.reduce((a, b) => a + b, 0) / values.length
    })

    const selectedMetricDelta = computed(() => recentSelectedMetricAvg.value - overallSelectedMetricAvg.value)


    watch([evolutionMetric, dateFilter], () => {
        pendingPointIndex.value = null
    }, { deep: true })


    const recentResults = computed(() => {
        const matches = filteredMatchesWithPlayer.value.slice(0, recentCount)
        return matches.map(m => {
            const rival = getRivalName(m)
            if (m.result === 'win') {
                return { text: 'V', class: 'bg-green-500', tooltip: `Victoria vs ${rival}` }
            } else if (m.result === 'tie') {
                return { text: 'E', class: 'bg-gray-500 dark:bg-neutral-600', tooltip: `Empate vs ${rival}` }
            } else {
                return { text: 'D', class: 'bg-red-500', tooltip: `Derrota vs ${rival}` }
            }
        }).reverse()
    })

    // Brief Stats Summary of the last 5 matches
    const recentStatsSummary = computed(() => {
        const slice = filteredMatchesWithPlayer.value.slice(0, recentCount)
        let goals = 0, assists = 0, minutes = 0
        slice.forEach(m => {
            const p = findPlayer(m)!
            goals += p.goals ?? 0
            assists += p.assists ?? 0
            minutes += Math.round(p.minutesPlayed ?? 0)
        })
        return { goals, assists, minutes }
    })

    const recentBarData = computed(() => {
        const ratings = recentMatchesData.value
        if (ratings.length === 0) return null
        const avg = props.stats?.ratingAve ?? 0

        return {
            labels: ratings.map(r => r.toFixed(1)),
            datasets: [{
                data: ratings,
                backgroundColor: ratings.map(r => r >= avg ? CLUB.colors.primary : hexToRgba(CLUB.colors.primary, 0.4)),
                borderRadius: 4,
                barThickness: isMobile.value ? 28 : 40,
                maxBarThickness: 50
            }]
        }
    })

    const recentBarOptions = computed<ChartOptions<'bar'>>(() => ({
        animation: formInView.value ? { duration: 700, easing: 'easeOutQuart' as const } : { duration: 0 },
        responsive: true,
        maintainAspectRatio: false,
        scales: {
            x: {
                grid: { display: false },
                ticks: {
                    color: 'rgba(166, 173, 187, 0.5)',
                    font: { size: 11, weight: 'bold' }
                }
            },
            y: {
                display: false,
                suggestedMin: 0,
                suggestedMax: 10
            }
        },
        plugins: {
            legend: { display: false },
            tooltip: {enabled: false}
        }
    }))

    // ═══════════════════════════════════════
    // ── ÚLTIMOS PARTIDOS (Table) ──
    // ═══════════════════════════════════════
    interface MatchRow {
        matchId: number
        played: boolean
        /** partido nulo: no cuenta aunque jugara */
        voided: boolean
        rivalName: string
        matchType: string
        rating: number
        goals: number
        assists: number
        minutes: number
        manOfTheMatch: boolean
        position: string
        result: 'win' | 'tie' | 'loss'
        timestamp: number
        date: string
    }

    

    // Normaliza el resultado: si no es 'win' ni 'tie', se trata como derrota
    // (consistente con el resto del componente, por si la API no siempre manda 'loss' exacto)
    const getResultCategory = (result: string): 'win' | 'tie' | 'loss' => {
        if (result === 'win') return 'win'
        if (result === 'tie') return 'tie'
        return 'loss'
    }

    //Match table
    const matchSearch = ref('')
    const matchResultFilter = ref<'all' | 'win' | 'tie' | 'loss'>('all')
    const matchSortKey = ref<'date' | 'rating' | 'goals' | 'assists' | 'minutes'>('date')
    const matchSortDir = ref<'asc' | 'desc'>('desc')

    const toggleSort = (key: typeof matchSortKey.value) => {
        if (matchSortKey.value === key) {
            matchSortDir.value = matchSortDir.value === 'asc' ? 'desc' : 'asc'
        } else {
            matchSortKey.value = key
            matchSortDir.value = 'desc'
        }
    }

    // Guardamos el timestamp original para poder ordenar por fecha real, no por string formateado
    const matchRowsRaw = computed(() => {
        return historyMatches.value.map(m => {
            const p = findPlayer(m)!
            return {
                matchId: m.matchId,
                played: p.played,
                voided: !!m.voided,
                rivalName: getRivalName(m),
                matchType: m.matchType,
                rating: p.rating,
                goals: p.goals,
                assists: p.assists,
                minutes: Math.round(p.minutesPlayed ?? 0),
                manOfTheMatch: p.manOfTheMatch,
                position: p.position,
                result: getResultCategory(m.result),
                timestamp: m.timestamp,
                date: formatDate(m.timestamp)
            }
        })
    })

    // Opciones legibles para el selector de orden (reutilizable en el <select> de móvil)
    const sortOptions = [
        { key: 'date', label: 'Fecha' },
        { key: 'rating', label: 'Valoración' },
        { key: 'goals', label: 'Goles' },
        { key: 'assists', label: 'Asistencias' },
        { key: 'minutes', label: 'Minutos' }
    ] as const

    const matchRows = computed<MatchRow[]>(() => {
        let rows = matchRowsRaw.value

        // Búsqueda por rival
        if (matchSearch.value.trim()) {
            const q = matchSearch.value.trim().toLowerCase()
            rows = rows.filter(r => r.rivalName.toLowerCase().includes(q))
        }

        // Filtro por resultado
        if (matchResultFilter.value !== 'all') {
            rows = rows.filter(r => r.result === matchResultFilter.value)
        }

        // Filtro por rango de fechas
        const start = parseTableDate(tableDateFilter.value.startDate)
        const end = parseTableDate(tableDateFilter.value.endDate)
        if (end) end.setHours(23, 59, 59, 999)
        if (start || end) {
            rows = rows.filter(r => {
                const d = new Date(r.timestamp * 1000)
                if (start && d < start) return false
                if (end && d > end) return false
                return true
            })
        }

        // Orden
        const dir = matchSortDir.value === 'asc' ? 1 : -1
        rows = [...rows].sort((a, b) => {
            let aVal: number, bVal: number
            switch (matchSortKey.value) {
                case 'rating': aVal = a.rating; bVal = b.rating; break
                case 'goals': aVal = a.goals; bVal = b.goals; break
                case 'assists': aVal = a.assists; bVal = b.assists; break
                case 'minutes': aVal = a.minutes; bVal = b.minutes; break
                default: aVal = a.timestamp; bVal = b.timestamp
            }
            return (aVal - bVal) * dir
        })

        return rows
    })

    // ═══════════════════════════════════════
    // ── TABLA: Filtro de rango de fechas y tipo de partido ──
    // ═══════════════════════════════════════
    const tableDateFilter = ref({ startDate: '', endDate: '' })
    const tableMatchType = ref<'all' | 'league' | 'friendly'>('all')

    const tableMinDateStr = computed(() => {
        if (!matchRowsRaw.value.length) return ''
        const timestamps = matchRowsRaw.value.map(r => r.timestamp)
        return formatToDatePicker(Math.min(...timestamps))
    })
    const tableMaxDateStr = computed(() => {
        if (!matchRowsRaw.value.length) return ''
        const timestamps = matchRowsRaw.value.map(r => r.timestamp)
        return formatToDatePicker(Math.max(...timestamps))
    })

    const tableActiveQuickRange = ref<'all' | 5 | 10 | 20>('all')

    const setTableQuickRange = (range: 'all' | 5 | 10 | 20) => {
        tableActiveQuickRange.value = range
        const rows = matchRowsRaw.value
        if (!rows.length) return

        if (range === 'all') {
            tableDateFilter.value = { startDate: tableMinDateStr.value, endDate: tableMaxDateStr.value }
        } else {
            // Los N más recientes: ya vienen ordenados newest→oldest desde filteredMatchesWithPlayer
            const slice = [...rows].sort((a, b) => b.timestamp - a.timestamp).slice(0, range)
            const timestamps = slice.map(r => r.timestamp)
            tableDateFilter.value = {
                startDate: formatToDatePicker(Math.min(...timestamps)),
                endDate: formatToDatePicker(Math.max(...timestamps))
            }
        }
    }

    // Inicializa el rango al rango completo cuando cambian los datos base
    watch(matchRowsRaw, (rows) => {
        if (rows.length && !tableDateFilter.value.startDate) {
            tableDateFilter.value = { startDate: tableMinDateStr.value, endDate: tableMaxDateStr.value }
        }
    }, { immediate: true })

    const parseTableDate = (dateStr: string) => {
        if (!dateStr) return null
        const parts = dateStr.split('/')
        if (parts.length === 3) {
            return new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]))
        }
        return null
    }

    const visibleMatches = computed(() => {
        if (showAll.value) return matchRows.value
        return matchRows.value.slice(0, initialShowCount)
    })

    const resultCounts = computed(() => {
        let rows = matchRowsRaw.value

        if (matchSearch.value.trim()) {
            const q = matchSearch.value.trim().toLowerCase()
            rows = rows.filter(r => r.rivalName.toLowerCase().includes(q))
        }
        if (tableMatchType.value === 'league') {
            rows = rows.filter(r => r.matchType === 'league' || r.matchType === 'playoff')
        } else if (tableMatchType.value === 'friendly') {
            rows = rows.filter(r => r.matchType !== 'league' && r.matchType !== 'playoff')
        }
        const start = parseTableDate(tableDateFilter.value.startDate)
        const end = parseTableDate(tableDateFilter.value.endDate)
        if (end) end.setHours(23, 59, 59, 999)
        if (start || end) {
            rows = rows.filter(r => {
                const d = new Date(r.timestamp * 1000)
                if (start && d < start) return false
                if (end && d > end) return false
                return true
            })
        }

        return {
            all: rows.length,
            win: rows.filter(r => r.result === 'win').length,
            tie: rows.filter(r => r.result === 'tie').length,
            loss: rows.filter(r => r.result === 'loss').length
        }
    })

    const getRatingColor = (rating: number) => {
        if (rating >= 8) return 'text-green-400'
        if (rating >= 7) return 'text-emerald-400'
        if (rating >= 6) return 'text-amber-400'
        return 'text-red-400'
    }
</script>

<style scoped>
    .animate-in {
        animation: slideUp 0.6s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
    }
    @keyframes slideUp {
        from { opacity: 0; transform: translateY(30px); }
        to { opacity: 1; transform: translateY(0); }
    }

    /* MVP row golden left accent */
    .mvp-row {
        border-left: 3px solid rgb(251, 191, 36);
    }

</style>
