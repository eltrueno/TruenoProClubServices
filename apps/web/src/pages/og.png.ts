import type { APIRoute } from "astro"
import { renderClubOgImage } from "@/lib/ogImage"

/** Imagen general para compartir enlaces (ver lib/ogImage.ts) */
export const GET: APIRoute = async () =>
    new Response(new Uint8Array(await renderClubOgImage()), { headers: { "Content-Type": "image/png" } })
