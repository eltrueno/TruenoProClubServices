import { CLUB } from "@/config/club"

/**
 * Datos estructurados (schema.org, JSON-LD): lo que leen los buscadores para entender qué es cada
 * página y enseñarla mejor. Las páginas los pasan al Layout (`jsonLd` y `breadcrumb`) y SeoHead
 * los mete en el <head>.
 */

export type JsonLd = Record<string, unknown>

/** Una página para las migas de pan: nombre y ruta ("/plantilla") */
export interface BreadcrumbItem {
    name: string
    path: string
}

const absolute = (path: string) => (path.startsWith("http") ? path : `${CLUB.siteUrl}${path}`)

/** El club (SportsTeam) y su web (WebSite), para la portada */
export function clubJsonLd(): JsonLd[] {
    const sameAs = Object.values(CLUB.socials).filter(Boolean)
    return [
        {
            "@context": "https://schema.org",
            "@type": "SportsTeam",
            name: CLUB.name,
            url: absolute("/"),
            logo: absolute(CLUB.logo),
            sport: "EA SPORTS FC Clubes Pro",
            description: "Club de Clubes Pro de EA SPORTS FC de la comunidad de Mr Casemuro.",
            ...(sameAs.length ? { sameAs } : {}),
        },
        {
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: CLUB.name,
            url: absolute("/"),
            inLanguage: "es",
        },
    ]
}

/** Migas de pan (BreadcrumbList): "Inicio" y después `items` */
export function breadcrumbJsonLd(items: BreadcrumbItem[]): JsonLd {
    return {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [{ name: "Inicio", path: "/" }, ...items].map((item, i) => ({
            "@type": "ListItem",
            position: i + 1,
            name: item.name,
            item: absolute(item.path),
        })),
    }
}

/** Para meterlo en <script type="application/ld+json">: un "</" en los datos no puede cerrarlo */
export const serializeJsonLd = (data: JsonLd[]) => JSON.stringify(data).replace(/</g, "\\u003c")
