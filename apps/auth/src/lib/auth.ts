import { createAuth } from "@trueno-proclub-services/auth"
import { db } from "../db"

export const auth = createAuth(db)
