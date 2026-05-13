const REQUIRED_ENV_VARS = [
  "MONGODB_URI",
  "TWITCH_CLIENT_ID",
  "TWITCH_CLIENT_SECRET",
  "TWITCH_CHANNEL_ID",
] as const

export function validateEnv(): void {
  const missing = REQUIRED_ENV_VARS.filter((key) => !process.env[key])
  if (missing.length > 0) {
    console.error(`[env] Missing required environment variables: ${missing.join(", ")}`)
    process.exit(1)
  }
}
