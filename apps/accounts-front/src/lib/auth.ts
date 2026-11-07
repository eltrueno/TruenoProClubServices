import { createAuthClient } from "better-auth/vue"
import { inferAdditionalFields } from "better-auth/client/plugins"
import type { AuthType } from "@trueno-proclub-services/auth"
import { AUTH_URL } from "@/config/site"

export const authClient = createAuthClient({
    baseURL: AUTH_URL,
    plugins: [inferAdditionalFields<AuthType>()],
})

/** Ajustes de privacidad: los únicos campos que el usuario puede escribir (el resto van con `input: false`) */
export interface PrivacySettings {
    showPublicName: boolean
    showPublicImage: boolean
}

/** `updateUser` tipa su payload con la inferencia del servidor, que no ve los campos extra */
export const updatePrivacySettings = (settings: PrivacySettings) =>
    (authClient.updateUser as (values: PrivacySettings) => ReturnType<typeof authClient.updateUser>)(settings)

export type { User } from "@trueno-proclub-services/auth"
