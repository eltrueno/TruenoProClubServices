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

/** Política de privacidad (una para todas las webs de la comunidad) */
export const privacyUrl = () => `${CLUB.accountsUrl}/privacidad`

/** Aviso legal y descargo de responsabilidad (uno para todas las webs de la comunidad) */
export const legalUrl = () => `${CLUB.accountsUrl}/aviso-legal`

/** Créditos y licencias de las librerías y recursos de terceros */
export const licensesUrl = () => `${CLUB.accountsUrl}/licencias`

/** Panel admin (común a todos los clubes), abierto en este club */
export const accountsAdminUrl = () => `${CLUB.accountsUrl}/admin?club=${CLUB.id}`
