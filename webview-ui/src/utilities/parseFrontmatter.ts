import { parse } from "yaml";

/**
 * Markdown先頭のYAMLフロントマターブロックにマッチする正規表現
 * - 先頭が "---" 行で始まり、次の "---" 行までをブロックとする
 * - キャプチャグループ1がフロントマター本文（YAML）
 */
const FRONTMATTER_REGEX = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
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
  const match = FRONTMATTER_REGEX.exec(markdown);

  if (!match) {
    return { frontmatter: null, content: markdown };
  }

  try {
    const parsed: unknown = parse(match[1]);

    if (!isPlainObject(parsed)) {
      return { frontmatter: null, content: markdown };
    }

    return { frontmatter: parsed, content: markdown.slice(match[0].length) };
  } catch {
    return { frontmatter: null, content: markdown };
  }
}
