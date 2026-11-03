import { CLAUDE_APP_BUNDLE } from "./adapters/claude";
import { CODEX_APP_BUNDLE } from "./adapters/codex";
import { bundleFor, frontTty, tmuxClients, TERMINAL_BUNDLES } from "./terminal";
import { Session } from "./types";

/**
 * Which session is in the front window?
 * - desktop apps: the most recently active session of that app
 * - terminals: the tty of the front tab (Terminal.app / iTerm2), mapped through tmux when a client
 *   is attached there; other terminals fall back to the most recently active tmux client, then to
 *   the most recently active session started from that terminal.
 */
export async function sessionForForeground(bundleId: string | undefined, sessions: Session[]): Promise<Session | undefined> {
  if (!bundleId) return undefined;
  const byRecent = [...sessions].sort((a, b) => b.updatedAt - a.updatedAt);

  if (bundleId === CLAUDE_APP_BUNDLE) return byRecent.find((s) => s.agent === "claude" && s.host === "app");
  if (bundleId === CODEX_APP_BUNDLE) return byRecent.find((s) => s.agent === "codex" && s.host === "app");

  const isTerminal = TERMINAL_BUNDLES.has(bundleId) || byRecent.some((s) => bundleFor(s.locator) === bundleId);
  if (!isTerminal) return undefined;

  const cli = byRecent.filter((s) => s.host === "cli");
  const tty = await frontTty(bundleId);
  const clients = await tmuxClients();

  if (tty) {
    const client = clients.find((c) => c.tty === tty);
    if (client) {
      const hit = cli.find((s) => s.locator.tmuxPane === client.pane);
      if (hit) return hit;
    }
    const hit = cli.find((s) => s.locator.tty === tty);
    if (hit) return hit;
  } else if (clients.length) {
    const hit = cli.find((s) => s.locator.tmuxPane === clients[0].pane && bundleFor(s.locator) === bundleId);
    if (hit) return hit;
  }
  return cli.find((s) => bundleFor(s.locator) === bundleId);
}
