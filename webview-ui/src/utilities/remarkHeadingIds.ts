import type { Root } from "mdast";
import { collectOutlineHeadings } from "./extractHeadings";

/**
 * 見出しにアウトラインと同じIDを振るremarkプラグイン
 *
 * アウトライン（extractHeadings）と同じ関数でIDを決めるので、同じMarkdownからは必ず同じIDになる。
 * 空の見出しにはIDを振らない。HTMLで書いた見出し（<h2>）はmdast上の見出しではないため、
 * IDを振らず、連番も消費しない。
 */
export function remarkHeadingIds() {
  return (tree: Root): void => {
    for (const { node, item } of collectOutlineHeadings(tree)) {
      const data = node.data ?? {};
      node.data = { ...data, hProperties: { ...data.hProperties, id: item.id } };
    }
  };
}
