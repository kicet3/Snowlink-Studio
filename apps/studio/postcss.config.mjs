import { fileURLToPath } from 'node:url';
export default { plugins: { '@tailwindcss/postcss': {}, [fileURLToPath(new URL('./scripts/media-postcss.cjs', import.meta.url))]: {} } };
