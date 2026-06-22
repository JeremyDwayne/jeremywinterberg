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
