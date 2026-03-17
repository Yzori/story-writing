import DOMPurify from "isomorphic-dompurify";

// Allow Tiptap's HTML elements and our custom attributes
const ALLOWED_TAGS = [
  "p", "br", "strong", "em", "u", "s", "del",
  "h1", "h2", "h3", "h4", "h5", "h6",
  "ul", "ol", "li",
  "blockquote", "pre", "code",
  "a", "span", "div",
  "hr", "img",
];

const ALLOWED_ATTR = [
  "href", "target", "rel", "class", "style",
  "data-mention", "data-comment-id", "data-illustration",
  "src", "alt", "width", "height",
  "id", "data-type",
];

export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOW_DATA_ATTR: true,
  });
}
