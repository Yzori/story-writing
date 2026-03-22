import DOMPurify from "isomorphic-dompurify";

const ALLOWED_TAGS = [
  "p", "br", "strong", "em", "u", "s", "del",
  "h1", "h2", "h3", "h4", "h5", "h6",
  "ul", "ol", "li",
  "blockquote", "pre", "code",
  "a", "span", "div",
  "hr", "img", "figure", "figcaption",
];

const ALLOWED_ATTR = [
  "href", "target", "rel", "class", "style",
  "data-mention", "data-comment-id", "data-illustration",
  "data-type", "data-layout", "data-src", "data-alt",
  "data-caption", "data-floatside",
  "src", "alt", "width", "height", "loading",
  "id",
];

export function sanitizeHtmlClient(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
  });
}
