# Personal Website (jeremywinterberg.com) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a fast static personal site (blog + About) at jeremywinterberg.com, migrating all Substack posts to Markdown, deployed to GitHub Pages.

**Architecture:** Astro static site. Blog posts are Markdown in a Content Layer collection, rendered through editorial layouts. A one-time Node script converts the Substack export to Markdown with locally-hosted images. Pagefind provides full-text search (indexed during `astro build`). GitHub Actions builds and deploys to GitHub Pages at a custom apex domain.

**Tech Stack:** Astro 6, TypeScript (strict), Vitest (+ Astro Container API), `@astrojs/rss`, `@astrojs/sitemap`, `astro-pagefind`, and a unified/rehype migration pipeline.

## Global Constraints

- **Node 22+** required (Astro 6 floor). `.nvmrc` pins `22`; `package.json` `engines.node` is `>=22`.
- **Astro 6.4.x**, **Content Layer API is mandatory**: collection config lives at `src/content.config.ts` (NOT `src/content/config.ts`); use a `glob()` loader from `astro/loaders`; import `z` from `astro/zod` (not `astro:content`); entries are keyed by `entry.id` (no `.slug`); render with the standalone `render(entry)` from `astro:content` (no `entry.render()`); dynamic post route is `[id].astro`.
- **`site`** in `astro.config.mjs` is exactly `https://jeremywinterberg.com`; **do NOT set `base`** (custom apex domain serves from root).
- **Deploy** uses `withastro/action@v6` + `actions/deploy-pages@v5`; Pages Source must be "GitHub Actions"; never manually add `upload-pages-artifact`/`configure-pages` (the action wraps them).
- **GitHub username:** `JeremyDwayne`. **LinkedIn:** `https://www.linkedin.com/in/jeremywinterberg`. The résumé nav link is labeled **"LinkedIn"** (there is no on-site résumé/CV page and no projects section).
- **Privacy:** `substack_export/` is git-ignored (contains the real subscriber email list); never commit it. Only converted Markdown + downloaded images are committed.
- **Theme:** "Warm Personal" — warm-orange accent, light default + dark toggle driven by `data-theme` on `<html>`. All colors are CSS custom properties.
- **Migration scripts are ESM-only** (the unified ecosystem is ESM); use `.mjs`.

---

## File Structure

```
package.json                      # deps, scripts, engines
astro.config.mjs                  # site, integrations (sitemap, pagefind), shiki dual themes
tsconfig.json                     # extends astro strict
vitest.config.ts                  # getViteConfig wrapper so .astro imports work in tests
.nvmrc                            # 22
.github/workflows/deploy.yml      # build + deploy to GitHub Pages
public/CNAME                      # jeremywinterberg.com
public/favicon.svg                # simple favicon
src/consts.ts                     # SITE, NAV, SOCIAL constants
src/styles/global.css             # CSS custom properties (light + dark), base styles, shiki + pagefind theming
src/content.config.ts             # blog collection: glob loader + exported zod schema
src/utils/posts.ts                # pure helpers: formatDate, sortByDate, getUniqueTags, getPostsByTag
src/layouts/BaseLayout.astro      # html shell, head, FOUC-safe theme script, header, footer
src/layouts/PostLayout.astro      # editorial reading layout; <article data-pagefind-body>
src/components/BaseHead.astro     # <title>, meta description, canonical, OG/Twitter
src/components/SiteHeader.astro   # nav + theme toggle + LinkedIn/GitHub links (data-pagefind-ignore)
src/components/SiteFooter.astro   # LinkedIn/GitHub links (data-pagefind-ignore)
src/components/ThemeToggle.astro  # the toggle button + handler
src/components/PostCard.astro     # post summary (title, date, description, tags)
src/components/TagList.astro      # tag chips linking to /tags/[tag]
src/components/Search.astro       # Pagefind UI (PagefindConfig + <pagefind-searchbox>)
src/pages/index.astro             # home: intro + recent posts
src/pages/about.astro             # About narrative (adapted résumé content)
src/pages/404.astro
src/pages/writing/index.astro     # all posts + tag filter + search box
src/pages/writing/[id].astro      # individual post
src/pages/tags/[tag].astro        # posts for a tag
src/pages/rss.xml.js              # RSS endpoint
src/data/blog/*.md                # posts (sample first, then migrated)
src/assets/blog/<slug>/*          # localized post images
scripts/migrate-substack.mjs      # one-time orchestrator (IO)
scripts/lib/clean-substack-chrome.mjs  # rehype plugin: strip chrome, normalize images
scripts/lib/html-to-markdown.mjs       # htmlToMarkdown(html) -> string
scripts/lib/frontmatter.mjs            # slugFromFilename, buildFrontmatter
scripts/lib/images.mjs                 # extractImageUrls, localImagePath
scripts/lib/*.test.mjs                 # unit tests for the above
src/utils/posts.test.ts                # unit tests for helpers
src/content.config.test.ts             # schema validation tests
src/components/*.test.ts               # container-API component tests
```

---

## Task 1: Project scaffold & tooling

**Files:**
- Create: `package.json`, `astro.config.mjs`, `tsconfig.json`, `vitest.config.ts`, `.nvmrc`, `src/consts.ts`, `src/env.d.ts`, `src/utils/sanity.test.ts`
- Modify: `.gitignore` (already exists — confirm `node_modules/`, `dist/`, `.astro/` present)

**Interfaces:**
- Produces: `src/consts.ts` exporting `SITE` (`{ title, description, url, author }`), `NAV` (`Array<{label, href}>`), `SOCIAL` (`{ linkedin, github }`). Build script is `astro build`; test script is `vitest run`.

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "jeremywinterberg-site",
  "type": "module",
  "version": "0.1.0",
  "private": true,
  "engines": { "node": ">=22" },
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "astro preview",
    "check": "astro check",
    "test": "vitest run",
    "migrate": "node scripts/migrate-substack.mjs"
  },
  "dependencies": {
    "astro": "^6.4.0",
    "@astrojs/rss": "^4.0.0",
    "@astrojs/sitemap": "^3.7.0",
    "astro-pagefind": "^2.0.0"
  },
  "devDependencies": {
    "@astrojs/check": "^0.9.0",
    "typescript": "^5.6.0",
    "vitest": "^2.1.0",
    "unified": "^11.0.0",
    "rehype-parse": "^9.0.0",
    "rehype-remark": "^10.0.0",
    "remark-gfm": "^4.0.0",
    "remark-stringify": "^11.0.0",
    "unist-util-visit": "^5.0.0",
    "gray-matter": "^4.0.3",
    "csv-parse": "^5.5.0",
    "p-limit": "^6.0.0"
  }
}
```

- [ ] **Step 2: Create `.nvmrc`**

```
22
```

- [ ] **Step 3: Create `tsconfig.json`**

```json
{
  "extends": "astro/tsconfigs/strict",
  "include": [".astro/types.d.ts", "**/*"],
  "exclude": ["dist", "substack_export"]
}
```

- [ ] **Step 4: Create `src/env.d.ts`**

```ts
/// <reference path="../.astro/types.d.ts" />
```

- [ ] **Step 5: Create `astro.config.mjs`**

```js
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
```

- [ ] **Step 6: Create `vitest.config.ts`** (uses Astro's Vite config so `.astro` files import in tests)

```ts
import { getViteConfig } from 'astro/config';

