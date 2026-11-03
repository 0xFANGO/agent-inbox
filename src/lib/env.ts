import { environment, getPreferenceValues } from "@raycast/api";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { writeConfig } from "../core/config";
import { installCli } from "../core/install";
import { CLI_PATH } from "../core/paths";
import { normalizeLanguage, translator, Translator } from "../core/i18n";
import { Config, ResumeTerminal } from "../core/types";

interface Preferences {
  language: string;
  resumeTerminal: string;
}

function resumeTerminal(v: string): ResumeTerminal {
  return v === "iterm" || v === "ghostty" ? v : "terminal";
}

/**
 * Raycast preferences are the source of truth for language and terminal; they are mirrored into
 * ~/.sessions/config.json so the hook CLI (which runs outside Raycast) uses the same language for
 * notifications and the right deeplink.
 */
export function syncConfig(): Config {
  const prefs = getPreferenceValues<Preferences>();
  return writeConfig({
    language: normalizeLanguage(prefs.language),
    resumeTerminal: resumeTerminal(prefs.resumeTerminal),
    deeplinkBase: `raycast://extensions/${environment.ownerOrAuthorName}/${environment.extensionName}`,
  });
}

/** Once hooks are connected, keep ~/.sessions/bin/agent-inbox.mjs in step with the extension version. */
function refreshCli() {
  try {
    const bundled = join(environment.assetsPath, "agent-inbox.mjs");
    if (existsSync(CLI_PATH) && existsSync(bundled)) installCli(bundled);
  } catch {
    // best effort
  }
}

let refreshed = false;

export function locale(): { t: Translator; config: Config } {
  const config = syncConfig();
  if (!refreshed) {
    refreshed = true;
    refreshCli();
  }
  return { t: translator(config.language), config };
}
