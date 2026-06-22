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
