import { CLUB } from "@/config/club"

/**
 * Enlaces a accounts.casemuro.stream, donde viven el login y los ajustes de la cuenta
 * (comunes a todos los clubes).
 */

/** Página de la cuenta; `hash` para ir a una tarjeta concreta (p. ej. "mi-jugador") */
export const accountsUrl = (hash?: string) => `${CLUB.accountsUrl}/${hash ? `#${hash}` : ""}`

/** Login de accounts que, al terminar, vuelve a `returnTo` (por defecto, la página actual) */
export const accountsLoginUrl = (returnTo?: string) => {
    const back = returnTo ?? (typeof window !== "undefined" ? window.location.href : CLUB.siteUrl)
    return `${CLUB.accountsUrl}/login?redirect=${encodeURIComponent(back)}`
}
