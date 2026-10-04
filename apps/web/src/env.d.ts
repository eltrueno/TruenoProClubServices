/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />
/// <reference types="vite-svg-loader" />

interface ImportMetaEnv {
    readonly PUBLIC_CLUB?: string;
    readonly PUBLIC_SITE_URL?: string;
    readonly PUBLIC_API_URL?: string;
    readonly PUBLIC_AUTH_URL?: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
