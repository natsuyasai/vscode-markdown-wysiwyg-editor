import { parse } from "yaml";

/**
 * Markdown先頭のYAMLフロントマターブロックにマッチする正規表現
 * - 先頭が "---" 行で始まり、次の "---" 行までをブロックとする
 * - 閉じの "---" は行全体でなければならない（"----" や "---x" は閉じとみなさない）
 * - キャプチャグループ1がフロントマター本文（YAML）
 */
const FRONTMATTER_REGEX = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export interface SplitFrontmatter {
  /** 先頭のフロントマターブロック（区切り行と直後の改行を含む元の文字列）。なければ空文字列 */
  raw: string;
  /** フロントマターのパース結果。フロントマターとして扱わない場合は null */
  data: Record<string, unknown> | null;
  /** フロントマターを除いた本文。常に `raw + body === markdown` となる */
  body: string;
}

/**
 * Markdown文字列先頭のYAMLフロントマターを、元の文字列のまま切り出す
 * - YAMLとして不正な場合、または結果がプレーンオブジェクトでない場合は
 *   フロントマターなしとみなし、全体を本文として返す
 */
export function splitFrontmatter(markdown: string): SplitFrontmatter {
  const match = FRONTMATTER_REGEX.exec(markdown);
  if (!match) {
    return { raw: "", data: null, body: markdown };
  }

  try {
    const parsed: unknown = parse(match[1]);
    if (!isPlainObject(parsed)) {
      return { raw: "", data: null, body: markdown };
    }
    return { raw: match[0], data: parsed, body: markdown.slice(match[0].length) };
  } catch {
    return { raw: "", data: null, body: markdown };
  }
}

/**
 * Markdown文字列先頭のYAMLフロントマターを検出してパースする
 * - パースに失敗した場合、または結果がプレーンオブジェクトでない場合は
 *   frontmatterをnullとし、contentは元のmarkdownをそのまま返す
 */
export function parseFrontmatter(markdown: string): {
  frontmatter: Record<string, unknown> | null;
  content: string;
} {
  const { data, body } = splitFrontmatter(markdown);
  return { frontmatter: data, content: body };
}
