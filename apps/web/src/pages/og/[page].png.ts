import type { APIRoute, GetStaticPaths } from "astro"
import { renderPageOgImage } from "@/lib/ogImage"

/**
 * Imagen para compartir de cada página indexable (/og/plantilla.png…; ver lib/ogImage.ts). La
 * página la usa con `ogImage="/og/<página>.png"` en el Layout.
 */
export const OG_PAGES = {
    plantilla: "Plantilla",
    partidos: "Partidos",
    totw: "Salón de la fama",
} as const

export const getStaticPaths = (() =>
    Object.entries(OG_PAGES).map(([page, title]) => ({ params: { page }, props: { title } }))) satisfies GetStaticPaths

export const GET: APIRoute = async ({ props }) =>
    new Response(new Uint8Array(await renderPageOgImage(props.title as string)), { headers: { "Content-Type": "image/png" } })
