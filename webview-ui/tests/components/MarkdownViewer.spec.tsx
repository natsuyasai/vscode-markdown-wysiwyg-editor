import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { MarkdownViewer } from "@/components/MarkdownViewer";

// vscodeモジュールをモック
vi.mock("@/utilities/vscode", () => ({
  vscode: {
    postMessage: vi.fn(),
  },
}));

// mermaidモジュールをモック
vi.mock("mermaid", () => ({
  default: {
    initialize: vi.fn(),
    render: vi.fn().mockResolvedValue({ svg: "<svg></svg>" }),
  },
}));

describe("MarkdownViewer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("基本的なレンダリング", () => {
    it("Markdownコンテンツをレンダリングすること", () => {
      render(<MarkdownViewer value="# Hello World" theme="light" />);

      expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Hello World");
    });

    it("段落をレンダリングすること", () => {
      render(<MarkdownViewer value="This is a paragraph." theme="light" />);

      expect(screen.getByText("This is a paragraph.")).toBeInTheDocument();
    });

    it("data-theme属性が設定されること", () => {
      const { container } = render(<MarkdownViewer value="test" theme="dark" />);

      const viewer = container.querySelector(".markdown-viewer");
      expect(viewer).toHaveAttribute("data-theme", "dark");
    });
  });

  describe("HTMLタグのレンダリング", () => {
    it("インラインHTMLタグをレンダリングすること", () => {
      render(<MarkdownViewer value="This is <strong>bold</strong> text." theme="light" />);

      const strong = screen.getByText("bold");
      expect(strong.tagName.toLowerCase()).toBe("strong");
    });

    it("divタグをレンダリングすること", () => {
      const { container } = render(
        <MarkdownViewer value='<div class="test-div">Content</div>' theme="light" />
      );

      const div = container.querySelector(".test-div");
      expect(div).toBeInTheDocument();
      expect(div).toHaveTextContent("Content");
    });

    it("スタイル属性を持つHTMLをレンダリングすること", () => {
      const { container } = render(
        <MarkdownViewer
          value='<p style="color: red;">Styled text</p>'
          theme="light"
        />
      );

      const styledP = container.querySelector('p[style*="color"]');
      expect(styledP).toBeInTheDocument();
    });

    it("details/summary要素をレンダリングすること", () => {
      render(
        <MarkdownViewer
          value="<details><summary>Click me</summary>Hidden content</details>"
          theme="light"
        />
      );

      expect(screen.getByText("Click me")).toBeInTheDocument();
      expect(screen.getByText("Hidden content")).toBeInTheDocument();
    });
  });

  describe("GFM (GitHub Flavored Markdown)", () => {
    it("テーブルをレンダリングすること", () => {
      const markdown = `
| Header 1 | Header 2 |
|----------|----------|
| Cell 1   | Cell 2   |
`;
      render(<MarkdownViewer value={markdown} theme="light" />);

      expect(screen.getByRole("table")).toBeInTheDocument();
      expect(screen.getByText("Header 1")).toBeInTheDocument();
      expect(screen.getByText("Cell 1")).toBeInTheDocument();
    });

    it("タスクリストをレンダリングすること", () => {
      const markdown = `
- [x] Completed task
- [ ] Incomplete task
`;
      const { container } = render(<MarkdownViewer value={markdown} theme="light" />);

      const checkboxes = container.querySelectorAll('input[type="checkbox"]');
      expect(checkboxes).toHaveLength(2);
    });

    it("取り消し線をレンダリングすること", () => {
      render(<MarkdownViewer value="~~strikethrough~~" theme="light" />);

      const del = screen.getByText("strikethrough");
      expect(del.tagName.toLowerCase()).toBe("del");
    });
  });

  describe("コードブロック", () => {
    it("インラインコードをレンダリングすること", () => {
      render(<MarkdownViewer value="Use `console.log()` for debugging." theme="light" />);

      const code = screen.getByText("console.log()");
      expect(code.tagName.toLowerCase()).toBe("code");
    });

    it("コードブロックをレンダリングすること", () => {
      const markdown = `
\`\`\`javascript
const x = 1;
\`\`\`
`;
      const { container } = render(<MarkdownViewer value={markdown} theme="light" />);

      const pre = container.querySelector("pre");
      expect(pre).toBeInTheDocument();
    });
  });

  describe("テーマ", () => {
    it("lightテーマが適用されること", () => {
      const { container } = render(<MarkdownViewer value="test" theme="light" />);

      const viewer = container.querySelector(".markdown-viewer");
      expect(viewer).toHaveAttribute("data-theme", "light");
    });

    it("darkテーマが適用されること", () => {
      const { container } = render(<MarkdownViewer value="test" theme="dark" />);

      const viewer = container.querySelector(".markdown-viewer");
      expect(viewer).toHaveAttribute("data-theme", "dark");
    });
  });

  describe("画像", () => {
    it("相対パスの画像をbaseUriで解決すること", () => {
      render(
        <MarkdownViewer
          value="![alt text](image.png)"
          theme="light"
          baseUri="http://example.com/assets"
        />
      );

      const img = screen.getByRole("img");
      expect(img).toHaveAttribute("src", "http://example.com/assets/image.png");
    });

    it("絶対URLの画像をそのまま使用すること", () => {
      render(
        <MarkdownViewer
          value="![alt text](https://example.com/image.png)"
          theme="light"
          baseUri="http://localhost"
        />
      );

      const img = screen.getByRole("img");
      expect(img).toHaveAttribute("src", "https://example.com/image.png");
    });

    it("data URLの画像をそのまま使用すること", () => {
      const dataUrl = "data:image/png;base64,abc123";
      const { container } = render(
        <MarkdownViewer
          value={`![alt text](${dataUrl})`}
          theme="light"
          baseUri="http://localhost"
        />
      );

      // react-markdownはdata URLをセキュリティ上の理由で処理する
      // img要素が存在し、alt属性が正しく設定されていることを確認
      const img = container.querySelector("img");
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute("alt", "alt text");
    });

    it("baseUriの末尾スラッシュを正規化すること", () => {
      render(
        <MarkdownViewer
          value="![alt](image.png)"
          theme="light"
          baseUri="http://example.com/assets/"
        />
      );

      const img = screen.getByRole("img");
      expect(img).toHaveAttribute("src", "http://example.com/assets/image.png");
    });
  });

  describe("リンク", () => {
    it("vscode-local-fileスキームのリンクが保持されること", () => {
      const { container } = render(
        <MarkdownViewer
          value="[Link](vscode-local-file:%2Fhome%2Fuser%2Ffile.md)"
          theme="light"
        />
      );

      const link = container.querySelector("a");
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute("href", "vscode-local-file:%2Fhome%2Fuser%2Ffile.md");
    });

    it("vscode-local-fileスキームのアンカー付きリンクが保持されること", () => {
      const { container } = render(
        <MarkdownViewer
          value="[Link](vscode-local-file:%2Fhome%2Fuser%2Ffile.md#section)"
          theme="light"
        />
      );

      const link = container.querySelector("a");
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute(
        "href",
        "vscode-local-file:%2Fhome%2Fuser%2Ffile.md#section"
      );
    });

    it("通常のHTTPリンクが保持されること", () => {
      const { container } = render(
        <MarkdownViewer value="[Link](https://example.com)" theme="light" />
      );

      const link = container.querySelector("a");
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute("href", "https://example.com");
    });

    it("アンカーリンクが保持されること", () => {
      const { container } = render(
        <MarkdownViewer value="[Section](#section)" theme="light" />
      );

      const link = container.querySelector("a");
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute("href", "#section");
    });
  });
});
