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
