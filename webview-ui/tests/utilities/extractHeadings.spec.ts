import { describe, it, expect } from "vitest";
import { extractHeadings, generateHeadingId } from "../../src/utilities/extractHeadings";

describe("generateHeadingId", () => {
  it("スペースをハイフンに変換し小文字化する", () => {
    expect(generateHeadingId("Hello World")).toBe("hello-world");
  });

  it("日本語テキストをそのまま使用する", () => {
    expect(generateHeadingId("見出しテスト")).toBe("見出しテスト");
  });

  it("特殊文字を除去する", () => {
    expect(generateHeadingId("Hello! World?")).toBe("hello-world");
  });
});

describe("extractHeadings", () => {
  it("Markdownテキストから見出しを抽出する", () => {
    const markdown = "# Title\n\nSome text\n\n## Section 1\n\n### Subsection";
    const result = extractHeadings(markdown);
    expect(result).toEqual([
      { level: 1, text: "Title", id: "title" },
      { level: 2, text: "Section 1", id: "section-1" },
      { level: 3, text: "Subsection", id: "subsection" },
    ]);
  });

  it("見出しがない場合は空配列を返す", () => {
    expect(extractHeadings("Just text")).toEqual([]);
  });

  it("コードブロック内の#を無視する", () => {
    const markdown = "# Real Heading\n\n```\n# Not a heading\n```\n\n## Another";
    const result = extractHeadings(markdown);
    expect(result).toEqual([
      { level: 1, text: "Real Heading", id: "real-heading" },
      { level: 2, text: "Another", id: "another" },
    ]);
  });

  it("重複IDにサフィックスを付与する", () => {
    const markdown = "# Title\n\n## Title\n\n### Title";
    const result = extractHeadings(markdown);
    expect(result).toEqual([
      { level: 1, text: "Title", id: "title" },
      { level: 2, text: "Title", id: "title-1" },
      { level: 3, text: "Title", id: "title-2" },
    ]);
  });
});
