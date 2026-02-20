import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within, waitFor } from "storybook/test";
import { MarkdownViewer } from "@/components/MarkdownViewer";

const meta: Meta<typeof MarkdownViewer> = {
  title: "Components/MarkdownViewer",
  component: MarkdownViewer,
  parameters: {
    layout: "fullscreen",
  },
  decorators: [
    (Story) => (
      <div style={{ height: "100vh", width: "100vw" }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof MarkdownViewer>;

// HTMLタグを含むMarkdown
const htmlMarkdown = `# HTMLタグのテスト

## インラインHTML

これは<strong>太字</strong>のテキストです。

これは<em>イタリック</em>のテキストです。

これは<u>下線</u>のテキストです。

これは<s>取り消し線</s>のテキストです。

## ブロックHTML

<div style="background-color: #f0f0f0; padding: 10px; border-radius: 5px;">
これはdivブロックの中のテキストです。
</div>

<p style="text-align: center;">中央揃えの段落</p>

## 折りたたみ要素

<details>
<summary>クリックで展開</summary>
これは折りたたまれたコンテンツです。
</details>

## 水平線

<hr>

上と下のセクション

## コメント
<!-- これはコメントです -->
`;

// Mermaidコードブロックを含むMarkdown
const mermaidMarkdown = `# Mermaid Diagram Test

This is a test document with a Mermaid diagram.

\`\`\`mermaid
graph TD;
    A-->B;
    A-->C;
    B-->D;
    C-->D;
\`\`\`

## Another Section

Some text after the diagram.
`;

// PlantUMLコードブロックを含むMarkdown
const plantUmlMarkdown = `# PlantUML Diagram Test

This is a test document with a PlantUML diagram.

\`\`\`plantuml
@startuml
Alice -> Bob: Hello
Bob --> Alice: Hi!
@enduml
\`\`\`

## Another Section

Some text after the diagram.
`;

// 総合的なMarkdownサンプル
const comprehensiveMarkdown = `# Markdown総合サンプル (閲覧モード)

このドキュメントはMarkdownの主要な機能を閲覧モードで表示しています。

## 見出しとテキスト

### サブセクション

通常の段落テキストです。**太字**、*イタリック*、~~取り消し線~~を含みます。

## リスト

- 項目1
- 項目2
  - ネストした項目
- 項目3

1. 番号付き項目1
2. 番号付き項目2

## コードと引用

インラインコード: \`const x = 42;\`

\`\`\`javascript
// コードブロック
function hello() {
  return "world";
}
\`\`\`

> 引用文はこのように表示されます。

## テーブル

| 列1 | 列2 | 列3 |
|-----|-----|-----|
| A | B | C |
| 1 | 2 | 3 |

## タスクリスト

- [x] 完了タスク
- [ ] 未完了タスク

---

*以上がMarkdownの主要機能です。*
`;

// MarkdownViewerラッパー
function MarkdownViewerWrapper({ value, theme }: { value: string; theme: "light" | "dark" }) {
  return (
    <div
      data-theme={theme}
      style={{ height: "100%", background: theme === "dark" ? "#1a1a1a" : "#ffffff" }}
    >
      <MarkdownViewer value={value} theme={theme} />
    </div>
  );
}

export const HtmlTagsLight: Story = {
  render: () => <MarkdownViewerWrapper value={htmlMarkdown} theme="light" />,
  name: "HTMLタグ描画 - Light",
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // 見出しが描画されていることを確認（アウトラインリンクと区別するためh1要素を指定）
    await waitFor(async () => {
      await expect(canvas.getAllByText("HTMLタグのテスト")[0]).toBeInTheDocument();
    });

    // strong要素（太字）がレンダリングされていることを確認
    const boldText = canvas.getByText("太字");
    await expect(boldText.tagName.toLowerCase()).toBe("strong");

    // em要素（イタリック）がレンダリングされていることを確認
    const italicText = canvas.getByText("イタリック");
    await expect(italicText.tagName.toLowerCase()).toBe("em");

    // 折りたたみ要素（details/summary）が存在することを確認
    await expect(canvas.getByText("クリックで展開")).toBeInTheDocument();

    // ブロック内のテキストが表示されていることを確認
    await expect(canvas.getByText("これはdivブロックの中のテキストです。")).toBeInTheDocument();
    await expect(canvas.getByText("中央揃えの段落")).toBeInTheDocument();
  },
};

export const HtmlTagsDark: Story = {
  render: () => <MarkdownViewerWrapper value={htmlMarkdown} theme="dark" />,
  name: "HTMLタグ描画 - Dark",
};

export const MermaidLight: Story = {
  render: () => <MarkdownViewerWrapper value={mermaidMarkdown} theme="light" />,
  name: "Mermaid - Light Theme",
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // 見出しが描画されていることを確認（アウトラインリンクと区別するためh1要素を指定）
    await waitFor(async () => {
      await expect(canvas.getAllByText("Mermaid Diagram Test")[0]).toBeInTheDocument();
    });

    // ダイアグラム以外のテキストが存在することを確認（アウトラインリンクと区別するためgetAllByTextを使用）
    await expect(
      canvas.getByText("This is a test document with a Mermaid diagram.")
    ).toBeInTheDocument();
    await expect(canvas.getAllByText("Another Section")[0]).toBeInTheDocument();
    await expect(canvas.getByText("Some text after the diagram.")).toBeInTheDocument();

    // MermaidのSVGが非同期でレンダリングされることを確認
    await waitFor(
      async () => {
        const svgElements = canvasElement.querySelectorAll("svg");
        await expect(svgElements.length).toBeGreaterThan(0);
      },
      { timeout: 5000 }
    );
  },
};

export const MermaidDark: Story = {
  render: () => <MarkdownViewerWrapper value={mermaidMarkdown} theme="dark" />,
  name: "Mermaid - Dark Theme",
};

export const PlantUmlLight: Story = {
  render: () => <MarkdownViewerWrapper value={plantUmlMarkdown} theme="light" />,
  name: "PlantUML - Light Theme",
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // 見出しとテキストが描画されていることを確認（アウトラインリンクと区別するためgetAllByTextを使用）
    await waitFor(async () => {
      await expect(canvas.getAllByText("PlantUML Diagram Test")[0]).toBeInTheDocument();
    });

    await expect(canvas.getAllByText("Another Section")[0]).toBeInTheDocument();
    await expect(canvas.getByText("Some text after the diagram.")).toBeInTheDocument();
  },
};

export const PlantUmlDark: Story = {
  render: () => <MarkdownViewerWrapper value={plantUmlMarkdown} theme="dark" />,
  name: "PlantUML - Dark Theme",
};

export const ComprehensiveLight: Story = {
  render: () => <MarkdownViewerWrapper value={comprehensiveMarkdown} theme="light" />,
  name: "総合サンプル - Light",
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // 見出しが描画されていることを確認（アウトラインリンクと区別するためgetAllByTextを使用）
    await waitFor(async () => {
      await expect(canvas.getAllByText("Markdown総合サンプル (閲覧モード)")[0]).toBeInTheDocument();
    });

    // H2見出しの確認（アウトラインに同名リンクがあるためgetAllByTextを使用）
    await expect(canvas.getAllByText("見出しとテキスト")[0]).toBeInTheDocument();
    await expect(canvas.getAllByText("リスト")[0]).toBeInTheDocument();
    await expect(canvas.getAllByText("コードと引用")[0]).toBeInTheDocument();

    // H3見出しの確認（アウトラインに同名リンクがあるためgetAllByTextを使用）
    await expect(canvas.getAllByText("サブセクション")[0]).toBeInTheDocument();

    // テキスト装飾の確認
    const boldText = canvas.getByText("太字");
    await expect(boldText.tagName.toLowerCase()).toBe("strong");

    const italicText = canvas.getByText("イタリック");
    await expect(italicText.tagName.toLowerCase()).toBe("em");

    // リスト項目の確認
    await expect(canvas.getByText("項目1")).toBeInTheDocument();
    await expect(canvas.getByText("項目2")).toBeInTheDocument();
    await expect(canvas.getByText("ネストした項目")).toBeInTheDocument();

    // 引用の確認
    const blockquote = canvasElement.querySelector("blockquote");
    await expect(blockquote).not.toBeNull();

    // テーブルの確認
    const table = canvasElement.querySelector("table");
    await expect(table).not.toBeNull();

    // インラインコードの確認
    await expect(canvas.getByText("const x = 42;")).toBeInTheDocument();
  },
};

export const ComprehensiveDark: Story = {
  render: () => <MarkdownViewerWrapper value={comprehensiveMarkdown} theme="dark" />,
  name: "総合サンプル - Dark",
};
