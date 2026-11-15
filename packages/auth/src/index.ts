import "dotenv/config"
import type { IAuthUser } from "@trueno-proclub-services/shared"
import { betterAuth } from "better-auth"
import { createAuthMiddleware, APIError } from "better-auth/api"
import { mongodbAdapter } from "better-auth/adapters/mongodb"
import { ObjectId } from "mongodb"

const DEVMODE = process.env.DEVMODE === "true";
// "a, b" también vale: sin quitar espacios, " b" no coincidiría con ningún origen
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS?.split(",").map((s) => s.trim()).filter(Boolean) ?? [];

/**
 * Permisos que se piden a Twitch en TODOS los logins (además de los de por defecto,
 * `user:read:email` y `openid`). Van aquí y no en el cliente para que no dependan de
 * por dónde entre el usuario: sin ellos no se puede saber si sigue o es sub del canal.
 */
export const TWITCH_SCOPES = ["user:read:follows", "user:read:subscriptions"]

/**
 * Discord solo se usa para VINCULARLO a una cuenta que ya existe (se entra siempre con Twitch).
 * Solo se pide `identify` (id y nombre): sin email, Better Auth no puede crear ni abrir una
 * cuenta con Discord, que es justo lo que se quiere. Sin credenciales, no hay proveedor.
 */
const DISCORD_ENABLED = !!(process.env.DISCORD_CLIENT_ID && process.env.DISCORD_CLIENT_SECRET)

export interface AuthHooks {
  /** Cada vez que alguien inicia sesión (se crea una sesión), también la primera. */
  onSignIn?: (user: any) => void | Promise<void>
  /** Cada vez que se lee la sesión (`get-session`). No se espera: es para refrescos en segundo plano. */
  onSessionRead?: (user: any) => void
  /**
   * Se acaba de vincular una cuenta de Discord (`account`, con el token como se guarda:
   * cifrado). `discordId` ya está en el usuario; esto es para completar el nombre.
   */
  onDiscordLinked?: (userId: string, account: any) => void | Promise<void>
}

