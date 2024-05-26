/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_HOST: string;
  readonly VITE_MATRIX_HOST: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare const __COMMIT_HASH__: string;
