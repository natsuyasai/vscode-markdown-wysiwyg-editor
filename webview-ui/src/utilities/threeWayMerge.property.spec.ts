import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { mergeUserEdits } from "@/utilities/threeWayMerge";

/**
 * mergeUserEdits のプロパティベーステスト。
 *
 * 3-wayマージの中核的な不変条件を検証する:
 * - ユーザー編集がなければoriginalはバイト単位で不変であること
 * - 正規化差分がなければcurrent（エディタ出力）がそのまま採用されること
 * - 未編集行はoriginalの記法を保全し、編集行はcurrentで置き換わること
 */
describe("mergeUserEdits プロパティ", () => {
  it("current===baseline（ユーザー編集なし）ならoriginalを完全に返す", () => {
    // 最重要保証: 編集がなければ正規化差分に関わらずoriginalがバイト不変
    fc.assert(
      fc.property(fc.string(), fc.string(), (original, baseline) => {
        expect(mergeUserEdits(original, baseline, baseline)).toBe(original);
      })
    );
  });

  it("original===baseline（正規化差分なし）ならcurrentをそのまま返す", () => {
    // 正規化が発生していなければエディタ出力（current）をそのまま保存する
    fc.assert(
      fc.property(fc.string(), fc.string(), (base, current) => {
        expect(mergeUserEdits(base, base, current)).toBe(current);
      })
    );
  });

  it("1:1整列モデルで未編集行はoriginal・編集行はcurrentになる", () => {
    // 各行に一意なトークンを与え、行単位diffが曖昧にならないようにする。
    // normalized: original→baselineで記法が変わった（正規化された）行
    // edited:     baseline→currentでユーザーが編集した行
    const lineFlags = fc.array(fc.record({ normalized: fc.boolean(), edited: fc.boolean() }), {
      minLength: 1,
      maxLength: 20,
    });

    fc.assert(
      fc.property(lineFlags, (flags) => {
        const originalLines = flags.map((_, i) => `L${i}-orig`);
        const baselineLines = flags.map((f, i) => (f.normalized ? `L${i}-norm` : originalLines[i]));
        const currentLines = flags.map((f, i) => (f.edited ? `L${i}-edit` : baselineLines[i]));
        // 期待値: 編集行はcurrent、未編集行はoriginal（正規化前）を保全
        const expected = flags.map((f, i) => (f.edited ? currentLines[i] : originalLines[i]));

        const result = mergeUserEdits(
          originalLines.join("\n"),
          baselineLines.join("\n"),
          currentLines.join("\n")
        );

        expect(result).toBe(expected.join("\n"));
      })
    );
  });
});
