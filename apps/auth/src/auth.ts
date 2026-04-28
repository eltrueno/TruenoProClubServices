import "dotenv/config"
import { betterAuth } from "better-auth"
import { mongodbAdapter } from "better-auth/adapters/mongodb"
import { db } from "./db"

export const auth = betterAuth({
  database: mongodbAdapter(db),

  advanced: {
    crossSubDomainCookies: {
      enabled: true,
      domain: process.env.COOKIE_DOMAIN || ".casemurocity.org"
    }
  },

  user: {
    additionalFields: {
      discordId: {
        type: "string",
        required: false,
        nullable: true
      },
      eaPlayerName: {
        type: "string",
        required: false,
        nullable: true
      },
      twitchId: {
        type: "string",
        required: false,
        nullable: true
      },
      twitchFollowing: {
        type: "boolean",
        required: true,
        default: false
      },
      role: {
        type: "string",
        defaultValue: "visitor"
      }
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
    }
  }
})
