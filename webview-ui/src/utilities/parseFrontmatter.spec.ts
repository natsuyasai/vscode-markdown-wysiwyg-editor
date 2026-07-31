import { describe, it, expect } from "vitest";
import { parseFrontmatter } from "@/utilities/parseFrontmatter";

describe("parseFrontmatter", () => {
  it("フラットなkey-value（文字列・数値・真偽値）を正しくパースし、contentからブロックを除去する", () => {
    const markdown = [
      "---",
      "title: Hello",
      "count: 42",
      "published: true",
      "---",
      "",
      "# Body",
    ].join("\n");
    const result = parseFrontmatter(markdown);
    expect(result).toEqual({
      frontmatter: { title: "Hello", count: 42, published: true },
      content: "\n# Body",
    });
  });

  it("配列値・ネストしたオブジェクトを含むフロントマターもオブジェクトとして正しくパースする", () => {
    const markdown = [
      "---",
      "tags:",
      "  - foo",
      "  - bar",
      "author:",
      "  name: Alice",
      "  age: 30",
      "---",
      "Body text",
    ].join("\n");
    const result = parseFrontmatter(markdown);
    expect(result).toEqual({
      frontmatter: { tags: ["foo", "bar"], author: { name: "Alice", age: 30 } },
      content: "Body text",
    });
  });

  it("フロントマターが存在しない場合はfrontmatterがnullでcontentが元のmarkdownのままである", () => {
    const markdown = "# Title\n\nSome text";
    const result = parseFrontmatter(markdown);
    expect(result).toEqual({ frontmatter: null, content: markdown });
  });

  it("不正なYAML構文（インデント崩れ）の場合はfrontmatterがnullでcontentが元のmarkdownのままである", () => {
    const markdown = ["---", "title: Hello", " bad: [unclosed", "---", "# Body"].join("\n");
    const result = parseFrontmatter(markdown);
    expect(result).toEqual({ frontmatter: null, content: markdown });
  });

  it("パース結果が配列の場合はfrontmatterがnullでcontentが元のmarkdownのままである", () => {
    const markdown = ["---", "- foo", "- bar", "---", "# Body"].join("\n");
    const result = parseFrontmatter(markdown);
    expect(result).toEqual({ frontmatter: null, content: markdown });
  });

  it("パース結果がスカラー値（文字列）の場合はfrontmatterがnullでcontentが元のmarkdownのままである", () => {
    const markdown = ["---", "just a scalar string", "---", "# Body"].join("\n");
    const result = parseFrontmatter(markdown);
    expect(result).toEqual({ frontmatter: null, content: markdown });
  });

  it("パース結果がnullの場合はfrontmatterがnullでcontentが元のmarkdownのままである", () => {
    const markdown = ["---", "", "---", "# Body"].join("\n");
    const result = parseFrontmatter(markdown);
    expect(result).toEqual({ frontmatter: null, content: markdown });
  });

  it("ファイル先頭ではない、本文中に登場する---ブロックはフロントマターとして扱わない", () => {
    const markdown = ["# Title", "", "---", "not: frontmatter", "---", "", "Body"].join("\n");
    const result = parseFrontmatter(markdown);
    expect(result).toEqual({ frontmatter: null, content: markdown });
  });
});
