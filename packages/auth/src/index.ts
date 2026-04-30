import "dotenv/config"
import { betterAuth } from "better-auth"
import { createAuthMiddleware, APIError } from "better-auth/api"
import { mongodbAdapter } from "better-auth/adapters/mongodb"
import { ObjectId } from "mongodb"



export const createAuth = (db: any) => betterAuth({
  database: mongodbAdapter(db),

  advanced: {
    crossSubDomainCookies: {
      enabled: true,
      domain: process.env.COOKIE_DOMAIN || ".casemurocity.org"
    }
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
            await db.collection("user").updateOne(
              { _id: new ObjectId(account.userId) },
              { $set: { twitchId: account.accountId } }
            )
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
      eaPlayerName: {
        type: "string",
        required: false
      },
      twitchId: {
        type: "string",
        required: false
      },
      twitchFollowing: {
        type: "boolean",
        required: true,
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

  trustedOrigins: [
    process.env.WWW_URL || "https://www.casemurocity.org",
    process.env.API_URL || "https://api.casemurocity.org",
  ],

  socialProviders: {
    twitch: {
      clientId: process.env.TWITCH_CLIENT_ID || "",
      clientSecret: process.env.TWITCH_CLIENT_SECRET || "",
      overrideUserInfoOnSignIn: true
    }
  }
})

/*DUMMY CLIENT FOR TYPE INFERENCE */
export type AuthType = ReturnType<typeof createAuth>