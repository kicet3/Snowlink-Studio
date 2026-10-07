import selectorParser from 'postcss-selector-parser';

const mediaScope = 'snowfall-media';
const scopeSelectors = selectorParser(root => {
  root.each(selector => {
    let scoped = false;
    let nested = false;
    selector.walk(node => {
      if (node.type === 'nesting') nested = true;
      if (node.type === 'class' && node.value === mediaScope) scoped = true;
      const documentRoot = (node.type === 'tag' && ['html', 'body'].includes(node.value.toLowerCase()))
        || (node.type === 'pseudo' && node.value === ':root')
        || (node.type === 'id' && node.value === 'root');
      if (documentRoot) {
        node.replaceWith(selectorParser.className({ value: mediaScope, spaces: { ...node.spaces } }));
        scoped = true;
      }
    });
    if (!scoped && !nested) {
      const leadingSpace = selector.first.spaces.before;
      selector.first.spaces.before = '';
      selector.prepend(selectorParser.combinator({ value: ' ' }));
      selector.prepend(selectorParser.className({ value: mediaScope, spaces: { before: leadingSpace, after: '' } }));
    }
  });
});

// Preserve upstream components while isolating their CSS and network namespace.
export function studioSource() {
  return { name: 'snowfall-owned-ui', enforce: 'pre', transform(code, id) {
    if (id.includes('/node_modules/') || !id.includes('/ima2-ui/src/') || !/\.[jt]sx?$/.test(id) || id.endsWith('/studio-entry.tsx') || id.endsWith('/studio-node-run.ts') || id.endsWith('/StudioBridge.tsx') || id.endsWith('/snowfall.ts')) return;
    return code.replace(/(["'`])\/api(?=[\/"'`?])/g, '$1/integrations/ima2/api')
      .replace(/document\.documentElement/g, '(document.querySelector<HTMLElement>(".snowfall-media") || document.documentElement)')
      .replace(/document\.body/g, '(document.querySelector<HTMLElement>(".snowfall-media") || document.body)');
  } };
}
export function studioCss() {
  return { postcssPlugin: 'snowfall-css-scope', OnceExit(root) {
    root.walkRules(rule => {
      let parent = rule.parent;
      while (parent) { if (parent.type === 'atrule' && /keyframes$/.test(parent.name)) return; parent = parent.parent; }
      // Parse selector types: `body` is a document root, but the `body` suffix
      // in `.right-panel-body` (and text inside attributes) must stay intact.
      rule.selector = scopeSelectors.processSync(rule.selector);
    });
    root.walkDecls(decl => { decl.value = decl.value.replace(/\/fonts\//g, '/studio-media/fonts/').replace(/100dvh/g, 'var(--studio-media-height, 100dvh)'); });
  } };
}
