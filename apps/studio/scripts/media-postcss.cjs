module.exports = () => ({
  postcssPlugin: 'snowlink-next-media-scope',
  async OnceExit(root) {
    const file = root.source?.input?.file || '';
    if (!file.includes('/vendor/ima2-ui/') && !file.includes('/@xyflow/')) return;
    const {studioCss} = await import('../vendor/ima2-ui/studio-build.mjs');
    studioCss().OnceExit(root);
  },
});
module.exports.postcss = true;
