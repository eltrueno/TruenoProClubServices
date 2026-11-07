#!/usr/bin/env node
/**
 * pnpm dev:local — todo el sistema de cuentas en local, de una vez:
 *
 *   auth      http://localhost:3001   Better Auth con su propia base de DESARROLLO
 *   api city  http://localhost:3010   api del club (lee la base del club de apps/api/.env)
 *   web city  http://localhost:4321   web del club
 *   accounts  http://localhost:4323   login y cuenta
 *
 * Todo en localhost, así que no hay líos de CORS ni de cookies: la cookie de sesión de
 * localhost:3001 la reciben todos los puertos. En el login de accounts aparecen botones
 * para entrar como usuario de prueba (visitante, seguidor, sub, admin) sin Twitch.
 *
 * Qué toca de tus bases de datos:
 *   - auth:  una base aparte, DEV_AUTH_DB (tpcs_auth_dev). Nunca la de producción.
 *   - club:  la de apps/api/.env, casi solo lectura.
 *   - compartida (vínculos, solicitudes, fotos globales): por defecto una COPIA aparte
 *     (tpcs27_shared_dev), así lo que pruebes no aparece en el /admin de verdad. Con
 *     --real-shared se usa la real (verás fotos y vínculos reales, pero lo que hagas, queda).
 *   - Subida de fotos a R2: desactivada (credenciales vacías).
 *
 * Opciones:
 *   --real-shared     usar la base compartida real (la de apps/api/.env)
 *   --only=auth,api   arrancar solo algunos (auth, api, web, accounts)
 *
 * Saca la conexión a Mongo de apps/api/.env (MONGO_URL) y las credenciales de Twitch de
 * apps/auth/.env; no hay que configurar nada más. Si ahí no está TWITCH_CHANNEL_ID, busca el
 * id del canal (DEV_TWITCH_CHANNEL, por defecto mr_casemuro) con las credenciales de la app.
 * Para probar el login real con Twitch, añade
 * http://localhost:3001/api/auth/callback/twitch a las redirect URLs de tu app de Twitch.
 */
