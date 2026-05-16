import { describe, it, expect } from "vitest";
import {
  createStorySchema,
  updateStorySchema,
  createChapterSchema,
  updateChapterSchema,
  reorderChaptersSchema,
} from "@/lib/validations";

describe("Validation Schemas", () => {
  describe("createStorySchema", () => {
    it("accepts valid minimal input", () => {
      const result = createStorySchema.safeParse({ title: "My Story" });
      expect(result.success).toBe(true);
    });

    it("rejects empty title", () => {
      const result = createStorySchema.safeParse({ title: "" });
      expect(result.success).toBe(false);
    });

    it("rejects missing title", () => {
      const result = createStorySchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it("rejects title over 500 chars", () => {
      const result = createStorySchema.safeParse({ title: "x".repeat(501) });
      expect(result.success).toBe(false);
    });

    it("accepts full valid input", () => {
      const result = createStorySchema.safeParse({
        title: "My Great Novel",
        format: "novel",
        writingMode: "solo",
        synopsis: "A tale of adventure",
        genres: ["Fantasy", "Adventure"],
        contentRating: "everyone",
        isPublic: true,
        dailyWordTarget: 1000,
      });
      expect(result.success).toBe(true);
    });

    it("rejects invalid format enum", () => {
      const result = createStorySchema.safeParse({
        title: "Test",
        format: "manga",
      });
      expect(result.success).toBe(false);
    });

    it("rejects invalid writing mode", () => {
      const result = createStorySchema.safeParse({
        title: "Test",
        writingMode: "multiplayer",
      });
      expect(result.success).toBe(false);
    });

    it("rejects synopsis over 5000 chars", () => {
      const result = createStorySchema.safeParse({
        title: "Test",
        synopsis: "x".repeat(5001),
      });
      expect(result.success).toBe(false);
    });

    it("rejects negative daily word target", () => {
      const result = createStorySchema.safeParse({
        title: "Test",
        dailyWordTarget: -1,
      });
      expect(result.success).toBe(false);
    });
  });

  describe("updateStorySchema", () => {
    it("accepts empty object (no fields to update)", () => {
      const result = updateStorySchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it("accepts partial updates", () => {
      const result = updateStorySchema.safeParse({
        title: "Updated Title",
        isPublic: true,
      });
      expect(result.success).toBe(true);
    });

    it("rejects empty title string", () => {
      const result = updateStorySchema.safeParse({ title: "" });
      expect(result.success).toBe(false);
    });

    it("accepts valid scene break styles", () => {
      for (const style of ["asterism", "fleuron", "dots", "line", "text-line", "space"]) {
        const result = updateStorySchema.safeParse({ sceneBreakStyle: style });
        expect(result.success).toBe(true);
      }
    });

    it("rejects invalid scene break style", () => {
      const result = updateStorySchema.safeParse({ sceneBreakStyle: "stars" });
      expect(result.success).toBe(false);
    });
  });

  describe("createChapterSchema", () => {
    it("accepts valid minimal input", () => {
      const result = createChapterSchema.safeParse({ title: "Chapter 1" });
      expect(result.success).toBe(true);
    });

    it("rejects content over 500KB", () => {
      const result = createChapterSchema.safeParse({
        title: "Ch 1",
        content: "x".repeat(500001),
      });
      expect(result.success).toBe(false);
    });

    it("accepts valid chapter statuses", () => {
      expect(
        createChapterSchema.safeParse({ title: "Ch", status: "draft" }).success
      ).toBe(true);
      expect(
        createChapterSchema.safeParse({ title: "Ch", status: "published" }).success
      ).toBe(true);
    });

    it("rejects invalid chapter status", () => {
      const result = createChapterSchema.safeParse({
        title: "Ch",
        status: "archived",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("updateChapterSchema", () => {
    it("accepts baseVersion for optimistic locking", () => {
      const result = updateChapterSchema.safeParse({
        content: "<p>Updated</p>",
        baseVersion: 5,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.baseVersion).toBe(5);
      }
    });

    it("rejects baseVersion of 0 (must be positive)", () => {
      const result = updateChapterSchema.safeParse({ baseVersion: 0 });
      expect(result.success).toBe(false);
    });

    it("rejects negative baseVersion", () => {
      const result = updateChapterSchema.safeParse({ baseVersion: -1 });
      expect(result.success).toBe(false);
    });
  });

  describe("reorderChaptersSchema", () => {
    it("accepts valid reorder", () => {
      const result = reorderChaptersSchema.safeParse({
        chapters: [
          { id: "550e8400-e29b-41d4-a716-446655440001", sortOrder: 0 },
          { id: "550e8400-e29b-41d4-a716-446655440002", sortOrder: 1 },
        ],
      });
      expect(result.success).toBe(true);
    });

    it("rejects non-UUID ids", () => {
      const result = reorderChaptersSchema.safeParse({
        chapters: [{ id: "not-a-uuid", sortOrder: 0 }],
      });
      expect(result.success).toBe(false);
    });

    it("rejects negative sort orders", () => {
      const result = reorderChaptersSchema.safeParse({
        chapters: [
          { id: "550e8400-e29b-41d4-a716-446655440001", sortOrder: -1 },
        ],
      });
      expect(result.success).toBe(false);
    });

    it("rejects empty chapters array", () => {
      const result = reorderChaptersSchema.safeParse({ chapters: [] });
      expect(result.success).toBe(false);
    });
  });
});
