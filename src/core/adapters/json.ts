/** Small helpers shared by adapters that edit JSON hook files (Claude settings.json, Codex hooks.json). */
import { HOOK_MARKER } from "./types";

export type HookEntry = { matcher?: string; hooks: { type: string; command: string; timeout?: number }[] };
export type HooksFile = { hooks?: Record<string, HookEntry[]>; [k: string]: unknown };

export function parseJsonFile(text: string, path: string): HooksFile {
  if (!text.trim()) return {};
  try {
    const v = JSON.parse(text);
    if (v && typeof v === "object" && !Array.isArray(v)) return v as HooksFile;
  } catch {
    // fallthrough
  }
  throw new Error(`${path} is not valid JSON; fix it before connecting.`);
}

function isOurs(entry: HookEntry): boolean {
  return Array.isArray(entry?.hooks) && entry.hooks.some((h) => typeof h?.command === "string" && h.command.includes(HOOK_MARKER));
}

export function withoutOurHooks(file: HooksFile): HooksFile {
  const hooks: Record<string, HookEntry[]> = {};
  for (const [event, entries] of Object.entries(file.hooks ?? {})) {
    const kept = (Array.isArray(entries) ? entries : []).filter((e) => !isOurs(e));
    if (kept.length) hooks[event] = kept;
  }
  const next: HooksFile = { ...file };
  if (Object.keys(hooks).length) next.hooks = hooks;
  else delete next.hooks;
  return next;
}

export function withOurHooks(file: HooksFile, ours: Record<string, HookEntry>): HooksFile {
  const base = withoutOurHooks(file);
  const hooks: Record<string, HookEntry[]> = { ...(base.hooks ?? {}) };
  for (const [event, entry] of Object.entries(ours)) hooks[event] = [...(hooks[event] ?? []), entry];
  return { ...base, hooks };
}

export function hasOurHooks(file: HooksFile): boolean {
  return Object.values(file.hooks ?? {}).some((entries) => Array.isArray(entries) && entries.some(isOurs));
}

export function stringify(file: HooksFile): string {
  return JSON.stringify(file, null, 2) + "\n";
}
