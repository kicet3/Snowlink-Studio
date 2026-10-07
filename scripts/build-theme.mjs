import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const { tokens } = JSON.parse(readFileSync(join(root, 'design/tokens.json'), 'utf8'));
function resolve(name, seen = new Set()) {
  if (!(name in tokens) || seen.has(name)) throw new Error(`Invalid token reference: ${name}`);
  return tokens[name].replace(/\{([\w-]+)\}/g, (_, key) => resolve(key, new Set([...seen, name])));
}
const resolved = Object.fromEntries(Object.keys(tokens).map(key => [key, resolve(key)]));
const css = '/* Generated from design/tokens.json. Run npm run theme:build. */\n:root {\n  color-scheme: light;\n'
  + Object.entries(tokens).map(([key, value]) => `  --${key}: ${value.replace(/\{([\w-]+)\}/g, 'var(--$1)')};`).join('\n') + '\n}\n';
const logo = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><rect width="40" height="40" rx="12" fill="${resolved['color-accent']}"/><g stroke="${resolved['color-on-accent']}" stroke-width="1.6" stroke-linecap="round" fill="none"><path d="M19 8v23M9 14l20 12M9 26l20-12M15 10l4 4 4-4m-8 19 4-4 4 4M10 18l5-1-1-5m10 17 1-5 5-1M10 22l5 1-1 5m10-17 1 5 5 1"/></g><path d="M27 27c0-6 6-8 8-8 0 8-3 11-8 8Z" fill="${resolved['palette-maple-200']}"/></svg>\n`;
const index = readFileSync(join(root, 'public/index.html'), 'utf8').replace(/(<meta name="theme-color" content=")[^"]+("\s*\/?>)/, `$1${resolved['color-background']}$2`);
const outputs = { 'public/styles/tokens.css': css, 'design/tokens.resolved.json': JSON.stringify(resolved, null, 2) + '\n', 'public/logo.svg': logo, 'public/index.html': index };
for (const [name, content] of Object.entries(outputs)) {
  const target = join(root, name);
  if (process.argv.includes('--check')) {
    if (!existsSync(target) || readFileSync(target, 'utf8') !== content) throw new Error(`Theme output is stale: ${name}. Run npm run theme:build.`);
  } else {
    mkdirSync(join(target, '..'), { recursive: true });
    writeFileSync(target, content);
  }
}
console.log(`${process.argv.includes('--check') ? 'Checked' : 'Built'} Snow & Autumn tokens, renderer palette, and brand mark.`);
