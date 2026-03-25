<template>
    <div v-if="!hasError">
        <div id="to_image" class="toimage flex w-full flex-initial overflow-hidden bg-base-200" v-if="!isloading">
            <div class="w-full mx-auto flex flex-col justify-center align-middle text-center p-2 shadow-md mt-2">
                <div v-for="([position,players]) in totwPlayersByPosition" :key="position">
                    <div v-if="position!='goalkeeper'" class="divider w-full md:w-10/12 mx-auto font-bold text-lg text-primary"></div>
                    <div class="flex flex-wrap justify-center align-middle text-center gap-8">
                        <TotwPlayerCard v-for="player in players" :key="player.playerName" :player="player" :variant="props.type == 'best' ? 'best' : 'worst'"
                        :imagePath="`/players/${player.playerName}_top_transp.png`" :placeholderPath="`/players/placeholder_top_transp.png`" />
                    </div>
                </div>
            </div>
        </div>
    </div>
    <div id="to_image" class="toimage flex flex-col  h-full" v-else-if="!isloading">
        <div class="m-auto p-28 pb-0 h-full">
            <p class="text-center font-bold text-5xl text-error">Ha ocurrido un error al generar la imágen</p>
        </div>
        <div class="flex place-content-center p-28 pt-4 h-full">
            <img src="/illustrations/bugfixingsvg.svg" class="select-none pointer-events-none" alt="Image representing error">
        </div>
    </div>
</template>
<script setup lang="ts">
    import { onBeforeMount, computed, ref, type Ref, type ComputedRef, onUnmounted, onMounted } from 'vue';
    import TotwService from "@/services/TotwService";
    import type TotwEntity from "@/model/totw/TotwEntity";
    import type { ITOTWPlayer } from '@/interfaces/totw.interface';
    import TotwPlayerCard from "@components/totw/TotwPlayerCard.vue";

    const props = defineProps({
        week: {
            type: String,
            required: true,
            default: "latest"
        },
        type: {
            type: String,
            required: false,
            default: "best"
        }
    })

    const totwService = new TotwService(props.week)
    const totw: Ref<TotwEntity> = totwService.getData()
    const isloading:Ref<boolean> = totwService.isloading as Ref<boolean>
    const hasError:Ref<boolean> = totwService.getHasError() as Ref<boolean>

    onBeforeMount(async () => {
        await totwService.fetch()
    })

    const totwPlayers: ComputedRef<ITOTWPlayer[]> = computed(() => {
        return props.type == "best" ? totw.value.bestPlayers : totw.value.worstPlayers
    })

    const totwPlayersByPosition: ComputedRef<Map<string, ITOTWPlayer[]>> = computed(() => {
        const map = new Map<string, ITOTWPlayer[]>()
        totwPlayers.value.forEach((player) => {
            const position = player.position
            if (!map.has(position)) {
                map.set(position, [])
            }
            map.get(position)!.push(player)
        })
        return map
    })

</script>

<style scoped>
    .toimage{
        width: 1920px;
        height: 1080px;
    }
</style>