export default getViteConfig({
  test: {
    include: ['src/**/*.{test,spec}.ts', 'scripts/**/*.{test,spec}.mjs'],
  },
});
```

- [ ] **Step 7: Create `src/consts.ts`**

```ts
export const SITE = {
  title: 'Jeremy Winterberg',
  description: 'Software engineer writing about code, systems, and the craft of building things.',
  url: 'https://jeremywinterberg.com',
  author: 'Jeremy Winterberg',
} as const;

export const NAV: ReadonlyArray<{ label: string; href: string }> = [
  { label: 'Home', href: '/' },
  { label: 'Writing', href: '/writing' },
  { label: 'About', href: '/about' },
];

export const SOCIAL = {
  linkedin: 'https://www.linkedin.com/in/jeremywinterberg',
  github: 'https://github.com/JeremyDwayne',
} as const;
```

- [ ] **Step 8: Create a sanity test `src/utils/sanity.test.ts`**

```ts
import { expect, test } from 'vitest';
import { SITE, SOCIAL } from '../consts';

test('site constants are configured', () => {
  expect(SITE.url).toBe('https://jeremywinterberg.com');
  expect(SOCIAL.github).toContain('JeremyDwayne');
});
```

- [ ] **Step 9: Install dependencies**

Run: `npm install`
Expected: completes; `node_modules/` populated; an `astro` binary exists.

- [ ] **Step 10: Run the test**

Run: `npm test`
Expected: PASS (1 test).

- [ ] **Step 11: Sync Astro types & validate config**

Run: `npx astro sync`
Expected: succeeds and generates `.astro/types.d.ts` (this validates `astro.config.mjs` and the integrations without needing any pages yet). The first full `npm run build` happens in Task 5 once pages exist.

- [ ] **Step 12: Commit**

```bash
git add -A
git commit -m "chore: scaffold Astro project with tooling and constants"
```

---

## Task 2: Post utility helpers (TDD)

**Files:**
- Create: `src/utils/posts.ts`, `src/utils/posts.test.ts`

**Interfaces:**
- Produces (used by every page that lists posts):
  - `type PostLike = { id: string; data: { title: string; description?: string; pubDate: Date; tags: string[]; draft?: boolean } }`
  - `formatDate(date: Date): string` → e.g. `"Mar 24, 2024"`
  - `sortByDate<T extends PostLike>(posts: T[]): T[]` → newest first (does not mutate input)
  - `getUniqueTags(posts: PostLike[]): string[]` → sorted, de-duplicated
  - `getPostsByTag<T extends PostLike>(posts: T[], tag: string): T[]`

- [ ] **Step 1: Write the failing test `src/utils/posts.test.ts`**

```ts
import { expect, test } from 'vitest';
import { formatDate, sortByDate, getUniqueTags, getPostsByTag } from './posts';

const make = (id: string, iso: string, tags: string[]) => ({
  id,
  data: { title: id, pubDate: new Date(iso), tags },
});

test('formatDate renders a human date', () => {
  expect(formatDate(new Date('2024-03-24T00:00:00Z'))).toBe('Mar 24, 2024');
});

test('sortByDate returns newest first without mutating input', () => {
  const posts = [make('a', '2020-01-01', []), make('b', '2024-01-01', []), make('c', '2022-01-01', [])];
  const sorted = sortByDate(posts);
  expect(sorted.map((p) => p.id)).toEqual(['b', 'c', 'a']);
  expect(posts.map((p) => p.id)).toEqual(['a', 'b', 'c']); // unchanged
});

test('getUniqueTags de-duplicates and sorts', () => {
  const posts = [make('a', '2024-01-01', ['Go', 'DSA']), make('b', '2024-01-02', ['DSA', 'Career'])];
  expect(getUniqueTags(posts)).toEqual(['Career', 'DSA', 'Go']);
});

test('getPostsByTag filters by tag', () => {
  const posts = [make('a', '2024-01-01', ['Go']), make('b', '2024-01-02', ['DSA'])];
  expect(getPostsByTag(posts, 'Go').map((p) => p.id)).toEqual(['a']);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/utils/posts.test.ts`
Expected: FAIL ("Failed to resolve import './posts'" or similar).

- [ ] **Step 3: Implement `src/utils/posts.ts`**

```ts
export type PostLike = {
  id: string;
  data: {
    title: string;
    description?: string;
    pubDate: Date;
    tags: string[];
    draft?: boolean;
  };
};

const DATE_FMT = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'UTC',
});

/** Format a Date as "Mar 24, 2024". */
export function formatDate(date: Date): string {
  return DATE_FMT.format(date);
}

/** Return a new array sorted newest-first by pubDate. */
export function sortByDate<T extends PostLike>(posts: T[]): T[] {
  return [...posts].sort((a, b) => b.data.pubDate.getTime() - a.data.pubDate.getTime());
}

/** All distinct tags across posts, alphabetically sorted. */
export function getUniqueTags(posts: PostLike[]): string[] {
  const set = new Set<string>();
  for (const post of posts) for (const tag of post.data.tags) set.add(tag);
  return [...set].sort((a, b) => a.localeCompare(b));
}

/** Posts that include the given tag. */
export function getPostsByTag<T extends PostLike>(posts: T[], tag: string): T[] {
  return posts.filter((post) => post.data.tags.includes(tag));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/utils/posts.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add post utility helpers (date/sort/tags)"
```

---

## Task 3: Blog content collection + sample posts

**Files:**
- Create: `src/content.config.ts`, `src/content.config.test.ts`, `src/data/blog/hello-world.md`, `src/data/blog/second-post.md`

**Interfaces:**
- Consumes: nothing.
- Produces: a `blog` collection queryable via `getCollection('blog')`; each entry has `id: string` and `data` matching `blogSchema`. Exports `blogSchema` (a zod object) for direct testing. Frontmatter fields: `title: string`, `description?: string`, `pubDate: Date`, `tags: string[]` (default `[]`), `draft: boolean` (default `false`).

- [ ] **Step 1: Write the failing test `src/content.config.test.ts`**

```ts
import { expect, test } from 'vitest';
import { blogSchema } from './content.config';

test('valid frontmatter parses and coerces date + defaults', () => {
  const parsed = blogSchema.parse({ title: 'T', pubDate: '2024-03-24' });
  expect(parsed.pubDate).toBeInstanceOf(Date);
  expect(parsed.tags).toEqual([]);
  expect(parsed.draft).toBe(false);
});

test('missing title is rejected', () => {
  expect(blogSchema.safeParse({ pubDate: '2024-03-24' }).success).toBe(false);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/content.config.test.ts`
Expected: FAIL (cannot import `blogSchema`).

- [ ] **Step 3: Implement `src/content.config.ts`**

```ts
import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

// Exported so it can be unit-tested directly.
export const blogSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  pubDate: z.coerce.date(),
  tags: z.array(z.string()).default([]),
  draft: z.boolean().default(false),
});

const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/data/blog' }),
  schema: blogSchema,
});

export const collections = { blog };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/content.config.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Create sample post `src/data/blog/hello-world.md`**

```markdown
---
title: "Hello, world"
description: "A first post while the site comes together."
pubDate: 2024-01-15
tags: ["Personal"]
draft: false
---

This is a sample post used during development. It will be removed once the real
Substack posts are migrated in.

## A heading

Some body text with a [link](https://example.com) and `inline code`.
```

- [ ] **Step 6: Create sample post `src/data/blog/second-post.md`**

```markdown
---
title: "A second sample"
description: "Another placeholder so listing and tag pages have data."
pubDate: 2024-02-20
tags: ["Personal", "DSA"]
draft: false
---

Second sample body.

```js
console.log("code block renders with syntax highlighting");
```
```

- [ ] **Step 7: Sync to confirm the collection loads**

