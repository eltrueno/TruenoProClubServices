<template>
    <div class="flex flex-col gap-8 animate-in mt-1">

        <!-- ═══ EVOLUCIÓN (Line Chart) ═══ -->
        <div class="card bg-base-200 shadow-md relative">
            <div class="card-body p-6">
                <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
                    <h2 class="card-title text-xl font-black uppercase border-l-4 border-primary pl-4">Evolución</h2>

                    <div class="flex flex-wrap items-center gap-3 w-full sm:w-auto sm:justify-end">
                        <!-- Legend -->
                        <div class="hidden sm:flex items-center gap-4 text-xs text-base-content/60 mr-2">
                            <span class="flex items-center gap-1.5">
                                <span class="w-5 h-0.5 bg-[#C80D0D] rounded-full inline-block"></span>
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
                <div class="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 p-3 dark:bg-base-100/40 bg-base-300/30 border border-base-content/5 rounded-2xl mb-6 sm:mx-0">
                    <div class="flex flex-wrap items-center gap-3 text-xs w-full md:w-auto">
                        <span class="font-black uppercase tracking-wider text-base-content/50 flex items-center gap-1">
                        Rango de fechas
                        </span>

                        <div class="relative w-full md:w-[260px]">
                            <VueTailwindDatepicker
                                i18n="es"
                                v-model="dateFilter"
                                class="w-full text-xs font-bold"
                                :formatter="dateFormatter"
                                :options="datePickerOptions"
                                :shortcuts="false"
                                as-single
                                use-range
                                @keypress.stop.prevent
                                @keyup.stop.prevent
                                @keydown.stop.prevent
                            />
                        </div>
                    </div>

                    <!-- Quick Presets -->
                    <div class="join dark:bg-base-100 bg-base-300 p-1 rounded-2xl w-full md:w-auto justify-around md:justify-start">
                        <button
                            v-for="preset in [
                                { val: 'all', label: 'Todo' },
                                { val: 5, label: 'Últ. 5' },
                                { val: 10, label: 'Últ. 10' },
                                { val: 20, label: 'Últ. 20' }
                            ]"
                            :key="preset.val"
                            @click="setQuickRange(preset.val as any)"
                            class="btn btn-xs join-item capitalize border-none px-4 lg:px-6"
                            :class="activeQuickRange === preset.val ? 'btn-primary shadow-sm' : 'btn-ghost'"
                        >
                            {{ preset.label }}
                        </button>
                    </div>
                </div>

                <div ref="mainChartContainer" class="w-full h-[260px] sm:h-[300px] relative">
                    <Line
                        ref="evolutionChart"
                        v-if="evolutionChartData"
                        :data="evolutionChartData"
                        :options="evolutionOptions"
                        @click="handleMainChartClick"
                    />

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
                        :player-name="props.player.member.playerName"
                        :metric-label="currentMetricMeta.label"
                        :value="activeTooltipMatch.value"
                        :average="activeTooltipMatch.average"
                        :decimals="currentMetricMeta.decimals"
                        :suffix="currentMetricMeta.suffix"
                        @close="closeTooltip"
                        @hover="setHoveringTooltip"
                    />

                </div>
            </div>
        </div>

        <!-- ═══ FORMA RECIENTE + MEJORES REGISTROS (Side-by-side on desktop) ═══ -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">

            <!-- Forma Reciente -->
            <div class="card bg-base-200 shadow-md relative">
                <div class="card-body p-6 flex flex-col justify-between gap-5">
                    <div>
                        <h2 class="card-title text-xl font-black uppercase border-l-4 border-primary pl-4 mb-6 tracking-widest">
                            Forma Reciente · Últimos {{ recentCount }}
                        </h2>

                        <!-- Recent Form Bar Chart -->
                        <div class="h-[140px] mt-5">
                            <Bar v-if="recentBarData" :data="recentBarData" :options="recentBarOptions" />
                        </div>

                        <div class="grid gap-3 grid-cols-1">
                            <!-- Delta de valoración (siempre visible) -->
                            <div class="dark:bg-base-100 bg-base-300 rounded-2xl p-5 flex flex-col justify-center border-l-4"
                                :class="recentDelta >= 0 ? 'border-green-500' : 'border-red-500'">
                                <div class="text-3xl font-black tabular-nums" :class="recentDelta >= 0 ? 'text-green-500' : 'text-red-500'">
                                    {{ recentDelta >= 0 ? '+' : '' }}{{ recentDelta.toFixed(2) }}
                                </div>
                                <div class="text-xs text-base-content/50 mt-1 font-medium">vs su media en valoración</div>
                            </div>

                            <!-- Delta de la métrica elegida en "Evolución" -->
                            <div v-if="evolutionMetric !== 'rating'"
                                class="dark:bg-base-100 bg-base-300 rounded-2xl p-5 flex flex-col justify-center border-l-4"
                                :class="selectedMetricDelta >= 0 ? 'border-green-500' : 'border-red-500'">
                                <div class="text-3xl font-black tabular-nums" :class="selectedMetricDelta >= 0 ? 'text-green-500' : 'text-red-500'">
                                    {{ selectedMetricDelta >= 0 ? '+' : '' }}{{ selectedMetricDelta.toFixed(currentMetricMeta.decimals) }}{{ currentMetricMeta.suffix }}
                                </div>
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
                        <div class="grid grid-cols-3 gap-2 text-center mt-1">
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

                    <div class="grid grid-cols-2 gap-3 lg:gap-4">
                        <div v-for="h in highlightStats" :key="h.label"
                             class="dark:bg-base-100 bg-base-300 border border-base-content/5 rounded-xl p-3 flex flex-col items-center text-center gap-1 group hover:-translate-y-0.5 hover:shadow-md hover:border-primary/25 transition-all duration-300 relative"
                             :class="{ 'cursor-pointer hover:border-primary/40': h.matchId }">
                            <span class="text-xl group-hover:scale-110 transition-transform duration-300">{{ h.icon }}</span>
                            <span class="text-base-content/50 uppercase text-[0.65rem] lg:text-[0.7rem] font-black tracking-widest leading-tight">{{ h.label }}</span>
                            <span class="text-lg font-black tabular-nums mt-0.5">{{ h.value }}</span>
                            
                            <span v-if="h.matchId" class="tooltip tooltip-top w-full before:text-[10px]" data-tip="Ir al partido">
                                <a :href="`/partido/${h.matchId}?player=${props.player.member.playerName}`"
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
        <div class="card bg-base-200 shadow-md relative">
            <div class="card-body p-6">
                <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                    <h2 class="card-title text-xl font-black uppercase border-l-4 border-primary pl-4">Partidos</h2>

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
                            <VueTailwindDatepicker
                                i18n="es"
                                v-model="tableDateFilter"
                                class="w-full text-xs font-bold"
                                :formatter="dateFormatter"
                                :options="datePickerOptions"
                                :shortcuts="false"
                                as-single
                                use-range
                                @keypress.stop.prevent
                                @keyup.stop.prevent
                                @keydown.stop.prevent
                            />
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

                
                <div v-else class="hidden md:block overflow-x-auto">
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
                        <tbody>
                            <tr v-for="row in visibleMatches" :key="row.matchId"
                                class="border-b border-base-content/5 transition-colors duration-150 relative cursor-pointer"
                                :class="row.manOfTheMatch
                                    ? 'bg-amber-400/[0.04] hover:bg-amber-400/[0.08] mvp-row'
                                    : 'hover:bg-base-100/30'">
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
                                        <a :href="`/partido/${row.matchId}?player=${props.player.member.playerName}`" class="after:absolute after:inset-0 after:content-['']">
                                            {{ row.rivalName }}
                                        </a>
                                    </div>
                                </td>
                                <td class="text-center py-3 text-xs tabular-nums text-base-content/60">{{ row.date }}</td>
                                <td class="text-center py-3">
                                    <span class="badge badge-xs badge-primary font-bold uppercase px-2 py-2.5 rounded-md">{{ translateMatchType(row.matchType) }}</span>
                                </td>
                                <td class="text-center py-3 text-xs font-bold text-base-content/70">{{ translatePosition(row.position) }}</td>
                                <td class="text-center font-black tabular-nums py-3" :class="getRatingColor(row.rating)">{{ row.rating.toFixed(1) }}</td>
                                <td class="text-center tabular-nums py-3">{{ row.goals }}</td>
                                <td class="text-center tabular-nums py-3">{{ row.assists }}</td>
                                <td class="text-center tabular-nums py-3 text-base-content/60">{{ row.minutes }}'</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <div v-if="matchRows.length > 0" class="md:hidden flex flex-col gap-3">
                    
                        <a v-for="row in visibleMatches" :key="row.matchId"
                        :href="`/partido/${row.matchId}?player=${props.player.member.playerName}`"
                        class="flex items-center gap-3 dark:bg-base-100 bg-base-300 rounded-2xl p-4 border border-base-content/5 active:scale-[0.98] transition-transform">
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

                            <div class="grid grid-cols-4 gap-2 text-center">
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
    import VueTailwindDatepicker from 'vue-tailwind-datepicker';
    import type PlayerProfileEntity from '@/model/PlayerProfileEntity';
    import type PlayerStatsEntity from '@/model/PlayerStatsEntity';
    import type ClubMatchEntity from '@/model/match/ClubMatchEntity';

    import { useChartExternalTooltip } from '@/composables/useChartExternalTooltip'
    import MatchChartTooltip from '@/components/player/detail/charts/MatchChartTooltip.vue'
    const mainChartContainer = ref<HTMLElement | null>(null)
    const { tooltip, externalTooltipHandler, setHoveringTooltip, pinTooltip, closeTooltip } = useChartExternalTooltip()

    ChartJS.register(
        CategoryScale, LinearScale, PointElement, LineElement,
        BarElement, Filler, Tooltip, Legend, LineController, BarController
    );

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

    // Chart Date Filter State using VueTailwindDatepicker
    const dateFilter = ref({
        startDate: '',
        endDate: ''
    })

    const dateFormatter = ref({
        date: 'DD/MM/YYYY',
        month: 'MM'
    })

    const datePickerOptions = ref({
        shortcuts: {
            today: "Hoy",
            yesterday: "Ayer",
            past: (period: number) => "Hace " + period + " Días",
            currentMonth: "Este mes",
            pastMonth: "Mes pasado",
        },
        footer: {
            apply: "Aplicar",
            cancel: "Cancelar",
        },
    })

    const activeQuickRange = ref<'all' | 5 | 10 | 20>('all')

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


    const playerNameLower = computed(() => props.player?.member?.playerName?.toLowerCase() ?? '')


    //TODO: FIx API
    const findPlayer = (match: ClubMatchEntity) => {
        const name = playerNameLower.value
        if (match.localClub.id == 101456) return match.localClub.players.find(p => p.playername.toLowerCase() === name)
        else if (match.awayClub.id == 101456) return match.awayClub.players.find(p => p.playername.toLowerCase() === name)
        else return null
    }

    const getRivalName = (match: ClubMatchEntity) => {
        const name = playerNameLower.value
        const inLocal = match.localClub.players.some(p => p.playername.toLowerCase() === name)
        return inLocal ? match.awayClub.name : match.localClub.name
    }

    const formatDate = (timestamp: number) => {
        const date = new Date(timestamp * 1000)
        const day = String(date.getDate()).padStart(2, '0')
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const year = date.getFullYear()
        return `${day}/${month}/${year}`
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

    // ── FILTERED LIST (with player entries) ---
    const filteredMatchesWithPlayer = computed(() => {
        return filteredMatches.value.filter(m => !!findPlayer(m))
    })

    // ═══════════════════════════════════════════
    // ── CHART DATE FILTERING ──
    // ═══════════════════════════════════════════
    const minMatchDateStr = computed(() => {
        if (!filteredMatches.value.length) return ''
        const timestamps = filteredMatches.value.map(m => m.timestamp)
        return formatToDatePicker(Math.min(...timestamps))
    })

    const maxMatchDateStr = computed(() => {
        if (!filteredMatches.value.length) return ''
        const timestamps = filteredMatches.value.map(m => m.timestamp)
        return formatToDatePicker(Math.max(...timestamps))
    })

    const chartFilteredMatches = computed(() => {
        const matches = filteredMatches.value
        if (!matches.length) return []

        const parseDatePickerDate = (dateStr: string) => {
            if (!dateStr) return null
            const parts = dateStr.split('/')
            if (parts.length === 3) {
                const d = Number(parts[0])
                const m = Number(parts[1])
                const y = Number(parts[2])
                return new Date(y, m - 1, d)
            }
            return null
        }

        const start = parseDatePickerDate(dateFilter.value.startDate)
        const end = parseDatePickerDate(dateFilter.value.endDate)
        if (end) {
            end.setHours(23, 59, 59, 999)
        }

        return matches.filter(m => {
            const matchDate = new Date(m.timestamp * 1000)
            if (start && matchDate < start) return false
            if (end && matchDate > end) return false
            return true
        })
    })

    const chartMatchesOldestFirst = computed(() => {
        return [...chartFilteredMatches.value].reverse().filter(m => !!findPlayer(m))
    })

    const setQuickRange = (range: 'all' | 5 | 10 | 20) => {
        activeQuickRange.value = range
        if (!filteredMatches.value.length) return

        if (range === 'all') {
            dateFilter.value = {
                startDate: minMatchDateStr.value,
                endDate: maxMatchDateStr.value
            }
        } else {
            const slice = filteredMatches.value.slice(0, range)
            if (slice.length) {
                const timestamps = slice.map(m => m.timestamp)
                const minT = Math.min(...timestamps)
                const maxT = Math.max(...timestamps)
                dateFilter.value = {
                    startDate: formatToDatePicker(minT),
                    endDate: formatToDatePicker(maxT)
                }
            }
        }
    }

    const checkActivePreset = () => {
        if (!filteredMatches.value.length) return

        if (dateFilter.value.startDate === minMatchDateStr.value && dateFilter.value.endDate === maxMatchDateStr.value) {
            activeQuickRange.value = 'all'
            return
        }

        for (const range of [5, 10, 20] as const) {
            const slice = filteredMatches.value.slice(0, range)
            if (slice.length) {
                const timestamps = slice.map(m => m.timestamp)
                const minStr = formatToDatePicker(Math.min(...timestamps))
                const maxStr = formatToDatePicker(Math.max(...timestamps))
                if (dateFilter.value.startDate === minStr && dateFilter.value.endDate === maxStr) {
                    activeQuickRange.value = range
                    return
                }
            }
        }

        activeQuickRange.value = '' as any
    }

    // Watch filteredMatches to set default dates
    watch(filteredMatches, (newMatches) => {
        if (newMatches && newMatches.length) {
            dateFilter.value = {
                startDate: minMatchDateStr.value,
                endDate: maxMatchDateStr.value
            }
            activeQuickRange.value = 'all'
        }
    }, { immediate: true })

    // Watch dates to synchronize quick range active state
    watch(() => dateFilter.value, () => {
        checkActivePreset()
    }, { deep: true })

    // ═══════════════════════════════════════════
    // ── MEJORES REGISTROS (Highlight Stats) ──
    // ═══════════════════════════════════════════
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
            console.log('result',m.result)
            if (m.result === 'win') currentStreak++
            else{
                console.log('loosed match -> break',m)
                break
            }
        }
        console.log('currentStreak',currentStreak)
        // Max streak scanning all
        let tmpStreak = 0
        for (const m of [...matches].reverse()) {
            if (m.result === 'win') { tmpStreak++; if (tmpStreak > maxStreak) maxStreak = tmpStreak }
            else tmpStreak = 0
        }
        console.log('tmpStreak',tmpStreak)
        console.log('maxStreak',maxStreak)

        return [
            { icon: '⭐', label: 'Mejor Valoración', value: bestRating.toFixed(1), sub: `vs ${bestRatingRival}`, matchId: bestRatingMatchId },
            { icon: '⚽', label: 'Máx. Goles', value: bestGoals, sub: `vs ${bestGoalsRival}`, matchId: bestGoalsMatchId },
            { icon: '🅰️', label: 'Máx. Asistencias', value: bestAssists, sub: `vs ${bestAssistsRival}`, matchId: bestAssistsMatchId },
            { icon: '🔥', label: 'Racha Victorias', value: currentStreak > 0 ? `${currentStreak} actual` : `${maxStreak} mejor`, sub: currentStreak > 0 ? 'Racha activa' : 'Récord histórico' },
            { icon: '💥', label: 'Máx. G+A', value: bestGA, sub: `vs ${bestGARival}`, matchId: bestGAMatchId },
            { icon: '🏅', label: 'MVPs Totales', value: totalMvp, sub: `${matches.length} partidos` },
            { icon: '📊', label: 'Media Valoración', value: (props.stats?.ratingAve ?? 0).toFixed(2), sub: 'Histórica' },
            { icon: '🎯', label: 'G+A / Partido', value: (props.stats?.goalsPlusAssistsPerMatch ?? 0).toFixed(2), sub: 'Media por partido' },
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
    const evolutionChartData = computed(() => {
        const matches = chartMatchesOldestFirst.value
        if (matches.length === 0) return null

        const dataPoints: number[] = []
        const labels: string[] = []

        matches.forEach((m) => {
            const p = findPlayer(m)
            if (!p) return

            const val = getMetricValue(p, evolutionMetric.value)

            dataPoints.push(val)
            labels.push(formatDate(m.timestamp))
        })

        const avg = dataPoints.length > 0 ? dataPoints.reduce((a, b) => a + b, 0) / dataPoints.length : 0

        return {
            labels,
            datasets: [
                {
                    label: 'Partido',
                    data: dataPoints,
                    borderColor: '#C80D0D',
                    backgroundColor: 'rgba(200, 13, 13, 0.08)',
                    borderWidth: 3,
                    pointBackgroundColor: '#C80D0D',
                    pointBorderColor: '#fff',
                    pointRadius: 4,
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

     const evolutionOptions = computed<ChartOptions<'line'>>(() => ({
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        layout: {
            padding: { left: 4, right: 4, top: 4, bottom: 0 }
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
                }
            },
            y: {
                grid: { color: 'rgba(166, 173, 187, 0.08)' },
                ticks: {
                    color: 'rgba(166, 173, 187, 0.5)',
                    padding: 4,             
                    maxTicksLimit: 6, 
                    font: { size: 11 },
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
            date: formatDate(m.timestamp),
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
                backgroundColor: ratings.map(r => r >= avg ? '#C80D0D' : 'rgba(200, 13, 13, 0.4)'),
                borderRadius: 4,
                barThickness: isMobile.value ? 28 : 40,
                maxBarThickness: 50
            }]
        }
    })

    const recentBarOptions = computed<ChartOptions<'bar'>>(() => ({
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
        return filteredMatchesWithPlayer.value.map(m => {
            const p = findPlayer(m)!
            return {
                matchId: m.matchId,
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
