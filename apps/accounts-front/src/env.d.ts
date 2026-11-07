/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

interface ImportMetaEnv {
    readonly PUBLIC_SITE_URL?: string;
    readonly PUBLIC_AUTH_URL?: string;
    readonly PUBLIC_API_URL_CITY?: string;
    readonly PUBLIC_API_URL_UNITED?: string;
    readonly PUBLIC_WEB_URL_CITY?: string;
    readonly PUBLIC_WEB_URL_UNITED?: string;
    /** "city,united" para limitar los clubes (en local) */
    readonly PUBLIC_CLUBS?: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
