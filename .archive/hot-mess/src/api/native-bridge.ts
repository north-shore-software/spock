/**
 * The fixture's "native surface": a real module-level import of a Tauri
 * plugin, exactly like the host app's src/api/app layer. It exists to keep the
 * tooling honest — the extractor and Ladle must both survive importing pages
 * that transitively import native-only modules (via vite aliases to
 * src/testing/tauri-stubs/*).
 */
import { open } from "@tauri-apps/plugin-dialog";

export async function pickLocalSchema(): Promise<string | null> {
  const result = await open({
    multiple: false,
    filters: [{ name: "Schemas", extensions: ["json", "yaml"] }],
  });
  return typeof result === "string" ? result : null;
}
