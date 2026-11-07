<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useAuth } from '@/composables/useAuth';
import { translateRole } from '@/i18n/translations';
import { routes } from '@/lib/query';
import { CLUB } from '@/config/club';
import { accountsLoginUrl, accountsUrl } from '@/lib/accounts';
import OptionToggle, { type ToggleOption } from '@/components/ui/OptionToggle.vue';

import ChevronDown from '@/icons/chevron-down.svg?component';
import UserRound from '@/icons/user-circle.svg?component';
import SettingsIcon from '@/icons/settings.svg?component';
import LogOut from '@/icons/signout.svg?component';
import LogIn from '@/icons/signin.svg?component';
import Shield from '@/icons/shield-check.svg?component';
import LinkIcon from '@/icons/link.svg?component';
import SunIcon from '@/icons/sun.svg?component';
import MonitorIcon from '@/icons/monitor.svg?component';
import MoonIcon from '@/icons/moon.svg?component';

const { isLoggedIn, isPending, user, logout, isAdmin, myMember, myPlayerId, myMemberLoaded, loadMyMember } = useAuth();

// Jugador de la cuenta: con él, "Mi jugador" lleva a su ficha aquí; vinculado pero sin partidos en este
// club, el botón sale desactivado; sin vincular, lleva a accounts para pedirlo
watch(isLoggedIn, (logged) => { if (logged) loadMyMember(); }, { immediate: true });
const linkedElsewhere = computed(() => !myMember.value && !!myPlayerId.value);

// Login y ajustes en accounts.casemuro.stream (comunes a todos los clubes). Al loguearse se vuelve aquí.
const loginHref = ref(accountsLoginUrl(CLUB.siteUrl));
const settingsHref = accountsUrl();
const linkPlayerHref = accountsUrl('mi-jugador');
const refreshLoginHref = () => { loginHref.value = accountsLoginUrl(window.location.href); };

// Tema: es lo único de ajustes que se queda en la web de cada club
type ThemeChoice = 'light' | 'dark' | 'system';
const THEME_OPTIONS: ToggleOption<ThemeChoice>[] = [
  { value: 'light', label: 'Tema claro', icon: SunIcon, iconOnly: true },
  { value: 'system', label: 'Tema del sistema', icon: MonitorIcon, iconOnly: true },
  { value: 'dark', label: 'Tema oscuro', icon: MoonIcon, iconOnly: true },
];
const currentTheme = ref<ThemeChoice>('system');
const setTheme = (theme: ThemeChoice) => {
  currentTheme.value = theme;
  localStorage.setItem('theme', theme);
  const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
};

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
  const stored = localStorage.getItem('theme');
  currentTheme.value = stored === 'light' || stored === 'dark' ? stored : 'system';
  refreshLoginHref();
  document.addEventListener('astro:after-swap', closeDropdown);
  document.addEventListener('astro:after-swap', refreshLoginHref);
});
onUnmounted(() => {
  document.removeEventListener('astro:after-swap', closeDropdown);
  document.removeEventListener('astro:after-swap', refreshLoginHref);
});
</script>

<template>
  <div class="dropdown dropdown-end">
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
            <a :href="settingsHref" @click="closeDropdown" class="btn btn-ghost justify-start gap-3">
              <SettingsIcon class="size-5" />
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

          <li v-if="!myMemberLoaded"><div class="skeleton h-10 w-full rounded-field"></div></li>
          <li v-else-if="myMember">
            <a :href="routes.player(myMember.playerId)" @click="closeDropdown" class="btn btn-primary justify-start gap-3">
              <UserRound class="size-5" />
              Mi jugador
            </a>
          </li>
          <!-- Tiene jugador, pero no ha jugado nunca en este club: no hay ficha que enseñar -->
          <li v-else-if="linkedElsewhere" class="pointer-events-none">
            <span class="btn btn-soft btn-disabled justify-start gap-3 h-auto min-h-10 py-2 text-left leading-tight">
              <UserRound class="size-5 shrink-0" />
              <span>Mi jugador<br /><span class="text-[11px] font-normal opacity-70">Aún no has jugado en {{ CLUB.name }}</span></span>
            </span>
          </li>
          <li v-else>
            <a :href="linkPlayerHref" @click="closeDropdown" class="btn btn-primary justify-start gap-3">
              <LinkIcon class="size-5" />
              Vincular mi jugador
            </a>
          </li>

          <li>
            <button @click="logout(); closeDropdown()" class="btn btn-ghost justify-start gap-3 text-base-content/70 hover:text-error hover:bg-error/10">
              <LogOut class="size-5" />
              Cerrar sesión
            </button>
          </li>
        </template>

        <template v-else>
          <li>
            <a :href="loginHref" @click="closeDropdown" class="btn btn-ghost justify-start gap-3">
              <LogIn class="size-5" />
              Iniciar sesión
            </a>
          </li>
        </template>

        <div class="divider my-0"></div>
        <!-- menu-title: DaisyUI no le pone hover ni cursor de enlace (como el nombre de arriba); el toggle sí se puede pulsar -->
        <!-- Como el nombre de arriba, la fila no recibe clics (si no, DaisyUI la ilumina al pulsar); solo el toggle -->
        <li class="menu-title pointer-events-none flex flex-row items-center justify-between gap-3 px-3 py-1.5 normal-case">
          <span class="text-xs font-semibold text-base-content/60 select-none">Tema</span>
          <div class="pointer-events-auto">
            <OptionToggle :model-value="currentTheme" @update:model-value="setTheme" :options="THEME_OPTIONS" size="sm" />
          </div>
        </li>
      </ul>
    </template>
  </div>
</template>
