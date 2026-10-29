import type { APIRoute } from "astro"
import path from "node:path"
import sharp from "sharp"
import { CLUB } from "@/config/club"

/**
 * Imagen para las vistas previas de enlaces (og:image / twitter:image): el escudo del club
 * centrado sobre su ogBackground (por defecto, su color principal), a 1200x630. Se genera en el build, así que cada club tiene la suya
 * y se actualiza sola al cambiar el escudo o el color en config/club.ts.
 * PNG y no WebP: WhatsApp y LinkedIn no enseñan vistas previas con WebP.
 */

// Si cambian, actualizar og:image:width/height en Layout.astro
const OG_WIDTH = 1200
const OG_HEIGHT = 630
// El escudo ocupa ~80% del alto, como el banner que se hacía a mano
const LOGO_HEIGHT = 500

export const GET: APIRoute = async () => {
    // El build corre en apps/web; el logo es una ruta de public/
    const logoPath = path.join(process.cwd(), "public", CLUB.logo)
    const logo = await sharp(logoPath).resize({ height: LOGO_HEIGHT, fit: "inside" }).png().toBuffer()

    const png = await sharp({
        create: { width: OG_WIDTH, height: OG_HEIGHT, channels: 4, background: CLUB.ogBackground ?? CLUB.colors.primary }
    })
        .composite([{ input: logo, gravity: "center" }])
        .png({ compressionLevel: 9 })
        .toBuffer()

    return new Response(new Uint8Array(png), { headers: { "Content-Type": "image/png" } })
}
