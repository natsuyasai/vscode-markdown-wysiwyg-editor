import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { mergeExternalChange } from "@/utilities/mergeExternalChange";

const lineArbitrary = fc
  .string({ minLength: 0, maxLength: 8 })
  .filter((line) => !line.includes("\n"));
const textArbitrary = fc
  .array(lineArbitrary, { minLength: 1, maxLength: 12 })
  .map((lines) => lines.join("\n"));

describe("mergeExternalChange（プロパティ）", () => {
  it("編集がなければ外部の変更と一致し、外部の変更がなければ編集と一致すること", () => {
    fc.assert(
      fc.property(textArbitrary, textArbitrary, (base, changed) => {
        expect(mergeExternalChange(base, base, changed)).toEqual({
          text: changed,
          conflict: false,
        });
        expect(mergeExternalChange(base, changed, base)).toEqual({
          text: changed,
          conflict: false,
        });
      })
    );
  });

  it("どちらも同じ内容に変更したときは、その内容になり競合しないこと", () => {
    fc.assert(
      fc.property(textArbitrary, textArbitrary, (base, changed) => {
        expect(mergeExternalChange(base, changed, changed)).toEqual({
          text: changed,
          conflict: false,
        });
      })
    );
  });
});
