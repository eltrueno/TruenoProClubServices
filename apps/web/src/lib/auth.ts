import { createAuthClient } from "better-auth/vue"
import { inferAdditionalFields } from "better-auth/client/plugins"
import type { AuthType } from "@trueno-proclub-services/auth"
import { AUTH_URL } from "@/lib/api"

export const SITE_URL = import.meta.env.PUBLIC_SITE_URL ?? "https://www.casemurocity.org"

export const authClient = createAuthClient({
    baseURL: AUTH_URL,
    plugins: [inferAdditionalFields<AuthType>()]
})

/** Ajustes de privacidad: los únicos campos que el usuario puede escribir (el resto van con `input: false`) */
export interface PrivacySettings {
    showPublicName: boolean
    showPublicImage: boolean
}

/**
 * `updateUser` tipa su payload a partir de la inferencia del servidor, que no llega a ver
 * los campos extra; aquí se llama con el tipo acotado a los ajustes de privacidad.
 */
export const updatePrivacySettings = (settings: PrivacySettings) =>
    (authClient.updateUser as (values: PrivacySettings) => ReturnType<typeof authClient.updateUser>)(settings)

export type { User } from "@trueno-proclub-services/auth"
