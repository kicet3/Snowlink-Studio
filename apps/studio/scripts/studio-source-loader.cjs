// Build the owned editor directly into Next.js; no separate Vite runtime.
module.exports = function (source) {
  const done = this.async();
  import('../vendor/ima2-ui/studio-build.mjs').then(({ studioSource }) => {
    const transformed = studioSource().transform(source, this.resourcePath) ?? source;
    done(null, transformed.replace(/import\.meta\.env\.DEV\b/g, '(process.env.NODE_ENV !== "production")')
      .replace(/import\.meta\.env\.(VITE_IMA2_\w+)/g, (_, key) => JSON.stringify(process.env[key] || '')));
  }).catch(done);
};
