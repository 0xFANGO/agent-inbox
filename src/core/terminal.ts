import { existsSync } from "node:fs";
import { asString, osascript, run, shQuote } from "./exec";
import { Locator, ResumeTerminal } from "./types";

export const TERMINAL_BUNDLE = "com.apple.Terminal";
export const ITERM_BUNDLE = "com.googlecode.iterm2";
export const GHOSTTY_BUNDLE = "com.mitchellh.ghostty";

const TERM_PROGRAM_BUNDLES: Record<string, string> = {
  Apple_Terminal: TERMINAL_BUNDLE,
  "iTerm.app": ITERM_BUNDLE,
  ghostty: GHOSTTY_BUNDLE,
  WezTerm: "com.github.wez.wezterm",
  vscode: "com.microsoft.VSCode",
  WarpTerminal: "dev.warp.Warp-Stable",
};

export const TERMINAL_BUNDLES = new Set([
  TERMINAL_BUNDLE,
  ITERM_BUNDLE,
  GHOSTTY_BUNDLE,
  "com.github.wez.wezterm",
  "net.kovidgoyal.kitty",
  "org.alacritty",
  "io.alacritty",
  "dev.warp.Warp-Stable",
  "com.microsoft.VSCode",
  "com.todesktop.230313mzl4w4u92", // Cursor
]);

export function bundleFor(loc: Locator): string | undefined {
  if (loc.bundleId) return loc.bundleId;
  if (loc.termProgram && TERM_PROGRAM_BUNDLES[loc.termProgram]) return TERM_PROGRAM_BUNDLES[loc.termProgram];
  return undefined;
}

export function tmuxBinary(): string {
  for (const p of ["/opt/homebrew/bin/tmux", "/usr/local/bin/tmux", "/usr/bin/tmux"]) if (existsSync(p)) return p;
  return "tmux";
}

function tmuxArgs(loc: Locator, args: string[]): string[] {
  return loc.tmuxSocket ? ["-S", loc.tmuxSocket, ...args] : args;
}

export async function tmuxPaneAlive(loc: Locator): Promise<boolean> {
  if (!loc.tmuxPane) return false;
  const r = await run(tmuxBinary(), tmuxArgs(loc, ["display-message", "-p", "-t", loc.tmuxPane, "#{pane_id}"]));
  return r.ok && r.stdout.trim() === loc.tmuxPane;
}

/** Focus a tmux pane: switch the attached client to it, then raise the terminal app. */
export async function focusTmuxPane(loc: Locator): Promise<boolean> {
  if (!loc.tmuxPane) return false;
  const tmux = tmuxBinary();
  const pane = loc.tmuxPane;
  const switched = await run(tmux, tmuxArgs(loc, ["switch-client", "-t", pane]));
  await run(tmux, tmuxArgs(loc, ["select-window", "-t", pane]));
  await run(tmux, tmuxArgs(loc, ["select-pane", "-t", pane]));
  const bundle = bundleFor(loc);
  if (bundle && bundle !== "tmux") await activateBundle(bundle);
  return switched.ok || !!bundle;
}

/** Is an agent process still attached to this tty? */
export async function ttyAlive(tty: string | undefined): Promise<boolean> {
  if (!tty) return false;
  const name = tty.replace(/^\/dev\//, "");
  const r = await run("/bin/ps", ["-t", name, "-o", "comm="]);
  if (!r.ok) return false;
  return r.stdout.split("\n").some((l) => /claude|codex|node/i.test(l));
}

export async function activateBundle(bundleId: string): Promise<boolean> {
  const r = await run("/usr/bin/open", ["-b", bundleId]);
  return r.ok;
}

/** Select the Terminal.app / iTerm2 tab that owns a tty. */
export async function focusTty(tty: string, bundleId: string | undefined): Promise<boolean> {
  if (bundleId === TERMINAL_BUNDLE) {
    const r = await osascript(`
tell application "Terminal"
  repeat with w in windows
    repeat with t in tabs of w
      if tty of t is ${asString(tty)} then
        set selected of t to true
        set index of w to 1
        activate
        return "ok"
      end if
    end repeat
  end repeat
end tell
return "miss"`);
    return r.ok && r.stdout.trim() === "ok";
  }
  if (bundleId === ITERM_BUNDLE) {
    const r = await osascript(`
tell application "iTerm2"
  repeat with w in windows
    repeat with t in tabs of w
      repeat with s in sessions of t
        if tty of s is ${asString(tty)} then
          select w
          select t
          select s
          activate
          return "ok"
        end if
      end repeat
    end repeat
  end repeat
end tell
return "miss"`);
    return r.ok && r.stdout.trim() === "ok";
  }
  return false;
}

/** The tty of the frontmost tab in Terminal.app or iTerm2. */
export async function frontTty(bundleId: string): Promise<string | undefined> {
  let script = "";
  if (bundleId === TERMINAL_BUNDLE) script = `tell application "Terminal" to get tty of selected tab of front window`;
  else if (bundleId === ITERM_BUNDLE) script = `tell application "iTerm2" to get tty of current session of current window`;
  else return undefined;
  const r = await osascript(script);
  const tty = r.stdout.trim();
  return r.ok && tty.startsWith("/dev/") ? tty : undefined;
}

/** tmux clients: which pane each terminal tty is showing, most recently active first. */
export async function tmuxClients(): Promise<{ tty: string; pane: string; activity: number }[]> {
  const r = await run(tmuxBinary(), ["list-clients", "-F", "#{client_tty}\t#{pane_id}\t#{client_activity}"]);
  if (!r.ok) return [];
  return r.stdout
    .split("\n")
    .map((l) => l.split("\t"))
    .filter((p) => p.length === 3)
    .map(([tty, pane, activity]) => ({ tty, pane, activity: Number(activity) || 0 }))
    .sort((a, b) => b.activity - a.activity);
}

/** Open a new terminal window running `command` in `cwd`. */
export async function openInTerminal(command: string, cwd: string, terminal: ResumeTerminal): Promise<boolean> {
  const line = cwd && existsSync(cwd) ? `cd ${shQuote(cwd)} && ${command}` : command;
  if (terminal === "iterm") {
    const r = await osascript(`
tell application "iTerm2"
  activate
  set w to (create window with default profile)
  tell current session of w to write text ${asString(line)}
end tell`);
    if (r.ok) return true;
  }
  if (terminal === "ghostty") {
    const args = ["-na", "Ghostty", "--args"];
    if (cwd && existsSync(cwd)) args.push(`--working-directory=${cwd}`);
    args.push("-e", process.env.SHELL || "/bin/zsh", "-lc", command);
    const r = await run("/usr/bin/open", args);
    if (r.ok) return true;
  }
  const r = await osascript(`
tell application "Terminal"
  activate
  do script ${asString(line)}
end tell`);
  return r.ok;
}