Run: `npx astro sync`
Expected: succeeds with no content-collection errors (the schema + sample posts validate). The first full build happens in Task 5.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: define blog content collection with sample posts"
```

---

## Task 4: Global styles, theming, BaseHead, BaseLayout, header/footer, theme toggle

**Files:**
- Create: `src/styles/global.css`, `src/components/BaseHead.astro`, `src/components/ThemeToggle.astro`, `src/components/SiteHeader.astro`, `src/components/SiteFooter.astro`, `src/layouts/BaseLayout.astro`, `public/favicon.svg`, `src/layouts/BaseLayout.test.ts`

**Interfaces:**
- Consumes: `SITE`, `NAV`, `SOCIAL` from `src/consts.ts`.
- Produces: `BaseLayout.astro` — props `{ title?: string; description?: string; ogType?: string }`, wraps page content in `<slot/>` inside `<html data-theme>` with header/footer; sets `<html lang="en">`; includes a FOUC-safe `is:inline` theme script in `<head>`.

- [ ] **Step 1: Create `public/favicon.svg`**

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="7" fill="#e8643c"/><text x="16" y="22" font-family="system-ui,sans-serif" font-size="18" font-weight="700" fill="#fff" text-anchor="middle">J</text></svg>
```

- [ ] **Step 2: Create `src/styles/global.css`** (CSS custom properties for light + dark; warm-orange accent; Shiki + Pagefind theming)

```css
:root {
  --bg: #fbf7f1;
  --surface: #ffffff;
  --text: #2c2620;
  --muted: #6b6052;
  --border: #f0e6d8;
  --accent: #e8643c;
  --accent-soft: #fcecdf;
  --max-width: 44rem;
  --font-sans: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  --font-mono: ui-monospace, "SF Mono", Menlo, Consolas, monospace;
  color-scheme: light;
}

:root[data-theme="dark"] {
  --bg: #1a1714;
  --surface: #241f1a;
  --text: #ede7df;
  --muted: #b3a899;
  --border: #352d25;
  --accent: #f6a04d;
  --accent-soft: #33271c;
  color-scheme: dark;
}

* { box-sizing: border-box; }
html { font-family: var(--font-sans); }
body {
  margin: 0;
  background: var(--bg);
  color: var(--text);
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
}
.container { max-width: var(--max-width); margin: 0 auto; padding: 0 1.25rem; }
a { color: var(--accent); text-decoration: none; }
a:hover { text-decoration: underline; }
main { min-height: 60vh; padding: 2.5rem 0; }
h1, h2, h3 { line-height: 1.2; letter-spacing: -0.01em; }
img { max-width: 100%; height: auto; border-radius: 8px; }
code { font-family: var(--font-mono); font-size: 0.9em; }
:not(pre) > code { background: var(--accent-soft); padding: 0.1em 0.35em; border-radius: 4px; }
pre { padding: 1rem; border-radius: 10px; overflow-x: auto; border: 1px solid var(--border); }
blockquote { border-left: 3px solid var(--accent); margin: 1.5rem 0; padding: 0.25rem 1rem; color: var(--muted); }

/* Header / footer */
.site-header, .site-footer { border-color: var(--border); }
.site-header { border-bottom: 1px solid var(--border); }
.site-footer { border-top: 1px solid var(--border); color: var(--muted); font-size: 0.9rem; }
.nav { display: flex; align-items: center; gap: 1.25rem; padding: 1rem 0; flex-wrap: wrap; }
.nav .brand { font-weight: 700; margin-right: auto; }
.nav a.active { color: var(--text); border-bottom: 2px solid var(--accent); }

/* Shiki dual-theme: switch to the dark palette when [data-theme="dark"]. */
:root[data-theme="dark"] .astro-code,
:root[data-theme="dark"] .astro-code span {
  color: var(--shiki-dark) !important;
  background-color: var(--shiki-dark-bg) !important;
  font-style: var(--shiki-dark-font-style) !important;
  font-weight: var(--shiki-dark-font-weight) !important;
  text-decoration: var(--shiki-dark-text-decoration) !important;
}

/* Pagefind UI themed to follow the site theme. */
:root {
  --pf-text: var(--text);
  --pf-background: var(--surface);
  --pf-border: var(--border);
  --pf-hover: var(--accent-soft);
  --pf-outline-focus: var(--accent);
}
```

- [ ] **Step 3: Create `src/components/BaseHead.astro`**

```astro
---
import { SITE } from '../consts';
interface Props { title?: string; description?: string; ogType?: string; }
const { title, description = SITE.description, ogType = 'website' } = Astro.props;
const fullTitle = title ? `${title} · ${SITE.title}` : SITE.title;
const canonical = new URL(Astro.url.pathname, Astro.site).href;
---
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<link rel="icon" type="image/svg+xml" href="/favicon.svg" />
<link rel="canonical" href={canonical} />
<link rel="alternate" type="application/rss+xml" title={SITE.title} href="/rss.xml" />
<title>{fullTitle}</title>
<meta name="description" content={description} />
<meta property="og:type" content={ogType} />
<meta property="og:title" content={fullTitle} />
<meta property="og:description" content={description} />
<meta property="og:url" content={canonical} />
<meta name="twitter:card" content="summary_large_image" />
```

- [ ] **Step 4: Create `src/components/ThemeToggle.astro`**

```astro
---
---
<button id="theme-toggle" type="button" aria-label="Toggle color theme" title="Toggle theme">
  <span aria-hidden="true">🌗</span>
</button>
<style>
  #theme-toggle {
    background: none; border: 1px solid var(--border); border-radius: 999px;
    cursor: pointer; font-size: 1rem; line-height: 1; padding: 0.35rem 0.6rem; color: var(--text);
  }
  #theme-toggle:hover { background: var(--accent-soft); }
</style>
<script>
  const btn = document.getElementById('theme-toggle');
  btn?.addEventListener('click', () => {
    const el = document.documentElement;
    const next = el.dataset.theme === 'dark' ? 'light' : 'dark';
    el.dataset.theme = next;
    el.style.colorScheme = next;
    localStorage.setItem('theme', next);
  });
</script>
```

- [ ] **Step 5: Create `src/components/SiteHeader.astro`**

```astro
---
import { SITE, NAV, SOCIAL } from '../consts';
import ThemeToggle from './ThemeToggle.astro';
const path = Astro.url.pathname;
const isActive = (href: string) => (href === '/' ? path === '/' : path.startsWith(href));
---
<header class="site-header" data-pagefind-ignore>
  <nav class="nav container">
    <a class="brand" href="/">{SITE.title}</a>
    {NAV.map((item) => (
      <a href={item.href} class={isActive(item.href) ? 'active' : ''}>{item.label}</a>
    ))}
    <a href={SOCIAL.linkedin} rel="me noopener" target="_blank">LinkedIn</a>
    <a href={SOCIAL.github} rel="me noopener" target="_blank">GitHub</a>
    <ThemeToggle />
  </nav>
</header>
```

- [ ] **Step 6: Create `src/components/SiteFooter.astro`**

```astro
---
import { SITE, SOCIAL } from '../consts';
const year = new Date().getFullYear();
---
<footer class="site-footer" data-pagefind-ignore>
  <div class="nav container">
    <span>© {year} {SITE.title}</span>
    <a href={SOCIAL.linkedin} rel="me noopener" target="_blank" style="margin-left:auto">LinkedIn</a>
    <a href={SOCIAL.github} rel="me noopener" target="_blank">GitHub</a>
    <a href="/rss.xml">RSS</a>
  </div>
</footer>
```

