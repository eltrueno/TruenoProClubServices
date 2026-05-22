<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue"
import { useAuth } from "@/composables/useAuth"
import AuthGuard from "@/components/auth/AuthGuard.vue"
import LoginWall from "@/components/auth/LoginWall.vue"
import { translateRole } from "@/i18n/translations"

const { user, syncTwitch, logout, deleteAccount, isLoggedIn } = useAuth()
const deleteModal = ref<HTMLDialogElement | null>(null)
const twitchSyncing = ref(false)


const syncCooldown = ref(0)
const COOLDOWN_TIME = 60 * 1000

const updateCooldown = () => {
  const lastSync = localStorage.getItem('last_twitch_sync')
  if (lastSync) {
    const elapsed = Date.now() - parseInt(lastSync)
    if (elapsed < COOLDOWN_TIME) {
      syncCooldown.value = Math.ceil((COOLDOWN_TIME - elapsed) / 1000)
      return
    }
  }
  syncCooldown.value = 0
}

let cooldownTimer: any = null

const handleSync = async (silent: boolean = false) => {
  if (!isLoggedIn.value || syncCooldown.value > 0) return
  twitchSyncing.value = true
  await syncTwitch(silent)
  localStorage.setItem('last_twitch_sync', Date.now().toString())
  updateCooldown()
  twitchSyncing.value = false
}

onMounted(() => {
  currentTheme.value = (localStorage.getItem('theme') as any) || 'system'
  updateCooldown()
  cooldownTimer = setInterval(updateCooldown, 1000)
})

onUnmounted(() => {
  if (cooldownTimer) clearInterval(cooldownTimer)
})

// Gestión de Temas
const currentTheme = ref<'light' | 'dark' | 'system'>('system')

const updateThemeClasses = (theme: string) => {
  const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light')
  if (isDark) {
    document.documentElement.classList.add('dark')
  } else {
    document.documentElement.classList.remove('dark')
  }
}

const setTheme = (theme: 'light' | 'dark' | 'system') => {
  currentTheme.value = theme
  localStorage.setItem('theme', theme)
  updateThemeClasses(theme)
}

// SVG icon paths reutilizables
const icons = {
  twitch: 'M26.711 14.929l-4.284 4.284h-4.285l-3.749 3.749v-3.749h-4.82v-16.067h17.138zM8.502 1.004l-5.356 5.356v19.279h6.427v5.356l5.356-5.356h4.284l9.641-9.64v-14.996zM21.356 6.895h2.142v6.427h-2.142zM15.464 6.895h2.143v6.427h-2.144z',
  discord: 'M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z',
}
</script>

