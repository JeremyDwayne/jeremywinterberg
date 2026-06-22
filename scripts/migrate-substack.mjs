/**
 * migrate-substack.mjs
 *
 * Reads the Substack export at `substack_export/` (posts.csv + posts/*.html),
 * converts each published newsletter post to Markdown with YAML frontmatter,
 * downloads and localizes all embedded images to `src/assets/blog/<slug>/`,
 * and writes the resulting `.md` files to `src/data/blog/`.
 *
 * Run via: npm run migrate
 */
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
