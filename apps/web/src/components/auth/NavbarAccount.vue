<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import { useAuth } from '@/composables/useAuth';
import { translateRole } from '@/i18n/translations';

import ChevronDown from '@/icons/chevron-down.svg?component';
import UserRound from '@/icons/user-circle.svg?component';
import UserIcon from '@/icons/user.svg?component';
import LogOut from '@/icons/signout.svg?component';
import LogIn from '@/icons/signin.svg?component';
import Shield from '@/icons/shield-check.svg?component';

const { isLoggedIn, isPending, user, logout, isAdmin } = useAuth();
const dropdownRef = ref<HTMLDivElement | null>(null);

// El dropdown de DaisyUI se abre por foco: quitándolo se cierra
const closeDropdown = () => {
  if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
};

onMounted(() => {
  document.addEventListener('astro:after-swap', closeDropdown);
});
onUnmounted(() => {
  document.removeEventListener('astro:after-swap', closeDropdown);
});
</script>

<template>
  <div ref="dropdownRef" class="dropdown dropdown-end">
    <!-- Cargando sesión -->
    <div v-if="isPending" class="btn btn-sm h-9 rounded-full border-none bg-white/90 px-2 cursor-default">
      <div class="skeleton size-7 rounded-full shrink-0 bg-base-300"></div>
      <div class="skeleton hidden sm:block h-3 w-16 bg-base-300"></div>
      <ChevronDown class="size-4 opacity-30 text-black" />
    </div>

    <template v-else>
      <div
        tabindex="0"
        role="button"
        class="btn btn-sm h-9 rounded-full border-none bg-white text-black hover:bg-gray-100 px-2 sm:pr-3 shadow-md gap-2"
        aria-label="Mi cuenta"
      >
        <div class="avatar">
          <div v-if="isLoggedIn && user?.image" class="size-7 rounded-full ring-1 ring-primary ring-offset-white ring-offset-1">
            <img :src="user.image" :alt="user.name || 'Usuario'" />
          </div>
          <UserRound v-else class="size-7 opacity-80" />
        </div>
        <span class="hidden sm:inline font-bold text-xs uppercase max-w-32 truncate">
          {{ isLoggedIn ? user?.name : 'Cuenta' }}
        </span>
        <ChevronDown class="size-4 opacity-70" />
      </div>

      <ul tabindex="0" class="dropdown-content menu mt-3 w-64 rounded-box border border-base-300 bg-base-200 text-base-content p-2 shadow-xl gap-1">
        <template v-if="isLoggedIn">
          <li class="menu-title cursor-default pointer-events-none my-1 flex flex-col items-center text-center">
            <span class="font-semibold text-base leading-tight text-base-content">{{ user?.name }}</span>
            <span class="mt-1 badge badge-primary badge-sm uppercase text-[10px] font-bold">{{ user?.role ? translateRole(user.role) : 'Visitante' }}</span>
          </li>

          <li>
            <a href="/micuenta" @click="closeDropdown" class="btn btn-ghost justify-start gap-3">
              <UserIcon class="size-5" />
              Mi cuenta
            </a>
          </li>

          <li v-if="isAdmin">
            <a href="/admin" @click="closeDropdown" class="btn btn-ghost justify-start gap-3">
              <Shield class="size-5" />
              Panel de admin
            </a>
          </li>

          <div class="divider my-0"></div>

          <li>
            <button @click="logout(true); closeDropdown()" class="btn btn-soft btn-error justify-start gap-3">
              <LogOut class="size-5" />
              Cerrar sesión
            </button>
          </li>
        </template>

        <template v-else>
          <li>
            <a href="/micuenta" @click="closeDropdown" class="btn btn-ghost justify-start gap-3">
              <LogIn class="size-5" />
              Iniciar sesión
            </a>
          </li>
        </template>
      </ul>
    </template>
  </div>
</template>
