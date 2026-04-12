---
name: Webtoon and Illustrated editor bug audit
description: Full audit of WebtoonEditor, IllustratedEditor, WebtoonReader, IllustratedReader, and write page as of 2026-03-27
type: project
---

Audited 2026-03-27. Bugs found:

**Bug 1 (Critical) — IllustratedBlock renderHTML loses all image data on save/load**
`src/components/editor/extensions/IllustratedBlock.tsx:101-106`
renderHTML uses `mergeAttributes(HTMLAttributes, ...)` which maps node attrs to HTML
attributes using their raw JS property names (src, alt, caption, layout, floatSide,
uploading), NOT the `data-*` names expected by parseHTML and IllustratedReader. The
saved HTML will contain `<div src="..." layout="...">` instead of `<div data-src="..."
data-layout="...">` causing total data loss on reload.

**Bug 2 (Critical) — IllustratedReader double-escapes data URIs, breaking image display**
`src/components/reader/IllustratedReader.tsx:56-58`
escapeHtml() is called on `src` before injecting into the `<img src="...">` attribute.
Data URIs contain `+`, `/`, and `=` chars; the function escapes `<`, `>`, `"`, `&`.
The `&` -> `&amp;` replacement corrupts `data:image/jpeg;base64,...` strings that
contain `&` (rare but possible), and more importantly `"` in the URL would break the
attribute boundary. The real problem: escapeHtml on a data URI that is then put into
`dangerouslySetInnerHTML` is double-sanitized by DOMPurify, which may further alter it.

**Bug 3 (High) — IllustratedBlock image data stripped by sanitizer in reader**
`src/lib/sanitize-client.ts` + `src/components/reader/IllustratedReader.tsx:88`
sanitizeHtmlClient() does NOT include `style` in ALLOWED_ATTR, so any inline style
on `<img>` tags (added by CSS class-less layout rendering) is stripped. More critically:
`data:` URIs in `src` attributes ARE allowed (data: is not blocked by DOMPurify by
default, and `src` is in ALLOWED_ATTR), so image data survives — but only if Bug 1
is fixed and the src is actually serialized correctly.

**Bug 4 (High) — WebtoonEditor word count update fires on every panel array reference change**
`src/components/editor/WebtoonEditor.tsx:467-469`
`onWordCountChange` is called in a useEffect that depends on `wordCount`. If the parent
passes a new function reference on each render (not wrapped in useCallback), this fires
in a tight loop. The write page passes no onWordCountChange to WebtoonEditor at all
(line 1801-1805 of write page), so this is benign in production — but the hook
dependency on `onWordCountChange` is still fragile.

**Bug 5 (High) — compressImage hard limit 500KB far below panel validation limit 1.5MB**
`src/client/images.ts:6` sets MAX_DATA_URL_LENGTH = 500_000
`src/lib/validations.ts:79` allows imageData up to 1_500_000
compressImage will reject images that compress to 500KB-1.5MB with "Image too large
even after compression", but the API would accept them. Users with moderately large
images will hit a client-side error wall that doesn't match the server's actual limit.

**Bug 6 (High) — Drop-image placeholder race condition in IllustratedEditor**
`src/components/editor/IllustratedEditor.tsx:136-153` and `159-175`
When a file is dropped or pasted, the code inserts a placeholder node, then after the
async upload resolves, it searches for a node with `uploading === true && src === null`.
If two images are dropped simultaneously, both placeholders match and both will be
updated with the same data URL (the first upload result). The second result will also
search and may not find a matching node or will update the wrong one.

**Bug 7 (Medium) — WebtoonEditor collaborator PATCH denied: only owner can edit panels**
`src/app/api/stories/[storyId]/chapters/[chapterId]/panels/[panelId]/route.ts:36`
`src/app/api/stories/[storyId]/chapters/[chapterId]/panels/route.ts:118`
Both POST and PATCH verify `story.userId !== session.user.id` (owner-only). Accepted
collaborators on co-op stories cannot save panels. The write page already gates editor
access for non-owners/collaborators, but panel operations will return 403 for collaborators.

**Bug 8 (Medium) — IllustratedEditor "Add Illustration" button does not trigger file input**
`src/components/editor/IllustratedEditor.tsx:518-521` handleAddIllustration calls
`editor.chain().focus().setIllustrationBlock({}).run()` — this inserts an empty
IllustratedBlock node. The file input in the toolbar area (line 666-672) is wired to
handleFileInputChange but the button at line 637 calls handleAddIllustration, not
`fileInputRef.current?.click()`. So clicking "Add Illustration" inserts an empty block
(which is intentional), but the hidden `<input ref={fileInputRef}>` is never triggered
from that button path. The file input can only be reached from inside the IllustratedBlock
node view's own Browse button. The floating "Add Illustration" button is therefore
misleading — it creates an empty placeholder block, not a file picker.

**Bug 9 (Medium) — CSP blocks external avatar URLs in collaborator presence display**
`next.config.ts:22` img-src is `'self' data: blob:` — no `https:`.
`src/app/write/[storyId]/page.tsx:1693` renders `<img src={c.avatarUrl}>` where
`avatarUrl` comes from the API (likely GitHub OAuth avatar, an https:// URL). These
will be blocked by the CSP, producing broken avatar images in the co-op presence bar.
Same issue affects story cover images stored as external URLs.

**Bug 10 (Low) — WebtoonReader panel fade-in stuck at 0.3 opacity until image loads**
`src/components/reader/WebtoonReader.tsx:157`
`animate={{ opacity: loadedPanels.has(panel.id) ? 1 : 0.3 }}`
On first render, no panels are in `loadedPanels`, so all panels animate to 0.3 opacity.
The `initial` is set to `{ opacity: 0 }` but the `animate` target is 0.3 not 1, so
panels that fail to load (404, network error) also call `onError` which adds them to
`loadedPanels` and animates to 1. This is actually correct for error handling, but the
0.3 "loading" state is visible as a permanent dim effect if Framer Motion batches
re-renders before the `onLoad` fires on already-cached images.

**Bug 11 (Low) — IllustratedBlock `uploading` attr serialized to HTML**
`src/components/editor/extensions/IllustratedBlock.tsx:93`
`uploading: { default: false }` has no `rendered: false` or `parseHTML` exclusion.
If a user saves mid-upload (unlikely but possible), the serialized HTML will contain
`uploading="true"` on the div, and on re-load parseHTML will set `uploading: true`,
permanently showing the spinner overlay on that block.

**Why:** Discovered during security fix audit (style attr removal from sanitizer + CSP img-src tightening).
**How to apply:** Bug 1 is the most urgent — it causes total content loss for illustrated stories.
