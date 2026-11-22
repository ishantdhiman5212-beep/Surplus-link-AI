/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  readonly VITE_USE_MOCK_DATA: string;
  readonly VITE_MOCK_DELAY_MS: string;
  readonly VITE_DEFAULT_JOIN_CODE: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
