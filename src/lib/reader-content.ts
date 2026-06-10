// Attribute values come from serialized HTML, so they are already
// entity-encoded (Tiptap's getHTML encodes & and " in attributes).
// Decode here so escapeHtml doesn't double-encode on re-render.
function decodeEntities(str: string): string {
  return str
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");
}

function extractAttr(tag: string, attr: string): string | null {
  const regex = new RegExp(`${attr}="([^"]*)"`, "i");
  const match = tag.match(regex);
  return match ? decodeEntities(match[1]) : null;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function renderIllustrationsForReader(content: string): string {
  return content.replace(
    /<div[^>]*data-type="illustr(?:ated|ation)"[^>]*\/?>/g,
    (match) => {
      const src = extractAttr(match, "data-src") || extractAttr(match, "src");
      if (!src) return "";

      const alt = extractAttr(match, "data-alt") || extractAttr(match, "alt") || "";
      const caption = extractAttr(match, "data-caption") || "";
      const layout = extractAttr(match, "data-layout") || "inline";
      const floatSide = extractAttr(match, "data-floatside") || "left";
      const layoutClass =
        layout === "side-by-side"
          ? floatSide === "right"
            ? "side-by-side-right"
            : "side-by-side"
          : layout;

      return `<figure class="illustration-block" data-layout="${escapeHtml(layoutClass)}">
        <img src="${escapeHtml(src)}" alt="${escapeHtml(alt)}" loading="lazy" class="w-full h-auto rounded-lg" />
        ${caption ? `<figcaption class="text-center text-[12px] text-text-ghost mt-2 italic">${escapeHtml(caption)}</figcaption>` : ""}
      </figure>`;
    }
  );
}
