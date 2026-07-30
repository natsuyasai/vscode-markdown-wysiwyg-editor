import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { stringify } from "yaml";
import { parseFrontmatter } from "@/utilities/parseFrontmatter";

/**
 * parseFrontmatter のプロパティベーステスト。
 *
 * 検証する性質（ラウンドトリップ）:
 * フラットなkey-valueオブジェクト（値は文字列・数値・真偽値のいずれか）を
 * yaml の stringify() でYAML文字列化し、
 *   "---\n" + YAML文字列 + "---\n" + 本文Markdown
 * という形でMarkdown文字列を組み立てる。この組み立てたMarkdownを
 * parseFrontmatter に渡すと:
 * 1. frontmatter が元のオブジェクトと一致する（toEqual）
 * 2. content が組み立てに使った「本文Markdown部分」と一致する
 *    （フロントマターブロックが正しく除去されている）
 *
 * ジェネレータの安全性:
 * - キー: 英字のみからなる識別子（YAMLのkeyとして曖昧にならず、
 *   本文Markdown側の文字集合とも衝突しない）。fc.dictionary により
 *   オブジェクト内でのキー重複も発生しない。
 * - 値:
 *   - 文字列値: 英数字・スペースのみからなり、かつ前後に空白を持たず、
 *     数値のみの文字列（"123"等）や真偽値・null相当の語（"true"/"false"/
 *     "null"/"yes"/"no"/"on"/"off"、大文字小文字違い含む）を除外する。
 *     これにより yaml の stringify→parse を経ても型が文字列のまま
 *     保持されることを保証する。
 *   - 数値: fc.integer()（YAML上は曖昧にならずそのまま数値として復元される）
 *   - 真偽値: fc.boolean()
 * - 本文Markdown: バックティックとハイフンを含まない安全な文字集合のみを
 *   使用する。これにより本文中に単独の "---" 行が出現することはなく、
 *   フロントマターの閉じ区切りと誤認されることもない。
 */

const KEY_CHARS = "abcdefghijklmnopqrstuvwxyz".split("");
const keyArb = fc
  .array(fc.constantFrom(...KEY_CHARS), { minLength: 3, maxLength: 8 })
  .map((chars) => chars.join(""));

const AMBIGUOUS_STRING_VALUES = new Set(["true", "false", "null", "yes", "no", "on", "off", "~"]);

const STRING_VALUE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 ".split(
  ""
);

const stringValueArb = fc
  .array(fc.constantFrom(...STRING_VALUE_CHARS), { minLength: 1, maxLength: 12 })
  .map((chars) => chars.join(""))
  .filter((value) => value.trim() === value && value.length > 0)
  .filter((value) => !/^\d+$/.test(value))
  .filter((value) => !AMBIGUOUS_STRING_VALUES.has(value.toLowerCase()));

const valueArb = fc.oneof(stringValueArb, fc.integer(), fc.boolean());

const frontmatterObjectArb = fc.dictionary(keyArb, valueArb, { minKeys: 1, maxKeys: 6 });

// 本文Markdownに使う安全な文字集合（バックティック・ハイフンを含まない）
const BODY_SAFE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 >;.".split(
  ""
);

const bodyLineArb = fc
  .array(fc.constantFrom(...BODY_SAFE_CHARS), { minLength: 0, maxLength: 15 })
  .map((chars) => chars.join(""));

const bodyMarkdownArb = fc
  .array(bodyLineArb, { minLength: 0, maxLength: 5 })
  .map((lines) => lines.join("\n"));

describe("parseFrontmatter プロパティ", () => {
  it("stringifyしたフラットなkey-valueオブジェクトをラウンドトリップで復元できる", () => {
    fc.assert(
      fc.property(frontmatterObjectArb, bodyMarkdownArb, (frontmatterObject, body) => {
        const yamlText = stringify(frontmatterObject);
        const markdown = "---\n" + yamlText + "---\n" + body;

        const result = parseFrontmatter(markdown);

        expect(result.frontmatter).toEqual(frontmatterObject);
        expect(result.content).toBe(body);
      })
    );
  });
});
