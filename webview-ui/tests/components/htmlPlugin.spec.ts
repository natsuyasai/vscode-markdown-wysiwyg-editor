import { describe, it, expect } from "vitest";

// htmlPlugin.tsから関数をテストするために、同じロジックをテスト用に再実装
// 実際のプラグインはMilkdownと統合されているため、ロジックのユニットテストを行う

// CommonMark仕様に基づくブロックレベルHTML要素
const BLOCK_TAGS = new Set([
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

  const match = trimmed.match(TAG_NAME_REGEX);
  if (match) {
    const tagName = match[1].toLowerCase();
    if (BLOCK_TAGS.has(tagName)) {
      return true;
    }
  }

  if (trimmed.startsWith("<!--")) {
    return true;
  }

  if (trimmed.startsWith("<?")) {
    return true;
  }

  if (trimmed.toLowerCase().startsWith("<!doctype")) {
    return true;
  }

  if (trimmed.startsWith("<![CDATA[")) {
    return true;
  }

  return html.includes("\n");
}

// HTMLをプレーンテキストとして表示するDOM要素を作成する
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

describe("htmlPlugin", () => {
  describe("isBlockHtml", () => {
    it("divタグをブロックレベルと判定すること", () => {
      expect(isBlockHtml("<div>content</div>")).toBe(true);
    });

    it("spanタグをインラインと判定すること", () => {
      expect(isBlockHtml("<span>content</span>")).toBe(false);
    });

    it("strongタグをインラインと判定すること", () => {
      expect(isBlockHtml("<strong>bold</strong>")).toBe(false);
    });

    it("emタグをインラインと判定すること", () => {
      expect(isBlockHtml("<em>italic</em>")).toBe(false);
    });

    it("tableタグをブロックレベルと判定すること", () => {
      expect(isBlockHtml("<table><tr><td>cell</td></tr></table>")).toBe(true);
    });

    it("HTMLコメントをブロックレベルと判定すること", () => {
      expect(isBlockHtml("<!-- comment -->")).toBe(true);
    });

    it("DOCTYPEをブロックレベルと判定すること", () => {
      expect(isBlockHtml("<!DOCTYPE html>")).toBe(true);
    });

    it("処理命令をブロックレベルと判定すること", () => {
      expect(isBlockHtml("<?xml version='1.0'?>")).toBe(true);
    });

    it("CDATAをブロックレベルと判定すること", () => {
      expect(isBlockHtml("<![CDATA[some data]]>")).toBe(true);
    });

    it("改行を含むHTMLをブロックレベルと判定すること", () => {
      expect(isBlockHtml("<span>line1\nline2</span>")).toBe(true);
    });

    it("閉じタグでもタグ名を正しく抽出すること", () => {
      expect(isBlockHtml("</div>")).toBe(true);
    });

    it("h1-h6タグをブロックレベルと判定すること", () => {
      expect(isBlockHtml("<h1>heading</h1>")).toBe(true);
      expect(isBlockHtml("<h2>heading</h2>")).toBe(true);
      expect(isBlockHtml("<h3>heading</h3>")).toBe(true);
      expect(isBlockHtml("<h4>heading</h4>")).toBe(true);
      expect(isBlockHtml("<h5>heading</h5>")).toBe(true);
      expect(isBlockHtml("<h6>heading</h6>")).toBe(true);
    });

    it("pタグをブロックレベルと判定すること", () => {
      expect(isBlockHtml("<p>paragraph</p>")).toBe(true);
    });

    it("ulタグをブロックレベルと判定すること", () => {
      expect(isBlockHtml("<ul><li>item</li></ul>")).toBe(true);
    });

    it("olタグをブロックレベルと判定すること", () => {
      expect(isBlockHtml("<ol><li>item</li></ol>")).toBe(true);
    });

    it("blockquoteタグをブロックレベルと判定すること", () => {
      expect(isBlockHtml("<blockquote>quote</blockquote>")).toBe(true);
    });

    it("preタグをブロックレベルと判定すること", () => {
      expect(isBlockHtml("<pre>code</pre>")).toBe(true);
    });
  });

  describe("createHtmlElement", () => {
    it("HTMLをプレーンテキストとして表示するspan要素を作成すること", () => {
      const element = createHtmlElement("<strong>bold</strong>", false);

      expect(element.tagName.toLowerCase()).toBe("span");
      expect(element.textContent).toBe("<strong>bold</strong>");
    });

    it("ブロックHTMLに対してdiv要素を作成すること", () => {
      const element = createHtmlElement("<div>content</div>", false);

      expect(element.tagName.toLowerCase()).toBe("div");
      expect(element.textContent).toBe("<div>content</div>");
    });

    it("forceBlock=trueでdiv要素を作成すること", () => {
      const element = createHtmlElement("<span>inline</span>", true);

      expect(element.tagName.toLowerCase()).toBe("div");
      expect(element.style.display).toBe("block");
    });

    it("data-type属性が設定されること", () => {
      const element = createHtmlElement("<em>text</em>", false);

      expect(element.getAttribute("data-type")).toBe("html");
    });

    it("data-value属性に元のHTMLが保存されること", () => {
      const html = "<em>text</em>";
      const element = createHtmlElement(html, false);

      expect(element.getAttribute("data-value")).toBe(html);
    });

    it("ブロック要素にdisplay:blockが設定されること", () => {
      const element = createHtmlElement("<div>block</div>", false);

      expect(element.style.display).toBe("block");
    });

    it("インライン要素にdisplay:blockが設定されないこと", () => {
      const element = createHtmlElement("<span>inline</span>", false);

      expect(element.style.display).not.toBe("block");
    });

    it("複雑なHTMLもプレーンテキストとして表示すること", () => {
      const html = '<div style="color: red;"><p>nested</p></div>';
      const element = createHtmlElement(html, false);

      expect(element.textContent).toBe(html);
      // 子要素がテキストノードのみであることを確認
      expect(element.children.length).toBe(0);
    });

    it("HTMLコメントもプレーンテキストとして表示すること", () => {
      const html = "<!-- this is a comment -->";
      const element = createHtmlElement(html, false);

      expect(element.textContent).toBe(html);
    });

    it("空のHTMLも処理できること", () => {
      const element = createHtmlElement("", false);

      expect(element.textContent).toBe("");
      expect(element.getAttribute("data-value")).toBe("");
    });
  });
});
