import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { studioCss, studioSource } from '../vendor/ima2-ui/studio-build.mjs';

const requireUi = createRequire(new URL('../vendor/ima2-ui/package.json', import.meta.url));
const postcss = requireUi('postcss');
const compile = css => postcss([studioCss()]).process(css, { from: undefined }).root;

test('embedded engine requests are scoped while studio node actions keep workspace routes', () => {
  const transform = studioSource().transform;
  const source = "fetch('/api/studio/actions')";
  assert.equal(transform(source, '/vendor/ima2-ui/src/studio-node-run.ts'), undefined);
  assert.equal(transform("fetch('/api/sessions')", '/vendor/ima2-ui/src/lib/api-sessions.ts'), "fetch('/integrations/ima2/api/sessions')");
});

test('embedded media preserves actual right-panel scrolling, padding and toolbar clearance selectors', () => {
  const source = ['right-panel', 'top-strip'].map(name => readFileSync(new URL(`../vendor/ima2-ui/src/styles/${name}.css`, import.meta.url), 'utf8')).join('\n');
  const rules = new Map();
  compile(source).walkRules(rule => rules.set(rule.selector, Object.fromEntries(rule.nodes.filter(node => node.type === 'decl').map(node => [node.prop, node.value]))));
  const body = rules.get('.snowfall-media .right-panel-body');
  assert.ok(body, 'The panel body class must still match the rendered DOM');
  assert.equal(body.padding, '16px 12px');
  assert.equal(body['overflow-y'], 'auto');
  assert.equal(body.display, 'flex');
  assert.equal(rules.get('.snowfall-media .right-panel.collapsed .right-panel-body').display, 'none');
  assert.equal(rules.get('.snowfall-media .app:not([data-mobile="1"]) .right-panel-body')['padding-top'], 'calc(16px + var(--chrome-top-h))');
  assert.ok(![...rules.keys()].some(selector => selector.includes('.right-panel-.snowfall-media')));
});

test('CSS scoping separates document roots from class, id and attribute names', () => {
  const selectors = [];
  compile(`
    :root[data-theme="light"], body::before, html, #root { color: red; }
    .right-panel-body, .agent-run__step-body, .body, #root-dialog, [data-label="body & html #root :root .snowfall-media"] { color: blue; }
    .snowfall-media .existing { color: green; }
    .snowfall-media-card { color: black; }
    .control { &:hover { color: orange; } }
    @keyframes body-pulse { from { opacity: 0; } to { opacity: 1; } }
  `).walkRules(rule => selectors.push(...rule.selectors));
  for (const selector of ['.snowfall-media[data-theme="light"]', '.snowfall-media::before', '.snowfall-media .right-panel-body', '.snowfall-media .agent-run__step-body', '.snowfall-media .body', '.snowfall-media #root-dialog', '.snowfall-media [data-label="body & html #root :root .snowfall-media"]', '.snowfall-media .existing', '.snowfall-media .snowfall-media-card', '&:hover', 'from', 'to']) assert.ok(selectors.includes(selector), selector);
  assert.equal(selectors.filter(selector => selector === '.snowfall-media').length, 2);
  assert.ok(!selectors.includes('.snowfall-media .snowfall-media .existing'));
});
