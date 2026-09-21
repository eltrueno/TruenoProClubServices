import { HeadBucketCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3"
import { lookup } from "node:dns/promises"
import { isIP } from "node:net"

/**
 * Fotos de jugadores en Cloudflare R2 (API S3). Si no hay credenciales el api sigue
 * funcionando, solo que subir fotos devuelve IMAGE_STORAGE_NOT_CONFIGURED.
 */
const ACCOUNT_ID = process.env.R2_ACCOUNT_ID
const ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID
const SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY
const BUCKET = process.env.R2_BUCKET
const PUBLIC_URL = (process.env.R2_PUBLIC_URL || "").replace(/\/+$/, "")

export const isConfigured = () => !!(ACCOUNT_ID && ACCESS_KEY_ID && SECRET_ACCESS_KEY && BUCKET && PUBLIC_URL)

/** Los playerId de EA son numéricos; se acota para que nunca formen rutas raras en el bucket */
export const PLAYER_ID_RE = /^[A-Za-z0-9_-]{1,64}$/

let client: S3Client | null = null
const getClient = () => {
    if (!client) {
        client = new S3Client({
            region: "auto",
            endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
            credentials: { accessKeyId: ACCESS_KEY_ID!, secretAccessKey: SECRET_ACCESS_KEY! }
        })
    }
    return client
}

/** Comprobación al arrancar: credenciales y bucket accesibles (solo loguea, nunca tumba el api) */
export const checkConnection = async () => {
    if (!isConfigured()) {
        console.warn("[r2] Sin configurar (faltan R2_*): no se podrán subir fotos de jugadores")
        return
    }
    try {
        await getClient().send(new HeadBucketCommand({ Bucket: BUCKET }))
        console.log(`[r2] Conexión OK: bucket "${BUCKET}" · público en ${PUBLIC_URL}`)
    } catch (e) {
        console.error(`[r2] No se puede acceder al bucket "${BUCKET}":`, e instanceof Error ? e.message : e)
    }
}

/** Sube la foto (PNG 400x450) y devuelve su URL pública, con `?v=` para saltarse la caché del CDN */
export const uploadPlayerImage = async (playerId: string, png: Buffer): Promise<string> => {
    if (!isConfigured()) throw new Error("IMAGE_STORAGE_NOT_CONFIGURED")
    if (!PLAYER_ID_RE.test(playerId)) throw new Error("ERROR_BAD_REQUEST")
    const key = `players/${playerId}.png`
    await getClient().send(new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        Body: png,
        ContentType: "image/png",
        CacheControl: "public, max-age=31536000, immutable"
    }))
    console.log(`[r2] Subida foto ${key} (${(png.length / 1024).toFixed(0)} kB)`)
    return `${PUBLIC_URL}/${key}?v=${Date.now()}`
}

// ---------------------------------------------------------------------------
// Proxy de imágenes remotas (para el editor). Es una petición hecha por el servidor
// a una URL que elige el admin, así que se acota todo lo posible:
//  - solo http(s) en puertos estándar, sin credenciales en la URL
//  - el host no puede resolver a IPs privadas / loopback / link-local (SSRF)
//  - se siguen como mucho 3 redirecciones, revalidando cada salto
//  - se leen como mucho 10 MB y se comprueba la firma real de la imagen (png/jpeg/webp/gif)
// ---------------------------------------------------------------------------
const MAX_REMOTE_BYTES = 10 * 1024 * 1024
const MAX_REDIRECTS = 3
const FETCH_TIMEOUT_MS = 15000