- [ ] **Step 7: Create `src/layouts/BaseLayout.astro`** (FOUC-safe theme script must be `is:inline` in `<head>`)

```astro
---
import BaseHead from '../components/BaseHead.astro';
import SiteHeader from '../components/SiteHeader.astro';
import SiteFooter from '../components/SiteFooter.astro';
import '../styles/global.css';
interface Props { title?: string; description?: string; ogType?: string; }
const { title, description, ogType } = Astro.props;
---
<!doctype html>
<html lang="en">
  <head>
    <BaseHead title={title} description={description} ogType={ogType} />
    <script is:inline>
      (() => {
        const stored = localStorage.getItem('theme');
        const theme = stored
          ? stored
          : window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        document.documentElement.dataset.theme = theme;
        document.documentElement.style.colorScheme = theme;
      })();
    </script>
  </head>
  <body>
    <SiteHeader />
    <main><div class="container"><slot /></div></main>
    <SiteFooter />
  </body>
</html>
```

- [ ] **Step 8: Write the container test `src/layouts/BaseLayout.test.ts`**

```ts
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { expect, test } from 'vitest';
import BaseLayout from './BaseLayout.astro';

test('BaseLayout renders title, theme script, and header nav', async () => {
  const container = await AstroContainer.create();
  const html = await container.renderToString(BaseLayout, {
    props: { title: 'Test Page' },
    slots: { default: '<p>hello</p>' },
  });
  expect(html).toContain('Test Page · Jeremy Winterberg');
  expect(html).toContain('dataset.theme'); // inline FOUC-safe script present
  expect(html).toContain('href="/writing"'); // nav rendered
  expect(html).toContain('<p>hello</p>'); // slot content
});
```

- [ ] **Step 9: Run the test**

Run: `npx vitest run src/layouts/BaseLayout.test.ts`
Expected: PASS (1 test).

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat: global theming, BaseLayout, header/footer, theme toggle"
```

---

## Task 5: PostCard, TagList, Home, About, 404 pages

**Files:**
- Create: `src/components/PostCard.astro`, `src/components/TagList.astro`, `src/pages/index.astro`, `src/pages/about.astro`, `src/pages/404.astro`, `src/components/PostCard.test.ts`

**Interfaces:**
- Consumes: `getCollection('blog')`, `sortByDate`, `formatDate` (Task 2), `BaseLayout` (Task 4).
- Produces: `PostCard.astro` props `{ id: string; title: string; description?: string; pubDate: Date; tags: string[] }`; `TagList.astro` props `{ tags: string[] }`.

- [ ] **Step 1: Create `src/components/TagList.astro`**

```astro
---
interface Props { tags: string[]; }
const { tags } = Astro.props;
---
{tags.length > 0 && (
  <ul class="tag-list">
    {tags.map((tag) => (
      <li><a href={`/tags/${encodeURIComponent(tag)}`}>#{tag}</a></li>
    ))}
  </ul>
)}
<style>
  .tag-list { display: flex; flex-wrap: wrap; gap: 0.4rem; list-style: none; padding: 0; margin: 0.5rem 0; }
  .tag-list a { font-size: 0.8rem; background: var(--accent-soft); color: var(--accent); padding: 0.15rem 0.55rem; border-radius: 999px; }
  .tag-list a:hover { text-decoration: none; filter: brightness(0.95); }
</style>
```

- [ ] **Step 2: Create `src/components/PostCard.astro`**

```astro
---
import { formatDate } from '../utils/posts';
import TagList from './TagList.astro';
interface Props { id: string; title: string; description?: string; pubDate: Date; tags: string[]; }
const { id, title, description, pubDate, tags } = Astro.props;
---
<article class="post-card">
  <h3><a href={`/writing/${id}`}>{title}</a></h3>
  <p class="date">{formatDate(pubDate)}</p>
  {description && <p class="desc">{description}</p>}
  <TagList tags={tags} />
</article>
<style>
  .post-card { padding: 1.25rem 0; border-bottom: 1px solid var(--border); }
  .post-card h3 { margin: 0 0 0.25rem; }
  .post-card .date { margin: 0; color: var(--muted); font-size: 0.85rem; }
  .post-card .desc { margin: 0.5rem 0; color: var(--muted); }
</style>
```

- [ ] **Step 3: Write the container test `src/components/PostCard.test.ts`**

```ts
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { expect, test } from 'vitest';
import PostCard from './PostCard.astro';

