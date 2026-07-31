import { describe, it, expect } from "vitest";
import { formatFrontmatterValue } from "@/utilities/formatFrontmatterValue";

describe("formatFrontmatterValue", () => {
  it("文字列値はそのまま文字列として返す", () => {
    expect(formatFrontmatterValue("Hello")).toBe("Hello");
  });

  it("数値は文字列化して返す", () => {
    expect(formatFrontmatterValue(42)).toBe("42");
  });

  it("真偽値trueは文字列化して返す", () => {
    expect(formatFrontmatterValue(true)).toBe("true");
  });

  it("真偽値falseは文字列化して返す", () => {
    expect(formatFrontmatterValue(false)).toBe("false");
  });

  it("nullの場合は空文字列を返す", () => {
    expect(formatFrontmatterValue(null)).toBe("");
  });

  it("undefinedの場合は空文字列を返す", () => {
    expect(formatFrontmatterValue(undefined)).toBe("");
  });

  it("空配列の場合は空文字列を返す", () => {
    expect(formatFrontmatterValue([])).toBe("");
  });

  it("文字列配列はカンマ区切りの文字列として返す", () => {
    expect(formatFrontmatterValue(["foo", "bar"])).toBe("foo, bar");
  });

  it("ネストしたオブジェクトはJSON文字列として返す", () => {
    expect(formatFrontmatterValue({ name: "Alice", age: 30 })).toBe(
      JSON.stringify({ name: "Alice", age: 30 })
    );
  });

  it("ネストした配列を含むオブジェクトはJSON文字列として返す", () => {
    const value = { tags: ["foo", "bar"], author: { name: "Alice" } };
    expect(formatFrontmatterValue(value)).toBe(JSON.stringify(value));
  });
});
