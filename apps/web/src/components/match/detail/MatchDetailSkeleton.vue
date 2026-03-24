<template>
    <div class="flex w-full flex-col items-center justify-center align-middle">
        <div class="skeleton dark:bg-base-100 w-64 h-10 skeletondark"></div>
        <div class="skeleton dark:bg-base-100 w-96 h-6 skeletondark mt-3"></div>
        <div class="flex gap-4 py-4 mt-2">
            <div class="skeleton dark:bg-base-100 w-56 h-16 skeletondark"></div>
            <div class="skeleton dark:bg-base-100 w-56 h-16 skeletondark hidden md:block"></div>
            <div class="skeleton dark:bg-base-100 w-56 h-16 skeletondark hidden md:block"></div>
        </div>
        <div class="w-full flex flex-col md:flex-row mt-4 lg:mt-1 gap-4 h-fit">
            <div class="flex-1 flex align-middle bg-base-200 rounded-lg shadow-md p-4 overflow-hidden">
                <div class="skeleton dark:bg-base-100 skeletondark hidden md:flex max-w-[30%] xl:max-w-[20%] object-contain" 
                style="aspect-ratio: 40/97;"></div>
                <div class="flex flex-col w-full">
                    <div class="inline-flex gap-2 self-center">
                        <div class="skeleton dark:bg-base-100 w-96 h-6 skeletondark"></div>
                    </div>
                    <div class="self-center skeleton dark:bg-base-100 w-64 h-3 skeletondark mt-2"></div>
                    <div class="relative overflow-hidden py-1 px-4 w-full bg-base-100 dark:bg-base-300 rounded-lg mt-4 mx-2">
                        <div class="w-full flex flex-col my-4 text-lg gap-y-3 p-4">
                            <div class="skeleton dark:bg-base-100 w-full h-4 skeletondark" v-for="n in 9" :key="n"></div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="flex justify-center items-center md:w-auto md:basis-5/12 xl:basis-4/12 md:flex-shrink-0">
                <div class="skeleton dark:bg-base-100 w-full max-w-md aspect-[3/4] skeletondark"></div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.skeletondark {
    background-image: linear-gradient( 105deg, transparent 0%, transparent 35%, rgba(108, 108, 108, 0.2) 50%, transparent 65%, transparent 100% );
}
</style>
