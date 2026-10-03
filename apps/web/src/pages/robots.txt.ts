import type { APIRoute } from "astro";
import { CLUB } from "../config/club";

export const GET: APIRoute = () => {
    const baseUrl = CLUB.siteUrl.replace(/\/+$/, "");
    const robots = `User-agent: *
Disallow: /404
Disallow: /404.html
Disallow: /imagegenerator
Disallow: /logrosdef
Disallow: /authcallback

Sitemap: ${baseUrl}/sitemap.xml
`;

    return new Response(robots, {
        headers: {
            "Content-Type": "text/plain; charset=utf-8",
        },
    });
};
