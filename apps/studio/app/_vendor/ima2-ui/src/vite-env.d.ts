// These build-time gates are replaced by Studio's Next.js source loader.
// Declare them locally so this standalone app has no Vite type dependency.
interface ImportMetaEnv {
  readonly DEV: boolean;
  readonly VITE_IMA2_DEV?: string;
  readonly VITE_IMA2_NODE_MODE?: string;
  readonly VITE_IMA2_CARD_NEWS?: string;
  readonly VITE_IMA2_AGENT_MODE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
