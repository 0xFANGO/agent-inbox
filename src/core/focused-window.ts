import { osascript } from "./exec";
import { nativeFocusScript } from "./native-focus";

export interface FocusedWindow {
  title: string;
  url: string;
}

/** Read the front window's outer document, never sidebar links or conversation contents. */
export async function readFocusedWindow(bundleId: string, execute = osascript): Promise<FocusedWindow | undefined> {
  const native = await execute(nativeFocusScript(bundleId), "JavaScript");
  if (native.ok) {
    try {
      const value = JSON.parse(native.stdout);
      if (value === null) return undefined;
      if (value && typeof value.title === "string" && typeof value.url === "string") return { title: value.title, url: value.url };
    } catch {
      // An unavailable native bridge can still fall back to a unique window title.
    }
  }
  const result = await execute(
    `
const processes = Application("System Events").applicationProcesses.whose({ bundleIdentifier: ${JSON.stringify(bundleId)} })();
if (!processes.length) JSON.stringify(null);
else {
  const app = processes[0];
  function attribute(node, name) {
    try { return node.attributes.byName(name).value(); } catch (_) { return undefined; }
  }
  let window = attribute(app, "AXFocusedWindow");
  if (!window) { try { window = app.windows[0]; } catch (_) {} }
  let result = null;
  if (window) {
    result = { title: String(attribute(window, "AXTitle") || ""), url: String(attribute(window, "AXDocument") || "") };
    const queue = [{ node: window, depth: 0 }];
    let visited = 0;
    while (queue.length && visited++ < 80) {
      const item = queue.shift();
      if (attribute(item.node, "AXRole") === "AXWebArea") {
        const url = String(attribute(item.node, "AXURL") || "");
        const title = String(attribute(item.node, "AXTitle") || "");
        // Claude exposes its Electron shell and conversation as sibling documents.
        if (${JSON.stringify(bundleId)} === "com.anthropic.claudefordesktop" && (url.startsWith("file:") || (!url && !title))) continue;
        result = { title: title || result.title, url: url || result.url };
        break;
      }
      if (item.depth < 8) {
        try { for (const node of item.node.uiElements()) queue.push({ node: node, depth: item.depth + 1 }); } catch (_) {}
      }
    }
  }
  JSON.stringify(result);
}`,
    "JavaScript",
  );
  if (!result.ok) {
    if (/AX_ACCESS_DENIED|assistive|not authorized|not permitted|(-1743|-1719|10004)/i.test(`${native.stderr}\n${result.stderr}`))
      throw new FocusAccessError();
    return undefined;
  }
  try {
    const value = JSON.parse(result.stdout);
    if (value && typeof value.title === "string" && typeof value.url === "string") return { title: value.title, url: value.url };
  } catch {
    // An unsupported accessibility tree is not evidence of a focused conversation.
  }
  return undefined;
}

export class FocusAccessError extends Error {
  constructor() {
    super("Cannot read the focused window with Raycast's current macOS permissions");
  }
}
