import { describe, it, expect } from "vitest";
import { mergeUserEdits } from "@/utilities/threeWayMerge";

describe("mergeUserEdits", () => {
  it("baselineとcurrentが同一（ユーザー編集なし）の場合はoriginalをそのまま返す", () => {
    const original = "* item1\n* item2\n\n\n\n_強調_\n";
    const baseline = "- item1\n- item2\n\n*強調*\n";
    const current = baseline;

    expect(mergeUserEdits(original, baseline, current)).toBe(original);
  });

  it("originalとbaselineが同一（正規化差分なし）の場合はcurrentを返す", () => {
    const original = "- item1\n- item2\n";
    const baseline = original;
    const current = "- item1\n- item2 edited\n";

    expect(mergeUserEdits(original, baseline, current)).toBe(current);
  });

  it("箇条書き記号の正規化がある文書で1行だけ編集した場合、未編集行の記号を保全する", () => {
    const original = "* item1\n* item2\n* item3";
    const baseline = "- item1\n- item2\n- item3";
    const current = "- item1\n- item2 edited\n- item3";

    expect(mergeUserEdits(original, baseline, current)).toBe("* item1\n- item2 edited\n* item3");
  });

  it("強調記号の正規化がある文書で別の行だけ編集した場合、強調行は不変のまま保全する", () => {
    const original = "_強調_\n\nsome text";
    const baseline = "*強調*\n\nsome text";
    const current = "*強調*\n\nsome text edited";

    expect(mergeUserEdits(original, baseline, current)).toBe("_強調_\n\nsome text edited");
  });

  it("エスケープが追加された文書で別の行を編集した場合、エスケープなしのまま保全する", () => {
    const original = "1) test\n\nother line";
    const baseline = "1\\) test\n\nother line";
    const current = "1\\) test\n\nother line edited";

    expect(mergeUserEdits(original, baseline, current)).toBe("1) test\n\nother line edited");
  });

  it("空行圧縮された文書で別の行を編集した場合、3連続空行を保全する", () => {
    const original = "first\n\n\n\nlast";
    const baseline = "first\n\nlast";
    const current = "first\n\nlast edited";

    expect(mergeUserEdits(original, baseline, current)).toBe("first\n\n\n\nlast edited");
  });

  it("行数が変わる正規化（Setext見出し→ATX見出し）でも未編集の見出しを保全する", () => {
    const original = "Title\n=====\n\nbody";
    const baseline = "# Title\n\nbody";
    const current = "# Title\n\nbody edited";

    expect(mergeUserEdits(original, baseline, current)).toBe("Title\n=====\n\nbody edited");
  });

  it("正規化された行そのものを編集した（競合した）場合はcurrentの内容を採用する", () => {
    const original = "* item1\n* item2";
    const baseline = "- item1\n- item2";
    const current = "- item1 edited\n- item2";

    expect(mergeUserEdits(original, baseline, current)).toBe("- item1 edited\n* item2");
  });

  it("複数箇所の編集が同時に適用される", () => {
    const original = "* item1\n\nparagraph\n\n_強調_\n\nfooter";
    const baseline = "- item1\n\nparagraph\n\n*強調*\n\nfooter";
    const current = "- item1\n\nparagraph edited\n\n*強調*\n\nfooter edited";

    expect(mergeUserEdits(original, baseline, current)).toBe(
      "* item1\n\nparagraph edited\n\n_強調_\n\nfooter edited"
    );
  });

  it("currentで追加された行が反映される", () => {
    const original = "* item1\n* item2";
    const baseline = "- item1\n- item2";
    const current = "- item1\n- item2\n- item3";

    expect(mergeUserEdits(original, baseline, current)).toBe("* item1\n* item2\n- item3");
  });

  it("currentで削除された行が反映される", () => {
    const original = "* item1\n* item2\n* item3";
    const baseline = "- item1\n- item2\n- item3";
    const current = "- item1\n- item3";

    expect(mergeUserEdits(original, baseline, current)).toBe("* item1\n* item3");
  });

  it("空行圧縮された箇所の直後に行を挿入しても、行の重複や欠落が起きない", () => {
    const original = "first\n\n\n\nlast";
    const baseline = "first\n\nlast";
    const current = "first\n\nnew line\nlast";

    expect(mergeUserEdits(original, baseline, current)).toBe("first\n\n\n\nnew line\nlast");
  });

  it("すべて空文字列の場合は空文字列を返す", () => {
    expect(mergeUserEdits("", "", "")).toBe("");
  });

  it("originalのみ末尾改行がある場合でも例外を出さず妥当な結果を返す", () => {
    const original = "* item1\n* item2\n";
    const baseline = "- item1\n- item2";
    const current = "- item1\n- item2 edited";

    expect(() => mergeUserEdits(original, baseline, current)).not.toThrow();
    expect(mergeUserEdits(original, baseline, current)).toContain("item2 edited");
  });

  it("currentのみ末尾改行がある場合でも例外を出さず末尾改行が反映される", () => {
    const original = "* item1\n* item2";
    const baseline = "- item1\n- item2";
    const current = "- item1\n- item2\n";

    expect(() => mergeUserEdits(original, baseline, current)).not.toThrow();
    expect(mergeUserEdits(original, baseline, current)).toBe("* item1\n* item2\n");
  });

  it("originalが空でbaseline/currentに内容がある場合でも例外を出さない", () => {
    expect(() => mergeUserEdits("", "text\n", "text edited\n")).not.toThrow();
  });
});
