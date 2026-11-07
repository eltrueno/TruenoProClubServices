import { UserRole } from "@trueno-proclub-services/shared"

const rtf = new Intl.RelativeTimeFormat("es", { numeric: "auto" })

/** "hace 5 minutos", "hace 3 horas", "ayer"… (null si no hay fecha válida) */
export function relativeTime(value: Date | string | null | undefined): string | null {
    if (!value) return null
    const diffMin = Math.round((new Date(value).getTime() - Date.now()) / 60000)
    if (!Number.isFinite(diffMin)) return null
    if (Math.abs(diffMin) < 60) return rtf.format(diffMin, "minute")
    if (Math.abs(diffMin) < 60 * 24) return rtf.format(Math.round(diffMin / 60), "hour")
    return rtf.format(Math.round(diffMin / 1440), "day")
}

const ROLE_LABELS: Record<string, string> = {
    [UserRole.admin]: "Admin",
    [UserRole.mod]: "Mod",
    [UserRole.vip]: "VIP",
    [UserRole.subscriber]: "Suscriptor",
    [UserRole.follower]: "Seguidor",
    [UserRole.visitor]: "Visitante",
}

export const roleLabel = (role?: string | null) => ROLE_LABELS[role ?? ""] ?? (role || "Visitante")

/** "Nivel 1" / "Nivel 2" / "Nivel 3" a partir del tier de Twitch ("1000"…) */
export const subTierLabel = (tier?: string | null) => (tier ? `Nivel ${tier.charAt(0)}` : null)

/** usu***@dominio.com */
export const maskEmail = (email?: string | null) => email?.replace(/^(.{3}).+(@.+)$/, "$1***$2") ?? ""

export const PLAYER_PLACEHOLDER = "/players/placeholder_top_transp.png"