<template>
  <AuthGuard>
    <template #pending>
        <div class="min-h-[80vh] flex justify-center items-start p-4 sm:p-8">
          <div class="w-full max-w-[48rem] space-y-6">

            <div class="rounded-xl dark:bg-base-200 shadow-md overflow-hidden">
              <div class="h-28 skeleton dark:bg-base-100 skeletondark"></div>
              <div class="px-6 pb-6 pt-4">
                <div class="flex items-center gap-4">
                  <div class="w-24 h-24 rounded-full skeleton dark:bg-base-100 skeletondark -mt-16"></div>
                  <div class="flex-1 space-y-2 pt-4">
                    <div class="skeleton dark:bg-base-100 skeletondark h-5 w-40"></div>
                    <div class="skeleton dark:bg-base-100 skeletondark h-3 w-52"></div>
                  </div>
                </div>
              </div>
            </div>

            <div class="rounded-xl dark:bg-base-200 shadow-md p-6 space-y-4">
              <div class="skeleton dark:bg-base-100 skeletondark h-3 w-32"></div>
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-4">
                  <div class="w-10 h-10 rounded-full skeleton dark:bg-base-100 skeletondark"></div>
                  <div class="space-y-2">
                    <div class="skeleton dark:bg-base-100 skeletondark h-4 w-20"></div>
                    <div class="skeleton dark:bg-base-100 skeletondark h-3 w-28"></div>
                  </div>
                </div>
                <div class="skeleton dark:bg-base-100 skeletondark h-8 w-24 rounded-lg"></div>
              </div>
            </div>

            <div class="rounded-xl dark:bg-base-200 shadow-md p-6 space-y-4">
              <div class="skeleton dark:bg-base-100 skeletondark h-3 w-36"></div>
              <div class="flex items-center justify-between">
                <div class="space-y-2">
                  <div class="skeleton dark:bg-base-100 skeletondark h-3 w-40"></div>
                  <div class="skeleton dark:bg-base-100 skeletondark h-4 w-32"></div>
                </div>
                <div class="skeleton dark:bg-base-100 skeletondark h-8 w-24 rounded-lg"></div>
              </div>
            </div>

            <div class="rounded-xl dark:bg-base-200 shadow-md p-6 space-y-4 border border-base-content/5">
              <div class="skeleton dark:bg-base-100 skeletondark h-3 w-36"></div>
              <div class="flex items-start justify-between">
                <div class="space-y-2">
                  <div class="skeleton dark:bg-base-100 skeletondark h-4 w-32"></div>
                  <div class="skeleton dark:bg-base-100 skeletondark h-3 w-64"></div>
                </div>
                <div class="skeleton dark:bg-base-100 skeletondark h-8 w-32 rounded-lg"></div>
              </div>
            </div>

          </div>
        </div>
    </template>
    <template #loggedin>
    <div class="min-h-[80vh] flex justify-center items-start p-4 sm:p-8">
      <div class="w-full max-w-[48rem] space-y-6">
        
        <!-- Hero card superior -->
        <div class="rounded-xl bg-base-200 shadow-md overflow-hidden relative">
          <!-- Banner -->
          <div class="h-28 bg-base-300 relative overflow-hidden">
             <div class="absolute inset-0 bg-primary/20 blur-3xl rounded-full scale-150 transform -translate-y-1/2"></div>
          </div>
          
          <!-- Contenido relativo al banner -->
          <div class="px-6 pb-6 relative z-10">
            <!-- Avatar montado -->
            <div class="absolute -top-12 left-6">
              <div class="w-24 h-24 rounded-full border-[4px] border-base-100 bg-base-300 overflow-hidden shadow-lg">
                <img :src="user?.image" alt="Avatar" class="w-full h-full object-cover" />
              </div>
            </div>
            
            <!-- Badge a la derecha -->
            <div class="absolute top-4 right-6">
              <span class="badge badge-primary badge-outline uppercase tracking-wide font-bold text-[10px]">
                {{ translateRole(user?.role || 'visitor') }}
              </span>
            </div>
            
            <!-- Info Usuario -->
            <div class="pt-14 text-left">
              <div class="flex items-center gap-2">
                <h1 class="text-xl font-bold text-base-content tracking-tight">{{ user?.name || 'Usuario' }}</h1>
                <svg class="w-4 h-4 text-[#9146FF]" fill="currentColor" viewBox="0 0 32 32">
                  <path :d="icons.twitch" />
                </svg>
              </div>
              <p class="text-sm text-base-content/50 mt-1">{{  user?.email?.replace(/^(.{3}).+(@.+)$/, '$1***$2') || 'usuario@email.com' }}</p>
            </div>
            
            <!-- Botones de acción -->
            <div class="mt-5 pt-4 border-t border-base-content/10 flex flex-col sm:flex-row gap-2">
              <div class="tooltip tooltip-bottom flex-1" :data-tip="twitchSyncing ? 'Sincronizando...' : 'Sincroniza tu perfil con datos nuevos de twitch'">
                <button 
                  @click="handleSync(true)" 
                  :disabled="twitchSyncing || syncCooldown > 0"
                  class="btn btn-sm btn-primary rounded-lg font-bold w-full transition-all gap-1.5"
                >
                  <span v-if="twitchSyncing" class="loading loading-spinner loading-xs"></span>
                  <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  {{ syncCooldown > 0 ? `Sincronizar datos en ${syncCooldown}s` : 'Sincronizar datos' }}
                </button>
              </div>

              <button @click="logout(true)" class="btn btn-sm btn-ghost rounded-lg font-bold flex-1 transition-all text-base-content/50 hover:text-error hover:bg-error/10 hover:border-error/30 gap-1.5">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Cerrar sesión
              </button>
            </div>
          </div>
        </div>

        
        <!-- Card Preferencias -->
        <div class="rounded-xl bg-base-200 shadow-md p-6">
          <h2 class="text-xs font-black text-base-content/60 mb-5 uppercase tracking-widest text-center">Preferencias</h2>
          <div class="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div class="text-center sm:text-left">
              <p class="font-bold text-base-content text-sm">Tema Visual</p>
              <p class="text-xs text-base-content/50 mt-0.5">Elige tu tema favorito para la web</p>
            </div>
            <div class="join border border-base-content/10">
              <button 
                @click="setTheme('light')" 
                :class="['join-item btn btn-sm min-w-[80px] font-bold', currentTheme === 'light' ? 'btn-primary' : 'btn-ghost']"
              >
                Claro
              </button>
              <button 
                @click="setTheme('dark')" 
                :class="['join-item btn btn-sm min-w-[80px] font-bold', currentTheme === 'dark' ? 'btn-primary' : 'btn-ghost']"
              >
                Oscuro
              </button>
              <button 
                @click="setTheme('system')" 
                :class="['join-item btn btn-sm min-w-[80px] font-bold', currentTheme === 'system' ? 'btn-primary' : 'btn-ghost']"
              >
                Sistema
              </button>
            </div>
          </div>
        </div>

        <!-- Card Conexiones opcionales -->
        <div class="rounded-xl bg-base-200 shadow-md p-6">
          <h2 class="text-xs font-black text-base-content/60 mb-5 uppercase tracking-widest">Conexiones</h2>
          
          <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div class="flex items-center gap-4">
              <div class="w-10 h-10 shrink-0 rounded-full bg-[#5865F2]/20 flex items-center justify-center text-[#5865F2]">
                <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                   <path :d="icons.discord" />
                </svg>
              </div>
              <div>
                <p class="font-bold text-base-content text-sm text-left">Discord</p>
                <p class="text-xs text-base-content/50 mt-0.5 text-left">Conecta tu cuenta de discord para que puedas ser mencionado si eres el mejor o el peor jugador de la semana y recibir puntos de lealtad en el canal de casemuro</p>
              </div>
            </div>
            <button class="btn btn-sm btn-outline btn-disabled rounded-lg font-bold w-full sm:w-auto transition-all">
              Proximamente...
            </button>
          </div>
        </div>


        <!-- Card Cuenta de juego -->
        <div class="rounded-xl bg-base-200 shadow-md p-6">
          <h2 class="text-xs font-black text-base-content/60 mb-5 uppercase tracking-widest">Cuenta de juego</h2>
          <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <p class="font-bold text-base-content text-sm">ID De EA</p>
              <p class="text-xs text-base-content/50 mt-0.5">{{ user?.eaPlayerName || 'Sin vincular' }}</p>
            </div>
            <button class="btn btn-sm btn-outline btn-disabled rounded-lg font-bold w-full sm:w-auto transition-all">
              Proximamente...
            </button>
          </div>
        </div>


        <!-- Card Zona de peligro -->
        <div class="rounded-xl bg-base-200 shadow-md p-6 border border-error/20 text-left">
          <h2 class="text-xs font-black text-error/80 mb-5 uppercase tracking-widest">Zona de peligro</h2>
          <div class="flex flex-col sm:flex-row items-start justify-between gap-6">
            <div>
              <p class="font-medium text-base-content text-sm">Eliminar cuenta</p>
              <p class="text-xs text-base-content/50 mt-1 leading-relaxed">
                Una vez que elimines tu cuenta, se borrarán todos tus datos de forma permanente. Esta acción no se puede deshacer.
              </p>
            </div>
            <button @click="deleteModal?.showModal()" class="btn btn-sm btn-error text-white rounded-lg font-bold sm:w-auto whitespace-nowrap transition-all">
              Eliminar Cuenta
            </button>
          </div>
        </div>

      </div>
    </div>
    </template>
    <template #loggedout>
        <LoginWall />
    </template>
  </AuthGuard>

  <!-- Modal de confirmación de eliminación -->
  <dialog ref="deleteModal" class="modal modal-bottom sm:modal-middle">
    <div class="modal-box bg-base-200 border border-error/20">
      <h3 class="font-bold text-lg text-error">¿Eliminar cuenta?</h3>
      <p class="py-4 text-sm text-base-content/70">
        Estás a punto de eliminar tu cuenta de forma permanente. Se borrarán todos tus datos, conexiones y configuración. 
        <strong class="text-base-content">Esta acción no se puede deshacer.</strong>
      </p>
      <div class="modal-action">
        <form method="dialog" class="flex gap-2">
          <button class="btn btn-ghost">Cancelar</button>
          <button @click="deleteAccount(true)" class="btn btn-error text-white">Sí, eliminar mi cuenta</button>
        </form>
      </div>
    </div>
    <form method="dialog" class="modal-backdrop">
      <button>close</button>
    </form>
  </dialog>
</template>
