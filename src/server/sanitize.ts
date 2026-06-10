import "server-only";
import DOMPurify from "isomorphic-dompurify";

// Allow Tiptap's HTML elements and our custom attributes
const ALLOWED_TAGS = [
  "p", "br", "strong", "em", "u", "s", "del",
  "h1", "h2", "h3", "h4", "h5", "h6",
  "ul", "ol", "li",
  "blockquote", "pre", "code",
  "a", "span", "div",
  "hr", "img", "figure", "figcaption",
  "mark",
];

const ALLOWED_ATTR = [
  "href", "target", "rel", "class", "style",
  "data-mention", "data-thread-id", "data-illustration",
  "data-type", "data-layout", "data-src", "data-alt",
  "data-caption", "data-prompt", "data-floatside", "data-color",
  "data-scene-break", "data-scene-break-style", "data-scene-break-label",
  "data-story-moment", "data-mood",
  "src", "alt", "width", "height", "loading",
  "id",
];

// Only allow safe CSS properties — blocks position/z-index (clickjacking),
// background-image/url() (tracking pixels), and opacity (invisible overlays)
const SAFE_CSS_PROPERTIES = new Set([
  "color",
  "background-color",
  "background",
  "font-weight",
  "font-style",
  "font-size",
  "text-align",
  "text-decoration",
  "padding",
  "padding-left",
  "padding-right",
  "padding-top",
  "padding-bottom",
  "margin",
  "margin-left",
  "margin-right",
  "margin-top",
  "margin-bottom",
  "border-radius",
  "border",
  "border-color",
  "border-width",
  "border-style",
  "line-height",
  "letter-spacing",
  "white-space",
  "word-break",
  "display",
]);

const URL_PATTERN = /url\s*\(/i;

function sanitizeCssValue(property: string, value: string): boolean {
  if (!SAFE_CSS_PROPERTIES.has(property)) return false;
  if (URL_PATTERN.test(value)) return false;
  return true;
}

DOMPurify.addHook("uponSanitizeAttribute", (_node, data) => {
  if (data.attrName === "style" && data.attrValue) {
    const clean = data.attrValue
      .split(";")
      .map((decl) => decl.trim())
      .filter((decl) => {
        if (!decl) return false;
        const colonIdx = decl.indexOf(":");
        if (colonIdx === -1) return false;
        const prop = decl.slice(0, colonIdx).trim().toLowerCase();
        const val = decl.slice(colonIdx + 1).trim();
        return sanitizeCssValue(prop, val);
      })
      .join("; ");
    data.attrValue = clean || "";
    if (!clean) data.keepAttr = false;
  }
});

export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
  });
}
