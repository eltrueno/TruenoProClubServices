export type ClubId = "city" | "united";

export interface ClubSocials {
    twitch?: string;
    youtube?: string;
    twitter?: string;
    instagram?: string;
    tiktok?: string;
}

export interface ClubColors {
    primary: string;
    primaryContent: string;
    secondary: string;
    secondaryContent: string;
}

/** Fondos y texto de un tema (cualquier color CSS). Lo que no se indique sale de global.css */
export interface ClubThemeSurfaces {
    base100?: string;
    base200?: string;
    base300?: string;
    baseContent?: string;
}

export interface ClubData {
    id: ClubId;
    name: string;
    /** api del club: por defecto `/api` del propio dominio (Cloudflare lo enruta a su instancia).
     *  `PUBLIC_API_URL` lo sobreescribe (p. ej. en local). */
    apiUrl: string;
    /** Web pública del club. La usan las webs de los otros clubes para enlazarla (footer);
     *  la URL canónica del build actual sigue saliendo de PUBLIC_SITE_URL (siteUrl). */
    webUrl: string;
    logo: string;
    ogImage: string;
    themeColor: string;
    colors: ClubColors;
    /** Fondo de la cabecera y la navbar: el color principal o el fondo del tema. Con "base" se
     *  añaden líneas del color del club (bajo la navbar y en los títulos) para no perder la marca */
    headerStyle: "primary" | "base";
    /** Fondos propios por tema; sin ellos, los de global.css */
    surfaces?: { light?: ClubThemeSurfaces; dark?: ClubThemeSurfaces };
    keywords: string[];
    socials: ClubSocials;
}

export interface ClubConfig extends ClubData {
    siteUrl: string;
    /** servicio de auth, común a todos los clubes */
    authUrl: string;
}

const clubs: Record<ClubId, ClubData> = {
    city: {
        id: "city",
        name: "Casemuro City",
        apiUrl: "/api",
        webUrl: "https://city.casemuro.stream",
        logo: "/club/city/logo.webp",
        ogImage: "/club/city/escudo_banner_fondo.webp",
        themeColor: "#C80D0D",
        colors: {
            primary: "#c80d0d",
            primaryContent: "#ffffff",
            secondary: "#0037ff",
            secondaryContent: "#ffffff",
        },
        headerStyle: "primary",
        keywords: ["casemuro city", "casemurocity"],
        socials: {
            twitch: "https://www.twitch.tv/mr_casemuro",
            youtube: "https://www.youtube.com/channel/UC33K1p2-9FwNclOSbQHFSpA/featured",
            twitter: "https://twitter.com/Mr_Casemuro",
            instagram: "https://www.instagram.com/mr.casemuro",
            tiktok: "https://www.tiktok.com/@mr.casemuro",
        },
    },
    united: {
        id: "united",
        name: "Casemuro United",
        apiUrl: "/api",
        webUrl: "https://united.casemuro.stream",
        logo: "/club/city/logo.webp",
        ogImage: "/club/city/escudo_banner_fondo.webp",
        themeColor: "#B90A34",
        colors: {
            primary: "#b90a34",
            primaryContent: "#ffffff",
            secondary: "#b90a34",
            secondaryContent: "#ffffff",
        },
        headerStyle: "base",
        surfaces: {
            // Marfil de la tercera equipación (Wrexham 26/27): mismos saltos de luminosidad
            // que el tema claro por defecto, con tono cálido. El oscuro se queda como está.
            light: {
                base100: "oklch(98.5% 0.012 90)",
                base200: "oklch(95% 0.02 88)",
                base300: "oklch(90% 0.028 86)",
                baseContent: "oklch(24% 0.012 60)",
            },
        },
        keywords: ["casemuro united", "casemuro city", "casemurocity"],
        socials: {
            twitch: "https://www.twitch.tv/mr_casemuro",
            youtube: "https://www.youtube.com/channel/UC33K1p2-9FwNclOSbQHFSpA/featured",
            twitter: "https://twitter.com/Mr_Casemuro",
            instagram: "https://www.instagram.com/mr.casemuro",
            tiktok: "https://www.tiktok.com/@mr.casemuro",
        },
    },
};

const clubId = (import.meta.env.PUBLIC_CLUB || "city") as ClubId;

if (!clubId || !(clubId in clubs)) {
    throw new Error(`Invalid or missing PUBLIC_CLUB: '${clubId}'. Must be 'city' or 'united'.`);
}

// siteUrl deriva exclusivamente de PUBLIC_SITE_URL para evitar dos fuentes de verdad
const rawSiteUrl = import.meta.env.PUBLIC_SITE_URL || "";
const siteUrl = rawSiteUrl.replace(/\/+$/, "");

const stripSlash = (url: string) => url.replace(/\/+$/, "");

export const CLUB: ClubConfig = {
    ...clubs[clubId],
    siteUrl,
    // Las env mandan sobre los valores del club (útil en local y para entornos de prueba)
    apiUrl: stripSlash(import.meta.env.PUBLIC_API_URL || clubs[clubId].apiUrl),
    authUrl: stripSlash(import.meta.env.PUBLIC_AUTH_URL || "https://auth.casemuro.stream"),
};

/** Los demás clubes de la comunidad, para que cada web enlace a las otras */
export const OTHER_CLUBS: ClubData[] = Object.values(clubs).filter((c) => c.id !== clubId);