import * as assert from "assert";
import {
  buildMermaidImageMap,
  buildPlantUmlImageMap,
  renderMarkdownToHtml,
} from "../../export/htmlExporter";

suite("htmlExporter", () => {
  suite("buildMermaidImageMap", () => {
    test("imagesがundefinedの場合、undefinedを返すこと", () => {
      const result = buildMermaidImageMap(undefined);

      assert.strictEqual(result, undefined);
    });

    test("imagesが空配列の場合、undefinedを返すこと", () => {
      const result = buildMermaidImageMap([]);

      assert.strictEqual(result, undefined);
    });

    test("複数要素がある場合、各codeのtrim済み文字列をキーとしたMapを返すこと", () => {
      const result = buildMermaidImageMap([
        { code: "graph TD;\nA-->B;", dataUri: "data:image/png;base64,AAAA" },
        { code: "graph TD;\nC-->D;", dataUri: "data:image/png;base64,BBBB" },
      ]);

      assert.ok(result instanceof Map);
      assert.strictEqual(result.size, 2);
      assert.strictEqual(result.get("graph TD;\nA-->B;"), "data:image/png;base64,AAAA");
      assert.strictEqual(result.get("graph TD;\nC-->D;"), "data:image/png;base64,BBBB");
    });

    test("前後に空白があるcodeの場合、trimされたキーで格納されること", () => {
      const result = buildMermaidImageMap([
        { code: "  \ngraph TD;\nA-->B;\n  ", dataUri: "data:image/png;base64,AAAA" },
      ]);

      assert.ok(result instanceof Map);
      assert.strictEqual(result.size, 1);
      assert.strictEqual(result.get("graph TD;\nA-->B;"), "data:image/png;base64,AAAA");
      assert.strictEqual(result.get("  \ngraph TD;\nA-->B;\n  "), undefined);
    });

    test("同一trimキーが重複した場合、後勝ちで格納されること", () => {
      const result = buildMermaidImageMap([
        { code: "graph TD;\nA-->B;", dataUri: "data:image/png;base64,OLD" },
        { code: "  graph TD;\nA-->B;  ", dataUri: "data:image/png;base64,NEW" },
      ]);

      assert.ok(result instanceof Map);
      assert.strictEqual(result.size, 1);
      assert.strictEqual(result.get("graph TD;\nA-->B;"), "data:image/png;base64,NEW");
    });
  });

  suite("buildPlantUmlImageMap", () => {
    test("imagesが未指定または空配列の場合、undefinedを返すこと", () => {
      assert.strictEqual(buildPlantUmlImageMap(undefined), undefined);
      assert.strictEqual(buildPlantUmlImageMap([]), undefined);
    });

    test("コードをtrimしたキーでMapへ変換すること", () => {
      const result = buildPlantUmlImageMap([
        { code: "  @startuml\nA -> B\n@enduml\n", dataUri: "data:image/png;base64,AAAA" },
      ]);

      assert.strictEqual(result?.get("@startuml\nA -> B\n@enduml"), "data:image/png;base64,AAAA");
    });
  });

  suite("renderMarkdownToHtml (PlantUML)", () => {
    const code = "@startuml\nA -> B\n@enduml";
    const markdown = "```plantuml\n" + code + "\n```";

    test("plantumlブロックでマップに一致する画像がある場合、img要素に置換されること", () => {
      const plantUmlImages = new Map<string, string>([[code, "data:image/png;base64,BBBB"]]);

      const result = renderMarkdownToHtml(markdown, undefined, undefined, plantUmlImages);

      assert.ok(result.includes('<img src="data:image/png;base64,BBBB"'));
      assert.ok(result.includes('alt="plantuml diagram"'));
      assert.ok(!result.includes("language-plantuml"));
    });

    test("一致する画像がない場合、従来のコードブロックにフォールバックすること", () => {
      const plantUmlImages = new Map<string, string>([["other", "data:image/png;base64,BBBB"]]);

      const result = renderMarkdownToHtml(markdown, undefined, undefined, plantUmlImages);

      assert.ok(result.includes('<code class="language-plantuml">'));
      assert.ok(!result.includes("<img"));
    });

    test("plantUmlImagesが未指定の場合、従来のコードブロックとして出力されること", () => {
      const result = renderMarkdownToHtml(markdown);

      assert.ok(result.includes('<code class="language-plantuml">'));
    });

    test("MermaidとPlantUMLの画像が混在しても、それぞれ対応する画像に置換されること", () => {
      const both = markdown + "\n\n```mermaid\ngraph TD;A-->B;\n```";
      const mermaidImages = new Map<string, string>([
        ["graph TD;A-->B;", "data:image/png;base64,MMMM"],
      ]);
      const plantUmlImages = new Map<string, string>([[code, "data:image/png;base64,PPPP"]]);

      const result = renderMarkdownToHtml(both, mermaidImages, undefined, plantUmlImages);

      assert.ok(result.includes("data:image/png;base64,MMMM"));
      assert.ok(result.includes("data:image/png;base64,PPPP"));
    });
  });

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

  /**
   * 特性テスト（characterization test）。
   * markedの更新でエクスポートHTMLの出力が変わらないことを確認する。期待値は現行（marked 18.0）の出力を固定したもの。
   */
  suite("renderMarkdownToHtml（markedの出力の特性）", () => {
    const cases: Array<{ name: string; markdown: string; html: string }> = [
      {
        name: "ATX見出し・Setext見出し・見出し内の強調",
        markdown: "# H1\n\n## H2 *em*\n\nSetext\n===",
        html: "<h1>H1</h1>\n<h2>H2 <em>em</em></h2>\n<h1>Setext</h1>\n",
      },
      {
        name: "ネストした箇条書きと番号付きリスト",
        markdown: "- a\n- b\n  - c\n\n1. one\n2. two",
        html: "<ul>\n<li>a</li>\n<li>b<ul>\n<li>c</li>\n</ul>\n</li>\n</ul>\n<ol>\n<li>one</li>\n<li>two</li>\n</ol>\n",
      },
      {
        name: "配置指定付きのGFMテーブル",
        markdown: "| L | C | R |\n|:--|:-:|--:|\n| 1 | 2 | 3 |",
        html:
          '<table>\n<thead>\n<tr>\n<th align="left">L</th>\n<th align="center">C</th>\n<th align="right">R</th>\n</tr>\n</thead>\n' +
          '<tbody><tr>\n<td align="left">1</td>\n<td align="center">2</td>\n<td align="right">3</td>\n</tr>\n</tbody></table>\n',
      },
      {
        name: "言語指定付きコードブロック（HTMLエスケープ）",
        markdown: '```ts\nconst a = 1 < 2 && "x";\n```',
        html: '<pre><code class="language-ts">const a = 1 &lt; 2 &amp;&amp; &quot;x&quot;;\n</code></pre>\n',
      },
      {
        name: "タイトル付きリンクとURLの自動リンク",
        markdown: '[text](https://example.com "title") and https://example.org',
        html: '<p><a href="https://example.com" title="title">text</a> and <a href="https://example.org">https://example.org</a></p>\n',
      },
      {
        name: "取り消し線・太字・斜体・インラインコード",
        markdown: "~~del~~ **bold** *em* `code`",
        html: "<p><del>del</del> <strong>bold</strong> <em>em</em> <code>code</code></p>\n",
      },
      {
        name: "タスクリスト",
        markdown: "- [ ] todo\n- [x] done",
        html: '<ul>\n<li><input disabled="" type="checkbox"> todo</li>\n<li><input checked="" disabled="" type="checkbox"> done</li>\n</ul>\n',
      },
      {
        name: "引用・水平線・生HTML",
        markdown: "> quote\n\n---\n\n<div>raw</div>",
        html: "<blockquote>\n<p>quote</p>\n</blockquote>\n<hr>\n<div>raw</div>",
      },
    ];

    for (const { name, markdown, html } of cases) {
      test(`${name}が既知のHTMLに変換されること`, () => {
        assert.strictEqual(renderMarkdownToHtml(markdown), html);
      });
    }
  });
});
