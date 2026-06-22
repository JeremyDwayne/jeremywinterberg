import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { expect, test } from 'vitest';
import PostCard from './PostCard.astro';

test('PostCard renders title link, date, and tags', async () => {
  const container = await AstroContainer.create();
  const html = await container.renderToString(PostCard, {
    props: { id: 'hello', title: 'Hello', description: 'Desc', pubDate: new Date('2024-03-24T00:00:00Z'), tags: ['Career'] },
  });
  expect(html).toContain('href="/writing/hello"');
  expect(html).toContain('Mar 24, 2024');
  expect(html).toContain('#Career');
});
