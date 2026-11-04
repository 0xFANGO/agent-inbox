import { confirmAlert, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { readConfig, writeConfig } from "../core/config";
import { Translator } from "../core/i18n";

// Settings can be pushed over All Sessions; notify both mounted views immediately on changes.
const listeners = new Set<(enabled: boolean) => void>();

export function useContentSearch(t: Translator) {
  const [enabled, update] = useState(() => readConfig().contentSearchEnabled === true);
  useEffect(() => {
    listeners.add(update);
    return () => {
      listeners.delete(update);
    };
  }, []);

  async function setEnabled(next: boolean) {
    if (
      next &&
      !(await confirmAlert({
        title: t("search.enableTitle"),
        message: t("search.enableDescription"),
        primaryAction: { title: t("search.enable") },
        dismissAction: { title: t("confirm.cancel") },
      }))
    )
      return;
    try {
      writeConfig({ contentSearchEnabled: next });
      for (const notify of listeners) notify(next);
    } catch (error) {
      await showToast({ style: Toast.Style.Failure, title: t("toast.error"), message: String(error) });
    }
  }

  return { enabled, setEnabled };
}
