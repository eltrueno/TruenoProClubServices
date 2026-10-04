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

export interface ClubData {
    id: ClubId;
    name: string;
    /** api del club: por defecto `/api` del propio dominio (Cloudflare lo enruta a su instancia).
     *  `PUBLIC_API_URL` lo sobreescribe (p. ej. en local). */
    apiUrl: string;
    logo: string;
    ogImage: string;
    themeColor: string;
    colors: ClubColors;
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
        logo: "/club/city/logo.webp",
        ogImage: "/club/city/escudo_banner_fondo.webp",
        themeColor: "#C80D0D",
        colors: {
            primary: "#c80d0d",
            primaryContent: "#ffffff",
            secondary: "#0037ff",
            secondaryContent: "#ffffff",
        },
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
        logo: "/club/city/logo.webp",
        ogImage: "/club/city/escudo_banner_fondo.webp",
        themeColor: "#C80D0D",
        colors: {
            primary: "#c80d0d",
            primaryContent: "#ffffff",
            secondary: "#0037ff",
            secondaryContent: "#ffffff",
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