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
