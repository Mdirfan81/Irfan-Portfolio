/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ROUTER?: 'memory' | 'browser'
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
