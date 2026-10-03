import type { APIRoute } from "astro";
import { CLUB } from "../config/club";

const pages = [
    { path: "", priority: "1.00" },
    { path: "plantilla", priority: "0.80" },
    { path: "partidos", priority: "0.80" },
    { path: "totw", priority: "0.80" },
];

export const GET: APIRoute = () => {
    const baseUrl = CLUB.siteUrl.replace(/\/+$/, "");
    const now = new Date().toISOString();

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages
    .map(
        (page) => `    <url>
        <loc>${baseUrl}${page.path ? `/${page.path}` : "/"}</loc>
        <lastmod>${now}</lastmod>
        <priority>${page.priority}</priority>
    </url>`
    )
    .join("\n")}
</urlset>`;

    return new Response(xml, {
        headers: {
            "Content-Type": "application/xml; charset=utf-8",
        },
    });
};
