# Design: jeremywinterberg.com

**Date:** 2026-06-21
**Status:** Approved (design); pending spec review before planning
**Owner:** Jeremy Winterberg (GitHub: `JeremyDwayne`)

## 1. Overview & Goals

Build a fast, simple, static personal website at **jeremywinterberg.com**, deployed
via **GitHub Pages**, to replace the current Substack newsletter. The site is
centered on Jeremy's **writing**, with a short professional **About** page and
outbound links to LinkedIn and GitHub. All existing Substack posts are migrated
into the site so it becomes the single source of truth for the blog.

Success criteria:

- All 13 published Substack posts are migrated to local Markdown with correct
  titles, dates, body content, code blocks, and locally-hosted images.
- The site builds to static files and deploys automatically on push to `main`.
- It serves at `https://jeremywinterberg.com` with HTTPS and a working `www`
  redirect.
- It is responsive, has a light/dark toggle, an RSS feed, a sitemap, and
  tag-based filtering of posts.

## 2. Scope

**In scope**

- Home page: brief intro + list of recent posts.
- Writing: post index with tag filtering; individual post pages; per-tag pages.
- About page: professional narrative adapted from Jeremy's existing résumé content.
- Outbound links to LinkedIn (labeled "LinkedIn") and GitHub in header/footer.
- Full-text post search (client-side, via Pagefind).
- RSS feed, XML sitemap, SEO/social-preview meta, light/dark theme toggle.
- One-time Substack → Markdown migration script (with image localization).
- GitHub Pages deployment with custom domain.

**Out of scope** (explicitly dropped during brainstorming)

- On-site résumé/CV page (the nav links out to LinkedIn instead).
- A projects/portfolio section (just a GitHub link).
- Newsletter/email signup, comments, analytics.

## 3. Decision Log

| Decision | Choice | Rationale |
|---|---|---|
| Blog content | Migrate fully off Substack to local Markdown | Single source of truth |
| Generator | Astro (static) | Best fit for content site; clean GH Pages deploy |
| Visual direction | "Warm Personal" | Friendly, approachable; chosen from mockups |
| Accent / theme | Warm orange; light default + dark toggle | Chosen from palette mockups |
| Résumé | Link out to LinkedIn (nav label "LinkedIn") | No duplicate CV to maintain |
| Résumé content | Adapt into the About page narrative | Reuse existing well-written copy |
| Projects | None on-site; GitHub link only | Keep it simple |
| Optional features | Tags/filtering + full-text search (no newsletter/comments/analytics) | Minimal surface area |
| Search | Pagefind via `astro-pagefind` (client-side, build-time index) | Best static-site full-text search; scales; no backend |
| Migration source | Substack export zip (already provided) | Complete + reliable |

## 4. Architecture & Tech Stack

- **Astro 6.4.x** (latest stable as of June 2026), static output. **Requires Node 22+.**
- **TypeScript**, with `astro check` for type checking.
- Content via Astro's **Content Layer API** (mandatory in Astro 6).
- Built-in **Shiki** for code syntax highlighting (dual light/dark themes).
- Integrations: `@astrojs/rss` (4.x), `@astrojs/sitemap` (3.x), `astro-pagefind`
  (2.x — Pagefind full-text search).
- Styling: hand-written CSS with **CSS custom properties** for theming (no CSS
  framework — keeps it simple and fast). Theme switched via a `data-theme`
  attribute on `<html>`.
- Deployment: **GitHub Actions** → **GitHub Pages** (artifact/OIDC flow).

### Project structure (target)

```
/
├── .github/workflows/deploy.yml      # CI build + deploy to Pages
├── astro.config.mjs                  # site, integrations, shikiConfig
├── src/
│   ├── content.config.ts             # blog collection (glob loader + zod schema)
│   ├── data/blog/<slug>.md           # migrated posts (one file per post)
│   ├── assets/blog/<slug>/...        # localized post images (optimized by Astro)
│   ├── layouts/
│   │   ├── BaseLayout.astro           # html shell, head/meta, header, footer, theme script
│   │   └── PostLayout.astro           # clean editorial reading layout for a post
│   ├── components/
│   │   ├── SiteHeader.astro           # nav + theme toggle + external links
│   │   ├── SiteFooter.astro           # LinkedIn + GitHub links
│   │   ├── PostCard.astro             # post summary card (title, date, tags, desc)
│   │   ├── TagList.astro              # renders tag chips linking to /tags/[tag]
│   │   ├── ThemeToggle.astro          # the toggle button
│   │   └── Search.astro               # Pagefind UI (PagefindConfig + <pagefind-searchbox>)
│   ├── pages/
│   │   ├── index.astro                # home: intro + recent posts
│   │   ├── about.astro                # About narrative
│   │   ├── writing/index.astro        # all posts + tag filter + search box
│   │   ├── writing/[id].astro         # individual post
│   │   ├── tags/[tag].astro           # posts for a tag
│   │   ├── 404.astro
│   │   └── rss.xml.js                 # RSS endpoint
│   └── styles/global.css              # CSS custom properties (light/dark), base styles
├── public/
│   ├── CNAME                          # contains: jeremywinterberg.com
│   └── favicon / og image assets
├── scripts/
│   └── migrate-substack.mjs           # one-time converter (ESM)
└── scripts/__tests__/                 # converter unit test(s)
```

