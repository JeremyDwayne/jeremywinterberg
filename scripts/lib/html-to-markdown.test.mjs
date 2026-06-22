import { expect, test } from 'vitest';
import { htmlToMarkdown } from './html-to-markdown.mjs';

test('converts headings, paragraphs, and preserves smart quotes', async () => {
  const md = await htmlToMarkdown('<h2>Title</h2><p>It’s fine</p>');
  expect(md).toContain('## Title');
  expect(md).toContain('It’s fine');
});

test('strips chrome buttons and keeps a clean image from data-attrs', async () => {
  const html = `<div class="captioned-image-container"><a class="image-link"><div class="image2-inset" data-attrs='{"src":"https://x.test/a.png","alt":"cube"}'><picture><source srcset="https://x.test/a.png 1x"><img src="https://x.test/a.png"></picture></div></a><div class="pencraft icon-container restack-image">junk</div></div>`;
  const md = await htmlToMarkdown(html);
  expect(md).toContain('![cube](https://x.test/a.png)');
  expect(md).not.toContain('junk');
});

test('renders code blocks as fenced blocks without mangling', async () => {
  const md = await htmlToMarkdown('<pre><code>Host &lt;devsite&gt;</code></pre>');
  expect(md).toContain('```');
  expect(md).toContain('Host <devsite>');
});
