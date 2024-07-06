/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_INCLUDE_EVENT_INFO: boolean;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare const __COMMIT_HASH__: string;