## 5. Content Model

Blog collection defined in **`src/content.config.ts`** (note: at the `src` root,
not `src/content/config.ts`) using the Content Layer API:

```ts
import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';            // Astro 6: z from 'astro/zod', not 'astro:content'

const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/data/blog' }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),   // from Substack "subtitle" (some posts have none)
    pubDate: z.coerce.date(),             // coerce so YAML dates parse to Date
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
  }),
});

export const collections = { blog };
```

Key API facts (verified against Astro 6 docs):

- Query with `getCollection('blog', ({ data }) => data.draft !== true)`.
- Entries are identified by **`entry.id`** (the old `.slug` was removed); routes
  use **`[id].astro`** and `getStaticPaths()`.
- Render a post with the standalone **`render(entry)`** from `astro:content`
  (`const { Content } = await render(post)`), not the removed `entry.render()`.

Frontmatter (per post) looks like:

```yaml
---
title: "Stop Following Tutorials"
description: "It's hurting your growth as an engineer."
pubDate: 2024-03-24
tags: ["Career"]
draft: false
---
```

### Proposed initial tag taxonomy

Substack exports carry no tags, so tags are applied by hand after conversion.
Proposed set (Jeremy to adjust): **Advent of Code, DSA, Career, Dev Environment,
Ruby, Go, Personal**. Suggested mapping:

- Advent of Code intro / Day 1 / Day 2 → `Advent of Code`, `Go`
- Merge Two Sorted Arrays, Simple vs Binary Search → `DSA`
- Threads and Queues in Ruby → `Ruby`
- Stop Following Tutorials, Two Promotions, Doubled My Income → `Career`
- Hackintosh Dev Environment, Old School Dev Environment → `Dev Environment`
- Quit MMORPG Games, Consistency Is Difficult → `Personal`

## 6. Theming & Visual Design

- "Warm Personal" direction: friendly, rounded, warm-orange accent.
- **Light default + dark toggle.** Theme driven by `data-theme` on `<html>`,
  set by an `is:inline` script in `<head>` (runs before paint → no flash):
  read `localStorage.theme`, else fall back to `prefers-color-scheme`; also set
  `document.documentElement.style.colorScheme`. A toggle button updates it and
  persists to `localStorage`.
- All colors are CSS custom properties keyed off `:root` and
  `:root[data-theme='dark']`.
- Blog **reading** pages stay clean and editorial (comfortable measure,
  readable type) inside the warmer site shell.
- Code blocks use Shiki **dual themes** (`themes: { light, dark }`, `wrap: true`)
  in `astro.config.mjs`. The dual-theme output requires CSS overrides keyed off
  `[data-theme='dark'] .astro-code` (using the `--shiki-dark*` variables, with
  `!important`) so the manual toggle also switches code-block colors.

## 7. Blog Features

- **Tag pages:** `src/pages/tags/[tag].astro` with `getStaticPaths()` building a
  unique tag set from `getCollection('blog')` and filtering posts per tag.
- **Tag filtering on the index:** `/writing` lists posts and exposes tag links;
  a small inline `<script>` can toggle visibility by `data-tags` for client-side
  filtering without a page load (progressive enhancement; links still work).
- **RSS:** `src/pages/rss.xml.js` exporting `GET(context)`, items from
  `getCollection`, `site: context.site`, `link: \`/writing/${post.id}/\``.
- **Sitemap:** `@astrojs/sitemap` (`astro add sitemap`); requires `site` set.
- **SEO/social:** per-page `<title>`, description, canonical, and Open
  Graph/Twitter meta in `BaseLayout`.
- **Images in posts:** localized into `src/assets/blog/<slug>/` and referenced
  with relative paths in the Markdown body so Astro optimizes them (images in
  `public/` are not optimized — so they go in `src/`).
