import { defineConfig } from 'astro/config';
import tailwind from "@astrojs/tailwind";
import node from "@astrojs/node";

import vue from "@astrojs/vue";
import icon from "astro-icon";

// https://astro.build/config
export default defineConfig({
  integrations: [tailwind(), icon(
    {
      iconsets: {
        local: "/src/icons",
      },
    }
  ), vue({
    appEntrypoint: '/src/pages/vueapp.ts',
    template: {
      transformAssetUrls: {
        includeAbsolute: false,
      }
    },
  })],
  output: "hybrid",
  adapter: node({
    mode: "middleware"
  })
});