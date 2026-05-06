<script setup>
import { ref } from 'vue'
import { useAuth } from "@/composables/useAuth"

const { isLoggedIn, isPending, loginWithTwitchPopup } = useAuth()
const acceptedPrivacy = ref(false)
const privacyModal = ref(null)
</script>

<template>
  <div class="min-h-[80vh] flex items-center justify-center p-4">
    <div class="card w-full max-w-md bg-base-200/50 shadow-2xl border border-white/5 backdrop-blur-xl">
      <div class="card-body items-center text-center py-10">
        
        <!-- Estado de carga -->
        <div v-if="isPending" class="flex flex-col items-center gap-6 py-8">
           <span class="loading loading-ring loading-lg text-primary scale-125"></span>
           <div class="space-y-2">
             <p class="text-sm font-black tracking-widest uppercase opacity-70 animate-pulse">Verificando sesión</p>
             <p class="text-xs opacity-40">Por favor, espera un momento...</p>
           </div>
        </div>

        <!-- No Logueado -->
        <div v-else-if="!isLoggedIn" class="w-full flex flex-col items-center gap-10">
           <div class="relative">
             <div class="absolute inset-0 bg-primary/20 blur-3xl rounded-full"></div>
             <div class="relative bg-base-300 p-6 rounded-3xl border border-white/10 shadow-inner">
               <svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
               </svg>
             </div>
           </div>
           
           <div class="space-y-3">
             <h2 class="text-4xl font-black tracking-tighter uppercase">Mi Cuenta</h2>
             <p class="text-sm opacity-60 leading-relaxed px-4">Inicia sesión para acceder a tu perfil y poder vincular tus cuentas, gestionar ajustes y obtener recompensas.</p>
           </div>

           <div class="card-actions w-full px-2 sm:px-4 flex-col gap-4">
             <div class="flex items-center gap-3 cursor-pointer group select-none" @click="acceptedPrivacy = !acceptedPrivacy">
               <input type="checkbox" v-model="acceptedPrivacy" class="checkbox checkbox-primary checkbox-sm border-white/20" @click.stop />
               <span class="text-xs opacity-70 group-hover:opacity-100 transition-opacity">
                 He leído y acepto la 
                 <button class="link link-primary font-bold no-underline hover:underline" @click.stop="privacyModal.showModal()">política de privacidad</button>
               </span>
             </div>

             <button 
               @click="loginWithTwitchPopup(true)" 
               :disabled="!acceptedPrivacy"
               class="btn bg-[#9146FF] hover:bg-[#772ce8] border-none text-white btn-block btn-md sm:btn-lg gap-2 sm:gap-3 shadow-[0_10px_30px_rgba(145,70,255,0.3)] transition-all duration-300 active:scale-[0.98] font-black tracking-tight sm:tracking-wider group text-xs sm:text-base disabled:bg-[#9146FF]/30 disabled:text-white/30 disabled:cursor-not-allowed"
             >
               <svg class="h-5 w-5 sm:h-6 sm:w-6 transition-transform group-hover:scale-110" fill="currentColor" viewBox="0 0 24 24">
                 <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z"/>
               </svg>
               <span class="whitespace-nowrap">ENTRAR CON TWITCH</span>
             </button>
           </div>
        </div>

      </div>
    </div>
  </div>

   <!-- Modal de Política de Privacidad -->
   <dialog ref="privacyModal" id="privacy_modal" class="modal modal-bottom sm:modal-middle">
     <div class="modal-box bg-base-200 border border-white/5 shadow-2xl max-w-2xl text-left">
       <h3 class="font-bold text-2xl text-primary mb-6">Política de Privacidad</h3>
       <div class="prose prose-invert prose-sm opacity-90 max-h-[60vh] overflow-y-auto pr-4 scrollbar-thin scrollbar-thumb-primary/20 space-y-4">
         
         <section>
           <h4 class="font-bold text-lg mb-2">1. Responsable del tratamiento</h4>
           <p>El responsable del tratamiento de los datos personales es:</p>
           <ul class="list-disc ml-4 space-y-1">
             <li><strong>Responsable:</strong> Raúl Jiménez (el_trueno)</li>
             <li><strong>Email de contacto:</strong> truenodeveloper@gmail.com</li>
           </ul>
         </section>

         <section>
           <h4 class="font-bold text-lg mb-2">2. Datos personales recopilados</h4>
           <p>A través de esta web se pueden recopilar los siguientes datos personales:</p>
           <div class="ml-4 space-y-2">
             <p><strong>Datos de identificación:</strong> Nombre de usuario (Twitch/Discord), ID de usuario.</p>
             <p><strong>Datos de contacto:</strong> Dirección de correo electrónico.</p>
             <p><strong>Datos de perfil:</strong> Imagen de perfil (avatar).</p>
             <p><strong>Datos de uso:</strong> Información para el funcionamiento de la plataforma (seguimiento de canal, vinculación EA).</p>
           </div>
         </section>

         <section>
           <h4 class="font-bold text-lg mb-2">3. Finalidad del tratamiento</h4>
           <ul class="list-disc ml-4 space-y-1">
             <li>Gestionar registro y autenticación (Twitch/Discord).</li>
             <li>Permitir el acceso y uso de la plataforma.</li>
             <li>Mostrar información básica del perfil.</li>
             <li>Vincular con servicios externos (EA, Discord).</li>
             <li>Mantenimiento, seguridad y mejora del servicio.</li>
           </ul>
         </section>

         <section>
           <h4 class="font-bold text-lg mb-2">4. Base legal</h4>
           <p>El tratamiento se basa en la <strong>ejecución de un contrato</strong> (gestión de cuenta) y el <strong>consentimiento del usuario</strong>.</p>
         </section>

         <section>
           <h4 class="font-bold text-lg mb-2">5. Conservación de los datos</h4>
           <p>Los datos se conservarán mientras la cuenta esté activa, hasta 30 días después de su eliminación o hasta que se solicite su supresión.</p>
         </section>

         <section>
           <h4 class="font-bold text-lg mb-2">6. Destinatarios de los datos</h4>
           <p>Los datos podrán ser comunicados o tratados por los siguientes terceros para garantizar el servicio:</p>
           <ul class="list-disc ml-4 space-y-2 mt-2">
             <li>
               <strong>Proveedores de autenticación: </strong> 
               <span class="opacity-80">Twitch y Discord. Estos servicios gestionan la identidad y el acceso de forma segura.</span>
             </li>
             <li>
               <strong>Proveedor de alojamiento (Hosting/VPS): </strong> 
               <span class="opacity-80">Los servidores se encuentran ubicados en el Espacio Económico Europeo (EEE), garantizando altos estándares de protección de datos.</span>
             </li>
           </ul>
           <p class="mt-4 italic border-l-2 border-primary pl-4 opacity-70">No se venden, alquilan ni ceden datos personales a terceros con fines comerciales o publicitarios.</p>
         </section>

         <section>
           <h4 class="font-bold text-lg mb-2">7. Derechos del usuario</h4>
           <p>Tienes derecho a acceder, rectificar, suprimir, limitar u oponerte al tratamiento. Contacto: truenodeveloper@gmail.com.</p>
         </section>

         <section>
           <h4 class="font-bold text-lg mb-2">8. Seguridad de los datos</h4>
           <p>Adoptamos medidas técnicas para garantizar la seguridad y evitar pérdidas o accesos no autorizados.</p>
         </section>

         <section>
           <h4 class="font-bold text-lg mb-2">9. Cambios en la política</h4>
           <p>Esta política puede actualizarse. Se recomienda revisarla periódicamente.</p>
         </section>

         <section>
           <h4 class="font-bold text-lg mb-2">10. Aceptación</h4>
           <p>El uso de esta web implica la aceptación de esta política de privacidad.</p>
         </section>

       </div>
      <div class="modal-action">
        <form method="dialog">
          <button class="btn btn-primary btn-outline border-2">Cerrar</button>
        </form>
      </div>
    </div>
    <form method="dialog" class="modal-backdrop">
      <button>close</button>
    </form>
  </dialog>
</template>

<style scoped>
.card {
  background-image: radial-gradient(circle at top right, rgba(200, 13, 13, 0.05), transparent 40%);
}
</style>