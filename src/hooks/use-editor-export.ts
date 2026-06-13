"use client";

import { useCallback } from "react";
import type { StoryProject } from "@/types/editor";

type SaveState = "idle" | "saving" | "saved" | "error";

interface UseEditorExportArgs {
  project: StoryProject | null;
  hasProAccess: boolean;
  setSaveState: (state: SaveState) => void;
  /** Called when a gated export is attempted without Pro — open the upgrade modal. */
  onUpgradeNeeded: (feature: string) => void;
}

/**
 * The PDF / EPUB / DOCX export handlers, lifted out of the editor page.
 *
 * Each export is the same shape — gate on Pro, bail if the project hasn't
 * loaded, dynamically import the (heavy) generator, surface failures via the
 * save-state pill — so they share one runner and differ only in which module
 * they pull in.
 */
export function useEditorExport({
  project,
  hasProAccess,
  setSaveState,
  onUpgradeNeeded,
}: UseEditorExportArgs) {
  const runExport = useCallback(
    async (feature: string, run: (project: StoryProject) => void | Promise<void>) => {
      if (!hasProAccess) {
        onUpgradeNeeded(feature);
        return;
      }
      if (!project) return;
      try {
        await run(project);
      } catch (err) {
        console.error(`${feature} failed:`, err);
        setSaveState("error");
        setTimeout(() => setSaveState("idle"), 3000);
      }
    },
    [project, hasProAccess, setSaveState, onUpgradeNeeded]
  );

  const handleExportPdf = useCallback(
    () =>
      runExport("PDF Export", async (p) => {
        const { exportPdf } = await import("@/client/export-pdf");
        await exportPdf(p);
      }),
    [runExport]
  );

  const handleExportEpub = useCallback(
    () =>
      runExport("EPUB Export", async (p) => {
        const { exportEpub } = await import("@/client/export-pdf");
        exportEpub(p);
      }),
    [runExport]
  );

  const handleExportDocx = useCallback(
    () =>
      runExport("DOCX Export", async (p) => {
        const { exportDocx } = await import("@/client/export-docx");
        exportDocx(p);
      }),
    [runExport]
  );

  return { handleExportPdf, handleExportEpub, handleExportDocx };
}
