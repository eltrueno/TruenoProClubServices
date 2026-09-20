<script setup lang="ts">
import { useAuth } from '@/composables/useAuth';
import { onMounted, onUnmounted, ref } from 'vue';
import { translateRole } from '@/i18n/translations';

const { isLoggedIn, user, logout, isAdmin } = useAuth();
const isMounted = ref(false);
const dropdownRef = ref<HTMLDetailsElement | null>(null);

const closeDropdown = () => {
  if (dropdownRef.value) {
    dropdownRef.value.removeAttribute('open');
  }
  if (document.activeElement instanceof HTMLElement) {
    document.activeElement.blur();
  }
};

onMounted(() => {
  isMounted.value = true;
  // Forzar cierre en cambios de página de Astro (View Transitions)
  document.addEventListener('astro:after-swap', closeDropdown);
  document.addEventListener('astro:page-load', closeDropdown);
});

onUnmounted(() => {
  document.removeEventListener('astro:after-swap', closeDropdown);
  document.removeEventListener('astro:page-load', closeDropdown);
});
</script>

<template>
  <!-- Usuario Autenticado -->
  <details 
    v-if="isLoggedIn" 
    ref="dropdownRef"
    class="dropdown dropdown-end"
  >
    <summary 
      class="tooltip tooltip-left list-none cursor-pointer [&::-webkit-details-marker]:hidden" 
      :data-tip="'Mi Cuenta'"
    >
      <div 
        class="btn btn-sm h-9 min-h-[2.25rem] shadow-md w-9 md:w-auto border-none hover:bg-gray-100 rounded-full px-0 md:px-3 flex items-center justify-center gap-2" 
        style="background-color: white; color: black;" 
        aria-label="Mi cuenta"
      >
        <template v-if="isMounted">
          <div v-if="user?.image" class="avatar">
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
      </div>
    </summary>

    <ul tabindex="0" class="dropdown-content menu bg-base-200 rounded-box z-[100] w-64 p-2 shadow-xl border border-base-200 mt-2">
      <li class="px-4 py-3 mb-1 border-b border-base-200 cursor-default pointer-events-none">
        <div class="flex flex-col gap-0.5 p-0 hover:bg-transparent cursor-default">
          <span class="font-bold text-base leading-tight text-base-content">{{ user?.name }}</span>
          <span class="badge badge-xs badge-primary font-bold text-[10px] uppercase tracking-wide px-2 py-2.5 rounded-md">{{ user?.role ? translateRole(user.role) : 'Visitante' }}</span>
        </div>
      </li>
      <li>
        <a href="/micuenta" @click="closeDropdown" class="flex items-center gap-3 py-2.5 text-base-content">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M17.982 18.725A7.488 7.488 0 0 0 12 15.75a7.488 7.488 0 0 0-5.982 2.975m11.963 0a9 9 0 1 0-11.963 0m11.963 0A8.966 8.966 0 0 1 12 21a8.966 8.966 0 0 1-5.982-2.275M15 9.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
          </svg>
          Mi Cuenta
        </a>
      </li>
      <li v-if="isAdmin">
        <a href="/admin" @click="closeDropdown" class="flex items-center gap-3 py-2.5 text-base-content">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
            <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
          </svg>
          Admin
        </a>
      </li>
      <li>
        <button @click="logout(true); closeDropdown()" class="flex items-center gap-3 py-2.5 text-error hover:text-error hover:bg-error/10 transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
          </svg>
          Cerrar sesión
        </button>
      </li>
    </ul>
  </details>

  <!-- Usuario No Autenticado o Cargando -->
  <div v-else class="tooltip tooltip-left" :data-tip="isMounted ? 'Entrar' : '...'">
    <a 
      href="/micuenta" 
      class="btn btn-sm h-9 min-h-[2.25rem] shadow-md w-9 md:w-auto border-none hover:bg-gray-100 rounded-full px-0 md:px-3 flex items-center justify-center gap-2" 
      style="background-color: white; color: black;" 
      aria-label="Mi cuenta"
    >
      <template v-if="isMounted">
        <div class="flex items-center justify-center">
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


