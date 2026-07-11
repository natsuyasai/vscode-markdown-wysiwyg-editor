import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { extractMermaidBlocks } from "@/utilities/extractMermaidBlocks";

/**
 * extractMermaidBlocks のプロパティベーステスト。
 *
 * 検証する性質:
 * 1. ラウンドトリップ: ```mermaid フェンスで囲んだソース断片の配列を、
 *    間に任意の地の文（段落テキスト）を挟んで組み立てたMarkdownから、
 *    元のソース断片が出現順そのまま復元できること（各要素はtrim後に比較）。
 * 2. 非mermaidの非混入: mermaid以外の言語のフェンスドコードブロックや
 *    地の文が混在していても、抽出結果はmermaidブロックの中身のみ
 *    （出現順・内容とも1と同じ）になること。
 *
 * ジェネレータの安全性:
 * - バックティック（`）を一切含まない文字集合のみを使用する。フェンスの
 *   開始/終了行は「行頭0〜3スペース + ```」で判定されるため、生成される
 *   ソース文字列・地の文にバックティックが存在しなければ、それらが
 *   フェンス行と誤認されることは原理的に起こらない。
 * - 安全な文字集合: 英数字、スペース、"-"、">"、";"
 */

const SAFE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 ->;".split("");

const safeCharArb = fc.constantFrom(...SAFE_CHARS);

// フェンスと衝突しない1行分の安全な文字列（空文字列も許容）
const safeLineArb = fc
  .array(safeCharArb, { minLength: 0, maxLength: 15 })
  .map((chars) => chars.join(""));

// 複数行からなる「安全なソース文字列」。trimすると空でないことを保証する。
const safeSourceArb = fc
  .array(safeLineArb, { minLength: 1, maxLength: 5 })
  .map((lines) => lines.join("\n"))
  .filter((source) => source.trim().length > 0);

// フェンスブロックの間に挟む地の文（空文字列でもよい）
const safeFillerArb = fc
  .array(safeLineArb, { minLength: 0, maxLength: 3 })
  .map((lines) => lines.join("\n"));

function fence(infoString: string, content: string): string {
  return "```" + infoString + "\n" + content + "\n```";
}

describe("extractMermaidBlocks プロパティ", () => {
  it("mermaidブロックのソース断片配列をラウンドトリップで復元できる", () => {
    const blocksAndFillersArb = fc
      .array(safeSourceArb, { minLength: 1, maxLength: 5 })
      .chain((blocks) =>
        fc.record({
          blocks: fc.constant(blocks),
          fillers: fc.array(safeFillerArb, {
            minLength: blocks.length + 1,
            maxLength: blocks.length + 1,
          }),
        })
      );

    fc.assert(
      fc.property(blocksAndFillersArb, ({ blocks, fillers }) => {
        let markdown = fillers[0];
        blocks.forEach((block, index) => {
          markdown += "\n" + fence("mermaid", block) + "\n" + fillers[index + 1];
        });

        const expected = blocks.map((block) => block.trim());
        const actual = extractMermaidBlocks(markdown).map((block) => block.trim());

        expect(actual).toEqual(expected);
      })
    );
  });

  it("非mermaidのコードブロックや地の文が混在してもmermaidブロックの中身のみを出現順に抽出する", () => {
    type Item =
      | { kind: "mermaid"; content: string }
      | { kind: "js"; content: string }
      | { kind: "text"; content: string };

    const mermaidItemArb: fc.Arbitrary<Item> = safeSourceArb.map((content) => ({
      kind: "mermaid",
      content,
    }));
    const jsItemArb: fc.Arbitrary<Item> = safeSourceArb.map((content) => ({
      kind: "js",
      content,
    }));
    const textItemArb: fc.Arbitrary<Item> = safeFillerArb.map((content) => ({
      kind: "text",
      content,
    }));

    const itemsArb = fc.array(fc.oneof(mermaidItemArb, jsItemArb, textItemArb), {
      minLength: 1,
      maxLength: 8,
    });

    fc.assert(
      fc.property(itemsArb, (items) => {
        const markdown = items
          .map((item) => (item.kind === "text" ? item.content : fence(item.kind, item.content)))
          .join("\n");

        const expected = items
          .filter((item): item is Extract<Item, { kind: "mermaid" }> => item.kind === "mermaid")
          .map((item) => item.content.trim());
        const actual = extractMermaidBlocks(markdown).map((block) => block.trim());

        expect(actual).toEqual(expected);
      })
    );
  });
});
