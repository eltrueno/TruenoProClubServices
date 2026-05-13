import { ObjectId } from "mongodb"
import { db } from "../db/index"

import { Account } from "@trueno-proclub-services/auth"

export const accountModel = {
  findTwitchAccount(userId: string): Promise<Account | null> {
    return db.collection<Account>("account").findOne({
      userId: new ObjectId(userId),
      providerId: "twitch"
    })
  },

  updateTokens(
    accountId: string,
    tokens: { accessToken: string; refreshToken: string; accessTokenExpiresAt: Date }
  ): Promise<any> {
    return db.collection("account").updateOne(
      { _id: new ObjectId(accountId) },
      { $set: tokens }
    )
  }
}
