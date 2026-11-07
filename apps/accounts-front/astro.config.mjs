// @ts-check
import { defineConfig } from "astro/config";
import vue from "@astrojs/vue";
import tailwindcss from "@tailwindcss/vite";

// Web estática (Cloudflare Pages): todo lo de la cuenta se hace en el navegador
// contra el servicio de auth y los api de los clubes.
export default defineConfig({
  site: process.env.PUBLIC_SITE_URL,
  output: "static",
  trailingSlash: "never",
  build: {
    // /login.html en vez de /login/index.html: Cloudflare Pages sirve /login sin barra final
    format: "file",
  },
  integrations: [vue()],
  vite: {
    plugins: [tailwindcss()],
  },
});
