import * as assert from "assert";
import { renderMarkdownToHtml } from "../../export/htmlExporter";

suite("htmlExporter", () => {
  suite("renderMarkdownToHtml", () => {
    test("mermaidブロックでマップに一致する画像がある場合、img要素に置換されること", () => {
      const markdown = "```mermaid\ngraph TD;\nA-->B;\n```";
      const mermaidImages = new Map<string, string>([
        ["graph TD;\nA-->B;", "data:image/png;base64,AAAA"],
      ]);

      const result = renderMarkdownToHtml(markdown, mermaidImages);

      assert.ok(result.includes('<img src="data:image/png;base64,AAAA"'));
      assert.ok(result.includes('alt="mermaid diagram"'));
      assert.ok(!result.includes('<code class="language-mermaid">'));
    });

    test("mermaidブロックだがマップに一致する画像がない場合、従来のコードブロックにフォールバックすること", () => {
      const markdown = "```mermaid\ngraph TD;\nA-->B;\n```";
      const mermaidImages = new Map<string, string>([
        ["graph TD;\nC-->D;", "data:image/png;base64,AAAA"],
      ]);

      const result = renderMarkdownToHtml(markdown, mermaidImages);

      assert.ok(result.includes('<code class="language-mermaid">'));
      assert.ok(!result.includes("<img"));
    });

    test("jsコードブロックは従来通りimg化されないこと", () => {
      const markdown = "```js\nconst a = 1;\n```";
      const mermaidImages = new Map<string, string>([
        ["const a = 1;", "data:image/png;base64,AAAA"],
      ]);

      const result = renderMarkdownToHtml(markdown, mermaidImages);

      assert.ok(result.includes('<code class="language-js">'));
      assert.ok(!result.includes("<img"));
    });

    test("mermaidImagesが未指定の場合、mermaidブロックも従来のコードブロックとして出力されること", () => {
      const markdown = "```mermaid\ngraph TD;\nA-->B;\n```";

      const result = renderMarkdownToHtml(markdown);

      assert.ok(result.includes('<code class="language-mermaid">'));
      assert.ok(!result.includes("<img"));
    });

    test("複数のmermaidブロックのうち、マップに一致するものだけがimg化されること", () => {
      const markdown = "```mermaid\ngraph TD;\nA-->B;\n```\n\n```mermaid\ngraph TD;\nC-->D;\n```";
      const mermaidImages = new Map<string, string>([
        ["graph TD;\nA-->B;", "data:image/png;base64,MATCHED"],
      ]);

      const result = renderMarkdownToHtml(markdown, mermaidImages);

      assert.ok(result.includes('<img src="data:image/png;base64,MATCHED"'));
      assert.ok(result.includes('<code class="language-mermaid">'));
    });

    test("前後に空行があるmermaidブロックでもtrim済みのコードでマップと一致すれば置換されること", () => {
      const markdown = "```mermaid\n\ngraph TD;\nA-->B;\n\n```";
      const mermaidImages = new Map<string, string>([
        ["graph TD;\nA-->B;", "data:image/png;base64,AAAA"],
      ]);

      const result = renderMarkdownToHtml(markdown, mermaidImages);

      assert.ok(result.includes('<img src="data:image/png;base64,AAAA"'));
    });

    test("infostringの大文字小文字を区別しないこと", () => {
      const markdown = "```Mermaid\ngraph TD;\nA-->B;\n```";
      const mermaidImages = new Map<string, string>([
        ["graph TD;\nA-->B;", "data:image/png;base64,AAAA"],
      ]);

      const result = renderMarkdownToHtml(markdown, mermaidImages);

      assert.ok(result.includes('<img src="data:image/png;base64,AAAA"'));
    });

    test("通常のテキストはmermaidの影響を受けず従来通り出力されること", () => {
      const markdown = "# Title\n\nSome paragraph text.";

      const result = renderMarkdownToHtml(markdown);

      assert.ok(result.includes("<h1"));
      assert.ok(result.includes("<p>Some paragraph text.</p>"));
    });
  });
});
