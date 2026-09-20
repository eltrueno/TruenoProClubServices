// @ts-check
import { defineConfig } from "astro/config";
import vue from "@astrojs/vue";
import tailwindcss from "@tailwindcss/vite";
import svgLoader from "vite-svg-loader";

// Full static: es lo que necesita GitHub Pages (ni SSR ni API routes).
// Las islas Vue hacen fetch al api en el navegador; los parámetros de las
// páginas "dinámicas" (jugador, partido, semana...) van por query string y
// se leen en cliente.
export default defineConfig({
  site: "https://www.casemurocity.org",
  output: "static",
  trailingSlash: "never",
  build: {
    // /jugador.html en vez de /jugador/index.html: GitHub Pages sirve /jugador sin redirección con barra final
    format: "file",
  },
  integrations: [
    vue({
      appEntrypoint: "./src/vueapp.ts",
      template: {
        transformAssetUrls: {
          includeAbsolute: false,
        },
      },
    }),
  ],
  vite: {
    plugins: [tailwindcss(), svgLoader({ defaultImport: "url" })],
  },
});
