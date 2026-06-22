import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { expect, test } from 'vitest';
import BaseLayout from './BaseLayout.astro';

test('BaseLayout renders title, theme script, and header nav', async () => {
  const container = await AstroContainer.create();
  const html = await container.renderToString(BaseLayout, {
    props: { title: 'Test Page' },
    slots: { default: '<p>hello</p>' },
  });
  expect(html).toContain('Test Page · Jeremy Winterberg');
  expect(html).toContain('dataset.theme'); // inline FOUC-safe script present
  expect(html).toContain('href="/writing"'); // nav rendered
  expect(html).toContain('<p>hello</p>'); // slot content
});
