export type EditorSaveGuardAction = "publish" | "chapter-switch" | "delete";

const SAVE_GUARD_MESSAGES: Record<EditorSaveGuardAction, string> = {
  publish: "Couldn't save your latest edits — publish cancelled.",
  "chapter-switch": "Couldn't save your latest edits — chapter switch cancelled.",
  delete: "Couldn't save your latest edits — delete cancelled.",
};

export function canProceedAfterSaveFlush(flushed: boolean) {
  return flushed;
}

export function getSaveGuardMessage(action: EditorSaveGuardAction) {
  return SAVE_GUARD_MESSAGES[action];
}
