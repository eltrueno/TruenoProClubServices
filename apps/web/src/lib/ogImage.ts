import path from "node:path"
import sharp from "sharp"
import { CLUB } from "@/config/club"

/**
 * Imágenes para las vistas previas de enlaces (og:image / twitter:image), generadas en el build
 * con el escudo y los colores de config/club.ts, así que cada club tiene las suyas:
 * - la general (/og.png): el escudo centrado sobre ogBackground (por defecto, el color principal);
 * - la de una página (/og/<página>.png): el escudo a la izquierda y, a la derecha, el nombre de la
 *   página y el del club.
 * PNG y no WebP: WhatsApp y LinkedIn no enseñan vistas previas con WebP.
 */

// Si cambian, actualizar og:image:width/height en SeoHead.astro
export const OG_WIDTH = 1200
export const OG_HEIGHT = 630

const background = () => CLUB.ogBackground ?? CLUB.colors.primary

/** El escudo (ruta de public/; el build corre en apps/web) a `height` px de alto */
const logo = (height: number) =>
    sharp(path.join(process.cwd(), "public", CLUB.logo)).resize({ height, fit: "inside" }).png().toBuffer({ resolveWithObject: true })

const escapeXml = (text: string) => text.replace(/[<>&"']/g, (c) => `&#${c.charCodeAt(0)};`)

/** Lienzo del fondo del club con capas encima */
const canvas = (layers: sharp.OverlayOptions[]) =>
    sharp({ create: { width: OG_WIDTH, height: OG_HEIGHT, channels: 4, background: background() } })
        .composite(layers)
        .png({ compressionLevel: 9 })
        .toBuffer()

/** La general: el escudo centrado a ~80% del alto, como el banner que se hacía a mano */
export async function renderClubOgImage(): Promise<Buffer> {
    const { data } = await logo(500)
    return canvas([{ input: data, gravity: "center" }])
}

/** La de una página: escudo a la izquierda; título de la página y nombre del club a la derecha */
export async function renderPageOgImage(title: string): Promise<Buffer> {
    const LOGO_HEIGHT = 320
    const MARGIN = 90
    const GAP = 70
    const { data, info } = await logo(LOGO_HEIGHT)

    const textX = MARGIN + info.width + GAP
    const textWidth = OG_WIDTH - textX - MARGIN
    // Que el título quepa en una línea: ~0,64 em por carácter en negrita, contando con DejaVu Sans
    // (la de los runners Linux de GitHub, más ancha que Segoe UI)
    const titleSize = Math.round(Math.min(92, textWidth / (title.length * 0.64)))
    const font = "'Segoe UI', 'DejaVu Sans', Arial, sans-serif"
    const color = CLUB.colors.primaryContent

    const text = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${OG_WIDTH}" height="${OG_HEIGHT}">
        <text x="${textX}" y="${OG_HEIGHT / 2 - 6}" font-family="${font}" font-size="${titleSize}" font-weight="800" fill="${color}">${escapeXml(title)}</text>
        <text x="${textX}" y="${OG_HEIGHT / 2 + 58}" font-family="${font}" font-size="40" font-weight="600" fill="${color}" fill-opacity="0.8">${escapeXml(CLUB.name)}</text>
    </svg>`)

    return canvas([
        { input: data, left: MARGIN, top: Math.round((OG_HEIGHT - info.height) / 2) },
        { input: text, left: 0, top: 0 },
    ])
}
