import { parse } from "yaml";

/**
 * Markdown先頭のYAMLフロントマターブロックにマッチする正規表現。
 * WebView側の parseFrontmatter（webview-ui/src/utilities/parseFrontmatter.ts）と同じ判定にする。
 * - 先頭が "---" 行で始まり、次の "---" だけの行までをブロックとする（CRLFにも対応）
 * - 閉じの "---" は行全体であること（"----" や "---x" では閉じない）
 * - キャプチャグループ1がフロントマター本文（YAML）
 */
const FRONTMATTER_REGEX = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/;

function isPlainObject(value: unknown): boolean {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Markdown先頭のYAMLフロントマターを取り除いた本文を返す。
 * YAMLとして不正なもの、およびYAMLの結果がオブジェクトでないもの（リストなど）は
 * フロントマターではなく本文として扱い、元のMarkdownをそのまま返す。
 */
export function stripFrontmatter(markdown: string): string {
  const match = FRONTMATTER_REGEX.exec(markdown);
  if (!match) {
    return markdown;
  }
  try {
    if (!isPlainObject(parse(match[1]))) {
      return markdown;
    }
  } catch {
    return markdown;
  }
  return markdown.slice(match[0].length);
}