- **Search (full-text):** [Pagefind](https://pagefind.app) via the
  `astro-pagefind` integration. Add `pagefind()` to the `integrations` array in
  `astro.config.mjs`; the integration registers an `astro:build:done` hook that
  indexes the built HTML during `astro build` and writes `dist/pagefind/` — **no
  extra build step or CI change needed**. The UI is the Pagefind 1.5 component-UI,
  wrapped in a `Search.astro` component (`<PagefindConfig />` +
  `<pagefind-searchbox>`), placed at the top of `/writing` (optionally also in the
  header). Add `data-pagefind-body` to the post `<article>` in `PostLayout` and
  `data-pagefind-ignore` to nav/footer so results index post content, not chrome.
  Theme the UI via the `--pf-*` CSS variables, overridden under our
  `[data-theme='dark']` selector so search follows the site's light/dark toggle.
  Note: `astro dev` serves the index from the last build, so run `astro build`
  once for search to work locally (CI always builds, so production is unaffected).

## 8. Substack Migration

A one-time Node ESM script, `scripts/migrate-substack.mjs`, reads the export at
`substack_export/` and writes Markdown into `src/data/blog/`.

**Input (verified):** `posts.csv` columns
`post_id,post_date,is_published,email_sent_at,inbox_sent_at,type,audience,title,subtitle,podcast_url`;
HTML files named `<numericId>.<slug>.html`; 14 HTML files = **13 `newsletter`
posts + 1 `page`** ("I am Available for Work!"). Sibling `*.opens.csv` /
`*.delivers.csv` are email analytics and are ignored.

**Pipeline (HTML → Markdown):** `unified()`
→ `rehype-parse` (`{ fragment: true }`)
→ **custom `cleanSubstackChrome` plugin** (`unist-util-visit`)
→ `rehype-remark`
→ `remark-gfm`
→ `remark-stringify` (`{ bullet: '-', emphasis: '_', rule: '-' }`).

`cleanSubstackChrome` does the surgical cleanup before conversion:

1. Remove any element whose `className` array includes `pencraft`, `lucide`,
   `restack-image`, `view-image`, or `icon-container` (pure UI buttons).
2. For each `.captioned-image-container`: HTML-unescape + `JSON.parse` the
   `data-attrs` on `.image2-inset` to get `{ src, alt, title }` (the canonical
   clean URL — **not** the `srcset`), read any `.image-caption`, and replace the
   whole subtree with a single clean `<img>` (caption emitted as following text).
3. Unwrap `<a class="image-link">`, `<picture>`, `<source>`.

**Code blocks:** export has bare `<pre><code>` with no language class → fenced
``` blocks with no language hint (HTML entities decode correctly via the parser).

**Image localization:** for each image URL (Substack S3/CDN or Unsplash),
download via native `fetch` → `arrayBuffer` → write to
`src/assets/blog/<slug>/<hash>.<ext>`; de-dupe by normalized URL (strip query
string before hashing); limit concurrency (`p-limit`) with simple retry; rewrite
the Markdown image path to the local relative path.

**Frontmatter mapping** (via `gray-matter`):

| Frontmatter | Source |
|---|---|
| `title` | CSV `title` |
| `description` | CSV `subtitle` (omit if empty) |
| `pubDate` | CSV `post_date` |
| `draft` | `!is_published` (all are published) |
| `slug` (→ filename / `id`) | from `<id>.<slug>.html` |
| `tags` | applied by hand afterward |

**Exclusions:** the `type=page` "I am Available for Work!" entry is **not** a
blog post; its content seeds the **About** page (see §9).

**Dependencies (devDependencies, ESM-only):** `unified`, `rehype-parse`,
`rehype-remark`, `remark-gfm`, `remark-stringify`, `unist-util-visit`,
`gray-matter`, a CSV parser (`csv-parse`), `p-limit`.

**Privacy:** `substack_export/` is git-ignored — it contains
`email_list.jeremywinterberg.csv` (real subscriber emails) which must never be
published. Only the converted Markdown + images are committed.

## 9. About Page

Adapt the existing résumé page content (summary, professional experience, skills,
education) into a narrative About page. **Drop** the dated "I am actively looking
for work" framing (it was written Feb 2024) and the reference quotes. End with a
link to LinkedIn for the full history and a GitHub link. Jeremy to review/trim
the adapted copy.

## 10. Deployment

- **Repo:** `JeremyDwayne/JeremyDwayne.github.io` (a GitHub *user* site repo must
  be named exactly `<username>.github.io`) — or any normally-named repo with Pages
  enabled; the custom domain serves from root either way.
- **CI:** `.github/workflows/deploy.yml`, two jobs:
  - build: `actions/checkout@v6` → `withastro/action@v6` (auto-detects package
    manager from the committed lockfile; defaults to Node 24). The Pagefind
    search index is produced inside `astro build` via the `astro-pagefind`
    integration, so no extra workflow step is required.
  - deploy: `needs: build`, `environment: github-pages`, `actions/deploy-pages@v5`.
  - Top-level `permissions: { contents: read, pages: write, id-token: write }`
    and `concurrency: { group: pages, cancel-in-progress: false }`.
  - Do **not** add `upload-pages-artifact`/`configure-pages` manually —
    `withastro/action` already produces the `github-pages` artifact.
- **Pages setting:** Settings → Pages → Source = **"GitHub Actions"**.
- **`astro.config.mjs`:** `site: 'https://jeremywinterberg.com'`, **no `base`**
  (custom domain serves from root).
- **`public/CNAME`:** single line `jeremywinterberg.com`.

**DNS (at Jeremy's registrar — repoint away from Substack):**

| Type | Host | Value |
|---|---|---|
| A | `@` | `185.199.108.153` |
| A | `@` | `185.199.109.153` |
| A | `@` | `185.199.110.153` |
| A | `@` | `185.199.111.153` |
| AAAA | `@` | `2606:50c0:8000::153` (+ `:8001/:8002/:8003::153`) — optional but recommended |
| CNAME | `www` | `JeremyDwayne.github.io` |
| TXT | `_github-pages-challenge-JeremyDwayne` | (token from GitHub → Settings → Pages → Add a domain) |

After DNS propagates: verify the domain (account-level, prevents takeover) and
enable **Enforce HTTPS**. Remove any stale Substack DNS records (extra A/AAAA or
a `www` CNAME pointing elsewhere) or the TLS cert may fail to provision.

## 11. Testing & Quality

- `astro check` (type checking) must pass.
- Content-collection zod schema acts as a content gate: a malformed post fails
  the build rather than shipping broken.
- `astro build` must succeed in CI before deploy.
- After `astro build`, the Pagefind search index (`dist/pagefind/`) is generated
  — a build smoke check confirms it exists.
- **Migration converter unit test:** feed a representative Substack HTML fragment
  (with a captioned image + chrome buttons + a code block + smart quotes) through
  the pipeline and assert: chrome removed, one clean `![alt](path)` image, fenced
  code block intact, entities/quotes preserved, frontmatter mapped correctly.
- Basic link/markup sanity (e.g., build-time check that internal links resolve).

## 12. Things Needed From Jeremy

- Confirm access to edit DNS for `jeremywinterberg.com` at the registrar.
- Decide repo name (`JeremyDwayne.github.io` recommended).
- Review/trim the About page copy once adapted.
- Review/adjust the proposed tag taxonomy (§5).

## 13. Verified Technical References

Confirmed via official docs during a research-and-verify pass on 2026-06-21
(adversarially re-checked the three highest-risk facts):

- Astro Content Collections / Content Layer API & v6 upgrade:
  https://docs.astro.build/en/guides/content-collections/ ,
  https://docs.astro.build/en/guides/upgrade-to/v6/
- Deploy to GitHub Pages: https://docs.astro.build/en/guides/deploy/github/ ,
  https://github.com/withastro/action , https://github.com/actions/deploy-pages
- Custom domain + DNS:
  https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site
- RSS / sitemap / syntax highlighting / images:
  https://docs.astro.build/en/recipes/rss/ ,
  https://docs.astro.build/en/guides/integrations-guide/sitemap/ ,
  https://docs.astro.build/en/guides/syntax-highlighting/ ,
  https://docs.astro.build/en/guides/images/
- Search (Pagefind / astro-pagefind): https://pagefind.app/docs/ ,
  https://github.com/shishkin/astro-pagefind
- Substack→Markdown libraries: rehype-remark, remark-stringify, gray-matter
  (unified ecosystem; ESM-only).

Notable version facts: latest Astro is **6.4.x** (Node 22+ required, Content
Layer API mandatory); `withastro/action@v6`; `actions/deploy-pages@v5` (the
action README still shows `@v4` — use `v5`); GitHub Pages apex IPs unchanged
(`185.199.108–111.153`); full-text search via `astro-pagefind@2.0.0` (Pagefind
1.5), which indexes automatically during `astro build` so the deploy workflow is
unchanged (verified by inspecting the package's `astro:build:done` hook).
