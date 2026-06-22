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
