import { activateBundle, bundleFor, focusTmuxPane, focusTty, openInTerminal, tmuxPaneAlive, ttyAlive } from "./terminal";
import { run } from "./exec";
import { JumpResult } from "./adapters/types";
import { Config, Session } from "./types";

export async function openUrl(url: string): Promise<boolean> {
  const r = await run("/usr/bin/open", [url]);
  return r.ok;
}

export async function copyToClipboard(text: string): Promise<boolean> {
  const r = await run("/usr/bin/pbcopy", [], text);
  return r.ok;
}

/**
 * Jump back to a terminal session: focus the tmux pane or terminal tab that still runs it;
 * if it is gone, resume it in a new terminal window.
 */
export async function jumpToCli(session: Session, resumeCommand: string, config: Config): Promise<JumpResult> {
  const loc = session.locator ?? {};
  const alive = await ttyAlive(loc.tty);
  if (loc.tmuxPane && (await tmuxPaneAlive(loc)) && (alive || !loc.tty)) {
    if (await focusTmuxPane(loc)) return { ok: true, method: "tmux" };
  }
  if (alive && loc.tty) {
    const bundle = bundleFor(loc);
    if (await focusTty(loc.tty, bundle)) return { ok: true, method: "tab" };
    // Ghostty and friends: no scripting API for tabs yet, raise the app.
    if (bundle && (await activateBundle(bundle))) return { ok: true, method: "activate" };
  }
  const ok = await openInTerminal(resumeCommand, session.cwd, config.resumeTerminal);
  return { ok, method: "resume" };
}