export const createAuth = (db: any, authHooks: AuthHooks = {}) => betterAuth({
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:4000",
  database: mongodbAdapter(db),


  advanced: {
    crossSubDomainCookies: DEVMODE
      ? {
        enabled: false
      }
      : {
        enabled: true,
        domain: process.env.COOKIE_DOMAIN || ".casemuro.stream",
      },
  },

  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      // El perfil (nombre, imagen…) viene de Twitch y no se edita a mano: por /update-user
      // solo se admiten los ajustes de privacidad. El resto de campos ya llevan `input: false`.
      // Solo se entra con Twitch y solo se vincula Discord. Lo demás (aunque Better Auth lo
      // rechazaría igual por falta de email o de proveedor) se corta aquí con un error claro.
      const provider = (ctx.body as { provider?: unknown } | undefined)?.provider
      if ((ctx.path === "/sign-in/social" && provider !== "twitch") || (ctx.path === "/link-social" && provider !== "discord")) {
        throw new APIError("FORBIDDEN", { message: "Provider not allowed" })
      }
      // Desvincular va por DELETE /api/discord/link del servicio de auth (solo Discord, y sin
      // exigir sesión reciente). Por aquí se podría soltar Twitch y dejar la cuenta sin entrada.
      if (ctx.path === "/unlink-account") {
        throw new APIError("FORBIDDEN", { message: "Not allowed" })
      }
      if (ctx.path === "/update-user") {
        const allowed = new Set(["showPublicName", "showPublicImage"])
        const keys = Object.keys((ctx.body ?? {}) as Record<string, unknown>)
        if (keys.length === 0 || keys.some((k) => !allowed.has(k))) {
          throw new APIError("FORBIDDEN", {
            message: "Not allowed"
          })
        }
      }
    }),
    after: createAuthMiddleware(async (ctx) => {
      if (ctx.path !== "/get-session" || !authHooks.onSessionRead) return
      const returned = ctx.context.returned as { user?: unknown } | null | undefined
      if (returned && typeof returned === "object" && "user" in returned && returned.user) {
        authHooks.onSessionRead(returned.user)
      }
    }),
  },

  databaseHooks: {
    account: {
      create: {
        after: async (account: any) => {
          if (account.providerId === "twitch") {
            // twitchId en el usuario; la sincronización la lanza el hook de sesión, justo después
            await db.collection("user").updateOne(
              { _id: new ObjectId(account.userId) },
              { $set: { twitchId: account.accountId } }
            )
          }
          if (account.providerId === "discord") {
            await db.collection("user").updateOne(
              { _id: new ObjectId(account.userId) },
              { $set: { discordId: account.accountId } }
            )
            if (authHooks.onDiscordLinked) {
              Promise.resolve(authHooks.onDiscordLinked(String(account.userId), account))
                .catch((err) => console.error("[auth] onDiscordLinked error:", err))
            }
          }
        }
      }
    },
    session: {
      create: {
        // Cada inicio de sesión (no solo el primero): así follow/sub/rol se refrescan al entrar
        after: async (session: any) => {
          if (!authHooks.onSignIn) return
          const userDoc = await db.collection("user").findOne({ _id: new ObjectId(session.userId) })
          if (!userDoc) return
          const user = { ...userDoc, id: userDoc._id.toString() }
          Promise.resolve(authHooks.onSignIn(user)).catch((err) => console.error("[auth] onSignIn error:", err))
        }
      }
    }
  },

  user: {
    additionalFields: {
      // input: false => solo los pone el servidor (sync de Twitch / admin), nunca `updateUser` desde el cliente
      discordId: {
        type: "string",
        required: false,
        input: false
      },
      // Nombre de usuario de Discord, para enseñarlo en la cuenta (se guarda al vincular)
      discordName: {
        type: "string",
        required: false,
        input: false
      },
      twitchId: {
        type: "string",
        required: false,
        input: false
      },
      twitchFollowing: {
        type: "boolean",
        required: false,
        defaultValue: false,
        input: false
      },
      twitchSub: {
        type: "boolean",
        required: false,
        defaultValue: false,
        input: false
      },
      twitchSubTier: {
        type: "string",
        required: false,
        input: false
      },
      twitchSyncedAt: {
        type: "date",
        required: false,
        input: false
      },
      twitchSyncAttemptAt: {
        type: "date",
        required: false,
        input: false
      },
      twitchNeedsReauth: {
        type: "boolean",
        required: false,
        defaultValue: false,
        input: false
      },
      role: {
        type: "string",
        defaultValue: "visitor",
        input: false
      },
      // Privacidad: qué se enseña de la cuenta cuando aparece vinculada a un jugador (lo cambia el propio usuario)
      showPublicName: {
        type: "boolean",
        required: false,
        defaultValue: true
      },
      showPublicImage: {
        type: "boolean",
        required: false,
        defaultValue: true
      }
    },
    deleteUser: {
      enabled: true,
    }
  },

  trustedOrigins: ALLOWED_ORIGINS.length ? ALLOWED_ORIGINS : ["http://localhost:4321"],

  account: {
    // accessToken / refreshToken cifrados en la base de datos (clave: BETTER_AUTH_SECRET).
    // Los guardados antes de activarlo siguen en claro y se cifran solos en el siguiente
    // login o renovación. apps/auth los lee con las mismas funciones (services/tokenCrypto).
    encryptOAuthTokens: true,
    // Vincular Discord a la cuenta de Twitch: son cuentas distintas, con emails distintos (y
    // de Discord ni se pide). Una cuenta de Discord solo puede estar en una cuenta de aquí.
    accountLinking: {
      enabled: true,
      trustedProviders: ["discord"],
      allowDifferentEmails: true,
    },
  },

  socialProviders: {
    twitch: {
      clientId: process.env.TWITCH_CLIENT_ID || "",
      clientSecret: process.env.TWITCH_CLIENT_SECRET || "",
      scope: TWITCH_SCOPES,
      overrideUserInfoOnSignIn: true
    },
    ...(DISCORD_ENABLED ? {
      discord: {
        clientId: process.env.DISCORD_CLIENT_ID as string,
        clientSecret: process.env.DISCORD_CLIENT_SECRET as string,
        disableDefaultScope: true,
        scope: ["identify"],
        // Siempre pregunta: así se puede elegir otra cuenta de Discord al volver a vincular
        prompt: "consent" as const,
      }
    } : {})
  }
})

/* TYPE INFERENCE */
export type AuthType = ReturnType<typeof createAuth>
export type Session = AuthType["$Infer"]["Session"]
export interface User extends IAuthUser {
  emailVerified: boolean
  createdAt: Date
  updatedAt: Date
}

export interface Account {
  id: string | any
  userId: string | any
  providerId: string
  accountId: string
  accessToken?: string | null
  refreshToken?: string | null
  accessTokenExpiresAt?: Date | null
  refreshTokenExpiresAt?: Date | null
  scope?: string | null
  idToken?: string | null
  createdAt: Date
  updatedAt: Date
}

/* SHARED TYPES */
export * from "./types/twitch.js"
export * from "./types/user.js"