<template>
    <div v-if="isloading">
        <div class="flex justify-center items-center">
            <div class="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
        </div>
    </div>
    <div v-else-if="hasError">
        <div class="flex justify-center items-center">
            <div class="text-red-500">Error al cargar los logros: {{ errorText }}</div>
        </div>
    </div>
    <div v-else>
        <div class="flex flex-col justify-center items-center">
            <div class="flex flex-col w-full justify-center ">
                <span>Leyenda</span>
                <br>
                <span class="my-1">Tipo: tipo de logro: official (partidos oficiales), friendly (partidos amistosos), general (otras cosas)</span>
                <span class="my-1">Ámbito: ámbito de logro: cumulative (referente al acumulativo de estadisticas sumando todos los partidos), match (referente a las estadisticas de un partido individual)</span>
                <span class="my-1">Modo: modo de logro: infinite (se puede conseguir infinitas veces, sería lo llamados hitos), unique (se puede conseguir una vez)</span>
                <span class="my-1">Paso: paso de logro: paso de logro. solo aplica al modo infinite, seria cada cuanto X salta el logro, ej: cada 50 goles</span>
                <span class="my-1">Umbral: umbral de logro: umbral de logro. Cuando se alcanza este umbral (es decir, un numero igual a superior, el logro salta)</span>
                <span class="my-1">Exacto: exacto de logro: exacto de logro. Lo mismo pero tiene que ser el numero exacto</span>

                <br>
                <br>
                <span>Si algo esta vacio, es porque no aplica al logro. Un logro solo puede tener o umbral o exacto por ejemplo</span>
            </div>
            <div class="text-primary font-bold text-3xl text-center mt-8 p-8 space-y-1">
                <div v-for="(ach, index) in achievements" class="collapse bg-base-200 my-1">
                    <input type="radio" name="achievAccord" :checked="index == 0" />
                    <div class="collapse-title text-xl font-medium flex flex-col justify-center items-center">
                        <span class="text-primary">{{ ach.name }}</span>
                        <span class="badge badge-primary">{{ ach.category }}</span>
                        <span class="text-xs text-neutral-content">{{ ach._id }}</span>
                    </div>
                    <div class="collapse-content text-primary-content font-normal text-base">
                        <p class="text-primary">{{ ach.description }}</p>
                        <p class="text-primary">Nombre visible: {{ ach.name }}</p>
                        <p>Tipo: {{ ach.type }}</p>
                        <p>Modo: {{ ach.mode }}</p>
                        <p>Ámbito: {{ ach.scope }}</p>
                        <p>Paso: {{ ach.step }}</p>
                        <p>Umbral: {{ ach.threshold }}</p>
                        <p>Exacto: {{ ach.exact }}</p>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
    import type AchievementDefinitionEntity from "@/model/AchievementDefinitionEntity";
    import AchievementDefService from "@/services/AchievementDefService"
    import { onBeforeMount, computed, watch, reactive, ref, type Ref } from 'vue';

    const achievementDefService = new AchievementDefService()
    const achievements: Ref<Array<AchievementDefinitionEntity>> = achievementDefService.getData()
    const isloading = achievementDefService.isloading
    const errorText = achievementDefService.getError()
    const hasError:Boolean = (errorText.value=='') ? false : true

    onBeforeMount(async () => {
        await achievementDefService.fetch()
    })
</script>