import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import pagefind from 'astro-pagefind';

// https://astro.build/config
export default defineConfig({
  site: 'https://jeremywinterberg.com',
  // No `base`: custom apex domain serves from root.
  integrations: [sitemap(), pagefind()],
  markdown: {
    shikiConfig: {
      // Dual themes; CSS in global.css switches them off [data-theme].
      themes: { light: 'github-light', dark: 'github-dark' },
      wrap: true,
    },
  },
});