const isPrivateIPv4 = (ip: string) => {
    const [a, b] = ip.split(".").map(Number)
    return a === 10 || a === 127 || a === 0
        || (a === 169 && b === 254)
        || (a === 172 && b >= 16 && b <= 31)
        || (a === 192 && b === 168)
        || (a === 100 && b >= 64 && b <= 127) // CGNAT
        || a >= 224 // multicast / reservado
}
const isPrivateIPv6 = (ip: string) => {
    const v = ip.toLowerCase()
    if (v === "::" || v === "::1") return true
    if (v.startsWith("::ffff:")) return isPrivateIPv4(v.slice(7))
    return v.startsWith("fc") || v.startsWith("fd") // ULA
        || v.startsWith("fe8") || v.startsWith("fe9") || v.startsWith("fea") || v.startsWith("feb") // link-local
        || v.startsWith("ff") // multicast
}
const isPrivateAddress = (ip: string) => (isIP(ip) === 4 ? isPrivateIPv4(ip) : isPrivateIPv6(ip))

const assertPublicUrl = async (raw: string): Promise<URL> => {
    let url: URL
    try {
        url = new URL(raw)
    } catch {
        throw new Error("ERROR_BAD_REQUEST")
    }
    if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error("ERROR_BAD_REQUEST")
    if (url.username || url.password) throw new Error("ERROR_BAD_REQUEST")
    if (url.port && url.port !== "80" && url.port !== "443") throw new Error("ERROR_BAD_REQUEST")

    const host = url.hostname.replace(/^\[|\]$/g, "")
    if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal")) throw new Error("ERROR_BAD_REQUEST")
    if (isIP(host)) {
        if (isPrivateAddress(host)) throw new Error("ERROR_BAD_REQUEST")
        return url
    }
    const addresses = await lookup(host, { all: true }).catch(() => [])
    if (addresses.length === 0 || addresses.some((a) => isPrivateAddress(a.address))) throw new Error("ERROR_BAD_REQUEST")
    return url
}

const IMAGE_SIGNATURES: Array<{ type: string; test: (b: Buffer) => boolean }> = [
    { type: "image/png", test: (b) => b.length >= 8 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
    { type: "image/jpeg", test: (b) => b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
    { type: "image/gif", test: (b) => b.length >= 6 && (b.subarray(0, 6).toString("ascii") === "GIF87a" || b.subarray(0, 6).toString("ascii") === "GIF89a") },
    { type: "image/webp", test: (b) => b.length >= 12 && b.subarray(0, 4).toString("ascii") === "RIFF" && b.subarray(8, 12).toString("ascii") === "WEBP" }
]
/** Tipo real por firma (nunca se confía en el Content-Type remoto: un SVG con script no debe pasar) */
export const sniffImageType = (b: Buffer): string | null => IMAGE_SIGNATURES.find((s) => s.test(b))?.type ?? null

const readCapped = async (res: Response): Promise<Buffer> => {
    const length = Number(res.headers.get("content-length") || 0)
    if (length > MAX_REMOTE_BYTES) throw new Error("ERROR_BAD_REQUEST")
    if (!res.body) throw new Error("ERROR_BAD_REQUEST")
    const chunks: Uint8Array[] = []
    let total = 0
    const reader = res.body.getReader()
    for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        total += value.byteLength
        if (total > MAX_REMOTE_BYTES) {
            await reader.cancel()
            throw new Error("ERROR_BAD_REQUEST")
        }
        chunks.push(value)
    }
    return Buffer.concat(chunks)
}

/** Descarga una imagen remota (para que el editor de la web pueda pintarla en canvas sin CORS) */
export const fetchRemoteImage = async (raw: string): Promise<{ contentType: string; body: Buffer }> => {
    let url = await assertPublicUrl(raw)
    let res: Response | null = null
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
        res = await fetch(url, {
            redirect: "manual",
            signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
            headers: { accept: "image/*", "user-agent": "tpcs-image-proxy" }
        })
        if (res.status >= 300 && res.status < 400) {
            const location = res.headers.get("location")
            if (!location || hop === MAX_REDIRECTS) throw new Error("ERROR_NOT_FOUND")
            url = await assertPublicUrl(new URL(location, url).toString())
            continue
        }
        break
    }
    if (!res || !res.ok) throw new Error("ERROR_NOT_FOUND")
    const body = await readCapped(res)
    const contentType = sniffImageType(body)
    if (!contentType) throw new Error("ERROR_BAD_REQUEST")
    return { contentType, body }
}
