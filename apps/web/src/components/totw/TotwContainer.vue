<template>
    <div class="w-full flex flex-col">
        <header class="flex flex-col justify-center align-middle overflow-x-hidden">
            <TotwTitle v-if="selectedType=='best'" :title="'ONCE DE LA SEMANA'" :subtitle="weekRangeString" :variant="'best'" />
            <TotwTitle v-else :title="'ONCE DE LA VERGÜENZA'" :subtitle="weekRangeString" :variant="'worst'" />
            <div class="w-fit mx-auto flex flex-col justify-center align-middle">
                <span class="text-center text-2xl">Próximo equipo:</span>
                <div class="grid auto-cols-max grid-flow-col gap-5 text-center">
                    <div class="flex flex-col">
                        <span class="countdown font-mono text-2xl">
                            <span :style="`--value: ${timeLeft.days}`"></span>
                        </span>
                        días
                    </div>
                    <div class="flex flex-col">
                        <span class="countdown font-mono text-2xl">
                            <span :style="`--value: ${timeLeft.hours}`"></span>
                        </span>
                        horas
                    </div>
                    <div class="flex flex-col">
                        <span class="countdown font-mono text-2xl">
                            <span :style="`--value: ${timeLeft.minutes}`"></span>
                        </span>
                        min
                    </div>
                    <div class="flex flex-col">
                        <span class="countdown font-mono text-2xl">
                            <span :style="`--value: ${timeLeft.seconds}`"></span>
                        </span>
                        seg
                    </div>
                </div>
            </div>
            <div class="join w-fit mx-auto" v-if="!isloading && !hasError">
                <button class="join-item btn" :class="{ 'btn-disabled': selectedIndex==0 }" @click="selectedIndex--"><</button>
                <button class="join-item btn">Semana {{selectedTotw?.weekNumber}}</button>
                <button class="join-item btn" :class="{ 'btn-disabled': selectedIndex==totwSorted.length-1 }" @click="selectedIndex++">></button>
            </div>
        </header>

        <div v-if="isloading" role="container" class="w-full flex flex-col gap-8">
            <!-- Header Skeleton -->
            <div class="flex flex-col items-center py-6 gap-6">                
                <div class="join mt-2">
                    <div class="skeleton dark:bg-base-100 skeletondark h-12 w-12 join-item rounded-r-none"></div>
                    <div class="skeleton dark:bg-base-100 skeletondark h-12 w-32 join-item rounded-none"></div>
                    <div class="skeleton dark:bg-base-100 skeletondark h-12 w-12 join-item rounded-l-none"></div>
                </div>
                <div class="join mt-2">
                    <div class="skeleton dark:bg-base-100 skeletondark h-12 w-24 join-item rounded-r-none"></div>
                    <div class="skeleton dark:bg-base-100 skeletondark h-12 w-24 join-item rounded-l-none"></div>
                </div>
            </div>
            <!-- Cards Skeleton -->
            <div class="w-full px-4 pb-8">
                <div class="flex flex-wrap justify-center gap-6">
                    <div v-for="i in 11" :key="i" class="skeleton dark:bg-base-100 skeletondark w-[188px] rounded-xl shrink-0" style="aspect-ratio: 8/9;"></div>
                </div>
            </div>
        </div>

        <div v-else-if="hasError" role="container" class="flex flex-col h-full overflow-hidden">
            <h3 class="text-center text-2xl p-3">Ha ocurrido un error al obtener los datos del equipo de la semana :/ {{ errorText }}</h3>
            <div class="flex place-content-center p-6">
                <img src="/illustrations/bugfixingsvg.svg" class="lg:w-2/3 w-full select-none pointer-events-none" alt="Image representing error">
            </div>
        </div>
        <div v-else role="container" class="w-full p-4">
            <TotwItem :totw="selectedTotw" v-model:isBest="isBestValue" />
        </div>
    </div>
</template>

<script setup lang="ts">
    import { onBeforeMount, computed, ref, type Ref, type ComputedRef, onUnmounted, onMounted } from 'vue';
    import TotwAllService from "@/services/TotwAllService";
    import type TotwEntity from "@/model/totw/TotwEntity";
    import TotwTitle from './TotwTitle.vue';
    import TotwItem from './TotwItem.vue';

    const totwAllService = new TotwAllService()
    const totwList: Ref<Array<TotwEntity>> = totwAllService.getData()
    const isloading:Ref<boolean> = totwAllService.isloading as Ref<boolean>
    const errorText:Ref<string> = totwAllService.getError() as Ref<string>
    const hasError:Ref<boolean> = totwAllService.getHasError() as Ref<boolean>

    const selectedType:Ref<string> = ref('best')
    const selectedIndex:Ref<number> = ref(0)

    const totwSorted: ComputedRef<TotwEntity[]> = computed(() => {
        return totwList.value.slice().reverse()
    })
    const selectedTotw:Ref<TotwEntity | undefined> = computed(() => totwSorted.value.at(selectedIndex.value))

    onBeforeMount(async () => {
        await totwAllService.fetch()
        selectedIndex.value = totwSorted.value.length-1
    })

    function getIsoWeekRange(weekKey: string) {
        const [yearStr, weekStr] = weekKey.split('-')
        const year = parseInt(yearStr)
        const week = parseInt(weekStr)

        const jan4 = new Date(year, 0, 4)
        const dayOfWeek = jan4.getDay() || 7
        const mondayOfWeek1 = new Date(jan4)
        mondayOfWeek1.setDate(jan4.getDate() - dayOfWeek + 1)

        const monday = new Date(mondayOfWeek1)
        monday.setDate(monday.getDate() + (week - 1) * 7)

        const sunday = new Date(monday)
        sunday.setDate(monday.getDate() + 6)

        return { monday, sunday }
    }

    function getNextMonday(): Date {
        const today = new Date()
        const day = today.getDay()
        const daysUntilNextMonday = (8 - day) % 7 || 7
        const nextMonday = new Date(today)
        nextMonday.setDate(today.getDate() + daysUntilNextMonday)
        nextMonday.setHours(0, 0, 0, 0)
        return nextMonday
    }

    function getTimeLeft(targetDate: Date) {
        const now = new Date()
        const diff = targetDate.getTime() - now.getTime()

        if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 }

        const days = Math.floor(diff / (1000 * 60 * 60 * 24))
        const hours = Math.floor((diff / (1000 * 60 * 60)) % 24)
        const minutes = Math.floor((diff / (1000 * 60)) % 60)
        const seconds = Math.floor((diff / 1000) % 60)

        return { days, hours, minutes, seconds }
    }

    const weekRangeString: ComputedRef<string> = computed(() => {
        if (!selectedTotw.value) return ""
        const range = getIsoWeekRange(selectedTotw.value.weekIso)
        return `${range.monday.toLocaleDateString()} - ${range.sunday.toLocaleDateString()}`
    })

    const isBestValue = computed({
        get: () => selectedType.value === 'best',
        set: (val) => selectedType.value = val ? 'best' : 'worst'
    })

    const timeLeft = ref(getTimeLeft(getNextMonday()))

    let timer: number
    onMounted(() => {
        timer = window.setInterval(() => {
            timeLeft.value = getTimeLeft(getNextMonday())
        }, 1000)
    })

    onUnmounted(() => {
        clearInterval(timer)
    })

</script>

<style scoped>
.skeletondark {
    background-image: linear-gradient( 105deg, transparent 0%, transparent 35%, rgba(108, 108, 108, 0.2) 50%, transparent 65%, transparent 100% );
}
</style>