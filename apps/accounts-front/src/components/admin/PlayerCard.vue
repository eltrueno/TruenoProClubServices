<script setup lang="ts">
/**
 * Ficha compacta de jugador: foto (zoom), nombre, pro · OVR, posiciones y
 * opcionalmente cuándo se le vio por primera / última vez.
 * Copia de la de la web de los clubes, para el panel admin y su selector.
 */
import { computed } from "vue"
import type { IClubMember, PlayerPosition } from "@trueno-proclub-services/shared"
import PlayerPhoto, { type PhotoZoom } from "./PlayerPhoto.vue"

const POSITION_LABELS: Record<PlayerPosition, string> = { goalkeeper: "Portero", defender: "Defensa", midfielder: "Centrocampista", forward: "Delantero" }
const translatePosition = (pos: PlayerPosition) => POSITION_LABELS[pos]
const POSITION_SHORT: Record<PlayerPosition, string> = { goalkeeper: "POR", defender: "DEF", midfielder: "MC", forward: "DEL" }

const props = withDefaults(defineProps<{
    member: Partial<IClubMember>
    positions?: PlayerPosition[]
    /** foto a mostrar en vez de la del miembro (p. ej. borrador del admin) */
    image?: string | null
    size?: "sm" | "md"
    /** zoom de la foto (ver PlayerPhoto): none | sm | md | lg */
    zoom?: PhotoZoom
    /** el nombre enlaza al perfil: URL de la ficha en la web del club */
    link?: string
    /** oculta la línea "En el club desde… · Último partido…" */
    noDates?: boolean
    /** id de EA en pequeño (panel admin) */
    showId?: boolean
}>(), { positions: () => [], image: undefined, size: "sm", zoom: "md", link: undefined, noDates: false, showId: false })

// Compartido por todas las tarjetas: en listas largas (panel admin, selector) crear uno por fecha se nota
const MONTH_YEAR = new Intl.DateTimeFormat("es-ES", { month: "short", year: "numeric" })

const fmt = (d?: Date | string | number | null) => {
    if (!d) return ""
    const date = typeof d === "number" ? new Date(d * (d < 1e12 ? 1000 : 1)) : new Date(d)
    return isNaN(date.getTime()) ? "" : MONTH_YEAR.format(date)
}
const since = computed(() => fmt(props.member.createdAt))
const lastSeen = computed(() => fmt(props.member.lastSeenAt))
</script>

<template>
    <div class="flex items-center gap-3 min-w-0">
        <PlayerPhoto :src="image !== undefined ? image : member.imageUrl" :alt="member.playerName" :size="size === 'md' ? 'md' : 'sm'" :zoom="zoom" />
        <div class="min-w-0 flex-1">
            <component
                :is="link ? 'a' : 'p'"
                :href="link || undefined"
                class="font-bold truncate leading-tight max-w-full"
                :class="[size === 'md' ? 'text-base' : 'text-sm', link ? 'hover-text-brand inline-block align-top' : 'block']"
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
            <p v-if="!noDates && (since || lastSeen)" class="text-xs text-base-content/75 truncate">
                <span v-if="since">Desde {{ since }}</span>
                <span v-if="since && lastSeen"> · </span>
                <span v-if="lastSeen">Última vez {{ lastSeen }}</span>
            </p>
            <p v-if="showId && member.playerId" class="text-xs text-base-content/60 font-mono truncate" :title="member.playerId">{{ member.playerId }}</p>
            <slot />
        </div>
    </div>
</template>
