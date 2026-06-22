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
