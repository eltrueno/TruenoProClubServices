import "dotenv/config"
import type { IAuthUser } from "@trueno-proclub-services/shared"
import { betterAuth } from "better-auth"
import { createAuthMiddleware, APIError } from "better-auth/api"
import { mongodbAdapter } from "better-auth/adapters/mongodb"
import { ObjectId } from "mongodb"

const DEVMODE = process.env.DEVMODE === "true";
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS?.split(",") ?? [];

export const createAuth = (db: any, onTwitchLogin?: (user: any) => Promise<void>) => betterAuth({
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:4000",
  database: mongodbAdapter(db),


  advanced: {
    crossSubDomainCookies: DEVMODE
      ? {
        enabled: false
      }
      : {
        enabled: true,
        domain: process.env.COOKIE_DOMAIN || ".casemurocity.org",
      },
  },

  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path === "/update-user") {
        throw new APIError("FORBIDDEN", {
          message: "Not allowed"
        })
      }
    }),
  },

  databaseHooks: {
    account: {
      create: {
        after: async (account: any) => {
          if (account.providerId === "twitch") {
            // Actualizamos el twitchId en el usuario
            await db.collection("user").updateOne(
              { _id: new ObjectId(account.userId) },
              { $set: { twitchId: account.accountId } }
            )

            const userDoc = await db.collection("user").findOne({ _id: new ObjectId(account.userId) })
            if (userDoc) {
              const user = { ...userDoc, id: userDoc._id.toString() }
              onTwitchLogin?.(user)
            }
          }
        }
      }
    }
  },

  user: {
    additionalFields: {
      discordId: {
        type: "string",
        required: false
      },
      twitchId: {
        type: "string",
        required: false
      },
      twitchFollowing: {
        type: "boolean",
        required: false,
        defaultValue: false
      },
      twitchSub: {
        type: "boolean",
        required: false,
        defaultValue: false
      },
      role: {
        type: "string",
        defaultValue: "visitor"
      }
    },
    deleteUser: {
      enabled: true,
    }
  },

  trustedOrigins: ALLOWED_ORIGINS.length ? ALLOWED_ORIGINS : ["http://localhost:4321"],

  socialProviders: {
    twitch: {
      clientId: process.env.TWITCH_CLIENT_ID || "",
      clientSecret: process.env.TWITCH_CLIENT_SECRET || "",
      overrideUserInfoOnSignIn: true
    }
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