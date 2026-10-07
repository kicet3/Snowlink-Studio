import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));
const apiOrigin = new URL(process.env.STUDIO_API_ORIGIN || 'https://api.snowfall.it.com');
if (apiOrigin.username || apiOrigin.password || apiOrigin.pathname !== '/' || apiOrigin.search || apiOrigin.hash
  || !(apiOrigin.protocol === 'https:' || apiOrigin.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(apiOrigin.hostname))) {
  throw new Error('STUDIO_API_ORIGIN must be an HTTPS origin or a localhost HTTP origin.');
}

const nextConfig = {
  agentRules: false,
  poweredByHeader: false,
  reactStrictMode: true,
  outputFileTracingRoot: root,
  experimental: { proxyTimeout: 180000 },
  async rewrites() {
    // Keep session cookies, uploads, generated files and SSE on the browser's origin.
    return { beforeFiles: ['api', 'integrations', 'media', 'renders', 'generated'].map(prefix => ({
      source: `/${prefix}/:path*`, destination: `${apiOrigin.origin}/${prefix}/:path*`,
    })) };
  },
  webpack(config, { isServer, webpack }) {
    config.resolve.modules = [path.join(root, 'node_modules'), ...(config.resolve.modules || ['node_modules'])];
    if (!isServer) {
      config.plugins.push(new webpack.NormalModuleReplacementPlugin(/^node:(fs|https)$/, resource => { resource.request = resource.request.slice(5); }));
      config.resolve.fallback = { ...config.resolve.fallback, fs: false, https: false, "image-size": false };
    }
    config.resolve.extensionAlias = { ...config.resolve.extensionAlias, ".js": [".ts", ".tsx", ".js"], ".mjs": [".mjs", ".mts"] };
    config.module.rules.push({ test: /\.[jt]sx?$/, include: path.join(root, 'app/_vendor/ima2-ui/src'),
      enforce: 'pre', use: [path.join(root, 'scripts/studio-source-loader.cjs')] });
    return config;
  },
};
export default nextConfig;
