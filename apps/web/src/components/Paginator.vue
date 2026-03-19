<template>
    <div class="join">
        <button class="join-item btn btn-sm" @click="firstPage()" :disabled="isInFirstPage">1</button>
        <button class="join-item btn btn-sm" @click="previousPage()" :disabled="isInFirstPage">
            <svg class="w-6 h-6 " aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
            <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m14 8-4 4 4 4"/>
            </svg>

        </button>

        <div class="join">
            <input v-for="page in pagination.pages" :key="page" class="join-item btn btn-square btn-sm" type="radio" name="pageradio"
            :aria-label="page.toString()" @click="setPage(page)" :checked="page===currentPage"
            :class="{
                'pointer-events-none': page===currentPage,
                'select-none': page===currentPage,
            }"
            />
        </div>

        <button class="join-item btn btn-sm" @click="nextPage()" :disabled="isInLastPage">
            <svg class="w-6 h-6" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
            <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m10 16 4-4-4-4"/>
            </svg>

        </button>
        <button class="join-item btn btn-sm" @click="lastPage()" :disabled="isInLastPage">{{ pageCount }}</button>
    </div>
</template>
<script setup lang="ts">
import { computed } from 'vue';
    
    const emit = defineEmits<{
        (e: 'pagechange', number:number)
    }>()

    interface IProps {
        maxButtons?: number
        itemsPerPage: number
        currentPage: number,
        itemsCount: number
    }

    const props = withDefaults(defineProps<IProps>(), {
        maxButtons: 3,
    })

    const pageCount = computed(() =>
        Math.ceil(props.itemsCount / props.itemsPerPage)
    );
    
    /**https://github.com/peshanghiwa/vue-awesome-paginate */
    const pagination = computed(() => {
        let startPage: number, endPage: number;

        if (pageCount.value <= props.maxButtons) {
            startPage = 1;
            endPage = pageCount.value;
        } else {
            let maxPagesShownBeforeCurrentPage = Math.floor(props.maxButtons / 2);
            let maxPagesShownAfterCurrentPage = Math.ceil(props.maxButtons / 2) - 1;
            if (props.currentPage <= maxPagesShownBeforeCurrentPage) {
            // current page is at the start of the pagination
            startPage = 1;
            endPage = props.maxButtons;
            } else if (
            props.currentPage + maxPagesShownAfterCurrentPage >=
            pageCount.value
            ) {
            // current page is at the end of the pagination
            startPage = pageCount.value - props.maxButtons + 1;
            endPage = pageCount.value;
            } else {
            // current page is somewhere in the middle of the pagination
            startPage = props.currentPage - maxPagesShownBeforeCurrentPage;
            endPage = props.currentPage + maxPagesShownAfterCurrentPage;
            }
        }
        // create an array of pages to be displayed
        let pages = Array.from(Array(endPage + 1 - startPage).keys()).map(
            (i) => startPage + i
        );

        return {
            startPage: startPage,
            endPage: endPage,
            pages: pages,
        };
    });

    const isInFirstPage = computed(()=>{
        return props.currentPage === 1
    })

    const isInLastPage = computed(()=>{
        return props.currentPage === pageCount.value
    })

    function firstPage(){
        emit('pagechange', 1)
    }

    function previousPage(){
        emit('pagechange', props.currentPage - 1)
    }

    function setPage(pagenumber: number){
        emit('pagechange', pagenumber)
    }

    function nextPage(){
        emit('pagechange', props.currentPage + 1)
    }

    function lastPage(){
        emit('pagechange', pageCount.value)
    }

</script>