test('PostCard renders title link, date, and tags', async () => {
  const container = await AstroContainer.create();
  const html = await container.renderToString(PostCard, {
    props: { id: 'hello', title: 'Hello', description: 'Desc', pubDate: new Date('2024-03-24T00:00:00Z'), tags: ['Career'] },
  });
  expect(html).toContain('href="/writing/hello"');
  expect(html).toContain('Mar 24, 2024');
  expect(html).toContain('#Career');
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/PostCard.test.ts`
Expected: PASS (1 test).

- [ ] **Step 5: Create `src/pages/index.astro`** (home: intro + recent posts)

```astro
---
import { getCollection } from 'astro:content';
import BaseLayout from '../layouts/BaseLayout.astro';
import PostCard from '../components/PostCard.astro';
import { sortByDate } from '../utils/posts';

const posts = sortByDate(await getCollection('blog', ({ data }) => !data.draft)).slice(0, 5);
---
<BaseLayout>
  <section class="intro">
    <h1>Hey, I'm Jeremy 👋</h1>
    <p>I'm a software engineer. I write about code, systems, and the craft of
      building things that last. This is where my essays live.</p>
    <p><a href="/writing">Read the writing →</a></p>
  </section>
  <section>
    <h2>Recent writing</h2>
    {posts.map((post) => (
      <PostCard id={post.id} title={post.data.title} description={post.data.description}
                pubDate={post.data.pubDate} tags={post.data.tags} />
    ))}
  </section>
</BaseLayout>
```

- [ ] **Step 6: Create `src/pages/about.astro`** (adapted résumé content; no "available for work" framing, no references)

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
import { SOCIAL } from '../consts';
---
<BaseLayout title="About" description="About Jeremy Winterberg — software engineer.">
  <h1>About</h1>
  <p>I'm an accomplished software engineer with over eight years of experience
    building and optimizing robust distributed systems. I'm proficient in Ruby on
    Rails, AWS, and Postgres, with a track record of leading complex projects, and
    I spend my side-project time in Go, TypeScript, React, and Next.js.</p>

  <h2>Experience</h2>
  <ul>
    <li><strong>Senior Software Engineer — PrimeTrust</strong> (2021–2023). Built
      and scaled a core financial API, cut p95 latency on ~500k daily requests from
      20s to under 500ms, and led a Heroku→AWS migration on Kubernetes, Terraform,
      and ArgoCD with 100% uptime.</li>
    <li><strong>Senior Software Engineer — Smartcare Software</strong> (2019–2021).
      Migrated systems to AWS (99.99% availability, ~$50k/yr saved) and architected
      integrations for nationwide electronic visit verification.</li>
    <li><strong>Software Engineer — Consulting</strong> (2017–2019). Delivered Rails
      and Angular applications for clients including the University of Minnesota.</li>
    <li><strong>Ruby on Rails Developer — UW–Eau Claire</strong> (2015–2017).</li>
  </ul>

  <h2>Skills</h2>
  <p><strong>Languages:</strong> Ruby, Go, TypeScript, SQL.
    <strong>Frameworks:</strong> Ruby on Rails, React, Next.js, Angular.
    <strong>Platforms &amp; tools:</strong> AWS, Docker, Kubernetes, Terraform,
    GitHub Actions, DataDog, Postgres, Redis.</p>

  <h2>Education</h2>
  <p>BSc Computer Science, University of Wisconsin–Eau Claire (minor: Economics).</p>

  <p>For the full work history, see my <a href={SOCIAL.linkedin} target="_blank" rel="noopener">LinkedIn</a>,
    and my code on <a href={SOCIAL.github} target="_blank" rel="noopener">GitHub</a>.</p>
</BaseLayout>
```

- [ ] **Step 7: Create `src/pages/404.astro`**

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
---
<BaseLayout title="Not found">
  <h1>404 — Not found</h1>
  <p>That page doesn't exist. <a href="/">Head home</a> or browse the
    <a href="/writing">writing</a>.</p>
</BaseLayout>
```

- [ ] **Step 8: Build and type-check**

Run: `npm run build && npm run check`
Expected: build succeeds and produces `dist/index.html`, `dist/about/index.html`, `dist/404.html`; `astro check` reports 0 errors.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: PostCard/TagList components and home, about, 404 pages"
```

---

## Task 6: Post reading layout + individual post page

**Files:**
- Create: `src/layouts/PostLayout.astro`, `src/pages/writing/[id].astro`

**Interfaces:**
- Consumes: `getCollection`/`render` from `astro:content`, `BaseLayout`, `formatDate`, `TagList`.
- Produces: route `/writing/<id>` for each non-draft post. `PostLayout` wraps the rendered `<Content />` in `<article data-pagefind-body>` (so Pagefind indexes the post body).

- [ ] **Step 1: Create `src/layouts/PostLayout.astro`**

```astro
---
import BaseLayout from './BaseLayout.astro';
import TagList from '../components/TagList.astro';
import { formatDate } from '../utils/posts';
interface Props { title: string; description?: string; pubDate: Date; tags: string[]; }
const { title, description, pubDate, tags } = Astro.props;
---
<BaseLayout title={title} description={description} ogType="article">
  <article class="post" data-pagefind-body>
    <h1>{title}</h1>
    <p class="post-meta">{formatDate(pubDate)}</p>
    <TagList tags={tags} />
    <div class="prose"><slot /></div>
  </article>
  <p><a href="/writing">← All writing</a></p>
</BaseLayout>
<style>
  .post-meta { color: var(--muted); font-size: 0.9rem; margin: 0 0 0.5rem; }
  .prose { margin-top: 1.5rem; }
  .prose :global(h2) { margin-top: 2rem; }
  .prose :global(p) { margin: 1rem 0; }
</style>
```

- [ ] **Step 2: Create `src/pages/writing/[id].astro`**

```astro
---
import { getCollection, render } from 'astro:content';
import PostLayout from '../../layouts/PostLayout.astro';

export async function getStaticPaths() {
  const posts = await getCollection('blog', ({ data }) => !data.draft);
  return posts.map((post) => ({ params: { id: post.id }, props: { post } }));
}

const { post } = Astro.props;
const { Content } = await render(post);
---
<PostLayout title={post.data.title} description={post.data.description}
            pubDate={post.data.pubDate} tags={post.data.tags}>
  <Content />
</PostLayout>
```

- [ ] **Step 3: Build and verify post pages exist**

Run: `npm run build`
Expected: build succeeds; `dist/writing/hello-world/index.html` and `dist/writing/second-post/index.html` are generated.

- [ ] **Step 4: Verify the post body is marked for indexing**

Run: `grep -l "data-pagefind-body" dist/writing/hello-world/index.html`
Expected: the file path prints (attribute present in output).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: post reading layout and individual post pages"
```

---

## Task 7: Writing index + tag pages

**Files:**
- Create: `src/pages/writing/index.astro`, `src/pages/tags/[tag].astro`

**Interfaces:**
- Consumes: `getCollection`, `sortByDate`, `getUniqueTags`, `getPostsByTag`, `PostCard`, `BaseLayout`.
- Produces: `/writing` (all posts + tag links) and `/tags/<tag>` for each tag. The writing index renders a `<div id="search">` placeholder where Task 9 mounts the search box.

- [ ] **Step 1: Create `src/pages/writing/index.astro`**

```astro
---
import { getCollection } from 'astro:content';
import BaseLayout from '../../layouts/BaseLayout.astro';
import PostCard from '../../components/PostCard.astro';
import { sortByDate, getUniqueTags } from '../../utils/posts';

const all = await getCollection('blog', ({ data }) => !data.draft);
const posts = sortByDate(all);
const tags = getUniqueTags(all);
---
<BaseLayout title="Writing" description="Essays and notes by Jeremy Winterberg.">
  <h1>Writing</h1>

  <!-- Search box is injected here in Task 9 -->
  <div id="search-slot"></div>

  <nav class="tag-nav" aria-label="Filter by tag">
    {tags.map((tag) => <a href={`/tags/${encodeURIComponent(tag)}`}>#{tag}</a>)}
  </nav>

  {posts.map((post) => (
    <PostCard id={post.id} title={post.data.title} description={post.data.description}
              pubDate={post.data.pubDate} tags={post.data.tags} />
  ))}
</BaseLayout>
<style>
  .tag-nav { display: flex; flex-wrap: wrap; gap: 0.6rem; margin: 1rem 0 2rem; }
  .tag-nav a { font-size: 0.85rem; color: var(--muted); }
</style>
```

- [ ] **Step 2: Create `src/pages/tags/[tag].astro`**

```astro
---
import { getCollection } from 'astro:content';
import BaseLayout from '../../layouts/BaseLayout.astro';
import PostCard from '../../components/PostCard.astro';
import { sortByDate, getUniqueTags, getPostsByTag } from '../../utils/posts';

export async function getStaticPaths() {
  const all = await getCollection('blog', ({ data }) => !data.draft);
  const tags = getUniqueTags(all);
  return tags.map((tag) => ({ params: { tag }, props: { posts: sortByDate(getPostsByTag(all, tag)), tag } }));
}

const { posts, tag } = Astro.props;
---
<BaseLayout title={`Posts tagged #${tag}`} description={`Writing tagged ${tag}.`}>
  <p><a href="/writing">← All writing</a></p>
  <h1>#{tag}</h1>
  {posts.map((post) => (
    <PostCard id={post.id} title={post.data.title} description={post.data.description}
              pubDate={post.data.pubDate} tags={post.data.tags} />
  ))}
</BaseLayout>
```

- [ ] **Step 3: Build and verify**

Run: `npm run build`
Expected: build succeeds; `dist/writing/index.html` exists and `dist/tags/Personal/index.html` and `dist/tags/DSA/index.html` are generated (from the sample posts' tags).

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: writing index and per-tag pages"
```

---

## Task 8: RSS feed + sitemap verification

**Files:**
- Create: `src/pages/rss.xml.js`

**Interfaces:**
- Consumes: `@astrojs/rss`, `getCollection`, `sortByDate`, `SITE`. (`@astrojs/sitemap` was added as an integration in Task 1 — this task only verifies its output.)
- Produces: `/rss.xml` feed and confirms `/sitemap-index.xml`.

- [ ] **Step 1: Create `src/pages/rss.xml.js`**

```js
import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import { SITE } from '../consts';

export async function GET(context) {
  const posts = await getCollection('blog', ({ data }) => !data.draft);
  posts.sort((a, b) => b.data.pubDate.getTime() - a.data.pubDate.getTime());
  return rss({
    title: SITE.title,
    description: SITE.description,
    site: context.site,
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.pubDate,
      link: `/writing/${post.id}/`,
    })),
  });
}
```

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 3: Verify feed and sitemap were generated**

Run: `test -f dist/rss.xml && test -f dist/sitemap-index.xml && echo OK`
Expected: prints `OK`.

- [ ] **Step 4: Verify the feed links use the production origin**

Run: `grep -o "https://jeremywinterberg.com/writing/[a-z0-9-]*/" dist/rss.xml | head -1`
Expected: prints a URL like `https://jeremywinterberg.com/writing/hello-world/`.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add RSS feed and verify sitemap output"
```

---

## Task 9: Full-text search (Pagefind)

**Files:**
- Create: `src/components/Search.astro`
- Modify: `src/pages/writing/index.astro` (mount the search component)

**Interfaces:**
- Consumes: `astro-pagefind` components. The integration (registered in Task 1) builds the index during `astro build`.
- Produces: a search box on `/writing`; `dist/pagefind/` after build.

- [ ] **Step 1: Create `src/components/Search.astro`**

```astro
---
import PagefindConfig from 'astro-pagefind/components/PagefindConfig.astro';
---
<div class="search">
  <PagefindConfig />
  <pagefind-searchbox></pagefind-searchbox>
</div>
<style>
  .search { margin: 0 0 2rem; }
</style>
```

- [ ] **Step 2: Mount it in `src/pages/writing/index.astro`** — replace the placeholder div

Replace:
```astro
  <!-- Search box is injected here in Task 9 -->
  <div id="search-slot"></div>
```
with:
```astro
  <Search />
```
And add the import to the frontmatter (below the existing imports):
```astro
import Search from '../../components/Search.astro';
```

- [ ] **Step 3: Build (this also produces the search index)**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 4: Verify the Pagefind index was generated**

Run: `test -d dist/pagefind && ls dist/pagefind | grep -q pagefind.js && echo OK`
Expected: prints `OK`.

- [ ] **Step 5: Manual check (optional, requires a prior build)**

Ask the user to run `npm run preview` and confirm typing in the search box on `/writing` returns post results. (Search reads the index from the last build, so a build must precede `preview`/`dev`.)

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add Pagefind full-text search to writing index"
```

---

## Task 10: Substack → Markdown converter library (TDD)

**Files:**
- Create: `scripts/lib/frontmatter.mjs`, `scripts/lib/frontmatter.test.mjs`, `scripts/lib/clean-substack-chrome.mjs`, `scripts/lib/html-to-markdown.mjs`, `scripts/lib/html-to-markdown.test.mjs`, `scripts/lib/images.mjs`, `scripts/lib/images.test.mjs`

**Interfaces:**
- Produces (used by the orchestrator in Task 11):
  - `slugFromFilename(filename: string): string` — `"141626028.merge-two-sorted-arrays.html"` → `"merge-two-sorted-arrays"`.
  - `buildFrontmatter(row, slug): object` — maps a `posts.csv` row to `{ title, description?, pubDate, tags: [], draft }`.
  - `htmlToMarkdown(html: string): Promise<string>` — cleans Substack chrome and converts to Markdown.
  - `extractImageUrls(markdown: string): string[]` — unique remote image URLs in the Markdown.
  - `localImagePath(url: string, slug: string): string` — deterministic repo-relative asset path for a downloaded image.

- [ ] **Step 1: Write `scripts/lib/frontmatter.test.mjs`**

```js
import { expect, test } from 'vitest';
import { slugFromFilename, buildFrontmatter } from './frontmatter.mjs';

test('slugFromFilename strips numeric id and extension', () => {
  expect(slugFromFilename('141626028.merge-two-sorted-arrays.html')).toBe('merge-two-sorted-arrays');
});

test('buildFrontmatter maps csv row fields', () => {
  const row = { title: 'Stop Following Tutorials', subtitle: "It's hurting your growth.", post_date: '2024-03-24T22:50:51.709Z', is_published: 'true' };
  const fm = buildFrontmatter(row, 'stop-following-tutorials');
  expect(fm.title).toBe('Stop Following Tutorials');
  expect(fm.description).toBe("It's hurting your growth.");
  expect(fm.pubDate).toBe('2024-03-24');
  expect(fm.draft).toBe(false);
  expect(fm.tags).toEqual([]);
});

test('buildFrontmatter omits empty description', () => {
  const fm = buildFrontmatter({ title: 'X', subtitle: '', post_date: '2024-01-01T00:00:00Z', is_published: 'true' }, 'x');
  expect('description' in fm).toBe(false);
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run scripts/lib/frontmatter.test.mjs`
Expected: FAIL (cannot import `./frontmatter.mjs`).

- [ ] **Step 3: Implement `scripts/lib/frontmatter.mjs`**

```js
/** "141626028.merge-two-sorted-arrays.html" -> "merge-two-sorted-arrays" */
export function slugFromFilename(filename) {
  const base = filename.replace(/\.html$/i, '');
  const firstDot = base.indexOf('.');
  return firstDot === -1 ? base : base.slice(firstDot + 1);
}

/** Map a posts.csv row to frontmatter fields. Tags are added by hand later. */
export function buildFrontmatter(row, slug) {
  const fm = {
    title: row.title,
    pubDate: new Date(row.post_date).toISOString().slice(0, 10), // YYYY-MM-DD
    tags: [],
    draft: row.is_published !== 'true',
  };
  if (row.subtitle && row.subtitle.trim()) fm.description = row.subtitle.trim();
  return { title: fm.title, ...(fm.description ? { description: fm.description } : {}), pubDate: fm.pubDate, tags: fm.tags, draft: fm.draft };
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run scripts/lib/frontmatter.test.mjs`
Expected: PASS (3 tests).

- [ ] **Step 5: Implement `scripts/lib/clean-substack-chrome.mjs`** (rehype plugin)

```js
import { visit } from 'unist-util-visit';

const CHROME = ['pencraft', 'lucide', 'restack-image', 'view-image', 'icon-container'];

function classList(node) {
  const c = node.properties && node.properties.className;
  return Array.isArray(c) ? c : c ? [c] : [];
}
const hasClass = (node, name) => classList(node).includes(name);
const isChrome = (node) => classList(node).some((c) => CHROME.includes(c));

/**
 * rehype plugin: remove Substack UI chrome and rewrite captioned images to a
 * single clean <img> using the data-attrs JSON (NOT srcset).
 */
export default function cleanSubstackChrome() {
  return (tree) => {
    // 1) Rewrite captioned images first.
    visit(tree, 'element', (node) => {
      if (!hasClass(node, 'captioned-image-container')) return;
      let attrs = null;
      visit(node, 'element', (inner) => {
        if (attrs) return;
        const raw = inner.properties && inner.properties.dataAttrs;
        if (raw) { try { attrs = JSON.parse(raw); } catch { attrs = null; } }
      });
      if (attrs && attrs.src) {
        node.tagName = 'img';
        node.properties = { src: attrs.src, alt: attrs.alt || '' };
        node.children = [];
      }
    });

    // 2) Remove chrome subtrees and unwrap picture/source/image-link.
    visit(tree, 'element', (node, index, parent) => {
      if (!parent || index === null) return;
      if (isChrome(node)) { parent.children.splice(index, 1); return [visit.SKIP, index]; }
      if (node.tagName === 'source') { parent.children.splice(index, 1); return [visit.SKIP, index]; }
      if (node.tagName === 'picture' || (node.tagName === 'a' && hasClass(node, 'image-link'))) {
        parent.children.splice(index, 1, ...node.children); // unwrap
        return [visit.SKIP, index];
      }
    });
  };
}
```

- [ ] **Step 6: Write `scripts/lib/html-to-markdown.test.mjs`**

```js
import { expect, test } from 'vitest';
import { htmlToMarkdown } from './html-to-markdown.mjs';

test('converts headings, paragraphs, and preserves smart quotes', async () => {
  const md = await htmlToMarkdown('<h2>Title</h2><p>It’s fine</p>');
  expect(md).toContain('## Title');
  expect(md).toContain('It’s fine');
});

test('strips chrome buttons and keeps a clean image from data-attrs', async () => {
  const html = `<div class="captioned-image-container"><a class="image-link"><div class="image2-inset" data-attrs='{"src":"https://x.test/a.png","alt":"cube"}'><picture><source srcset="https://x.test/a.png 1x"><img src="https://x.test/a.png"></picture></div></a><div class="pencraft icon-container restack-image">junk</div></div>`;
  const md = await htmlToMarkdown(html);
  expect(md).toContain('![cube](https://x.test/a.png)');
  expect(md).not.toContain('junk');
});

test('renders code blocks as fenced blocks without mangling', async () => {
  const md = await htmlToMarkdown('<pre><code>Host &lt;devsite&gt;</code></pre>');
  expect(md).toContain('```');
  expect(md).toContain('Host <devsite>');
});
```

- [ ] **Step 7: Run to verify it fails**

Run: `npx vitest run scripts/lib/html-to-markdown.test.mjs`
Expected: FAIL (cannot import `./html-to-markdown.mjs`).

- [ ] **Step 8: Implement `scripts/lib/html-to-markdown.mjs`**

```js
import { unified } from 'unified';
import rehypeParse from 'rehype-parse';
import rehypeRemark from 'rehype-remark';
import remarkGfm from 'remark-gfm';
import remarkStringify from 'remark-stringify';
import cleanSubstackChrome from './clean-substack-chrome.mjs';

const processor = unified()
  .use(rehypeParse, { fragment: true })
  .use(cleanSubstackChrome)
  .use(rehypeRemark)
  .use(remarkGfm)
  .use(remarkStringify, { bullet: '-', emphasis: '_', rule: '-', fences: true });

/** Convert a Substack post HTML fragment to clean Markdown. */
export async function htmlToMarkdown(html) {
  const file = await processor.process(html);
  return String(file).trim() + '\n';
}
```

- [ ] **Step 9: Run to verify it passes**

Run: `npx vitest run scripts/lib/html-to-markdown.test.mjs`
Expected: PASS (3 tests).

- [ ] **Step 10: Write `scripts/lib/images.test.mjs`**

```js
import { expect, test } from 'vitest';
import { extractImageUrls, localImagePath } from './images.mjs';

test('extractImageUrls finds unique remote image urls', () => {
  const md = '![a](https://x.test/one.png)\n\n![b](https://x.test/two.jpg?w=100)\n\n![c](https://x.test/one.png)';
  expect(extractImageUrls(md)).toEqual(['https://x.test/one.png', 'https://x.test/two.jpg?w=100']);
});

test('extractImageUrls ignores already-local paths', () => {
  expect(extractImageUrls('![a](../../assets/blog/x/one.png)')).toEqual([]);
});

test('localImagePath is deterministic and strips query for the extension', () => {
  const p1 = localImagePath('https://x.test/two.jpg?w=100', 'my-post');
  const p2 = localImagePath('https://x.test/two.jpg?w=100', 'my-post');
  expect(p1).toBe(p2);
  expect(p1.startsWith('../../assets/blog/my-post/')).toBe(true);
  expect(p1.endsWith('.jpg')).toBe(true);
});
```

- [ ] **Step 11: Run to verify it fails**

Run: `npx vitest run scripts/lib/images.test.mjs`
Expected: FAIL (cannot import `./images.mjs`).

- [ ] **Step 12: Implement `scripts/lib/images.mjs`**

```js
import { createHash } from 'node:crypto';

/** Unique remote (http/https) image URLs referenced in Markdown. */
export function extractImageUrls(markdown) {
  const urls = [];
  const re = /!\[[^\]]*\]\((https?:\/\/[^)\s]+)\)/g;
  let m;
  while ((m = re.exec(markdown)) !== null) if (!urls.includes(m[1])) urls.push(m[1]);
  return urls;
}

