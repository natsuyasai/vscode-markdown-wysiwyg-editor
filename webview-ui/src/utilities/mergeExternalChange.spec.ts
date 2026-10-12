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
});
