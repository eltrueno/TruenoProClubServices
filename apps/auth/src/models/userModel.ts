import { ObjectId } from "mongodb"
import { db } from "../db/index"

import { User } from "@trueno-proclub-services/auth"

export const userModel = {
  updateFromTwitchSync(userId: string, payload: Partial<User>): Promise<any> {
    return db.collection("user").updateOne(
      { _id: new ObjectId(userId) },
      { $set: payload }
    )
  }
}
