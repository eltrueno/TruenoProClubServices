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
    <a href="/micuenta" class="btn btn-ghost btn-circle text-[#eeeeee]" aria-label="Mi cuenta">
      <template v-if="isMounted">
        <div v-if="isLoggedIn && user?.image" class="avatar">
          <div class="w-8 rounded-full ring ring-base-100/20 ring-offset-base-100 ring-offset-1">
            <img :src="user.image" :alt="user.name || 'Usuario'" />
          </div>
        </div>
        <div v-else class="flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>
      </template>
      <div v-else class="w-8 h-8 rounded-full bg-base-100/10 animate-pulse"></div>
    </a>
  </div>
</template>


