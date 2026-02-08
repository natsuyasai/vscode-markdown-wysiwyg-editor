import type { Root, Paragraph, Table, Code, ThematicBreak, List } from "mdast";
import { gfmToMarkdown } from "mdast-util-gfm";
import { toMarkdown } from "mdast-util-to-markdown";
import { describe, it, expect } from "vitest";
import { createRemarkStringifyOptions } from "../../src/components/MilkdownEditor/remarkConfig";

function paragraphWithBreak(before: string, after: string): Paragraph {
  return {
    type: "paragraph",
    children: [{ type: "text", value: before }, { type: "break" }, { type: "text", value: after }],
  };
}

function tableWithCells(headers: string[], cells: Paragraph["children"][]): Table {
  return {
    type: "table",
    children: [
      {
        type: "tableRow",
        children: headers.map((h) => ({
          type: "tableCell" as const,
          children: [{ type: "text" as const, value: h }],
        })),
      },
      {
        type: "tableRow",
        children: cells.map((c) => ({
          type: "tableCell" as const,
          children: c,
        })),
      },
    ],
  };
}

function convert(node: Root["children"][number], useGfm = false): string {
  const opts = createRemarkStringifyOptions();
  return toMarkdown(node, useGfm ? { ...opts, extensions: [gfmToMarkdown()] } : opts);
}

describe("createRemarkStringifyOptions", () => {
  describe("設定値", () => {
    it("箇条書きのbulletに'-'を使用する", () => {
      const opts = createRemarkStringifyOptions();
      expect(opts.bullet).toBe("-");
    });

    it("bulletOtherに'*'を使用する", () => {
      const opts = createRemarkStringifyOptions();
      expect(opts.bulletOther).toBe("*");
    });

    it("水平線のruleに'-'を使用する", () => {
      const opts = createRemarkStringifyOptions();
      expect(opts.rule).toBe("-");
    });

    it("emphasisに'*'を使用する", () => {
      const opts = createRemarkStringifyOptions();
      expect(opts.emphasis).toBe("*");
    });

    it("strongに'*'を使用する", () => {
      const opts = createRemarkStringifyOptions();
      expect(opts.strong).toBe("*");
    });

    it("fencesがtrueに設定されている", () => {
      const opts = createRemarkStringifyOptions();
      expect(opts.fences).toBe(true);
    });

    it("listItemIndentが'one'に設定されている", () => {
      const opts = createRemarkStringifyOptions();
      expect(opts.listItemIndent).toBe("one");
    });

    it("handlersにbreakとtextのハンドラが含まれている", () => {
      const opts = createRemarkStringifyOptions();
      expect(opts.handlers).toBeDefined();
      expect(opts.handlers!.break).toBeTypeOf("function");
      expect(opts.handlers!.text).toBeTypeOf("function");
    });
  });

  describe("hardBreakハンドラ", () => {
    it("通常のparagraph内でtrailing spaces（スペース2つ+改行）を出力する", () => {
      const node = paragraphWithBreak("Line1", "Line2");
      const result = convert(node);
      expect(result).toBe("Line1  \nLine2\n");
    });

    it("デフォルトのバックスラッシュ改行ではなくtrailing spacesを使う", () => {
      const node = paragraphWithBreak("Before", "After");
      const result = convert(node);
      expect(result).not.toContain("\\\n");
      expect(result).toContain("  \n");
    });

    it("テーブルセル内のbreakはスペースに変換される", () => {
      const table = tableWithCells(
        ["Header1", "Header2"],
        [
          [
            { type: "text", value: "Cell1" },
            { type: "break" },
            { type: "text", value: "continued" },
          ],
          [{ type: "text", value: "Cell2" }],
        ]
      );
      const result = convert(table, true);
      expect(result).toContain("Cell1 continued");
      expect(result).not.toContain("  \n");
    });
  });

  describe("textハンドラ", () => {
    it("trailing spacesを含むテキストがエンコードされずそのまま保持される", () => {
      const node: Paragraph = {
        type: "paragraph",
        children: [{ type: "text", value: "Hello World  " }],
      };
      const result = convert(node);
      expect(result).toBe("Hello World  \n");
      expect(result).not.toContain("&#x20;");
    });

    it("テーブルセル内のパイプ文字がエスケープされる", () => {
      const table = tableWithCells(
        ["Header", "Value"],
        [[{ type: "text", value: "pipe|inside" }], [{ type: "text", value: "normal" }]]
      );
      const result = convert(table, true);
      expect(result).toContain("pipe\\|inside");
    });
  });

  describe("Markdown変換の統合テスト", () => {
    it("箇条書きリストが'-'で出力される", () => {
      const list: List = {
        type: "list",
        ordered: false,
        children: [
          {
            type: "listItem",
            children: [
              {
                type: "paragraph",
                children: [{ type: "text", value: "Item1" }],
              },
            ],
          },
        ],
      };
      const result = convert(list);
      expect(result).toMatch(/^- Item1/);
    });

    it("emphasisが'*'で囲まれる", () => {
      const node: Paragraph = {
        type: "paragraph",
        children: [
          {
            type: "emphasis",
            children: [{ type: "text", value: "italic" }],
          },
        ],
      };
      const result = convert(node);
      expect(result).toBe("*italic*\n");
    });

    it("strongが'**'で囲まれる", () => {
      const node: Paragraph = {
        type: "paragraph",
        children: [
          {
            type: "strong",
            children: [{ type: "text", value: "bold" }],
          },
        ],
      };
      const result = convert(node);
      expect(result).toBe("**bold**\n");
    });

    it("コードブロックがfenced style（バッククォート3つ）で出力される", () => {
      const node: Code = {
        type: "code",
        lang: "js",
        value: "console.log(1)",
      };
      const result = convert(node);
      expect(result).toBe("```js\nconsole.log(1)\n```\n");
    });

    it("水平線が'---'で出力される", () => {
      const node: ThematicBreak = {
        type: "thematicBreak",
      };
      const result = convert(node);
      expect(result).toBe("---\n");
    });
  });
});
