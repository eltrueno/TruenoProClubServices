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
    logo: string;
    ogImage: string;
    themeColor: string;
    colors: ClubColors;
    keywords: string[];
    socials: ClubSocials;
}

export interface ClubConfig extends ClubData {
    siteUrl: string;
}

const clubs: Record<ClubId, ClubData> = {
    city: {
        id: "city",
        name: "Casemuro City",
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
        logo: "/clubs/united/logo.png", // TODO: asset pendiente de proporcionar
        ogImage: "/clubs/united/og.webp", // TODO: asset pendiente de proporcionar
        themeColor: "#000000", // TODO: color pendiente de confirmar
        colors: {
            primary: "#000000", // TODO: color pendiente de confirmar
            primaryContent: "#ffffff",
            secondary: "#000000", // TODO: color pendiente de confirmar
            secondaryContent: "#ffffff",
        },
        keywords: ["casemuro united"], // TODO: keywords SEO pendientes de confirmar
        socials: {
            // TODO: redes sociales de United pendientes de proporcionar
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

export const CLUB: ClubConfig = {
    ...clubs[clubId],
    siteUrl,
};