import { spawn, spawnSync } from "node:child_process"
import { existsSync, readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..")
const args = process.argv.slice(2)
const realShared = args.includes("--real-shared")
const only = (args.find((a) => a.startsWith("--only="))?.split("=")[1] ?? "").split(",").filter(Boolean)

const PORTS = { auth: 3001, api: 3010, web: 4321, accounts: 4323 }
const URL = Object.fromEntries(Object.entries(PORTS).map(([k, p]) => [k, `http://localhost:${p}`]))
const DEV_AUTH_DB = process.env.DEV_AUTH_DB || "tpcs_auth_dev"
const DEV_SHARED_DB = process.env.DEV_SHARED_DB || "tpcs27_shared_dev"
// Secreto fijo de desarrollo (NO el de producción): firma sesiones y cifra tokens de la base de dev
const DEV_SECRET = "dev-local-secret-no-usar-en-produccion-0123456789"

// ── .env de las apps ───────────────────────────────────────────────────────
function readEnv(file) {
  const path = join(ROOT, file)
  if (!existsSync(path)) return null
  const out = {}
  for (const line of readFileSync(path, "utf-8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/)
    if (!m || line.trim().startsWith("#")) continue
    out[m[1]] = m[2].replace(/^(['"])(.*)\1$/, "$2")
  }
  return out
}

const apiEnv = readEnv("apps/api/.env")
const authEnv = readEnv("apps/auth/.env") ?? {}
if (!apiEnv?.MONGO_URL) {
  console.error("✖ Falta apps/api/.env con MONGO_URL: de ahí saco la conexión a Mongo (y la base del club).")
  process.exit(1)
}

/** mongodb://user:pass@host:port/<base>?opts → misma conexión sin la base (cada app pone la suya) */
const mongoBase = apiEnv.MONGO_URL.replace(/^(mongodb(?:\+srv)?:\/\/[^/]+)\/[^?]*/, "$1/")

/**
 * Id numérico del canal de Twitch. Si no está en apps/auth/.env se busca por su nombre con
 * un token de la app (client credentials). Sin él no se puede saber si alguien sigue o es sub:
 * NUNCA se pone un valor de relleno (con uno inválido Twitch da "sigue" a cualquiera).
 */
async function resolveTwitchChannelId() {
  if (/^[1-9]\d*$/.test(authEnv.TWITCH_CHANNEL_ID ?? "")) return authEnv.TWITCH_CHANNEL_ID
  const login = process.env.DEV_TWITCH_CHANNEL || "mr_casemuro"
  const { TWITCH_CLIENT_ID: id, TWITCH_CLIENT_SECRET: secret } = authEnv
  if (!id || !secret) return ""
  try {
    const token = await fetch("https://id.twitch.tv/oauth2/token", {
      method: "POST",
      body: new URLSearchParams({ client_id: id, client_secret: secret, grant_type: "client_credentials" }),
    }).then((r) => r.json())
    const users = await fetch(`https://api.twitch.tv/helix/users?login=${encodeURIComponent(login)}`, {
      headers: { Authorization: `Bearer ${token.access_token}`, "Client-Id": id },
    }).then((r) => r.json())
    const found = users.data?.[0]?.id ?? ""
    if (found) console.log(`  TWITCH_CHANNEL_ID no está en apps/auth/.env: uso el de ${login} (${found})`)
    return found
  } catch (err) {
    console.warn(`  No he podido buscar el canal ${login} en Twitch:`, err instanceof Error ? err.message : err)
    return ""
  }
}
const twitchChannelId = await resolveTwitchChannelId()
if (!twitchChannelId) {
  console.warn("\x1b[33m⚠ Sin TWITCH_CHANNEL_ID: el login con Twitch funciona, pero follow/sub no se pueden comprobar.\x1b[0m")
}
const sharedDb = realShared ? (apiEnv.SHARED_DB_NAME || "tpcs27_shared") : DEV_SHARED_DB
const LOCAL_ORIGINS = [URL.accounts, URL.web].join(",")

// ── Procesos ───────────────────────────────────────────────────────────────
const SERVICES = [
  {
    id: "auth", color: 35, pkg: "@trueno-proclub-services/authservice",
    cmd: "exec tsx watch src/index.ts",
    env: {
      PORT: String(PORTS.auth),
      DEVMODE: "true",
      DEV_LOGIN: "true",
      MONGODB_URI: mongoBase,
      DBNAME: DEV_AUTH_DB,
      BETTER_AUTH_URL: URL.auth,
      BETTER_AUTH_SECRET: DEV_SECRET,
      ALLOWED_ORIGINS: LOCAL_ORIGINS,
      // Twitch (de apps/auth/.env) por si quieres probar el login de verdad
      TWITCH_CLIENT_ID: authEnv.TWITCH_CLIENT_ID || "",
      TWITCH_CLIENT_SECRET: authEnv.TWITCH_CLIENT_SECRET || "",
      TWITCH_CHANNEL_ID: twitchChannelId,
    },
  },
  {
    id: "api", color: 36, pkg: "@trueno-proclub-services/api",
    cmd: "exec tsx watch src/app.ts",
    env: {
      PORT: String(PORTS.api),
      DEVMODE: "true",
      AUTH_URL: URL.auth,
      ALLOWED_ORIGINS: LOCAL_ORIGINS,
      SHARED_DB_NAME: sharedDb,
      // Sin subidas a R2 en local
      R2_ACCOUNT_ID: "", R2_ACCESS_KEY_ID: "", R2_SECRET_ACCESS_KEY: "", R2_BUCKET: "",
    },
  },
  {
    id: "web", color: 33, pkg: "@trueno-proclub-services/web",
    cmd: `exec astro dev --port ${PORTS.web}`,
    env: {
      PUBLIC_CLUB: "city",
      PUBLIC_SITE_URL: URL.web,
      PUBLIC_API_URL: URL.api,
      PUBLIC_AUTH_URL: URL.auth,
      PUBLIC_ACCOUNTS_URL: URL.accounts,
    },
  },
  {
    id: "accounts", color: 31, pkg: "@trueno-proclub-services/accounts-front",
    cmd: `exec astro dev --port ${PORTS.accounts}`,
    env: {
      PUBLIC_SITE_URL: URL.accounts,
      PUBLIC_AUTH_URL: URL.auth,
      PUBLIC_API_URL_CITY: URL.api,
      PUBLIC_WEB_URL_CITY: URL.web,
      PUBLIC_CLUBS: "city",
    },
  },
].filter((s) => only.length === 0 || only.includes(s.id))

// ── Arranque ───────────────────────────────────────────────────────────────
const tag = (s) => `\x1b[${s.color}m[${s.id.padEnd(8)}]\x1b[0m`

console.log("\n\x1b[1m▶ dev:local\x1b[0m — compilando packages (shared, auth)…")
for (const pkg of ["@trueno-proclub-services/shared", "@trueno-proclub-services/auth"]) {
  const r = spawnSync(`pnpm --filter ${pkg} build`, { cwd: ROOT, stdio: "inherit", shell: true })
  if (r.status !== 0) process.exit(r.status ?? 1)
}

const children = []
for (const s of SERVICES) {
  const child = spawn(`pnpm --filter ${s.pkg} ${s.cmd}`, {
    cwd: ROOT,
    shell: true,
    // dotenv no pisa variables que ya existen: lo de aquí manda sobre los .env de cada app
    env: { ...process.env, ...s.env, FORCE_COLOR: "1" },
  })
  const pipe = (stream) => {
    let buffer = ""
    stream.on("data", (chunk) => {
      buffer += chunk.toString()
      const lines = buffer.split(/\r?\n/)
      buffer = lines.pop() ?? ""
      for (const line of lines) if (line.trim()) console.log(`${tag(s)} ${line}`)
    })
  }
  pipe(child.stdout)
  pipe(child.stderr)
  child.on("exit", (code) => console.log(`${tag(s)} terminado (código ${code})`))
  children.push(child)
}

console.log(`
\x1b[1mTodo en local:\x1b[0m
  \x1b[31maccounts\x1b[0m  ${URL.accounts}/login   ← entra con un usuario de prueba
  \x1b[33mweb city\x1b[0m  ${URL.web}
  \x1b[36mapi city\x1b[0m  ${URL.api}
  \x1b[35mauth\x1b[0m      ${URL.auth}   (base ${DEV_AUTH_DB})
  base compartida: ${sharedDb}${realShared ? "  \x1b[33m(¡la real!)\x1b[0m" : "  (copia de desarrollo; --real-shared para la real)"}
  Ctrl+C para pararlo todo.
`)

// ── Parada: en Windows hay que matar el árbol entero (pnpm → tsx/astro) ─────
let stopping = false
function stop() {
  if (stopping) return
  stopping = true
  for (const c of children) {
    if (c.exitCode !== null) continue
    if (process.platform === "win32") spawnSync("taskkill", ["/pid", String(c.pid), "/T", "/F"], { stdio: "ignore" })
    else c.kill("SIGTERM")
  }
  process.exit(0)
}
process.on("SIGINT", stop)
process.on("SIGTERM", stop)
