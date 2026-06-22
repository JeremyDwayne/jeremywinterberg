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

test('strips Subscribe/Share button-wrapper and subscription-widget but keeps real content', async () => {
  const html = `
    <p>Real content</p>
    <div class="button-wrapper">
      <a class="button primary" href="https://www.jeremywinterberg.com/subscribe?">Subscribe now</a>
      <a class="button" href="https://substack.com/app-link/post?action=share">Share</a>
    </div>
    <div class="subscription-widget show-subscribe">
      <div class="preamble"><p>reader-supported</p></div>
      <div class="cta-caption">Subscribe to get full access.</div>
      <input class="email-input" placeholder="Type your email…">
      <button class="fake-button">Subscribe</button>
    </div>
  `;
  const md = await htmlToMarkdown(html);
  expect(md).toContain('Real content');
  expect(md).not.toContain('Subscribe now');
  expect(md).not.toContain('reader-supported');
  expect(md).not.toContain('Type your email');
});
