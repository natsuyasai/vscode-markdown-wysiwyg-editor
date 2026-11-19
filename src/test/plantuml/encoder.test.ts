import * as assert from "assert";
import * as pako from "pako";
import { encodePlantUml } from "../../plantuml/encoder";

/**
 * 特性テスト（characterization test）。
 * 依存ライブラリ（pako）の更新で、PlantUMLサーバーへ渡すエンコード結果が変わらないことを確認する。
 * 期待値は現行実装（pako 3.0.1）の出力を固定したもの。
 */
const ENCODE_TABLE = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_";

/** PlantUML独自のBase64を復号し、raw deflateを展開して元の文字列に戻す */
function decodePlantUml(encoded: string): string {
  const bytes: number[] = [];
  for (let i = 0; i < encoded.length; i += 4) {
    const [c1, c2, c3, c4] = encoded
      .slice(i, i + 4)
      .split("")
      .map((ch) => ENCODE_TABLE.indexOf(ch));
    bytes.push((c1 << 2) | (c2 >> 4), ((c2 & 0xf) << 4) | (c3 >> 2), ((c3 & 0x3) << 6) | c4);
  }
  // 3バイト単位に満たない末尾は0で埋められている。raw deflateは終端ブロック以降を無視する
  return new TextDecoder().decode(pako.inflateRaw(new Uint8Array(bytes)));
}

suite("encodePlantUml（特性テスト）", () => {
  const cases: Array<{ name: string; source: string; encoded: string }> = [
    {
      name: "ASCIIのシーケンス図（圧縮後39バイト＝3の倍数）",
      source: "@startuml\nAlice -> Bob: Hello\n@enduml",
      encoded: "SoWkIImgAStDuNBCoKnELT2rKt3AJx9Iy4ZDoSddSaZDIodDpG40",
    },
    {
      name: "日本語を含む図（UTF-8、圧縮後59バイト＝余り2）",
      source: "@startuml\nアリス -> ボブ: こんにちは\n@enduml",
      encoded: "0JO0oVz0StHXSdHrRMmAuuAYuuEguuAv82q-8EE3dEE3bZeWuu6JuuAJuu6huu6Xuu6l2a1bRcHrRMm0",
    },
    { name: "1文字（圧縮後3バイト）", source: "A", encoded: "SmG0" },
    { name: "2文字（圧縮後4バイト＝余り1）", source: "AB", encoded: "StG20000" },
  ];

  for (const { name, source, encoded } of cases) {
    test(`${name}は既知のエンコード結果になること`, () => {
      assert.strictEqual(encodePlantUml(source), encoded);
    });

    test(`${name}のエンコード結果を復号すると元の文字列に戻ること`, () => {
      assert.strictEqual(decodePlantUml(encodePlantUml(source)), source);
    });
  }
});
