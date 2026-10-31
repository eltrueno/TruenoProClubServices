<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue';
import { useAuth } from '@/composables/useAuth';
import { translateRole } from '@/i18n/translations';
import { routes } from '@/lib/query';
import { CLUB } from '@/config/club';

import ChevronDown from '@/icons/chevron-down.svg?component';
import UserRound from '@/icons/user-circle.svg?component';
import SettingsIcon from '@/icons/settings.svg?component';
import LogOut from '@/icons/signout.svg?component';
import LogIn from '@/icons/signin.svg?component';
import Shield from '@/icons/shield-check.svg?component';
import LinkIcon from '@/icons/link.svg?component';

const { isLoggedIn, isPending, user, logout, isAdmin, myMember, myMemberLoaded, loadMyMember } = useAuth();

// Jugador vinculado (para "Mi jugador" / "Vincular mi jugador"): cacheado y compartido con Ajustes
watch(isLoggedIn, (logged) => { if (logged) loadMyMember(); }, { immediate: true });
const dropdownRef = ref<HTMLDivElement | null>(null);

// Pastilla de la cuenta: blanca sobre una nav del color del club (City) y del color del club sobre una
// nav con el fondo del tema (United, headerStyle "base"), para que destaque en las dos
const brandPill = CLUB.headerStyle === 'base';
const pillClass = brandPill
  ? 'bg-primary text-primary-content hover:bg-primary/85'
  : 'bg-white text-black hover:bg-gray-100';
const pillPendingClass = brandPill ? 'bg-primary/80' : 'bg-white/90';

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
    <div v-if="isPending" class="btn btn-sm h-9 rounded-full border-none px-2 cursor-default" :class="pillPendingClass">
      <div class="skeleton size-7 rounded-full shrink-0 bg-base-300"></div>
      <div class="skeleton hidden sm:block h-3 w-16 bg-base-300"></div>
      <ChevronDown class="size-4 opacity-30" :class="brandPill ? 'text-primary-content' : 'text-black'" />
    </div>

    <template v-else>
      <div
        tabindex="0"
        role="button"
        class="btn btn-sm h-9 rounded-full border-none px-2 sm:pr-3 shadow-md gap-2"
        :class="pillClass"
        aria-label="Mi Cuenta"
      >
        <div class="avatar">
          <div v-if="isLoggedIn && user?.image" class="size-7 rounded-full">
            <img :src="user.image" :alt="user.name || 'Usuario'" />
          </div>
          <UserRound v-else class="size-7 opacity-80" />
        </div>
        <span class="hidden sm:inline font-semibold text-sm max-w-32 truncate">
          {{ isLoggedIn ? user?.name : 'Inicia Sesión' }}
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
              <SettingsIcon class="size-5" />
              Ajustes
            </a>
          </li>

          <li v-if="isAdmin">
            <a href="/admin" @click="closeDropdown" class="btn btn-ghost justify-start gap-3">
              <Shield class="size-5" />
              Panel de admin
            </a>
          </li>

          <div class="divider my-0"></div>

          <!-- Con jugador vinculado lleva a su ficha; sin él, a vincularlo en Ajustes -->
          <li v-if="!myMemberLoaded"><div class="skeleton h-10 w-full rounded-field"></div></li>
          <li v-else-if="myMember">
            <a :href="routes.player(myMember.playerId)" @click="closeDropdown" class="btn btn-soft btn-primary justify-start gap-3">
              <UserRound class="size-5" />
              Mi jugador
            </a>
          </li>
          <li v-else>
            <a href="/micuenta#mi-jugador" @click="closeDropdown" class="btn btn-soft btn-primary justify-start gap-3">
              <LinkIcon class="size-5" />
              Vincular mi jugador
            </a>
          </li>

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
