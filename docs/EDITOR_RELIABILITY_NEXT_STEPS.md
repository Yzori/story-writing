# Editor Reliability Next Steps

This tracks the remaining backend work behind the writing editor. The UI now supports safer conflict copy, current-content manual snapshots, clearer inserts, and chapter landmarks; these are the next persistence changes that should follow.

## Media Storage

Current issue: chapter images can still live inside HTML as compressed data URLs. That works locally, but it is fragile for long chapters, version history, exports, and published reading.

Recommended model:

- Store uploaded chapter media as rows in `chapter_assets`.
- Persist a stable `asset_id`, `url`, `mime_type`, `width`, `height`, `size_bytes`, `created_by`, and `created_at`.
- Store editor HTML with asset references, not raw image bytes.
- Keep snapshot content pointing at the same stable asset references.
- Add an orphan cleanup job for assets no longer referenced by any chapter or snapshot after a grace period.

Migration path:

1. Keep accepting existing data URLs for backward compatibility.
2. On save, detect data URL images in illustration blocks.
3. Upload them to object storage and replace `data-src` with the stored asset URL/id.
4. Preserve old snapshot HTML as readable, but normalize restored content on next save.

## Version History

Current behavior:

- Manual named versions now snapshot the editor's current content, including unsaved local image blocks.
- Auto snapshots are pruned to the latest 50 auto-save milestones.
- Named versions are retained until deleted.

Next backend improvements:

- Add snapshot `kind`: `manual` or `auto`.
- Add `deleted_at` for snapshots instead of hard delete if auditability matters.
- Add a restore endpoint that performs the restore atomically with optimistic locking.
- Return structured restore conflicts instead of relying on the normal autosave conflict banner.

## Conflict Semantics

Current behavior:

- Chapter saves use `baseVersion`.
- Server returns `409` with `serverVersion`.
- Client stores the local draft and asks the user whether to load latest, copy draft, or save local draft.

Next backend improvements:

- Include `changedBy`, `changedAt`, and possibly `source` in `409` responses.
- If the same user changed the chapter in another tab, say that explicitly.
- If a collaborator changed it, include their display name.
- Consider a lightweight merge preview for text-only conflicts.

## Validation Checklist

- Save a chapter with an image, manually name a version, edit text, restore the version, and confirm the image remains.
- Create two tabs, edit both, confirm one gets a conflict and the draft can be copied/saved.
- Save a named version, delete it, reload history, confirm it stays deleted.
- Confirm auto snapshots prune only auto versions, never named versions.
- Confirm published reader and export flows render restored image references.
