import { describe, it, expect } from "vitest";
import { parseFrontmatter, splitFrontmatter } from "@/utilities/parseFrontmatter";

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

describe("splitFrontmatter", () => {
  it("フロントマターを区切り行と直後の改行を含む元の文字列のまま切り出す", () => {
    const markdown = "---\ntitle:   a  # c\n---\n\n# Body";
    expect(splitFrontmatter(markdown)).toEqual({
      raw: "---\ntitle:   a  # c\n---\n",
      data: { title: "a" },
      body: "\n# Body",
    });
  });

  it("YAMLとして不正なフロントマターは切り出さず、全体を本文とする", () => {
    const markdown = "---\ntitle: [閉じていない\n---\n\n# Body";
    expect(splitFrontmatter(markdown)).toEqual({ raw: "", data: null, body: markdown });
  });

  it("配列だけのYAMLは切り出さない", () => {
    const markdown = "---\n- a\n- b\n---\nBody";
    expect(splitFrontmatter(markdown).raw).toBe("");
  });

  it("閉じの区切りが行全体でなければ（----）閉じとみなさない", () => {
    const markdown = "---\ntitle: a\n----\nBody";
    expect(splitFrontmatter(markdown).raw).toBe("");
  });

  it("文書末尾が閉じの区切りでも切り出せる", () => {
    expect(splitFrontmatter("---\ntitle: a\n---")).toEqual({
      raw: "---\ntitle: a\n---",
      data: { title: "a" },
      body: "",
    });
  });
});
