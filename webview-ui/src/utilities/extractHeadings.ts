import type { Heading, Root, RootContent } from "mdast";
import { toString } from "mdast-util-to-string";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import { unified } from "unified";

export type HeadingItem = {
  level: number;
  text: string;
  id: string;
};

export function generateHeadingId(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\sぁ-ゖ゠-ヿ一-龯가-힯-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+$/, "");
}

// アウトライン・Readonly表示・編集モードで同じ解釈になるよう、CommonMark + GFM のパーサを共通で使う
const markdownParser = unified().use(remarkParse).use(remarkGfm);

/** 見出しノードの表示テキスト。装飾（強調・リンク・コード）は除く。画像の代替テキストは含めない */
function headingText(node: Heading): string {
  return toString(node, { includeImageAlt: false }).trim();
}

function collectHeadingNodes(nodes: readonly RootContent[], found: Heading[]): void {
  for (const node of nodes) {
    if (node.type === "heading") {
      found.push(node);
    } else if ("children" in node) {
      collectHeadingNodes(node.children, found);
    }
  }
}

export interface OutlineHeading {
  node: Heading;
  item: HeadingItem;
}

/**
 * mdastから、アウトラインに載せる見出しを文書順に取り出す
 * - 空の見出しは含めない
 * - 同じテキストの見出しには連番付きのIDを振る
 * - HTMLで書いた見出し（<h2>）はmdast上では見出しでないため含まれない
 */
export function collectOutlineHeadings(tree: Root): OutlineHeading[] {
  const nodes: Heading[] = [];
  collectHeadingNodes(tree.children, nodes);

  const idCounts = new Map<string, number>();
  const outline: OutlineHeading[] = [];
  for (const node of nodes) {
    const text = headingText(node);
    if (text === "") {
      continue;
    }
    const baseId = generateHeadingId(text);
    const count = idCounts.get(baseId) ?? 0;
    const id = count > 0 ? `${baseId}-${count}` : baseId;
    idCounts.set(baseId, count + 1);
    outline.push({ node, item: { level: node.depth, text, id } });
  }
  return outline;
}

/** Markdownの見出しを、CommonMark（remark-parse + remark-gfm）の解釈に従って抽出する */
export function extractHeadings(markdown: string): HeadingItem[] {
  const tree = markdownParser.parse(markdown);
  return collectOutlineHeadings(tree).map(({ item }) => item);
}
