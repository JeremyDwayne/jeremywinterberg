import { unified } from 'unified';
import rehypeParse from 'rehype-parse';
import rehypeRemark from 'rehype-remark';
import remarkGfm from 'remark-gfm';
import remarkStringify from 'remark-stringify';
import cleanSubstackChrome from './clean-substack-chrome.mjs';

const processor = unified()
  .use(rehypeParse, { fragment: true })
  .use(cleanSubstackChrome)
  .use(rehypeRemark)
  .use(remarkGfm)
  .use(remarkStringify, { bullet: '-', emphasis: '_', rule: '-', fences: true });

/** Convert a Substack post HTML fragment to clean Markdown. */
export async function htmlToMarkdown(html) {
  const file = await processor.process(html);
  return String(file).trim() + '\n';
}
