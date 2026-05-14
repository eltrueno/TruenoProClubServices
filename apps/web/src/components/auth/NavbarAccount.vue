<script setup lang="ts">
import { useAuth } from '@/composables/useAuth';
import { onMounted, ref } from 'vue';

const { isLoggedIn, user } = useAuth();
const isMounted = ref(false);

onMounted(() => {
  isMounted.value = true;
});
</script>

<template>
  <div class="tooltip tooltip-left" :data-tip="isMounted ? (isLoggedIn ? 'Mi Cuenta' : 'Entrar') : '...'">
    <a href="/micuenta" class="btn btn-sm h-9 min-h-[2.25rem] w-9 md:w-auto border-none hover:bg-gray-100 rounded-full px-0 md:px-3 flex items-center justify-center gap-2" style="background-color: white; color: black;" aria-label="Mi cuenta">
      <template v-if="isMounted">
        <div v-if="isLoggedIn && user?.image" class="avatar">
          <div class="w-7 rounded-full ring-1 ring-primary ring-offset-white ring-offset-1">
            <img :src="user.image" :alt="user.name || 'Usuario'" />
          </div>
        </div>
        <div v-else class="flex items-center justify-center">
          <svg class="w-6 h-6" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
            <path fill-rule="evenodd" d="M12 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm-2 9a4 4 0 0 0-4 4v1a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-1a4 4 0 0 0-4-4h-4Z" clip-rule="evenodd"/>
          </svg>
        </div>
        <span class="font-bold text-xs uppercase hidden sm:inline">Cuenta</span>
      </template>
      <div v-else class="flex items-center gap-2">
        <div class="w-7 h-7 rounded-full bg-base-100/10 animate-pulse"></div>
        <div class="w-16 h-4 bg-base-100/10 animate-pulse hidden sm:block"></div>
      </div>
    </a>
  </div>
</template>


