<script setup lang="ts">
/**
 * Ficha compacta de jugador: foto (zoom), nombre, pro · OVR, posiciones y
 * opcionalmente cuándo se le vio por primera / última vez.
 * Reutilizada en Mi cuenta, panel admin y el selector de jugadores.
 */
import { computed } from "vue"
import type { IClubMember, PlayerPosition } from "@trueno-proclub-services/shared"
import { translatePosition } from "@/i18n/translations"
import { routes } from "@/lib/query"
import PlayerPhoto from "./PlayerPhoto.vue"

const POSITION_SHORT: Record<PlayerPosition, string> = { goalkeeper: "POR", defender: "DEF", midfielder: "MC", forward: "DEL" }

const props = withDefaults(defineProps<{
    member: Partial<IClubMember> & { createdAt?: Date | string }
    positions?: PlayerPosition[]
    /** foto a mostrar en vez de la del miembro (p. ej. borrador del admin) */
    image?: string | null
    size?: "sm" | "md"
    /** el nombre enlaza al perfil */
    link?: boolean
    /** muestra "en el club desde" y "último partido" */
    dates?: boolean
    /** id de EA en pequeño (panel admin) */
    showId?: boolean
}>(), { positions: () => [], image: undefined, size: "sm", link: false, dates: false, showId: false })

const subtitle = computed(() =>
    [props.member.proName, props.member.proOverall ? `${props.member.proOverall} OVR` : ""].filter(Boolean).join(" · ")
)

const fmt = (d?: Date | string | number | null) => {
    if (!d) return ""
    const date = typeof d === "number" ? new Date(d * (d < 1e12 ? 1000 : 1)) : new Date(d)
    return isNaN(date.getTime()) ? "" : date.toLocaleDateString("es-ES", { month: "short", year: "numeric" })
}
const since = computed(() => fmt(props.member.createdAt))
const lastSeen = computed(() => fmt(props.member.lastSeenAt))
</script>

<template>
    <div class="flex items-center gap-3 min-w-0">
        <PlayerPhoto :src="image !== undefined ? image : member.imageUrl" :alt="member.playerName" :size="size === 'md' ? 'md' : 'sm'" />
        <div class="min-w-0 flex-1">
            <component
                :is="link && member.playerId ? 'a' : 'p'"
                :href="link && member.playerId ? routes.player(member.playerId) : undefined"
                class="font-bold truncate block leading-tight"
                :class="[size === 'md' ? 'text-base' : 'text-sm', link ? 'hover:text-primary' : '']"
            >{{ member.playerName || "—" }}</component>
            <p v-if="subtitle" class="text-xs text-base-content/60 truncate">{{ subtitle }}</p>
            <p v-if="positions.length" class="flex gap-1 mt-0.5">
                <span
                    v-for="(pos, i) in positions"
                    :key="pos"
                    class="badge badge-xs font-bold"
                    :class="i === 0 ? 'badge-primary' : 'badge-ghost'"
                    :title="translatePosition(pos)"
                >{{ POSITION_SHORT[pos] }}</span>
            </p>
            <p v-if="dates && (since || lastSeen)" class="text-[10px] text-base-content/40 truncate mt-0.5">
                <span v-if="since">Desde {{ since }}</span>
                <span v-if="since && lastSeen"> · </span>
                <span v-if="lastSeen">Último partido {{ lastSeen }}</span>
            </p>
            <p v-if="showId && member.playerId" class="text-[10px] text-base-content/30 font-mono truncate" :title="member.playerId">{{ member.playerId }}</p>
            <slot />
        </div>
    </div>
</template>
