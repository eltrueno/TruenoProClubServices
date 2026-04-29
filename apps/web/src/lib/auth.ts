import { createAuthClient } from "better-auth/vue"

export const authClient = createAuthClient({
    baseURL: "https://auth.casemurocity.org"
})