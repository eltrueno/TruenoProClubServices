import { createAuthClient } from "better-auth/vue"
import { inferAdditionalFields } from "better-auth/client/plugins"
import type { AuthType } from "@trueno-proclub-services/auth"


export const authClient = createAuthClient({
    baseURL: "https://auth.casemurocity.org",
    plugins: [
        inferAdditionalFields<AuthType>()
    ]
})