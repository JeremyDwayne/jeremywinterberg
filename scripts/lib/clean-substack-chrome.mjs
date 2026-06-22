import { visit } from 'unist-util-visit';

const CHROME = ['pencraft', 'lucide', 'restack-image', 'view-image', 'icon-container'];

/**
 * Get class list from a hast node as an array.
 * In hast, className is an array; guard against string or missing.
 */
function classList(node) {
  const c = node.properties && node.properties.className;
  return Array.isArray(c) ? c : c ? [c] : [];
}

const hasClass = (node, name) => classList(node).includes(name);
const isChrome = (node) => classList(node).some((c) => CHROME.includes(c));

/**
 * rehype plugin: remove Substack UI chrome and rewrite captioned images to a
 * single clean <img> using the data-attrs JSON (NOT srcset).
 */
export default function cleanSubstackChrome() {
  return (tree) => {
    // 1) Rewrite captioned images first.
    visit(tree, 'element', (node) => {
      if (!hasClass(node, 'captioned-image-container')) return;
      let attrs = null;
      visit(node, 'element', (inner) => {
        if (attrs) return;
        const raw = inner.properties && inner.properties.dataAttrs;
        if (raw) { try { attrs = JSON.parse(raw); } catch { attrs = null; } }
      });
      if (attrs && attrs.src) {
        node.tagName = 'img';
        node.properties = { src: attrs.src, alt: attrs.alt || '' };
        node.children = [];
      }
    });

    // 2) Remove chrome subtrees and unwrap picture/source/image-link.
    visit(tree, 'element', (node, index, parent) => {
      if (!parent || index === null) return;
      if (isChrome(node)) { parent.children.splice(index, 1); return [visit.SKIP, index]; }
      if (node.tagName === 'source') { parent.children.splice(index, 1); return [visit.SKIP, index]; }
      if (node.tagName === 'picture' || (node.tagName === 'a' && hasClass(node, 'image-link'))) {
        parent.children.splice(index, 1, ...node.children); // unwrap
        return [visit.SKIP, index];
      }
    });
  };
}
