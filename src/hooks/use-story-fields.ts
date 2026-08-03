"use client";

import { useCallback } from "react";
import type {
  StoryProject,
  StoryMetadata,
  StoryBible,
  WritingGoals,
  FrontMatter,
  TypographySettings,
} from "@/types/editor";
import type { useApiMutation } from "@/hooks/use-api-mutation";

type MutateJson = ReturnType<typeof useApiMutation>["mutateJson"];

interface UseStoryFieldsArgs {
  project: StoryProject | null;
  updateProject: (updater: (prev: StoryProject) => StoryProject) => void;
  mutateJson: MutateJson;
  storyId: string;
  isPublic: boolean;
  setIsPublic: (value: boolean) => void;
  toast: (message: string, type?: "success" | "error" | "info") => void;
  onDeleted: () => void;
}

/**
 * Story-level field editing: the Jacket's metadata + front matter, typography,
 * goals/bible, the publish toggle, and delete-story.
 *
 * The three persisted sub-objects (metadata / frontMatter / typography) all
 * follow one optimistic-with-rollback shape, so they route through a single
 * patchStoryField helper and differ only in the column body they send.
 * (Per-chapter settings live with the chapter lifecycle, not here.)
 */
export function useStoryFields({
  project,
  updateProject,
  mutateJson,
  storyId,
  isPublic,
  setIsPublic,
  toast,
  onDeleted,
}: UseStoryFieldsArgs) {
  // Optimistically set one story-level field, PATCH the matching columns, and
  // restore the prior value if the server rejects it.
  const patchStoryField = useCallback(
    <K extends "metadata" | "frontMatter" | "typography">(
      field: K,
      value: StoryProject[K],
      body: Record<string, unknown>,
      errorMessage: string
    ) => {
      const previous = project?.[field];
      updateProject((prev) => ({ ...prev, [field]: value }));
      void mutateJson(`/api/stories/${storyId}`, {
        body,
        errorMessage,
        rollback:
          previous !== undefined
            ? () => updateProject((prev) => ({ ...prev, [field]: previous }))
            : undefined,
      });
    },
    [project, mutateJson, updateProject, storyId]
  );

  const handleUpdateMetadata = useCallback(
    (metadata: StoryMetadata) => {
      patchStoryField(
        "metadata",
        metadata,
        {
          synopsis: metadata.synopsis,
          hook: metadata.hook,
          genres: metadata.genres,
          contentRating: metadata.contentRating,
          status: metadata.status,
          language: metadata.language,
          dedication: metadata.dedication,
          // Cover is a data URL for MVP, a URL in production.
          coverImageUrl: metadata.coverImageDataUrl || null,
        },
        "Couldn't save story details"
      );
    },
    [patchStoryField]
  );

  const handleUpdateFrontMatter = useCallback(
    (frontMatter: FrontMatter) => {
      patchStoryField(
        "frontMatter",
        frontMatter,
        {
          epigraph: frontMatter.epigraph,
          epigraphAttribution: frontMatter.epigraphAttribution,
          foreword: frontMatter.foreword,
          showToc: frontMatter.showToc,
        },
        "Couldn't save front matter"
      );
    },
    [patchStoryField]
  );

  const handleUpdateTypography = useCallback(
    (typography: TypographySettings) => {
      patchStoryField(
        "typography",
        typography,
        {
          dropCaps: typography.dropCaps,
          sceneBreakStyle: typography.sceneBreakStyle,
          paragraphIndent: typography.paragraphIndent,
          lineSpacing: typography.lineSpacing,
          textAlignment: typography.textAlignment,
          paragraphSpacing: typography.paragraphSpacing,
        },
        "Couldn't save typography settings"
      );
    },
    [patchStoryField]
  );

  // Bible and goals are editor-local — optimistic only, no server round-trip.
  const handleUpdateBible = useCallback(
    (bible: StoryBible) => updateProject((prev) => ({ ...prev, bible })),
    [updateProject]
  );

  const handleUpdateGoals = useCallback(
    (goals: WritingGoals) => updateProject((prev) => ({ ...prev, goals })),
    [updateProject]
  );

  const handleTogglePublish = useCallback(() => {
    const newValue = !isPublic;
    setIsPublic(newValue);
    void mutateJson(`/api/stories/${storyId}`, {
      body: { isPublic: newValue },
      successMessage: newValue
        ? "The doors are open — readers can find this story"
        : "Story set to private",
      errorMessage: "Couldn't update story visibility",
      rollback: () => setIsPublic(!newValue),
    });
  }, [isPublic, mutateJson, storyId, setIsPublic]);

  const handleDeleteStory = useCallback(async () => {
    if (!confirm("Are you sure you want to delete this story? This cannot be undone.")) return;
    await mutateJson(`/api/stories/${storyId}`, {
      method: "DELETE",
      errorMessage: "Couldn't delete story",
      onSuccess: () => {
        toast("Story deleted", "info");
        onDeleted();
      },
    });
  }, [mutateJson, storyId, toast, onDeleted]);

  return {
    handleUpdateMetadata,
    handleUpdateBible,
    handleUpdateGoals,
    handleUpdateFrontMatter,
    handleUpdateTypography,
    handleTogglePublish,
    handleDeleteStory,
  };
}
