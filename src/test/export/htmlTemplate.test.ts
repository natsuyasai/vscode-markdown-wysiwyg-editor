import * as assert from "assert";
import { generateHtmlDocument, generateScopedHtmlDocument } from "../../export/htmlTemplate";

suite("htmlTemplate", () => {
  suite("generateHtmlDocument", () => {
    test("基本的なHTMLドキュメントを生成すること", () => {
      const result = generateHtmlDocument("<p>Hello</p>", "Test", "light");

      assert.ok(result.includes("<!DOCTYPE html>"));
      assert.ok(result.includes("<title>Test</title>"));
      assert.ok(result.includes('<body class="light">'));
      assert.ok(result.includes('<article class="markdown-body">'));
      assert.ok(result.includes("<p>Hello</p>"));
    });

    test("ダークテーマの場合にbodyクラスがdarkであること", () => {
      const result = generateHtmlDocument("<p>Hello</p>", "Test", "dark");

      assert.ok(result.includes('<body class="dark">'));
      assert.ok(result.includes("#1e1e1e"));
    });

    test("カスタムCSSが含まれること", () => {
      const customCss = ".custom { color: red; }";
      const result = generateHtmlDocument("<p>Hello</p>", "Test", "light", customCss);

      assert.ok(result.includes(customCss));
    });

    test("タイトルのHTMLエスケープが行われること", () => {
      const result = generateHtmlDocument("<p>Hello</p>", '<script>alert("xss")</script>', "light");

      assert.ok(!result.includes('<script>alert("xss")</script>'));
      assert.ok(result.includes("&lt;script&gt;"));
    });
  });

  suite("generateScopedHtmlDocument", () => {
    suite("CSSスコーピング方式 (useShadowDom: false)", () => {
      test("mwe-contentコンテナでラップされること", () => {
        const result = generateScopedHtmlDocument("<p>Hello</p>", "Test", "light", false);

        assert.ok(result.includes('<div class="mwe-content">'));
        assert.ok(result.includes('<article class="markdown-body">'));
        assert.ok(result.includes("<p>Hello</p>"));
      });

      test("CSSセレクタが.mwe-contentでスコープ化されること", () => {
        const result = generateScopedHtmlDocument("<p>Hello</p>", "Test", "light", false);

        assert.ok(result.includes(".mwe-content {"));
        assert.ok(result.includes(".mwe-content .markdown-body"));
        assert.ok(result.includes(".mwe-content h1"));
        assert.ok(result.includes(".mwe-content a"));
      });

      test("all: initialが.mwe-contentに適用されること", () => {
        const result = generateScopedHtmlDocument("<p>Hello</p>", "Test", "light", false);

        assert.ok(result.includes("all: initial;"));
      });

      test("box-sizingリセットが含まれること", () => {
        const result = generateScopedHtmlDocument("<p>Hello</p>", "Test", "light", false);

        assert.ok(result.includes(".mwe-content *"));
        assert.ok(result.includes("box-sizing: border-box;"));
      });

      test("bodyクラスが付与されないこと", () => {
        const result = generateScopedHtmlDocument("<p>Hello</p>", "Test", "light", false);

        assert.ok(!result.includes('class="light"'));
        assert.ok(!result.includes('class="dark"'));
      });

      test("ダークテーマのカラーが使用されること", () => {
        const result = generateScopedHtmlDocument("<p>Hello</p>", "Test", "dark", false);

        assert.ok(result.includes("#1e1e1e"));
        assert.ok(result.includes("#d4d4d4"));
      });

      test("カスタムCSSが含まれること", () => {
        const customCss = ".custom { color: red; }";
        const result = generateScopedHtmlDocument(
          "<p>Hello</p>",
          "Test",
          "light",
          false,
          customCss
        );

        assert.ok(result.includes(customCss));
      });
    });

    suite("Shadow DOM方式 (useShadowDom: true)", () => {
      test("Shadow DOMのテンプレートとスクリプトが含まれること", () => {
        const result = generateScopedHtmlDocument("<p>Hello</p>", "Test", "light", true);

        assert.ok(result.includes('<div id="mwe-shadow-host">'));
        assert.ok(result.includes('<template id="mwe-template">'));
        assert.ok(result.includes("attachShadow"));
        assert.ok(result.includes("cloneNode(true)"));
      });

      test(":hostセレクタが使用されること", () => {
        const result = generateScopedHtmlDocument("<p>Hello</p>", "Test", "light", true);

        assert.ok(result.includes(":host {"));
        assert.ok(result.includes("all: initial;"));
        assert.ok(result.includes("display: block;"));
      });

      test(".mwe-contentコンテナが使用されないこと", () => {
        const result = generateScopedHtmlDocument("<p>Hello</p>", "Test", "light", true);

        assert.ok(!result.includes('class="mwe-content"'));
      });

      test("コンテンツがテンプレート内に配置されること", () => {
        const result = generateScopedHtmlDocument("<p>Hello</p>", "Test", "light", true);

        const templateStart = result.indexOf("<template");
        const templateEnd = result.indexOf("</template>");
        const templateContent = result.substring(templateStart, templateEnd);
        assert.ok(templateContent.includes("<p>Hello</p>"));
        assert.ok(templateContent.includes('<article class="markdown-body">'));
      });

      test("ダークテーマのカラーが使用されること", () => {
        const result = generateScopedHtmlDocument("<p>Hello</p>", "Test", "dark", true);

        assert.ok(result.includes("#1e1e1e"));
        assert.ok(result.includes("#d4d4d4"));
      });

      test("カスタムCSSが含まれること", () => {
        const customCss = ".custom { color: red; }";
        const result = generateScopedHtmlDocument("<p>Hello</p>", "Test", "light", true, customCss);

        assert.ok(result.includes(customCss));
      });
    });

    test("タイトルのHTMLエスケープが行われること", () => {
      const result = generateScopedHtmlDocument(
        "<p>Hello</p>",
        '<script>alert("xss")</script>',
        "light",
        false
      );

      assert.ok(!result.includes("<title><script>"));
      assert.ok(result.includes("&lt;script&gt;"));
    });
  });
});
