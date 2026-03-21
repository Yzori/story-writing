import { describe, it, expect } from "vitest";
import { sanitizeHtml } from "@/server/sanitize";

describe("HTML Sanitization", () => {
  describe("Allowed tags", () => {
    it("preserves basic formatting tags", () => {
      const input = "<p><strong>Bold</strong> and <em>italic</em></p>";
      expect(sanitizeHtml(input)).toBe(input);
    });

    it("preserves headings", () => {
      const input = "<h1>Title</h1><h2>Subtitle</h2><h3>Section</h3>";
      expect(sanitizeHtml(input)).toBe(input);
    });

    it("preserves lists", () => {
      const input = "<ul><li>One</li><li>Two</li></ul>";
      expect(sanitizeHtml(input)).toBe(input);
    });

    it("preserves blockquotes", () => {
      const input = "<blockquote>A wise quote</blockquote>";
      expect(sanitizeHtml(input)).toBe(input);
    });

    it("preserves code blocks", () => {
      const input = "<pre><code>const x = 1;</code></pre>";
      expect(sanitizeHtml(input)).toBe(input);
    });

    it("preserves links with href", () => {
      const input = '<a href="https://example.com">Link</a>';
      expect(sanitizeHtml(input)).toBe(input);
    });

    it("preserves horizontal rules", () => {
      const input = "<hr>";
      const result = sanitizeHtml(input);
      expect(result).toContain("hr");
    });

    it("preserves underline and strikethrough", () => {
      const input = "<u>underline</u><s>strike</s><del>deleted</del>";
      expect(sanitizeHtml(input)).toBe(input);
    });
  });

  describe("XSS Prevention", () => {
    it("removes script tags", () => {
      const input = '<p>Hello</p><script>alert("xss")</script>';
      const result = sanitizeHtml(input);
      expect(result).not.toContain("script");
      expect(result).not.toContain("alert");
    });

    it("removes event handlers", () => {
      const input = '<p onmouseover="alert(1)">Hover me</p>';
      const result = sanitizeHtml(input);
      expect(result).not.toContain("onmouseover");
      expect(result).not.toContain("alert");
    });

    it("removes javascript: URLs", () => {
      const input = '<a href="javascript:alert(1)">Click</a>';
      const result = sanitizeHtml(input);
      expect(result).not.toContain("javascript:");
    });

    it("removes iframe tags", () => {
      const input = '<iframe src="https://evil.com"></iframe>';
      const result = sanitizeHtml(input);
      expect(result).not.toContain("iframe");
    });

    it("removes form tags", () => {
      const input = '<form action="https://evil.com"><input></form>';
      const result = sanitizeHtml(input);
      expect(result).not.toContain("form");
    });

    it("removes object/embed tags", () => {
      const input = '<object data="evil.swf"></object><embed src="evil.swf">';
      const result = sanitizeHtml(input);
      expect(result).not.toContain("object");
      expect(result).not.toContain("embed");
    });

    it("handles nested script injection", () => {
      // DOMPurify strips the <script> tag, leaving the text fragments
      // The key assertion is that no executable script remains
      const input = '<p><scr<script>ipt>alert(1)</scr</script>ipt></p>';
      const result = sanitizeHtml(input);
      expect(result).not.toContain("<script>");
      expect(result).not.toContain("</script>");
    });

    it("removes svg onload attacks", () => {
      const input = '<svg onload="alert(1)"><circle r="10"></circle></svg>';
      const result = sanitizeHtml(input);
      expect(result).not.toContain("onload");
      expect(result).not.toContain("alert");
    });
  });

  describe("Data attributes (Tiptap)", () => {
    it("preserves data-mention attribute", () => {
      const input = '<span data-mention="user-123">@Alice</span>';
      const result = sanitizeHtml(input);
      expect(result).toContain('data-mention="user-123"');
    });

    it("preserves data-illustration attribute", () => {
      const input = '<div data-illustration="true">Image</div>';
      const result = sanitizeHtml(input);
      expect(result).toContain("data-illustration");
    });

    it("preserves data-type attribute", () => {
      const input = '<div data-type="scene-break">***</div>';
      const result = sanitizeHtml(input);
      expect(result).toContain('data-type="scene-break"');
    });
  });

  describe("Edge cases", () => {
    it("handles empty string", () => {
      expect(sanitizeHtml("")).toBe("");
    });

    it("handles plain text (no HTML)", () => {
      expect(sanitizeHtml("Just plain text")).toBe("Just plain text");
    });

    it("handles deeply nested tags", () => {
      const input = "<p><strong><em><u>Formatted</u></em></strong></p>";
      expect(sanitizeHtml(input)).toBe(input);
    });
  });
});
