import { describe, it, expect } from "vitest";
import { extractMermaidBlocks } from "@/utilities/extractMermaidBlocks";

describe("extractMermaidBlocks", () => {
  it("mermaidブロックが1個の場合はその中身を1要素で返す", () => {
    const markdown = "```mermaid\ngraph TD\nA-->B\n```";
    const result = extractMermaidBlocks(markdown);
    expect(result).toEqual(["graph TD\nA-->B"]);
  });

  it("mermaidブロックが複数ある場合は出現順にすべて返す", () => {
    const markdown = [
      "```mermaid",
      "graph TD",
      "A-->B",
      "```",
      "",
      "Some text between blocks",
      "",
      "```mermaid",
      "sequenceDiagram",
      "Alice->>Bob: Hello",
      "```",
    ].join("\n");
    const result = extractMermaidBlocks(markdown);
    expect(result).toEqual(["graph TD\nA-->B", "sequenceDiagram\nAlice->>Bob: Hello"]);
  });

  it("mermaid以外の言語のコードブロックは抽出しない", () => {
    const markdown = "```js\nconsole.log('mermaid');\n```";
    expect(extractMermaidBlocks(markdown)).toEqual([]);
  });

  it("mermaidブロックが無い場合は空配列を返す", () => {
    expect(extractMermaidBlocks("普通のテキストです")).toEqual([]);
  });

  it("本文テキストにmermaidという語があっても誤抽出しない", () => {
    const markdown = "mermaidという図式化ツールについて説明します。\n\n```js\nmermaid.init();\n```";
    expect(extractMermaidBlocks(markdown)).toEqual([]);
  });

  it("インラインコードにmermaidの語があっても誤抽出しない", () => {
    const markdown = "`mermaid`というキーワードを含む文章です。";
    expect(extractMermaidBlocks(markdown)).toEqual([]);
  });

  it("フェンス行に軽微な先頭インデント（0〜3スペース）があっても抽出できる", () => {
    const markdown = "   ```mermaid\n   graph TD\n   A-->B\n   ```";
    const result = extractMermaidBlocks(markdown);
    expect(result[0]?.trim()).toBe("graph TD\n   A-->B");
  });

  it("info stringが大文字小文字混在でも抽出できる（大文字小文字を区別しない）", () => {
    const markdown = "```Mermaid\ngraph TD\nA-->B\n```";
    const result = extractMermaidBlocks(markdown);
    expect(result).toEqual(["graph TD\nA-->B"]);
  });

  it("info stringが末尾空白付き（mermaid ）でも抽出できる", () => {
    const markdown = "```mermaid   \ngraph TD\nA-->B\n```";
    const result = extractMermaidBlocks(markdown);
    expect(result).toEqual(["graph TD\nA-->B"]);
  });

  it("返す中身をtrimするとMermaidソースそのものになる", () => {
    const markdown = "```mermaid\n\n  graph TD\n  A-->B\n\n```";
    const result = extractMermaidBlocks(markdown);
    expect(result[0]?.trim()).toBe("graph TD\n  A-->B");
  });
});
