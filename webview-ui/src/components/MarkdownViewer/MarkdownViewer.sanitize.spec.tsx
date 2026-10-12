import { render } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { MarkdownViewer } from "@/components/MarkdownViewer";

vi.mock("@/utilities/vscode", () => ({
  vscode: {
    postMessage: vi.fn(),
  },
}));

vi.mock("mermaid", () => ({
  default: {
    initialize: vi.fn(),
    render: vi.fn().mockResolvedValue({ svg: "<svg></svg>" }),
  },
}));

const renderMarkdown = (value: string, baseUri = "") =>
  render(<MarkdownViewer value={value} theme="light" baseUri={baseUri} />).container;

describe("MarkdownViewer: 生HTMLの無害化", () => {
  describe("危険な要素・属性の除去", () => {
    it("scriptタグが出力されないこと", () => {
      const container = renderMarkdown("<script>window.__pwned = 1</script>\n\ntext");

      expect(container.querySelector("script")).toBeNull();
    });

    it("iframe・object・embed・formが出力されないこと", () => {
      const container = renderMarkdown(
        '<iframe src="https://example.com"></iframe>\n\n<object data="x"></object>\n\n<embed src="x">\n\n<form action="x"><input name="a"></form>'
      );

      expect(container.querySelector("iframe, object, embed, form")).toBeNull();
    });

    it("イベントハンドラ属性が出力されないこと", () => {
      const container = renderMarkdown('<img src="a.png" onerror="alert(1)" onclick="alert(2)">');

      const img = container.querySelector("img");
      expect(img).toBeInTheDocument();
      expect(img?.getAttributeNames().some((name) => name.startsWith("on"))).toBe(false);
    });

    it("javascript:スキームのhrefが除去されること", () => {
      const container = renderMarkdown('<a href="javascript:alert(1)">x</a>');

      expect(container.querySelector("a")?.getAttribute("href") ?? null).toBeNull();
    });

    it("javascript:スキームのMarkdownリンクが除去されること", () => {
      const container = renderMarkdown("[x](javascript:alert(1))");

      expect(container.querySelector("a")?.getAttribute("href") ?? "").not.toMatch(/javascript/i);
    });

    it("data:スキームのhrefが除去されること", () => {
      const container = renderMarkdown('<a href="data:text/html,<script>1</script>">x</a>');

      expect(container.querySelector("a")?.getAttribute("href") ?? null).toBeNull();
    });
  });

  describe("既存の表示を維持すること", () => {
    it("class属性が保持されること", () => {
      const container = renderMarkdown('<div class="keep-me">a</div>');

      expect(container.querySelector("div.keep-me")).toBeInTheDocument();
    });

    it("style属性が保持されること", () => {
      const container = renderMarkdown('<p style="color: red;">a</p>');

      expect(container.querySelector('p[style*="color"]')).toBeInTheDocument();
    });

    it("見出しのIDがそのまま付与されること（アウトラインのリンク先と一致する）", () => {
      const container = renderMarkdown("## Hello");

      const heading = container.querySelector("h2");
      expect(heading?.id).toBeTruthy();
      expect(heading?.id.startsWith("user-content-")).toBe(false);
    });

    it("コードブロックの言語クラスが保持され、言語が判定されること", () => {
      const container = renderMarkdown("```typescript\nconst a = 1;\n```");

      expect(container.querySelector("code.hljs, code[class*='language-']")).toBeInTheDocument();
    });

    it("vscode-webviewスキームの画像が保持されること", () => {
      const container = renderMarkdown('<img src="vscode-webview://abc/a.png" alt="x">');

      expect(container.querySelector("img")).toHaveAttribute("src", "vscode-webview://abc/a.png");
    });

    it("相対パスの画像がbaseUriで解決されること", () => {
      const container = renderMarkdown("![x](a.png)", "https://base.example/dir");

      expect(container.querySelector("img")).toHaveAttribute(
        "src",
        "https://base.example/dir/a.png"
      );
    });

    it("HTMLで書いたvscode-local-fileリンクが保持されること", () => {
      const container = renderMarkdown('<a href="vscode-local-file:%2Fa%2Fb.md">x</a>');

      expect(container.querySelector("a")).toHaveAttribute("href", "vscode-local-file:%2Fa%2Fb.md");
    });

    it("タスクリストのチェックボックスが保持されること", () => {
      const container = renderMarkdown("- [x] done\n- [ ] todo");

      expect(container.querySelectorAll('input[type="checkbox"]')).toHaveLength(2);
    });

    it("テーブルの配置指定が保持されること", () => {
      const container = renderMarkdown("| a | b |\n|:-:|--:|\n| 1 | 2 |");

      expect(container.querySelectorAll("th")).toHaveLength(2);
    });

    it("脚注が描画されること", () => {
      const container = renderMarkdown("text[^1]\n\n[^1]: note");

      expect(container.querySelector("a[data-footnote-ref]")).toBeInTheDocument();
    });
  });
});
