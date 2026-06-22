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
