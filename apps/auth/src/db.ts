import "dotenv/config"
import { MongoClient } from "mongodb"

if (!process.env.MONGODB_URI) {
  throw new Error("MONGODB_URI is not defined")
}

const client = new MongoClient(process.env.MONGODB_URI)
const dbName = process.env.DBNAME || "auth"

export async function connectToDatabase() {
  await client.connect()
  return client.db(dbName)
}

export const db = client.db(dbName)
