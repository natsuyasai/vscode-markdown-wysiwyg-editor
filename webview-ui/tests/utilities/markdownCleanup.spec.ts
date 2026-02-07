import { describe, it, expect } from "vitest";
import { cleanupMarkdown, detectLineEnding } from "../../src/utilities/markdownCleanup";

describe("detectLineEnding", () => {
  it("CRLFを含むテキストではCRLFを返す", () => {
    expect(detectLineEnding("Line1\r\nLine2")).toBe("\r\n");
  });

  it("LFのみのテキストではLFを返す", () => {
    expect(detectLineEnding("Line1\nLine2")).toBe("\n");
  });

  it("改行なしのテキストではLFを返す", () => {
    expect(detectLineEnding("No newline")).toBe("\n");
  });
});

describe("cleanupMarkdown", () => {
  describe("既存の変換", () => {
    it("<br>タグを改行に変換する", () => {
      expect(cleanupMarkdown("Line1<br>Line2", "\n")).toBe("Line1\nLine2");
    });

    it("<br />タグを改行に変換する", () => {
      expect(cleanupMarkdown("Line1<br />Line2", "\n")).toBe("Line1\nLine2");
    });

    it("<br/>タグを改行に変換する", () => {
      expect(cleanupMarkdown("Line1<br/>Line2", "\n")).toBe("Line1\nLine2");
    });

    it("&nbsp;を通常のスペースに変換する", () => {
      expect(cleanupMarkdown("Hello&nbsp;World", "\n")).toBe("Hello World");
    });

    it("Unicode ノーブレークスペース（\\u00A0）を通常のスペースに変換する", () => {
      expect(cleanupMarkdown("Hello\u00A0World", "\n")).toBe("Hello World");
    });

    it("改行コードをCRLFに統一する", () => {
      expect(cleanupMarkdown("Line1\nLine2", "\r\n")).toBe("Line1\r\nLine2");
    });

    it("CRLFからLFへの統一", () => {
      expect(cleanupMarkdown("Line1\r\nLine2", "\n")).toBe("Line1\nLine2");
    });
  });

  describe("バックスラッシュ改行の変換", () => {
    it("バックスラッシュ改行をtrailing spaces（スペース2つ+改行）に変換する", () => {
      expect(cleanupMarkdown("Line1\\\nLine2", "\n")).toBe("Line1  \nLine2");
    });

    it("複数のバックスラッシュ改行を変換する", () => {
      expect(cleanupMarkdown("A\\\nB\\\nC", "\n")).toBe("A  \nB  \nC");
    });

    it("CRLF環境でもバックスラッシュ改行を正しく変換する", () => {
      expect(cleanupMarkdown("Line1\\\nLine2", "\r\n")).toBe("Line1  \r\nLine2");
    });
  });

  describe("連続空行の正規化", () => {
    it("3つ以上の連続空行を2つの空行に正規化する", () => {
      expect(cleanupMarkdown("A\n\n\nB", "\n")).toBe("A\n\nB");
    });

    it("4つ以上の連続空行も2つの空行に正規化する", () => {
      expect(cleanupMarkdown("A\n\n\n\n\nB", "\n")).toBe("A\n\nB");
    });

    it("2つの空行（1つの空行）はそのまま維持する", () => {
      expect(cleanupMarkdown("A\n\nB", "\n")).toBe("A\n\nB");
    });
  });

  describe("末尾の空行の正規化", () => {
    it("末尾の余分な空行を1つの改行に正規化する", () => {
      expect(cleanupMarkdown("Content\n\n\n", "\n")).toBe("Content\n");
    });

    it("末尾が1つの改行の場合はそのまま維持する", () => {
      expect(cleanupMarkdown("Content\n", "\n")).toBe("Content\n");
    });

    it("末尾に改行がない場合はそのまま維持する", () => {
      expect(cleanupMarkdown("Content", "\n")).toBe("Content");
    });
  });

  describe("複合的なケース", () => {
    it("バックスラッシュ改行と連続空行の両方を処理する", () => {
      expect(cleanupMarkdown("A\\\nB\n\n\n\nC", "\n")).toBe("A  \nB\n\nC");
    });

    it("すべての変換を組み合わせて適用する", () => {
      const input = "Hello&nbsp;World<br>Line2\\\nLine3\n\n\n\n";
      const expected = "Hello World\nLine2  \nLine3\n";
      expect(cleanupMarkdown(input, "\n")).toBe(expected);
    });
  });

  describe("テーブル行の保護", () => {
    it("テーブル行が保存後も壊れないこと", () => {
      const input =
        "| Header 1 | Header 2 | Header 3 |\n| --- | --- | --- |\n| Cell 1 | Cell 2 | Cell 3 |\n";
      const result = cleanupMarkdown(input, "\n");
      expect(result).toBe(input);
    });

    it("テーブル行内の<br>タグがスペースに変換されること（改行ではなく）", () => {
      const input =
        "| Header 1 | Header 2 | Header 3 |\n| --- | --- | --- |\n| Cell 1 | Cell<br>2 | Cell 3 |\n";
      const expected =
        "| Header 1 | Header 2 | Header 3 |\n| --- | --- | --- |\n| Cell 1 | Cell 2 | Cell 3 |\n";
      const result = cleanupMarkdown(input, "\n");
      expect(result).toBe(expected);
    });

    it("テーブル行内の&nbsp;がスペースに変換されること", () => {
      const input = "| Header&nbsp;1 | Header 2 |\n| --- | --- |\n| Cell 1 | Cell 2 |\n";
      const expected = "| Header 1 | Header 2 |\n| --- | --- |\n| Cell 1 | Cell 2 |\n";
      const result = cleanupMarkdown(input, "\n");
      expect(result).toBe(expected);
    });

    it("テーブルの前後のテキストは通常通り処理されること", () => {
      const input =
        "Text before<br>continued\n\n| Header 1 | Header 2 |\n| --- | --- |\n| Cell 1 | Cell 2 |\n\nText after<br>more\n";
      const expected =
        "Text before\ncontinued\n\n| Header 1 | Header 2 |\n| --- | --- |\n| Cell 1 | Cell 2 |\n\nText after\nmore\n";
      const result = cleanupMarkdown(input, "\n");
      expect(result).toBe(expected);
    });

    it("CJK文字を含むテーブル行が保護されること", () => {
      const input =
        "| 名前 | 年齢 | 住所 |\n| --- | --- | --- |\n| 田中太郎 | 30 | 東京都千代田区 |\n";
      const result = cleanupMarkdown(input, "\n");
      expect(result).toBe(input);
    });

    it("テーブル行内の<br />タグがスペースに変換されること", () => {
      const input = "| Cell 1 | Cell<br />2 | Cell 3 |\n";
      const expected = "| Cell 1 | Cell 2 | Cell 3 |\n";
      const result = cleanupMarkdown(input, "\n");
      expect(result).toBe(expected);
    });

    it("CRLF環境でもテーブルが保護されること", () => {
      const input = "| Header 1 | Header 2 |\r\n| --- | --- |\r\n| Cell<br>1 | Cell 2 |\r\n";
      const expected = "| Header 1 | Header 2 |\r\n| --- | --- |\r\n| Cell 1 | Cell 2 |\r\n";
      const result = cleanupMarkdown(input, "\r\n");
      expect(result).toBe(expected);
    });

    it("テーブル行内のノーブレークスペースがスペースに変換されること", () => {
      const input = "| Cell\u00A01 | Cell 2 |\n";
      const expected = "| Cell 1 | Cell 2 |\n";
      const result = cleanupMarkdown(input, "\n");
      expect(result).toBe(expected);
    });
  });
});
