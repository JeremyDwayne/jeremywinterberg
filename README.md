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
