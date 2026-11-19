import { describe, expect, it } from "vitest";
import { mergeExternalChange } from "@/utilities/mergeExternalChange";

describe("mergeExternalChange", () => {
  const base = "a\nb\nc";

  it("編集がなければ、外部の変更をそのまま返すこと", () => {
    expect(mergeExternalChange(base, base, "a\nB\nc")).toEqual({
      text: "a\nB\nc",
      conflict: false,
    });
  });

  it("外部の変更がなければ、編集をそのまま返すこと", () => {
    expect(mergeExternalChange(base, "A\nb\nc", base)).toEqual({
      text: "A\nb\nc",
      conflict: false,
    });
  });

  it("別々の箇所の変更は、両方を取り込むこと", () => {
    expect(mergeExternalChange("a\n\nb\n\nc", "A\n\nb\n\nc", "a\n\nb\n\nC")).toEqual({
      text: "A\n\nb\n\nC",
      conflict: false,
    });
  });

  it("同じ変更を両方が行っていれば、競合にしないこと", () => {
    expect(mergeExternalChange(base, "a\nX\nc", "a\nX\nc")).toEqual({
      text: "a\nX\nc",
      conflict: false,
    });
  });

  it("同じ箇所への異なる変更は、編集を優先して競合を知らせること", () => {
    expect(mergeExternalChange(base, "a\nmine\nc", "a\ntheirs\nc")).toEqual({
      text: "a\nmine\nc",
      conflict: true,
    });
  });

  it("競合していない箇所の外部の変更は、競合があっても取り込むこと", () => {
    expect(
      mergeExternalChange("a\n\nb\n\nc", "a-mine\n\nb\n\nc", "a-theirs\n\nb\n\nc-theirs")
    ).toEqual({ text: "a-mine\n\nb\n\nc-theirs", conflict: true });
  });

  /**
   * 特性テスト（characterization test）。
   * node-diff3（diff3Merge, excludeFalseConflicts）の更新で取り込み結果が変わらないことを確認する。
   * 期待値は現行（node-diff3 3.2）の結果を固定したもの。早期returnを通らず diff3Merge を経由する入力にしている。
   */
  describe("diff3Mergeの取り込み結果（特性）", () => {
    it.each([
      {
        name: "同じ変更（偽の競合）と別箇所の変更が混在しても、競合にせず両方を取り込む",
        base: "a\n\nb\n\nc",
        ours: "X\n\nb\n\nc",
        theirs: "X\n\nb\n\nC",
        expected: { text: "X\n\nb\n\nC", conflict: false },
      },
      {
        name: "直接隣り合う行への変更は競合として扱い、編集を優先する",
        base: "a\nb\nc",
        ours: "A\nb\nc",
        theirs: "a\nB\nc",
        expected: { text: "A\nb\nc", conflict: true },
      },
      {
        name: "変更のない行を1行挟んだ変更は、両方を取り込む",
        base: "a\nb\nc",
        ours: "A\nb\nc",
        theirs: "a\nb\nC",
        expected: { text: "A\nb\nC", conflict: false },
      },
      {
        name: "編集で削除した行を外部で変更した場合は競合とし、削除を優先する",
        base: "a\n\nb\n\nc",
        ours: "a\n\nc",
        theirs: "a\n\nB\n\nc",
        expected: { text: "a\n\nc", conflict: true },
      },
      {
        name: "編集で変更した行を外部で削除した場合は競合とし、変更を優先する",
        base: "a\n\nb\n\nc",
        ours: "a\n\nB\n\nc",
        theirs: "a\n\nc",
        expected: { text: "a\n\nB\n\nc", conflict: true },
      },
      {
        name: "両方が末尾に異なる行を追加した場合は競合とし、編集を優先する",
        base: "a\nb",
        ours: "a\nb\nours",
        theirs: "a\nb\ntheirs",
        expected: { text: "a\nb\nours", conflict: true },
      },
      {
        name: "先頭への追加と末尾への追加は、両方を取り込む",
        base: "a\n\nb",
        ours: "ours\n\na\n\nb",
        theirs: "a\n\nb\n\ntheirs",
        expected: { text: "ours\n\na\n\nb\n\ntheirs", conflict: false },
      },
      {
        name: "同じ箇所への一部だけ重なる変更は競合とし、編集を優先する",
        base: "a\nb\nc",
        ours: "a\nX\nY\nc",
        theirs: "a\nX\nc",
        expected: { text: "a\nX\nY\nc", conflict: true },
      },
    ])("$name", ({ base, ours, theirs, expected }) => {
      expect(mergeExternalChange(base, ours, theirs)).toEqual(expected);
    });
  });
});