/** Repo-relative path (from a post in src/data/blog/) to a localized image. */
export function localImagePath(url, slug) {
  const noQuery = url.split('?')[0];
  const extMatch = noQuery.match(/\.(png|jpe?g|gif|webp|svg|avif)$/i);
  const ext = extMatch ? extMatch[0].toLowerCase() : '.png';
  const hash = createHash('sha1').update(url).digest('hex').slice(0, 12);
  return `../../assets/blog/${slug}/${hash}${ext}`;
}
```

- [ ] **Step 13: Run to verify it passes**

Run: `npx vitest run scripts/lib/images.test.mjs`
Expected: PASS (3 tests).

- [ ] **Step 14: Run the whole suite**

Run: `npm test`
Expected: PASS (all tests across `src/` and `scripts/`).

- [ ] **Step 15: Commit**

```bash
git add -A
git commit -m "feat: Substack->Markdown converter library with unit tests"
```

---

## Task 11: Run the migration, tag posts, integrate real content

**Files:**
- Create: `scripts/migrate-substack.mjs`
- Generated: `src/data/blog/*.md` (13 posts), `src/assets/blog/<slug>/*` (images)
- Delete: `src/data/blog/hello-world.md`, `src/data/blog/second-post.md` (samples)

**Interfaces:**
- Consumes: all `scripts/lib/*` functions (Task 10), `gray-matter`, `csv-parse`, `p-limit`, the export at `substack_export/`.

- [ ] **Step 1: Implement `scripts/migrate-substack.mjs`**

```js
import { readFile, writeFile, readdir, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { parse } from 'csv-parse/sync';
import matter from 'gray-matter';
import pLimit from 'p-limit';
import { slugFromFilename, buildFrontmatter } from './lib/frontmatter.mjs';
import { htmlToMarkdown } from './lib/html-to-markdown.mjs';
import { extractImageUrls, localImagePath } from './lib/images.mjs';

const EXPORT_DIR = 'substack_export';
const POSTS_DIR = path.join(EXPORT_DIR, 'posts');
const OUT_POSTS = 'src/data/blog';
const OUT_ASSETS = 'src/assets/blog';
const limit = pLimit(5);

async function downloadImage(url, destAbs) {
  if (existsSync(destAbs)) return;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`fetch ${url} -> ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await mkdir(path.dirname(destAbs), { recursive: true });
  await writeFile(destAbs, buf);
}

async function main() {
  const csv = await readFile(path.join(EXPORT_DIR, 'posts.csv'), 'utf8');
  const rows = parse(csv, { columns: true, skip_empty_lines: true });
  const byId = new Map(rows.map((r) => [r.post_id, r])); // post_id == "<numeric>.<slug>"

  const files = (await readdir(POSTS_DIR)).filter((f) => f.endsWith('.html'));
  await mkdir(OUT_POSTS, { recursive: true });
  let written = 0;

  for (const file of files) {
    const postId = file.replace(/\.html$/i, '');
    const row = byId.get(postId);
    if (!row) { console.warn(`! no csv row for ${file}, skipping`); continue; }
    if (row.type !== 'newsletter') { console.log(`- skip non-post (${row.type}): ${file}`); continue; }
    if (row.is_published !== 'true') { console.log(`- skip unpublished: ${file}`); continue; }

    const slug = slugFromFilename(file);
    const html = await readFile(path.join(POSTS_DIR, file), 'utf8');
    let md = await htmlToMarkdown(html);

    // Localize images.
    const urls = extractImageUrls(md);
    await Promise.all(urls.map((url) => limit(async () => {
      const rel = localImagePath(url, slug);                 // ../../assets/blog/<slug>/<hash>.<ext>
      const abs = path.join(OUT_ASSETS, slug, path.basename(rel));
      try { await downloadImage(url, abs); md = md.split(url).join(rel); }
      catch (e) { console.warn(`! image failed (${url}): ${e.message}`); }
    })));

    const fm = buildFrontmatter(row, slug);
    const out = matter.stringify(md, fm);
    await writeFile(path.join(OUT_POSTS, `${slug}.md`), out, 'utf8');
    written++;
    console.log(`✓ ${slug}`);
  }
  console.log(`\nDone. Wrote ${written} posts.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
```

- [ ] **Step 2: Run the migration**

Run: `npm run migrate`
Expected: prints `✓ <slug>` for ~13 posts, `- skip non-post (page): 141574677.experience.html`, and `Done. Wrote 13 posts.` Files appear in `src/data/blog/` and images in `src/assets/blog/`.

- [ ] **Step 3: Remove the sample posts**

Run: `rm src/data/blog/hello-world.md src/data/blog/second-post.md`
Expected: only migrated posts remain. Verify: `ls src/data/blog | wc -l` → `13`.

- [ ] **Step 4: Apply tags by hand** — edit the `tags: []` line in each migrated post's frontmatter using this mapping (adjust to taste):

```
advent-of-code-2023-introduction        -> ["Advent of Code", "Go"]
advent-of-code-2023-day-1                -> ["Advent of Code", "Go"]
advent-of-code-2023-day-2                -> ["Advent of Code", "Go"]
merge-two-sorted-arrays                  -> ["DSA"]
dsa-simple-search-vs-binary-search       -> ["DSA"]
threads_and_queues_in_ruby               -> ["Ruby"]
stop-following-tutorials                 -> ["Career"]
two-promotions-in-8-months               -> ["Career"]
how-i-doubled-my-income-and-2021-year-review -> ["Career"]
making-the-best-of-an-old-school-dev-environment -> ["Dev Environment"]
the-rebirth-of-a-hackintosh-dev-environment      -> ["Dev Environment"]
why-i-decided-to-quit-mmorpg-games       -> ["Personal"]
consistency-is-difficult                 -> ["Personal"]
```

- [ ] **Step 5: Type-check, test, build with real content**

Run: `npm run check && npm test && npm run build`
Expected: `astro check` 0 errors (a content-collection schema error here means a post's frontmatter is malformed — fix that post); all unit tests pass; build succeeds and generates 13 post pages plus tag pages for the applied tags.

- [ ] **Step 6: Spot-check a converted post**

Run: `npx astro preview` (ask the user to open it) and confirm one image-heavy post (e.g. `/writing/dsa-simple-search-vs-binary-search`) renders with local images and code blocks. Confirm images load from `/_astro/` (optimized), not from Substack.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "content: migrate Substack posts to Markdown with local images and tags"
```

---

## Task 12: Deployment — GitHub Actions, custom domain, docs

**Files:**
- Create: `.github/workflows/deploy.yml`, `public/CNAME`, `README.md`

**Interfaces:**
- Consumes: the build (`astro build`, which also produces `dist/pagefind/`).
- Produces: an automated deploy to GitHub Pages on push to `main`.

- [ ] **Step 1: Create `public/CNAME`** (bare domain, single line, no protocol)

```
jeremywinterberg.com
```

- [ ] **Step 2: Create `.github/workflows/deploy.yml`**

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
      - uses: withastro/action@v6
        # Builds with `npm run build`; the astro-pagefind integration produces
        # dist/pagefind/ during that build, so no extra step is needed.

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v5
```

- [ ] **Step 3: Create `README.md`** with the one-time GitHub Pages + DNS setup

````markdown
# jeremywinterberg.com

Personal site (blog + about) built with Astro and deployed to GitHub Pages.

## Develop

```bash
nvm use            # Node 22+
npm install
npm run build      # build once so search works in dev
npm run dev
```

`npm run check` (types), `npm test` (unit tests), `npm run build` (static site
+ Pagefind index in `dist/pagefind/`).

## Re-run the Substack migration

```bash
npm run migrate    # reads ./substack_export, writes src/data/blog + src/assets/blog
```

`substack_export/` is git-ignored (it contains the private subscriber list).

## One-time deploy setup

1. Push this repo to `JeremyDwayne/JeremyDwayne.github.io` on GitHub.
2. **Settings → Pages → Build and deployment → Source = "GitHub Actions"**.
3. **Settings → Pages → Add a domain → `jeremywinterberg.com`**; GitHub gives a
   `TXT` verification record — add it, then Verify (prevents takeover).
4. At the DNS registrar (repoint away from Substack), set:

   | Type  | Host                                   | Value                     |
   |-------|----------------------------------------|---------------------------|
   | A     | `@`                                    | `185.199.108.153`         |
   | A     | `@`                                    | `185.199.109.153`         |
   | A     | `@`                                    | `185.199.110.153`         |
   | A     | `@`                                    | `185.199.111.153`         |
   | AAAA  | `@`                                    | `2606:50c0:8000::153` (+ `:8001`,`:8002`,`:8003`) |
   | CNAME | `www`                                  | `JeremyDwayne.github.io`  |
   | TXT   | `_github-pages-challenge-JeremyDwayne` | (token from step 3)       |

   Remove any leftover Substack A/CNAME records.
5. After DNS propagates (verify with `dig jeremywinterberg.com +noall +answer -t A`),
   enable **Enforce HTTPS** in Settings → Pages.
````

- [ ] **Step 4: Validate the workflow file locally**

Run: `python3 -c "import yaml,sys; yaml.safe_load(open('.github/workflows/deploy.yml')); print('YAML OK')"`
Expected: prints `YAML OK`.

- [ ] **Step 5: Final full verification**

Run: `npm run check && npm test && npm run build && test -d dist/pagefind && test -f dist/CNAME && echo ALL_GOOD`
Expected: prints `ALL_GOOD` (types clean, tests pass, build succeeds, search index present, CNAME copied to output).

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "ci: GitHub Pages deploy workflow, CNAME, and setup docs"
```

- [ ] **Step 7: Handoff to the user** for the GitHub-side steps

The user must: create the GitHub repo and push, set Pages Source to "GitHub Actions", add + verify the custom domain, set the DNS records (README table), and enable Enforce HTTPS. These can't be done from this environment.

---

## Self-Review Notes

- **Spec coverage:** scope/nav (Tasks 5–8), Content Layer collection (Task 3), theming + dark toggle (Task 4), Shiki dual themes (Tasks 1+4), tags + filtering (Task 7), RSS + sitemap (Tasks 1+8), search/Pagefind (Tasks 1+9), Substack migration with image localization + privacy (Tasks 10–11), About from résumé (Task 5), deploy + DNS (Task 12), testing (Tasks 2,3,4,5,10 + verification steps) — all mapped.
- **Out of scope honored:** no résumé/CV page, no projects section, no newsletter/comments/analytics. Résumé nav link is "LinkedIn".
- **Type consistency:** `PostLike`/`getCollection` entries use `id` + `data.{title,description?,pubDate,tags,draft}` consistently across utils, pages, RSS; converter functions (`slugFromFilename`, `buildFrontmatter`, `htmlToMarkdown`, `extractImageUrls`, `localImagePath`) match between Task 10 definitions and Task 11 usage.
