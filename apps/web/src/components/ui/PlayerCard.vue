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
import PlayerPhoto, { type PhotoZoom } from "./PlayerPhoto.vue"

const POSITION_SHORT: Record<PlayerPosition, string> = { goalkeeper: "POR", defender: "DEF", midfielder: "MC", forward: "DEL" }

const props = withDefaults(defineProps<{
    member: Partial<IClubMember>
    positions?: PlayerPosition[]
    /** foto a mostrar en vez de la del miembro (p. ej. borrador del admin) */
    image?: string | null
    size?: "sm" | "md"
    /** zoom de la foto (ver PlayerPhoto): none | sm | md | lg */
    zoom?: PhotoZoom
    /** el nombre enlaza al perfil */
    link?: boolean
    /** oculta la línea "En el club desde… · Último partido…" */
    noDates?: boolean
    /** id de EA en pequeño (panel admin) */
    showId?: boolean
}>(), { positions: () => [], image: undefined, size: "sm", zoom: "md", link: false, noDates: false, showId: false })

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
        <PlayerPhoto :src="image !== undefined ? image : member.imageUrl" :alt="member.playerName" :size="size === 'md' ? 'md' : 'sm'" :zoom="zoom" />
        <div class="min-w-0 flex-1">
            <component
                :is="link && member.playerId ? 'a' : 'p'"
                :href="link && member.playerId ? routes.player(member.playerId) : undefined"
                class="font-bold truncate block leading-tight"
                :class="[size === 'md' ? 'text-base' : 'text-sm', link ? 'hover:text-primary' : '']"
            >{{ member.playerName || "—" }}</component>
            <p v-if="positions.length" class="flex gap-1 mt-0.5">
                <span
                    v-for="(pos, i) in positions"
                    :key="pos"
                    class="badge badge-xs font-bold"
                    :class="i === 0 ? 'badge-primary' : 'badge-ghost'"
                    :title="translatePosition(pos)"
                >{{ POSITION_SHORT[pos] }}</span>
            </p>
            <p v-if="!noDates && (since || lastSeen)" class="text-xs text-base-content/60 truncate">
                <span v-if="since">Desde {{ since }}</span>
                <span v-if="since && lastSeen"> · </span>
                <span v-if="lastSeen">Última vez {{ lastSeen }}</span>
            </p>
            <p v-if="showId && member.playerId" class="text-[10px] text-base-content/30 font-mono truncate" :title="member.playerId">{{ member.playerId }}</p>
            <slot />
        </div>
    </div>
</template>
