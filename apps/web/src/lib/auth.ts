import { createAuthClient } from "better-auth/vue"
import { inferAdditionalFields } from "better-auth/client/plugins"
import type { AuthType } from "@trueno-proclub-services/auth"
import { AUTH_URL } from "@/lib/api"

export const SITE_URL = import.meta.env.PUBLIC_SITE_URL ?? "https://www.casemurocity.org"

export const authClient = createAuthClient({
    baseURL: AUTH_URL,
    plugins: [inferAdditionalFields<AuthType>()]
})

export type { User } from "@trueno-proclub-services/auth"
