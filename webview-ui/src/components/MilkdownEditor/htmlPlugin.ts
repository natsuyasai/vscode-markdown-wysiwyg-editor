import type { Ctx } from "@milkdown/kit/ctx";
import type { Node } from "@milkdown/kit/prose/model";
import { $nodeSchema } from "@milkdown/utils";

// CommonMark仕様に基づくブロックレベルHTML要素
// https://spec.commonmark.org/0.31.2/#html-blocks
const BLOCK_TAGS = new Set([
  // CommonMark Type 6: 標準ブロック要素
  "address",
  "article",
  "aside",
  "base",
  "basefont",
  "blockquote",
  "body",
  "caption",
  "center",
  "col",
  "colgroup",
  "dd",
  "details",
  "dialog",
  "dir",
  "div",
  "dl",
  "dt",
  "fieldset",
  "figcaption",
  "figure",
  "footer",
  "form",
  "frame",
  "frameset",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "head",
  "header",
  "hr",
  "html",
  "iframe",
  "legend",
  "li",
  "link",
  "main",
  "menu",
  "menuitem",
  "nav",
  "noframes",
  "ol",
  "optgroup",
  "option",
  "p",
  "param",
  "search",
  "section",
  "summary",
  "table",
  "tbody",
  "td",
  "tfoot",
  "th",
  "thead",
  "title",
  "tr",
  "track",
  "ul",
  // CommonMark Type 1: script, pre, style, textarea
  "pre",
  "script",
  "style",
  "textarea",
]);

// HTMLタグ名を抽出する正規表現
const TAG_NAME_REGEX = /^<\/?([a-zA-Z][a-zA-Z0-9-]*)/;

// HTMLがブロックレベルかどうかを判定
function isBlockHtml(html: string): boolean {
  const trimmed = html.trim();

  // タグ名を抽出
  const match = trimmed.match(TAG_NAME_REGEX);
  if (match) {
    const tagName = match[1].toLowerCase();
    if (BLOCK_TAGS.has(tagName)) {
      return true;
    }
  }

  // HTMLコメント
  if (trimmed.startsWith("<!--")) {
    return true;
  }

  // 処理命令
  if (trimmed.startsWith("<?")) {
    return true;
  }

  // DOCTYPE
  if (trimmed.toLowerCase().startsWith("<!doctype")) {
    return true;
  }

  // CDATA
  if (trimmed.startsWith("<![CDATA[")) {
    return true;
  }

  // 改行を含む場合もブロックとして扱う
  return html.includes("\n");
}

// HTMLをプレーンテキストとして表示するDOM要素を作成する
// 編集モードでは、HTMLタグをそのまま文字列として表示
function createHtmlElement(html: string, forceBlock: boolean): HTMLElement {
  const isBlock = forceBlock || isBlockHtml(html);
  const container = isBlock ? document.createElement("div") : document.createElement("span");

  container.setAttribute("data-type", "html");
  container.setAttribute("data-value", html);

  if (isBlock) {
    container.style.display = "block";
  }

  // HTMLタグをプレーンテキストとして表示
  container.textContent = html;

  return container;
}

// 統一HTMLスキーマ - すべてのHTMLを処理
// インラインとして定義するが、ブロックレベルHTMLはdisplay:blockでレンダリング
export const htmlSchema = $nodeSchema("html", (_ctx: Ctx) => {
  return {
    atom: true,
    group: "inline",
    inline: true,
    attrs: {
      value: {
        default: "",
      },
    },
    toDOM: (node: Node) => {
      const value = node.attrs.value as string;
      return createHtmlElement(value, false);
    },
    parseDOM: [
      {
        tag: 'span[data-type="html"]',
        getAttrs: (dom: HTMLElement) => {
          return {
            value: dom.getAttribute("data-value") ?? "",
          };
        },
      },
      {
        tag: 'div[data-type="html"]',
        getAttrs: (dom: HTMLElement) => {
          return {
            value: dom.getAttribute("data-value") ?? "",
          };
        },
      },
    ],
    parseMarkdown: {
      match: ({ type }) => type === "html",
      runner: (state, node, type) => {
        state.addNode(type, { value: node.value as string });
      },
    },
    toMarkdown: {
      match: (node) => node.type.name === "html",
      runner: (state, node) => {
        state.addNode("html", undefined, node.attrs.value as string);
      },
    },
  };
});

// htmlBlockSchemaは互換性のために残すが、実際にはhtmlSchemaで処理
// 古いドキュメントとの互換性のため
export const htmlBlockSchema = $nodeSchema("html_block", (_ctx: Ctx) => {
  return {
    atom: true,
    group: "inline", // block から inline に変更して paragraph 内でも使用可能に
    inline: true,
    attrs: {
      value: {
        default: "",
      },
    },
    toDOM: (node: Node) => {
      const value = node.attrs.value as string;
      return createHtmlElement(value, true);
    },
    parseDOM: [
      {
        tag: 'div[data-type="html_block"]',
        getAttrs: (dom: HTMLElement) => {
          return {
            value: dom.getAttribute("data-value") ?? "",
          };
        },
      },
    ],
    parseMarkdown: {
      // このスキーマはマッチしない（すべてhtmlSchemaで処理）
      match: () => false,
      runner: (state, node, type) => {
        state.addNode(type, { value: node.value as string });
      },
    },
    toMarkdown: {
      match: (node) => node.type.name === "html_block",
      runner: (state, node) => {
        state.addNode("html", undefined, node.attrs.value as string);
      },
    },
  };
});
