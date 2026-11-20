#!/usr/bin/env node
/**
 * Genera la lista de librerías de terceros (con su licencia) de todo el monorepo para la página
 * de créditos de accounts (/licencias): apps/accounts-front/src/data/licenses.json.
 *
 * Lee las dependencias declaradas en el package.json de cada app y paquete del workspace y, de
 * cada una, la versión instalada, la licencia y la web de su package.json en node_modules (por
 * eso hay que tener las dependencias instaladas: `pnpm install`). Los paquetes propios
 * (@trueno-proclub-services/*) no salen.
 *
 * Uso (desde la raíz): node scripts/generate-licenses.mjs
 * Hay que volver a ejecutarlo al añadir, quitar o actualizar dependencias, y commitear el JSON.
 */
import { existsSync, readdirSync, readFileSync, realpathSync, writeFileSync, mkdirSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const OUT = path.join(ROOT, "apps/accounts-front/src/data/licenses.json")
const OWN_SCOPE = "@trueno-proclub-services/"
// Paquetes que no son librerías de verdad (p. ej. "fs" del bot, que es un módulo de Node)
const IGNORE = new Set(["fs"])

/** Dónde se usa cada app o paquete, para agrupar en la página */
const AREA = {
    web: "webs",
    "accounts-front": "webs",
    api: "servidores",
    worker: "servidores",
    auth: "servidores",
    authservice: "servidores",
    discordbot: "servidores",
    imagerenderer: "servidores",
    "imagerenderer-client": "servidores",
    eafcapi: "servidores",
    shared: "servidores",
}

const readJson = (file) => JSON.parse(readFileSync(file, "utf8"))

/** La raíz (herramientas comunes: tests…) y las carpetas del workspace con package.json (apps/* y packages/*) */
const workspaces = [
    ROOT,
    ...["apps", "packages"].flatMap((dir) =>
        readdirSync(path.join(ROOT, dir), { withFileTypes: true })
            .filter((d) => d.isDirectory() && existsSync(path.join(ROOT, dir, d.name, "package.json")))
            .map((d) => path.join(ROOT, dir, d.name))
    ),
]

/** package.json instalado de `dep`, buscándolo desde la carpeta del workspace hacia arriba */
function installedPackage(fromDir, dep) {
    let dir = fromDir
    while (true) {
        const candidate = path.join(dir, "node_modules", dep, "package.json")
        if (existsSync(candidate)) return readJson(realpathSync(candidate))
        const parent = path.dirname(dir)
        if (parent === dir) return null
        dir = parent
    }
}

const licenseOf = (pkg) => {
    if (typeof pkg.license === "string") return pkg.license
    if (pkg.license?.type) return pkg.license.type
    if (Array.isArray(pkg.licenses)) return pkg.licenses.map((l) => l.type ?? l).join(" OR ")
    return "Desconocida"
}

const urlOf = (pkg, name) => {
    const repo = typeof pkg.repository === "string" ? pkg.repository : pkg.repository?.url
    const fromRepo = repo
        ?.replace(/^git\+/, "")
        .replace(/^git:\/\//, "https://")
        .replace(/^github:/, "https://github.com/")
        .replace(/\.git$/, "")
    const url = pkg.homepage || fromRepo
    return url && /^https?:\/\//.test(url) ? url : `https://www.npmjs.com/package/${name}`
}

/** nombre → entrada; una librería usada en varias apps sale una vez */
const libs = new Map()

for (const ws of workspaces) {
    const pkg = readJson(path.join(ws, "package.json"))
    const short = pkg.name.replace(OWN_SCOPE, "")
    const area = AREA[short] ?? "servidores"
    const groups = [
        [pkg.dependencies ?? {}, false],
        [pkg.devDependencies ?? {}, true],
    ]
    for (const [deps, dev] of groups) {
        for (const name of Object.keys(deps)) {
            if (name.startsWith(OWN_SCOPE) || IGNORE.has(name)) continue
            const installed = installedPackage(ws, name)
            if (!installed) {
                console.warn(`[licencias] ${name} (${short}) no está instalado: ejecuta pnpm install`)
                continue
            }
            const entry = libs.get(name) ?? {
                name,
                version: installed.version,
                license: licenseOf(installed),
                url: urlOf(installed, name),
                description: installed.description ?? "",
                areas: new Set(),
                // Herramienta de desarrollo solo si nadie la usa como dependencia normal
                dev: true,
            }
            entry.areas.add(dev ? "desarrollo" : area)
            if (!dev) entry.dev = false
            libs.set(name, entry)
        }
    }
}

const list = [...libs.values()]
    .map(({ areas, ...rest }) => ({ ...rest, areas: [...areas].filter((a) => a !== "desarrollo" || rest.dev).sort() }))
    .sort((a, b) => a.name.localeCompare(b.name))

mkdirSync(path.dirname(OUT), { recursive: true })
writeFileSync(OUT, `${JSON.stringify(list, null, 2)}\n`)

const unknown = list.filter((l) => l.license === "Desconocida").map((l) => l.name)
console.log(`[licencias] ${list.length} librerías → ${path.relative(ROOT, OUT)}`)
if (unknown.length) console.warn(`[licencias] Sin licencia en su package.json: ${unknown.join(", ")}`)
