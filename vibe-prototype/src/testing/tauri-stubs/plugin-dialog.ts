/**
 * Browser/Node-safe fake for @tauri-apps/plugin-dialog. Every vite config
 * (app, ladle, scripts) aliases the real module here, so app code can import
 * the native API at module level — the exact situation the tooling must
 * survive in the host app — while remaining runnable everywhere.
 * Mirror every export name the app imports from the real module.
 */

let mockResult: string | null = "/Users/demo/Documents/example-schema.json";

/** Stories/tests can preset what the "file picker" returns. */
export function setMockDialogResult(value: string | null) {
  mockResult = value;
}

export async function open(_options?: unknown): Promise<string | null> {
  console.log("[mock tauri] dialog.open →", mockResult);
  return mockResult;
}
